import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./DirectCompetitionAdmin.css";

const DirectCompetitionAdmin = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [liveCompetitions, setLiveCompetitions] = useState([]);
  const [activeCompetition, setActiveCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminMessage, setAdminMessage] = useState("");

  const fetchLiveCompetitions = async () => {
    try {
      const res = await fetch("https://server-production-c33c.up.railway.app/api/races", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      const live = data.filter((race) => race.endTmst === null);
      setLiveCompetitions(live);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveCompetition = async () => {
    try {
      const res = await fetch("https://server-production-c33c.up.railway.app/api/active-competition", {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCompetition(data);
      } else {
        setActiveCompetition(null);
      }
    } catch (err) {
      console.error(err);
      setActiveCompetition(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchLiveCompetitions(), fetchActiveCompetition()]);
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Activar una competición en directo
  const handleSetActive = async (raceId) => {
    try {
      const res = await fetch("https://server-production-c33c.up.railway.app/api/active-competition", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ raceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage("Competición activada correctamente");
        setActiveCompetition(data.race);
        window.location.reload();
      } else {
        setAdminMessage(data.error || "Error al activar la competición");
      }
      await fetchLiveCompetitions();
    } catch (err) {
      setAdminMessage("Error en la petición");
    }
  };

  // Quitar la competición activa del directo
  const handleRemoveActive = async () => {
    try {
      const res = await fetch("https://server-production-c33c.up.railway.app/api/active-competition", {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (res.ok) {
        setAdminMessage("Competición eliminada del directo");
        setActiveCompetition(null);
        window.location.reload();
      } else {
        const data = await res.json();
        setAdminMessage(data.error || "Error al eliminar la competición");
      }
    } catch (err) {
      setAdminMessage("Error en la petición");
    }
  };

  const handleBack = () => {
    navigate("/menu");
  };

  return (
    <div className="admin-container">
      <header className="old-recordings-banner">
        <div className="banner-content">
          <button onClick={handleBack} className="back-btn">
            ↩
          </button>
          <h1>Competición en Directo</h1>
        </div>
      </header>
      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        </div>
      ) : (
        <main className="admin-main">
          {adminMessage && <p className="admin-message">{adminMessage}</p>}
          <div className="competition-list">
            {liveCompetitions.length === 0 ? (
              <p>No hay competiciones en directo.</p>
            ) : (
              liveCompetitions.map((race) => (
                <div
                  key={race._id}
                  className={`competition-card ${
                    activeCompetition && activeCompetition._id === race._id ? "active" : "inactive"
                  }`}
                >
                  <h3>{race.name}</h3>
                  <p>ID: {race._id}</p>
                  {activeCompetition && activeCompetition._id === race._id ? (
                    <div className="active-indicator">
                      <span>ACTIVA</span>
                      <button onClick={handleRemoveActive}>Quitar</button>
                    </div>
                  ) : (
                    <button onClick={() => handleSetActive(race._id)}>Poner en Directo</button>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      )}
    </div>
  );
};

export default DirectCompetitionAdmin;
