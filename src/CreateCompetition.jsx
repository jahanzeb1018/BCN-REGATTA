// CreateCompetition.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateCompetition.css";

const CreateCompetition = () => {
  const [name, setName] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreateCompetition = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("https://server-production-c33c.up.railway.app/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (response.ok) {
        setCompetitionId(data.race._id);
      } else {
        setError(data.error || "Error creating competition");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  // Redirigir a Map2D con el parámetro raceId
  const handleGoToJoin = () => {
    navigate(`/map?raceId=${competitionId}`);
  };

  return (
    <div className="create-competition-container">
      <h2>Crear Nueva Competición</h2>
      <form onSubmit={handleCreateCompetition} className="create-competition-form">
        <input
          type="text"
          placeholder="Nombre de la Competición"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit">Crear Competición</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {competitionId && (
        <div className="competition-result">
          <p>Competición creada exitosamente!</p>
          <p>ID: <strong>{competitionId}</strong></p>
          <button onClick={handleGoToJoin}>Ir a Unirse a la Competición</button>
        </div>
      )}
    </div>
  );
};

export default CreateCompetition;
