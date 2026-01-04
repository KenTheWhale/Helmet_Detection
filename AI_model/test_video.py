import argparse
import asyncio
import json
import logging
import os
import cv2
import yt_dlp
import numpy as np
from pathlib import Path
from datetime import datetime

from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaPlayer
from av import VideoFrame
from ultralytics import YOLO

# ==============================================================================
# 1. CẤU HÌNH & KHỞI TẠO (LOGIC CỦA BẠN)
# ==============================================================================

# Link YouTube (Thay đổi link tại đây)
YOUTUBE_URL = "https://www.youtube.com/watch?v=LCauiIO0Bt4" 

# Đường dẫn Model
MODEL_PATH = Path(r"./best.pt")

# Các thư mục lưu trữ
PATH_HELMET    = Path(r"./2_Detect_Helmet")
PATH_NO_HELMET = Path(r"./3_Detect_No_Helmet")

# Cấu hình AI
SAVE_FRAME_INTERVAL = 30  # Giãn cách frame để lưu ảnh (tránh ghi ổ cứng quá nhiều)
CONF_VIOLATION      = 0.25
CONF_SAFE           = 0.4
IOU_THRESHOLD       = 0.3

KW_UNSAFE = ['no-helmet', 'head', 'face', 'person', 'no_helmet']
KW_SAFE   = ['helmet', 'hardhat', 'safety-cap']

# Khởi tạo thư mục
for p in [PATH_HELMET, PATH_NO_HELMET]:
    p.mkdir(parents=True, exist_ok=True)

# Load Model 1 lần duy nhất khi khởi động
print("⏳ Đang tải model YOLOv8...")
try:
    # Nếu không có best.pt, dùng tạm yolov8n.pt để demo không bị lỗi
    if not MODEL_PATH.exists():
        print("⚠️ Không tìm thấy best.pt, đang dùng yolov8n.pt mặc định!")
        model = YOLO("yolov8n.pt") 
    else:
        model = YOLO(str(MODEL_PATH))
    print("✅ Model đã tải xong.")
except Exception as e:
    print(f"❌ Lỗi tải model: {e}")
    exit()

# ==============================================================================
# 2. CLASS XỬ LÝ VIDEO (CUSTOM TRACK)
# ==============================================================================
class AIVideoTrack(VideoStreamTrack):
    """
    Đây là lớp trung gian:
    Nhận frame từ YouTube -> Chạy YOLO -> Vẽ hình -> Trả về WebRTC
    """
    def __init__(self, track):
        super().__init__()
        self.track = track
        self.frame_cnt = 0

    async def recv(self):
        # 1. Lấy frame gốc từ nguồn (YouTube)
        frame = await self.track.recv()
        
        # 2. Chuyển đổi sang định dạng OpenCV (numpy array)
        img = frame.to_ndarray(format="bgr24")
        
        # 3. CHẠY LOGIC AI CỦA BẠN TẠI ĐÂY
        self.frame_cnt += 1
        
        # Detect
        results = model.predict(img, conf=CONF_VIOLATION, iou=IOU_THRESHOLD, verbose=False)
        
        has_violation = False
        has_safe = False

        # Vẽ khung
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

                # Logic VI PHẠM (Đỏ)
                if any(k in cls_name for k in KW_UNSAFE) and conf >= CONF_VIOLATION:
                    has_violation = True
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(img, f"VIOLATION {conf:.2f}", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                # Logic AN TOÀN (Xanh)
                elif any(k in cls_name for k in KW_SAFE) and conf >= CONF_SAFE:
                    if not has_violation: 
                        has_safe = True 
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(img, f"SAFE {conf:.2f}", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # 4. Lưu ảnh bằng chứng (Audit)
        if self.frame_cnt % SAVE_FRAME_INTERVAL == 0:
            time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            img_name = f"Log_{time_str}_{self.frame_cnt}.jpg"
            
            if has_violation:
                cv2.imwrite(str(PATH_NO_HELMET / img_name), img)
                print(f"❌ [ALERT] Lưu ảnh vi phạm: {img_name}")
            elif has_safe:
                cv2.imwrite(str(PATH_HELMET / img_name), img)

        # 5. Tái tạo VideoFrame để trả về WebRTC
        new_frame = VideoFrame.from_ndarray(img, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
        return new_frame

# ==============================================================================
# 3. WEBRTC SERVER LOGIC
# ==============================================================================

pcs = set()

def get_youtube_stream_url(url):
    print(f"📡 Đang lấy link stream từ YouTube: {url}...")
    ydl_opts = {'format': 'best', 'quiet': True} # Lấy format tốt nhất có cả tiếng và hình
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info['url'], info['title']
    except Exception as e:
        print(f"❌ Lỗi lấy link YouTube: {e}")
        return None, None

async def offer(request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pcs.add(pc)

    # Lấy link trực tiếp từ YouTube
    stream_url, title = get_youtube_stream_url(YOUTUBE_URL)
    
    if stream_url:
        print(f"▶️ Bắt đầu stream: {title}")
        # Tạo MediaPlayer từ link online
        # options={"rtsp_transport": "tcp"} giúp ổn định hơn nếu là link rtsp, với http thì không ảnh hưởng
        player = MediaPlayer(stream_url)

        # --- KEY POINT: BỌC PLAYER BẰNG AI TRACK ---
        if player.video:
            ai_track = AIVideoTrack(player.video)
            pc.addTrack(ai_track)
        
        # Nếu muốn nghe tiếng thì bỏ comment dòng dưới (AI không xử lý tiếng, chỉ pass qua)
        # if player.audio:
        #     pc.addTrack(player.audio)
    else:
        return web.Response(status=500, text="Could not get YouTube stream")

    @pc.on("iceconnectionstatechange")
    async def on_iceconnectionstatechange():
        if pc.iceConnectionState == "failed":
            await pc.close()
            pcs.discard(pc)

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.json_response({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })

async def index(request):
    # Đọc file HTML
    file_path = os.path.join(os.path.dirname(__file__), "test_video.html")
    if not os.path.exists(file_path):
        return web.Response(status=404, text="Missing test_video.html")
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

    print(f"🚀 AI Monitor Server đang chạy tại: http://localhost:8080")
    web.run_app(app, host="0.0.0.0", port=8080)