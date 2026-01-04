import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";  // ← Add this import

const Dashboard = () => {
  const navigate = useNavigate();

  const items = [
    { name: "Live Camera Detection", icon: "📷", path: "/camera-detect" },
    { name: "Video File Detection", icon: "📹", path: "/video-detect" },
  ];

  const handleCardClick = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">
            Hemeti <span className="highlight">AI Detector</span>
          </h1>
          <p className="dashboard-subtitle">
            Choose a detection method to analyze images and videos for AI-generated content in real-time.
          </p>
        </header>

        <div className="dashboard-grid">
          {items.map((item, index) => (
            <div
              className="dashboard-card"
              key={index}
              onClick={() => handleCardClick(item.path)}
            >
              <span className="icon">{item.icon}</span>
              <h3>{item.name}</h3>
              <p>
                Manage and view details related to {item.name.toLowerCase()}.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;