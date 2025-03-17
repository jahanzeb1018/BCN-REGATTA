// OldRecordings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OldRecordings.css";

const OldRecordings = () => {
  const [races, setRaces] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://server-production-c33c.up.railway.app/api/races", {
      headers: { Authorization: localStorage.getItem("token") },
    })
      .then((res) => res.json())
      .then((data) => setRaces(data))
      .catch((err) => console.error(err));
  }, []);

  const handleView2D = (raceId) => {
    // Redirige a Map2D con el parámetro raceId
    navigate(`/map?raceId=${raceId}`);
  };

  const handleView3D = (raceId) => {
    // Redirige a Scene con el parámetro raceId
    navigate(`/scene?raceId=${raceId}`);
  };

  return (
    <div className="old-recordings-container">
      <h2>Old Recordings</h2>
      <div className="races-list">
        {races.map((race) => (
          <div key={race._id} className="race-card">
            <h3>{race.name}</h3>
            <p>Created at: {new Date(race.createdAt).toLocaleString()}</p>
            <div className="race-buttons">
              <button onClick={() => handleView2D(race._id)}>Ver en 2D</button>
              <button onClick={() => handleView3D(race._id)}>Ver en 3D</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OldRecordings;
