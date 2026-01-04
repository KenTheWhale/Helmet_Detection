import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; // ← Add this
import "../styles/CameraDetect.css";

const CameraDetect = () => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const navigate = useNavigate(); // ← For navigation
  const [status, setStatus] = useState("Đang kết nối đến server...");
  const [error, setError] = useState(null);

  // Handle back button click
  const handleBack = () => {
    if (pcRef.current) {
      pcRef.current.close(); // Clean up WebRTC connection
    }
    navigate("/dashboard");
  };

  useEffect(() => {
    const startStream = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.addTransceiver("video", { direction: "recvonly" });

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            setStatus("Đang phát trực tiếp - AI đang phân tích");
            setError(null);
          }
        };

        pc.oniceconnectionstatechange = () => {
          setStatus(`Trạng thái kết nối: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
            setError("Mất kết nối với server camera. Vui lòng tải lại trang.");
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise((resolve) => {
          if (pc.iceGatheringState === "complete") {
            resolve();
          } else {
            const check = () => {
              if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", check);
                resolve();
              }
            };
            pc.addEventListener("icegatheringstatechange", check);
          }
        });

        const response = await fetch("http://localhost:8080/offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sdp: pc.localDescription.sdp,
            type: pc.localDescription.type,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server trả lỗi: ${response.status} - ${text}`);
        }

        const answer = await response.json();
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

      } catch (err) {
        console.error("WebRTC Error:", err);
        setError(`Không thể kết nối: ${err.message}`);
        setStatus("Lỗi kết nối");
      }
    };

    startStream();

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <div className="camera-detect-wrapper">
      <div className="camera-container">
        {/* Back Button + Title Row */}
        <div className="header-with-back">
          <button onClick={handleBack} className="back-btn">
            ← Back to Dashboard
          </button>
          <h1 className="page-title">Live Camera Detection</h1>
        </div>

        <div className="video-section">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="live-video"
          />

          <div className="status-bar">
            <span className={`status ${status.includes('phát trực tiếp') ? 'success' : status.includes('Lỗi') ? 'error' : 'connecting'}`}>
              ● {status}
            </span>
          </div>

          {error && (
            <div className="error-message">
              <p>Warning: {error}</p>
              <p>Vui lòng kiểm tra:</p>
              <ul>
                <li>Server Python đang chạy (<code>python server.py</code>)</li>
                <li>Nghe trên <code>http://localhost:8080</code></li>
                <li>Không dùng HTTPS (chỉ dùng HTTP localhost)</li>
              </ul>
            </div>
          )}
        </div>

        <div className="info-panel card">
          <h3>Trạng thái phát hiện mũ bảo hộ</h3>
          <p>AI đang phân tích từng khung hình trong thời gian thực.</p>
          <ul className="legend">
            <li><span className="box red"></span> Viền đỏ = Không đội mũ (Vi phạm)</li>
            <li><span className="box green"></span> Viền xanh = Đội mũ (An toàn)</li>
          </ul>
          <p className="note">
            Ảnh vi phạm/an toàn được tự động lưu trên server để kiểm tra.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CameraDetect;