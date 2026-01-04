import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import "../styles/Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="nav-navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Helmet <span className="nav-highlight">AI Detector</span>
        </Link>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user-email">{user.email}</span>
              <button
                className="nav-btn nav-btn-logout"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-btn nav-btn-primary">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;