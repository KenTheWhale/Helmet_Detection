import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CameraDetect from "./pages/CameraDetect";     // ← Add this
import VideoDetect from "./pages/VideoDetect";       // ← Add this
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/camera-detect"
              element={
                <ProtectedRoute>
                  <CameraDetect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/video-detect"
              element={
                <ProtectedRoute>
                  <VideoDetect />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;