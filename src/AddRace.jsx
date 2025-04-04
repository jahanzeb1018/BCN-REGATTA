import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./AddRace.css";

const AddRace = () => {
  const [raceName, setRaceName] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/menu");
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!raceName || !file) {
      setMessage("Por favor, complete todos los campos.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        const raceData = {
          name: raceName,
          ...jsonData,
        };

        const response = await fetch("https://server-production-c33c.up.railway.app/api/races", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token"),
          },
          body: JSON.stringify(raceData),
        });

        if (response.ok) {
          setMessage("Regata subida correctamente.");
          navigate("/old-records");
        } else {
          const data = await response.json();
          setMessage(data.error || "Error al subir la regata.");
        }
      } catch (err) {
        console.error(err);
        setMessage("Error al procesar el archivo.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="add-race-container">
      <header className="old-recordings-banner">
        <div className="banner-content">
          <button onClick={handleBack} className="back-btn">↩</button>
          <h1>Añadir Carrera</h1>
        </div>
      </header>
      <main className="add-race-main">
        <h2>Sube el archivo JSON de la carrera</h2>
        <form onSubmit={handleSubmit} className="add-race-form">
          <div className="form-group">
            <label>Nombre de la Carrera:</label>
            <input
              type="text"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Seleccionar Archivo (.json):</label>
            <input type="file" accept=".json" onChange={handleFileChange} required />
          </div>
          <button type="submit">Subir Carrera</button>
        </form>
        {message && <p className="message">{message}</p>}
      </main>
    </div>
  );
};

export default AddRace;
