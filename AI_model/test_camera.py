import asyncio
import os

import cv2
import numpy as np
import threading
import time
from pathlib import Path
from datetime import datetime
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame
from aiohttp import web
from ultralytics import YOLO

# ==============================================================================
# 1. CẤU HÌNH
# ==============================================================================
# Chọn Camera ID (0 là camera laptop mặc định, 1 là camera cắm ngoài nếu có)
CAMERA_ID = 0 

MODEL_PATH = Path(r"./best.pt")
PATH_HELMET    = Path(r"./2_Detect_Helmet")
PATH_NO_HELMET = Path(r"./3_Detect_No_Helmet")
SAVE_INTERVAL = 60
SAVE_FRAME_INTERVAL = 30
CONF_VIOLATION      = 0.4 # Tăng lên xíu để đỡ báo ảo
CONF_SAFE           = 0.5
IOU_THRESHOLD       = 0.45

KW_UNSAFE = ['no-helmet', 'head', 'face', 'person', 'no_helmet']
KW_SAFE   = ['helmet', 'hardhat', 'safety-cap']

# Tạo thư mục
for p in [PATH_HELMET, PATH_NO_HELMET]:
    p.mkdir(parents=True, exist_ok=True)

# Load Model
print("⏳ Đang tải model YOLOv8...")
try:
    if not MODEL_PATH.exists():
        print("⚠️ Không tìm thấy best.pt, dùng yolov8n.pt mặc định!")
        model = YOLO("yolov8n.pt") 
    else:
        model = YOLO(str(MODEL_PATH))
    print("✅ Model đã tải xong.")
except Exception as e:
    print(f"❌ Lỗi tải model: {e}")
    exit()

# ==============================================================================
# 2. CLASS CAMERA TRACK (MỚI)
# ==============================================================================
class CameraAITrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()
        self.cap = cv2.VideoCapture(CAMERA_ID)
        # Thiết lập độ phân giải HD để video rõ nét
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        self.latest_frame = None
        self.processed_frame = None
        self.last_save_time = time.time()
        self.running = True

        # Luồng 1: Đọc camera liên tục (Đảm bảo mượt)
        self.read_thread = threading.Thread(target=self._update_camera, daemon=True)
        # Luồng 2: Chạy AI (Đảm bảo không lag luồng chính)
        self.ai_thread = threading.Thread(target=self._run_ai, daemon=True)

        self.read_thread.start()
        self.ai_thread.start()

    def _update_camera(self):
        while self.running:
            ret, frame = self.cap.read()
            if ret:
                self.latest_frame = frame
            time.sleep(0.01)

    def _run_ai(self):
        while self.running:
            if self.latest_frame is not None:
                frame = self.latest_frame.copy()

                # Chạy AI với kích thước ảnh nhỏ hơn (imgsz=320) để tăng tốc
                results = model.predict(frame, conf=0.4, imgsz=416, verbose=False)

                has_no_helmet = False
                # Vẽ khung ngay trên luồng AI
                for r in results:
                    annotated_frame = r.plot() # Hàm vẽ sẵn của YOLO, rất nhanh và đẹp
                    for box in r.boxes:
                        label = model.names[int(box.cls[0])].lower()
                        if label in ['head', 'no-helmet']:
                            has_no_helmet = True

                self.processed_frame = annotated_frame

                # Logic chụp ảnh mỗi 1 phút
                current_time = time.time()
                if current_time - self.last_save_time >= SAVE_INTERVAL:
                    if has_no_helmet:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        cv2.imwrite(str(PATH_NO_HELMET / f"violation_{timestamp}.jpg"), annotated_frame)
                        print(f"📸 Đã lưu ảnh vi phạm lúc {timestamp}")
                    self.last_save_time = current_time

            time.sleep(0.03) # Giới hạn AI chạy khoảng 30 FPS để tiết kiệm CPU

    async def recv(self):
        pts, time_base = await self.next_timestamp()

        # Nếu đã có frame xử lý bởi AI thì gửi đi, nếu chưa thì gửi frame thô
        frame = self.processed_frame if self.processed_frame is not None else self.latest_frame

        if frame is None:
            frame = np.zeros((720, 1280, 3), dtype=np.uint8)

        new_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        new_frame.pts = pts
        new_frame.time_base = time_base
        return new_frame

    def stop(self):
        self.running = False
        self.cap.release()
        super().stop()

# ==============================================================================
# 3. SERVER LOGIC
# ==============================================================================
pcs = set()

async def offer(request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pcs.add(pc)

    print(f"📷 Khởi động Camera Laptop...")
    
    # --- THAY ĐỔI Ở ĐÂY: DÙNG CLASS MỚI ---
    # Không dùng MediaPlayer nữa, dùng CameraAITrack tự viết
    video_track = CameraAITrack()
    pc.addTrack(video_track)

    @pc.on("iceconnectionstatechange")
    async def on_iceconnectionstatechange():
        if pc.iceConnectionState == "failed":
            await pc.close()
            pcs.discard(pc)
            # Quan trọng: Giải phóng camera khi client ngắt kết nối
            video_track.stop() 

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.json_response({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })

async def index(request):
    file_path = os.path.join(os.path.dirname(__file__), "test_camera.html")
    if not os.path.exists(file_path):
        return web.Response(status=404, text="Missing test_camera.html")
    content = open(file_path, "r", encoding='utf-8').read()
    return web.Response(content_type="text/html", text=content)

async def on_shutdown(app):
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()

if __name__ == "__main__":
    app = web.Application()
    app.router.add_get("/", index)
    app.router.add_post("/offer", offer)
    app.on_shutdown.append(on_shutdown)

    print(f"🚀 AI Camera Server đang chạy tại: http://localhost:8080")
    web.run_app(app, host="0.0.0.0", port=8080)