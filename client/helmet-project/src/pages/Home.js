import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Home.css";

const Home = () => {
  const { user } = useAuth();

  return (
    <>
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Helmet <span className="home-highlight">AI Detector</span>
          </h1>
          <p className="home-hero-subtitle">
            Instantly detect AI-generated text with industry-leading accuracy.
            <br />
            Trusted by writers, educators, and content teams worldwide.
          </p>

          <div className="home-hero-actions">
            <Link
              to={user ? "/dashboard" : "/login"}
              className="home-btn home-btn-primary"
            >
              {user ? "Go to Dashboard" : "Try It Free"}
            </Link>
            <Link to="/about" className="home-btn home-btn-outline">
              Learn More
            </Link>
          </div>

          <div className="home-trust-badges">
            <span>98.7% Accuracy</span>
            <span>Supports GPT-4, Claude, Gemini & More</span>
            <span>Real-time Analysis</span>
          </div>
        </div>

        <div className="home-hero-image">
          <div className="home-mock-dashboard">
            <div className="home-mock-screen">
              <div className="home-orange-bar"></div>
              <div className="home-orange-bar home-orange-bar-light"></div>
              <div className="home-mock-content">
                <div className="home-mock-circle"></div>
                <div className="home-mock-line"></div>
                <div className="home-mock-line home-mock-line-short"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="home-features-section">
        <div className="home-container">
          <h2 className="home-section-title">Why Choose Hemeti AI Detector?</h2>

          <div className="home-features-grid">
            <div className="home-feature-card">
              <div className="home-feature-icon">🔍</div>
              <h3>Advanced Detection</h3>
              <p>
                Powered by cutting-edge machine learning models trained on millions
                of human and AI-written samples.
              </p>
            </div>

            <div className="home-feature-card">
              <div className="home-feature-icon">🚀</div>
              <h3>Lightning Fast</h3>
              <p>
                Get detailed results in seconds — perfect for high-volume content
                checking.
              </p>
            </div>

            <div className="home-feature-card">
              <div className="home-feature-icon">🛡️</div>
              <h3>Privacy First</h3>
              <p>
                Your text is never stored or used for training. We respect your
                privacy completely.
              </p>
            </div>

            <div className="home-feature-card">
              <div className="home-feature-icon">📊</div>
              <h3>Detailed Reports</h3>
              <p>
                Highlight suspected AI sections with confidence scores and
                sentence-by-sentence analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="home-cta-section">
        <div className="home-container">
          <h2>Ready to Ensure Content Authenticity?</h2>
          <p>
            Join thousands who trust Hemeti to maintain originality and integrity.
          </p>
          <Link
            to={user ? "/dashboard" : "/login"}
            className="home-btn home-btn-primary home-btn-large"
          >
            {user ? "Open Your Dashboard" : "Start Detecting Now →"}
          </Link>
        </div>
      </section>
    </>
  );
};

export default Home;
// import React, { useRef, useState, useEffect } from 'react';
// import Webcam from 'react-webcam';

// const Home = () => {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const [isHelmet, setIsHelmet] = useState(null);

//   const drawBoxes = (predictions) => {
//     const ctx = canvasRef.current.getContext('2d');
//     ctx.clearRect(0, 0, 640, 480); // Xóa khung cũ

//     predictions.forEach(prediction => {
//       const [x1, y1, x2, y2] = prediction.box;
//       const label = prediction.label;
      
//       // Chọn màu: helmet xanh lá, head/person màu đỏ
//       ctx.strokeStyle = label === 'helmet' ? '#00FF00' : '#FF0000';
//       ctx.lineWidth = 3;
//       ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

//       // Vẽ nhãn
//       ctx.fillStyle = label === 'helmet' ? '#00FF00' : '#FF0000';
//       ctx.font = '18px Arial';
//       ctx.fillText(`${label} (${Math.round(prediction.confidence * 100)}%)`, x1, y1 > 20 ? y1 - 5 : 20);
//     });
//   };

//   const captureAndDetect = async () => {
//     if (webcamRef.current) {
//       const imageSrc = webcamRef.current.getScreenshot();
//       if (!imageSrc) return;

//       const blob = await fetch(imageSrc).then(res => res.blob());
//       const formData = new FormData();
//       formData.append('file', blob);

//       try {
//         const response = await fetch('http://127.0.0.1:8000/detect', {
//           method: 'POST',
//           body: formData,
//         });
//         const data = await response.json();
        
//         // Vẽ tọa độ nhận được lên Canvas
//         drawBoxes(data.predictions);

//         // Kiểm tra logic có mũ hay không
//         const hasHelmet = data.predictions.some(p => p.label === 'helmet');
//         setIsHelmet(hasHelmet);
//       } catch (error) {
//         console.error("Error:", error);
//       }
//     }
//   };

//   useEffect(() => {
//     const interval = setInterval(captureAndDetect, 2);
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//       <div style={{ position: 'relative', width: 640, height: 480 }}>
//         <Webcam
//           ref={webcamRef}
//           screenshotFormat="image/jpeg"
//           width={640}
//           height={480}
//           style={{ position: 'absolute', top: 0, left: 0 }}
//         />
//         <canvas
//           ref={canvasRef}
//           width={640}
//           height={480}
//           style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
//         />
//       </div>
//       <h2 style={{ color: isHelmet ? 'green' : 'red' }}>
//         {isHelmet === null ? "Đang khởi tạo..." : isHelmet ? "AN TOÀN" : "CẢNH BÁO: CHƯA ĐỘI MŨ"}
//       </h2>
//     </div>
//   );
// };

// export default Home;
