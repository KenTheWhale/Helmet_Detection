import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

const ClientSideDetector = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isHelmet, setIsHelmet] = useState(null);

  const drawBoxes = (predictions) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 640, 480); // Xóa khung cũ

    predictions.forEach(prediction => {
      const [x1, y1, x2, y2] = prediction.box;
      const label = prediction.label;
      
      // Chọn màu: helmet xanh lá, head/person màu đỏ
      ctx.strokeStyle = label === 'helmet' ? '#00FF00' : '#FF0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Vẽ nhãn
      ctx.fillStyle = label === 'helmet' ? '#00FF00' : '#FF0000';
      ctx.font = '18px Arial';
      ctx.fillText(`${label} (${Math.round(prediction.confidence * 100)}%)`, x1, y1 > 20 ? y1 - 5 : 20);
    });
  };

  const captureAndDetect = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('file', blob);

      try {
        const response = await fetch('http://localhost:8000/detect', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        
        // Vẽ tọa độ nhận được lên Canvas
        drawBoxes(data.predictions);

        // Kiểm tra logic có mũ hay không
        const hasHelmet = data.predictions.some(p => p.label === 'helmet');
        setIsHelmet(hasHelmet);
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(captureAndDetect, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 640, height: 480 }}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={640}
          height={480}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
        />
      </div>
      <h2 style={{ color: isHelmet ? 'green' : 'red' }}>
        {isHelmet === null ? "Đang khởi tạo..." : isHelmet ? "AN TOÀN" : "CẢNH BÁO: CHƯA ĐỘI MŨ"}
      </h2>
    </div>
  );
};

export default ClientSideDetector;
