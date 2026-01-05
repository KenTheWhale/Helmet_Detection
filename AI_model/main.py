import os
import threading
import time
import uuid
from datetime import datetime

import cloudinary.uploader
import cv2
import uvicorn
import yt_dlp
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI()

# Cấu hình Cloudinary
cloudinary.config(cloud_name="dj0ckodyq", api_key="923517352954895", api_secret="1XJ8N6dCCUV0SmJhlCjQKpQRAUM")

model = YOLO("best1.pt") # File YOLOv11 của bạn

FIXED_UUID = str(uuid.uuid4())[:8]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Hoặc chỉ định rõ ["http://localhost:3000"]
    allow_methods=["*"],
    allow_headers=["*"],
)

violation_logs = []

camera_status = {"is_running": False}
cap = None
last_upload_time = 0

def upload_violation(frame):
    """Gửi ảnh sai phạm lên Cloud in background để không làm lag stream"""
    global violation_logs
    try:
        timestamp_raw = datetime.now()
        timestamp_str = timestamp_raw.strftime("%d/%m/%Y %H:%M:%S")
        file_name = f"FSB_{timestamp_raw.strftime('%d_%m_%Y_%H_%M_%S')}_{FIXED_UUID}"

        _, buffer = cv2.imencode('.jpg', frame)
        upload_result = cloudinary.uploader.upload(
            buffer.tobytes(),
            folder="violations",
            public_id=file_name,
            overwrite=True,
            resource_type="image"
        )

        # Lưu thông tin vào danh sách log
        new_log = {
            "id": len(violation_logs) + 1,
            "name": file_name,
            "time": timestamp_str,
            "url": upload_result['secure_url']
        }
        # Thêm vào đầu danh sách để cái mới nhất hiện lên trên
        violation_logs.insert(0, new_log)

        print(f"Đã lưu bằng chứng: {file_name}")
    except Exception as e:
        print(f"Lỗi khi upload: {e}")

@app.get("/logs")
async def get_logs():
    return violation_logs[:10]

@app.delete("/logs/{log_id}")
async def delete_log(log_id: int):
    global violation_logs
    # Lọc bỏ log có id trùng với log_id được gửi lên
    violation_logs = [log for log in violation_logs if log.get("id") != log_id]
    return {"message": "Đã xóa log thành công"}

def generate_frames(source_path=0):
    global cap, last_upload_time

    # Giải phóng cap cũ nếu có
    if cap is not None:
        cap.release()

    cap = cv2.VideoCapture(source_path)

    # Tối ưu cho Webcam: Giảm độ phân giải để AI chạy mượt hơn nếu cần
    if source_path == 0:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while camera_status["is_running"]:
        success, frame = cap.read()
        if not success:
            break

        # GIẢM KÍCH THƯỚC FRAME TẠI ĐÂY (Ví dụ: giảm xuống 640x480 hoặc 480x270)
        # Việc này giúp AI chạy nhanh gấp đôi
        frame = cv2.resize(frame, (640, 360))

        # --- PHẦN AI NHẬN DIỆN ---
        # Thêm imgsz=320 để model tối ưu hơn nữa
        results = model(frame, conf=0.5, imgsz=320, verbose=False)

        # Vẽ bounding box lên frame để hiển thị lên React
        annotated_frame = results[0].plot()

        # Giả sử class 0 là "không đội mũ" (bạn cần check lại index class của bạn)
        # Kiểm tra nếu có bất kỳ box nào thuộc class vi phạm
        violations = [box for box in results[0].boxes if int(box.cls[0]) == 0]

        if len(violations) > 0:
            current_time = time.time()
            # Chỉ upload nếu cách lần cuối 10 giây
            if current_time - last_upload_time > 10:
                last_upload_time = current_time
                # Chạy upload ở thread riêng để không gây giật lag stream video
                threading.Thread(target=upload_violation, args=(frame.copy(),)).start()

        # Encode frame để gửi về UI
        _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        yield b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n'

    if cap:
        cap.release()
        cap = None

@app.get("/video_feed")
async def video_feed():
    camera_status["is_running"] = True
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/stop_camera")
async def stop_camera():
    camera_status["is_running"] = False
    return {"status": "Camera stopped"}

@app.get("/stream_youtube")
async def stream_youtube(link: str):
    # Kích hoạt trạng thái chạy để vòng lặp generate_frames không bị thoát
    camera_status["is_running"] = True

    ydl_opts = {
        'format': 'best[ext=mp4]/best', # Ưu tiên mp4 để OpenCV đọc dễ hơn
        'quiet': True,
        'no_warnings': True,
        # Thêm cấu hình để tránh bị YouTube chặn
        'nocheckcertificate': True,
        'ignoreerrors': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(link, download=False)
            video_url = info.get('url')

        if not video_url:
            return {"error": "Không thể lấy link video trực tiếp"}

        # Trả về StreamingResponse tương tự như video_feed
        return StreamingResponse(
            generate_frames(video_url),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    except Exception as e:
        camera_status["is_running"] = False
        print(f"Lỗi Youtube: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    # Chạy cố định ở 127.0.0.1 port 8000
    print("--- SERVER ĐANG CHẠY TẠI http://127.0.0.1:8000 ---")
    uvicorn.run(app, host="127.0.0.1", port=8000)