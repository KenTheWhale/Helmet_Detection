import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const { user } = useAuth();

  return (
    <section className="hero">
      <div className="hero-text">
        <h1>Professional Dashboard System</h1>
        <p>
          A clean, friendly and modern React application built with pure CSS.
        </p>

        <Link
          to={user ? "/dashboard" : "/login"}
          className="btn btn-primary"
        >
          {user ? "Go to Dashboard" : "Get Started"}
        </Link>
      </div>
    </section>
  );
};

export default Home;
