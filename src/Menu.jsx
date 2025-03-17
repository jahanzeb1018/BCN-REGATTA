// Menu.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Menu.css";

const Menu = () => {
  const navigate = useNavigate();

  const handleMap2D = () => {
    navigate("/map");
  };

  const handleOldRecordings = () => {
    navigate("/old-records");
  };

  const handle3DView = () => {
    navigate("/scene");
  };

  const handleLogout = () => {
    // Eliminar el token del localStorage
    localStorage.removeItem("token");
    // Redirigir a la pantalla de login
    navigate("/login");
  };

  return (
    <div className="menu-container">
      <h2 className="menu-title">⛵ Control Center</h2>
      <p className="menu-subtitle">Navigate your fleet with advanced tools</p>

      <div className="menu-cards">
        <div className="menu-card" onClick={handleMap2D}>
          <h3>🌍 2D Map</h3>
          <p>Monitor positions on a real-time 2D map</p>
        </div>
        <div className="menu-card" onClick={handleOldRecordings}>
          <h3>📼 Old Recordings</h3>
          <p>Review historical data and past voyages</p>
        </div>
        <div className="menu-card" onClick={handle3DView}>
          <h3>🌐 3D View</h3>
          <p>Experience an immersive three-dimensional environment</p>
        </div>
      </div>

      {/* Botón de Logout */}
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Menu;
