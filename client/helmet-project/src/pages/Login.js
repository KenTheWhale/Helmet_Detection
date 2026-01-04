import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Import dedicated CSS
import "../styles/Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    // In real app: validate credentials here
    login("user@hemeti.com"); // mock login
    navigate("/dashboard");
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">
            Hemeti <span className="login-highlight">AI Detector</span>
          </h1>
          <h2 className="login-subtitle">Welcome Back</h2>
          <p className="login-description">
            Log in to access your dashboard and detect AI-generated content instantly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <input
              type="email"
              placeholder="Email address"
              className="login-input"
              required
            />
          </div>

          <div className="login-input-group">
            <input
              type="password"
              placeholder="Password"
              className="login-input"
              required
            />
          </div>

          <button type="submit" className="login-btn login-btn-primary">
            Sign In
          </button>
        </form>

        
      </div>
    </div>
  );
};

export default Login;