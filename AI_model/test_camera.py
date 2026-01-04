import argparse
import asyncio
import json
import logging
import os
import cv2
import numpy as np
from pathlib import Path
from datetime import datetime
from fractions import Fraction
import time

from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame
from ultralytics import YOLO

# ==============================================================================
# 1. CẤU HÌNH
# ==============================================================================
# Chọn Camera ID (0 là camera laptop mặc định, 1 là camera cắm ngoài nếu có)
CAMERA_ID = 0 

MODEL_PATH = Path(r"./best.pt")
PATH_HELMET    = Path(r"./2_Detect_Helmet")
PATH_NO_HELMET = Path(r"./3_Detect_No_Helmet")

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
    """
    Track này tự mở Camera, đọc frame, chạy YOLO và gửi sang WebRTC
    """
    def __init__(self):
        super().__init__()
        self.cap = cv2.VideoCapture(CAMERA_ID)
        self.frame_cnt = 0
        self.start_time = time.time()
        
        # Cấu hình độ phân giải Camera (nếu cần nhẹ thì giảm xuống)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    async def recv(self):
        # Tính toán timestamp cho frame (WebRTC cần cái này để video trôi chảy)
        pts, time_base = await self.next_timestamp()
        
        # Đọc frame từ Camera
        ret, frame = self.cap.read()
        if not ret:
            # Nếu không đọc được (camera bị rút, lỗi), tạo màn hình đen
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        self.frame_cnt += 1
        
        # --- LOGIC AI YOLO ---
        # Chạy predict
        results = model.predict(frame, conf=CONF_VIOLATION, iou=IOU_THRESHOLD, verbose=False)
        
        has_violation = False
        has_safe = False

        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                if model.names:
                    cls_name = model.names[cls_id].lower().replace("_", "-")
                else:
                    cls_name = "unknown"
                
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Vẽ VI PHẠM
                if any(k in cls_name for k in KW_UNSAFE) and conf >= CONF_VIOLATION:
                    has_violation = True
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(frame, f"VIOLATION {conf:.2f}", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                # Vẽ AN TOÀN
                elif any(k in cls_name for k in KW_SAFE) and conf >= CONF_SAFE:
                    if not has_violation: has_safe = True 
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"SAFE {conf:.2f}", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Lưu ảnh (Audit)
        if self.frame_cnt % SAVE_FRAME_INTERVAL == 0:
            time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            img_name = f"Cam_{time_str}_{self.frame_cnt}.jpg"
            if has_violation:
                cv2.imwrite(str(PATH_NO_HELMET / img_name), frame)
                print(f"❌ [CAM] Lưu ảnh vi phạm: {img_name}")
            elif has_safe:
                cv2.imwrite(str(PATH_HELMET / img_name), frame)

        # --- ĐÓNG GÓI TRẢ VỀ WEBRTC ---
        # Chuyển OpenCV (BGR) -> VideoFrame
        new_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        new_frame.pts = pts
        new_frame.time_base = time_base
        return new_frame

    def stop(self):
        if self.cap.isOpened():
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