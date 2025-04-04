import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Menu.css";

const Menu = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  const [activeCompetition, setActiveCompetition] = useState(null);

  // Consultar la competición activa para el modo Live
  useEffect(() => {
    fetch("https://server-production-c33c.up.railway.app/api/active-competition", {
      headers: { Authorization: token },
    })
      .then((res) => {
        if (res.ok) return res.json();
        else throw new Error("No active competition");
      })
      .then((data) => {
        setActiveCompetition(data);
      })
      .catch((err) => {
        console.error(err);
        setActiveCompetition(null);
      });
  }, [token]);

  const handleLive = () => {
    if (activeCompetition) {
      // Navegar al mapa 2D en modo live usando el raceId activo
      navigate(`/map?raceId=${activeCompetition._id}`);
    }
  };

  const handleOldRecordings = () => {
    navigate("/old-records");
  };

  const handleCreateCompetition = () => {
    navigate("/create-competition");
  };

  const handleAddRace = () => {
    navigate("/add-race");
  };

  // Para el admin: Navegar a la nueva sección de Competición en Directo
  const handleDirectCompetitionAdmin = () => {
    navigate("/direct-competition-admin");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <div className="menu-page">
      <header className="home-banner" data-aos="fade-down">
        <div className="banner-content">
          <h1 data-aos="fade-right">Smart Navigation</h1>
          <button onClick={handleLogout} className="logout-btn" data-aos="fade-left">
            Logout
          </button>
        </div>
      </header>
      <main className="menu-content" data-aos="fade-up">
        <h2 className="menu-title">⛵ Control Center</h2>
        <p className="menu-subtitle">Navigate your fleet with advanced tools</p>
        <div className="menu-cards">
          {/* Tarjeta LIVE */}
          <div
            className={`menu-card live-card ${!activeCompetition ? "disabled" : ""}`}
            data-aos="zoom-in"
            data-aos-delay="100"
            onClick={() => {
              if (activeCompetition) handleLive();
            }}
          >
            <h3>Main Event</h3>
            <p>View live tracking</p>
            {activeCompetition && <div className="live-label">LIVE</div>}
          </div>
          {/* Tarjeta Old Recordings */}
          <div className="menu-card" data-aos="zoom-in" data-aos-delay="200" onClick={handleOldRecordings}>
            <h3>📼 Recordings</h3>
            <p>Review historical data and voyages</p>
          </div>
          {/* Tarjeta Crear Competición */}
          <div className="menu-card" data-aos="zoom-in" data-aos-delay="300" onClick={handleCreateCompetition}>
            <h3>🆕 Crear Competición</h3>
            <p>Create a new competition for mobile tracking</p>
          </div>
          {/* Tarjeta Añadir Carrera */}
          <div className="menu-card" data-aos="zoom-in" data-aos-delay="400" onClick={handleAddRace}>
            <h3>🆕 Añadir Carrera</h3>
            <p>Upload a JSON file of a finished race</p>
          </div>
          {/* Tarjeta Competición en Directo (solo para admin) */}
          {role === "admin" && (
            <div className="menu-card" data-aos="zoom-in" data-aos-delay="500" onClick={handleDirectCompetitionAdmin}>
              <h3>⚙️ Competición en Directo</h3>
              <p>Manage live competitions</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Menu;
