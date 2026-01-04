import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    login("user@myapp.com");
    navigate("/dashboard");
  };

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>

        <input className="input" placeholder="Email" required />
        <input className="input" type="password" placeholder="Password" required />

        <button className="btn btn-primary" style={{ width: "100%" }}>
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
