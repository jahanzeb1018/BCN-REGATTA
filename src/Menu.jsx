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
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleCreateCompetition = () => {
    navigate("/create-competition");
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
        <div className="menu-card" onClick={handleCreateCompetition}>
          <h3>🆕 Crear Competición</h3>
          <p>Create a new competition for mobile tracking</p>
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Menu;
