// OldRecordings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OldRecordings.css";

const OldRecordings = () => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://server-production-c33c.up.railway.app/api/races", {
      headers: { Authorization: localStorage.getItem("token") },
    })
      .then((res) => res.json())
      .then((data) => {
        setRaces(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleView2D = (raceId) => {
    navigate(`/map?raceId=${raceId}`);
  };

  const handleView3D = (raceId) => {
    navigate(`/scene?raceId=${raceId}`);
  };

  const handleBack = () => {
    navigate("/menu");
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="old-recordings-page">
      <header className="old-recordings-banner">
        <div className="banner-content">
          <button onClick={handleBack} className="back-btn">
            ↩
          </button>
          <h1>Recordings</h1>
        </div>
      </header>
      <main className="old-recordings-content" data-aos="fade-up">
        <div className="races-list">
          {races.map((race) => (
            <div key={race._id} className="race-card" data-aos="zoom-in" data-aos-delay="100">
              {!race.endTmst && <div className="live-label">LIVE</div>}
              <h3>{race.name}</h3>
              <p>Created at: {new Date(race.createdAt).toLocaleString()}</p>
              <div className="race-buttons">
                <button onClick={() => handleView2D(race._id)}>Ver en 2D</button>
                <button onClick={() => handleView3D(race._id)}>Ver en 3D</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default OldRecordings;
