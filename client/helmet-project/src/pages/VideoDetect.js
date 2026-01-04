import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/VideoDetect.css"; // We'll create this next

const VideoDetect = () => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const navigate = useNavigate();

  const [status, setStatus] = useState("Sẵn sàng kết nối");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const handleBack = () => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    navigate("/dashboard");
  };

  const startStream = async () => {
    setError(null);
    setStatus("Đang kết nối đến server YouTube AI...");

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.addTransceiver("video", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus("Đang giám sát video YouTube - AI hoạt động");
          setIsConnected(true);
        }
      };

      pc.oniceconnectionstatechange = () => {
        setStatus(`Trạng thái kết nối: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          setError("Mất kết nối với server. Vui lòng thử lại.");
          setIsConnected(false);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") resolve();
        else {
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
        throw new Error(`Server lỗi: ${response.status} - ${text}`);
      }

      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

    } catch (err) {
      console.error(err);
      setError(`Không thể kết nối: ${err.message}`);
      setStatus("Lỗi kết nối");
      setIsConnected(false);
    }
  };

  const stopStream = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsConnected(false);
    setStatus("Đã ngắt kết nối");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <div className="video-detect-wrapper">
      <div className="video-container">
        {/* Header with Back Button */}
        <div className="header-with-back">
          <button onClick={handleBack} className="back-btn">
            ← Back to Dashboard
          </button>
          <h1 className="page-title">YouTube Video Detection</h1>
        </div>

        {/* Video Section */}
        <div className="video-section">
          <div className="video-wrapper">
            <div className={`live-badge ${isConnected ? "active" : ""}`}>
              ● LIVE AI
            </div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              controls
              className="live-video"
            />
          </div>

          <div className="controls">
            <button
              onClick={startStream}
              disabled={isConnected}
              className="btn-start"
            >
              ▶️ Kết nối AI Monitor
            </button>
            <button
              onClick={stopStream}
              disabled={!isConnected}
              className="btn-stop"
            >
              ⏹️ Ngắt kết nối
            </button>
          </div>

          <div className="status-bar">
            <span className={`status ${isConnected ? 'success' : status.includes('Lỗi') ? 'error' : 'connecting'}`}>
              ● {status}
            </span>
          </div>

          {error && (
            <div className="error-message">
              <p>Warning: {error}</p>
              <p>Kiểm tra:</p>
              <ul>
                <li>Server Python đang chạy với YouTube URL hợp lệ</li>
                <li>Link YouTube công khai và đang live/đã phát</li>
                <li>Không bị chặn bởi CORS (đã thêm middleware)</li>
              </ul>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="info-panel card">
          <h3>Trạng thái phát hiện mũ bảo hộ từ YouTube</h3>
          <p>
            AI đang phân tích video YouTube thời gian thực. Mọi vi phạm sẽ được đánh dấu bằng khung đỏ.
          </p>
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

export default VideoDetect;