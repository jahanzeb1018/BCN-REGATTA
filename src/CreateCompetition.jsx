import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateCompetition.css";

const CreateCompetition = () => {
  const [name, setName] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [error, setError] = useState("");
  const [buoys, setBuoys] = useState([]); // Cada boya: { name, lat, lng }
  const [buoyMessage, setBuoyMessage] = useState("");
  const navigate = useNavigate();

  const handleCreateCompetition = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("https://server-production-c33c.up.railway.app/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, buoys: [] }),
      });
      const data = await response.json();
      if (response.ok) {
        setCompetitionId(data.race._id);
      } else {
        setError(data.error || "Error al crear la competición");
      }
    } catch (err) {
      setError("Ocurrió un error. Por favor, inténtalo de nuevo.");
    }
  };

  // Copiar ID al portapapeles
  const handleCopyId = () => {
    navigator.clipboard.writeText(competitionId);
  };

  // Redirigir a Map2D
  const handleGoToJoin = () => {
    navigate(`/map?raceId=${competitionId}`);
  };

  // Volver al menú
  const handleBack = () => {
    navigate("/menu");
  };

  // Agregar una nueva boya
  const handleAddBuoy = () => {
    setBuoys([...buoys, { name: "", lat: "", lng: "" }]);
  };

  // Eliminar una boya
  const handleRemoveBuoy = (index) => {
    const newBuoys = [...buoys];
    newBuoys.splice(index, 1);
    setBuoys(newBuoys);
  };

  // Actualizar un campo de boya
  const handleBuoyChange = (index, field, value) => {
    const newBuoys = [...buoys];
    newBuoys[index][field] = value;
    setBuoys(newBuoys);
  };

  // Guardar boyas
  const handleSaveBuoys = async () => {
    const invalidBuoys = buoys.filter(b => b.lat === "" || b.lng === "");
    if (invalidBuoys.length > 0) {
      setBuoyMessage("Por favor, complete latitud y longitud en todas las boyas.");
      return;
    }
    try {
      const res = await fetch(`https://server-production-c33c.up.railway.app/api/competitions/${competitionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify({ buoys }),
      });
      const data = await res.json();
      if (res.ok) {
        setBuoyMessage("Boyas actualizadas correctamente.");
      } else {
        setBuoyMessage(data.error || "Error al actualizar las boyas.");
      }
    } catch (err) {
      setBuoyMessage("Ocurrió un error al actualizar las boyas.");
    }
  };

  return (
    <div className="create-competition-page">
      {/* Banner superior */}
      <header className="cc-banner">
        <div className="cc-banner-content">
          <button onClick={handleBack} className="cc-back-btn">↩</button>
          <h1>Crear Competición</h1>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="cc-container">
        {/* Card para crear la competición */}
        <div className="cc-card">
          <h2 className="cc-title">1. Datos de la Competición</h2>
          <p className="cc-subtitle">Ingresa el nombre y crea la competición</p>
          <form onSubmit={handleCreateCompetition} className="cc-form">
            <input
              type="text"
              placeholder="Nombre de la Competición"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button type="submit" className="cc-btn-primary">Crear Competición</button>
          </form>
          {error && <p className="cc-error">{error}</p>}
        </div>

        {/* Card de resultados, visible solo si hay competitionId */}
        {competitionId && (
          <div className="cc-card cc-card-result">
            <h2 className="cc-title">2. Competición Creada</h2>
            <p className="cc-success">¡Competición creada exitosamente!</p>
            <div className="cc-id-container">
              <label>ID:</label>
              <input
                type="text"
                value={competitionId}
                readOnly
                onClick={handleCopyId}
                title="Haz click para copiar"
              />
              <button onClick={handleCopyId} className="cc-btn-secondary" title="Copiar ID">
                Copiar
              </button>
            </div>
            <button onClick={handleGoToJoin} className="cc-btn-primary">
              Unirse a la Competición
            </button>
          </div>
        )}

        {/* Card para configurar boyas, visible solo si hay competitionId */}
        {competitionId && (
          <div className="cc-card cc-card-buoys">
            <h2 className="cc-title">3. Configurar Boyas</h2>
            <p className="cc-subtitle">Agrega boyas con las coordenadas deseadas</p>

            {buoys.map((buoy, index) => (
              <div key={`buoy-${index}`} className="cc-buoy-row">
                <input
                  type="text"
                  placeholder="Nombre (opcional)"
                  value={buoy.name}
                  onChange={(e) => handleBuoyChange(index, "name", e.target.value)}
                />
                <div className="cc-coord-group">
                  <input
                    type="number"
                    placeholder="Latitud"
                    value={buoy.lat}
                    onChange={(e) => handleBuoyChange(index, "lat", e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Longitud"
                    value={buoy.lng}
                    onChange={(e) => handleBuoyChange(index, "lng", e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBuoy(index)}
                  className="cc-btn-danger"
                >
                  Quitar
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddBuoy}
              className="cc-btn-secondary"
              style={{ marginBottom: "1rem" }}
            >
              Agregar Boya
            </button>

            {buoyMessage && <p className="cc-error">{buoyMessage}</p>}

            {buoys.length > 0 && (
              <button
                type="button"
                onClick={handleSaveBuoys}
                className="cc-btn-primary"
              >
                Guardar Configuración de Boyas
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CreateCompetition;
