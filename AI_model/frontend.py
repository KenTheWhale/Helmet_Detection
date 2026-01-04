from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware # Thêm cái này
from ultralytics import YOLOWorld
import cv2
import numpy as np

# 1. Khởi tạo App với Metadata cho Swagger
app = FastAPI(
    title="Helmet Detection API",
    description="API sử dụng YOLO World để nhận diện mũ bảo hiểm từ Camera",
    version="1.0.0"
)

# 2. Cấu hình CORS để ReactJS có thể truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong thực tế nên thay "*" bằng ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model (nên để ngoài function để tránh load lại mỗi lần gọi API)
try:
    model = YOLOWorld('best.pt')
except Exception as e:
    print(f"Lỗi load model: {e}")

@app.post("/detect", tags=["Detection"]) # Thêm tags để nhóm trên Swagger
async def detect_helmet(file: UploadFile = File(...)):
    """
    Endpoint nhận ảnh từ Camera và trả về tọa độ Bounding Box.
    - **file**: Ảnh chụp từ webcam (format .jpg hoặc .png)
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model.predict(img, conf=0.5)

    predictions = []
    for r in results:
        for box in r.boxes:
            coords = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            label = model.names[cls]

            predictions.append({
                "box": coords,
                "label": label,
                "confidence": conf
            })

    return {"predictions": predictions}

# 3. Chạy Server
if __name__ == "__main__":
    import uvicorn
    # Chạy lệnh này: python main.py
    uvicorn.run(app, host="127.0.0.1", port=8000)
