// AddRace.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddRace.css';

const AddRace = () => {
  const [raceName, setRaceName] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

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
        // Se asume que el archivo JSON contiene los campos:
        // buoys, positions, startTmst, endTmst, etc.
        // Se agrega el nombre que ha introducido el usuario.
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
          // Redirige a la pantalla de grabaciones (o donde desees)
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
      <h2>Añadir Carrera</h2>
      <form onSubmit={handleSubmit} className="add-race-form">
        <label>
          Nombre de la Carrera:
          <input
            type="text"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            required
          />
        </label>
        <label>
          Seleccionar Archivo (.json):
          <input type="file" accept=".json" onChange={handleFileChange} required />
        </label>
        <button type="submit">Subir Carrera</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddRace;
