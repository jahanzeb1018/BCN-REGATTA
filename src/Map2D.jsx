// Map2D.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useNavigate, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";
import io from "socket.io-client";
import "./Map2D.css";

const socket = io("https://server-production-c33c.up.railway.app/", {
  query: { role: "viewer" },
});

// Paleta de colores para asignar a los barcos
const colorPalette = ["red", "blue", "yellow", "green", "purple", "cyan", "orange", "lime", "pink"];
// Objeto para recordar el color asignado a cada barco
const assignedColors = {};

// Componente que ajusta la vista del mapa para encuadrar los barcos
const MapUpdater = ({ boats }) => {
  const map = useMap();
  useEffect(() => {
    if (boats.length > 0) {
      const bounds = boats.map((boat) => boat.position);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [boats, map]);
  return null;
};

const Map2D = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const raceId = queryParams.get("raceId");

  const [boats, setBoats] = useState([]);
  const [buoys, setBuoys] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Datos de la carrera (si se suministra raceId)
  const [race, setRace] = useState(null);

  // Variables para el modo replay (si la carrera finalizó)
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // 1. Si existe raceId, obtenemos los datos de la carrera (buoys, positions, etc.)
  useEffect(() => {
    if (raceId) {
      fetch(`https://server-production-c33c.up.railway.app/api/races/${raceId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setRace(data);
          setBuoys(data.buoys || []);
          if (data.startTmst) {
            setCurrentTime(data.startTmst);
          }
        })
        .catch(console.error);
    }
  }, [raceId]);

  // 2. Suscribirse a los eventos del socket para actualización de ubicación y boyas.
  useEffect(() => {
    const handleUpdateLocation = (data) => {
      console.log("Update location received:", data); // Depuración
      if (raceId && data.raceId !== raceId) return; // Filtra por raceId

      setBoats((prev) => {
        const idx = prev.findIndex((b) => b.id === data.id);
        if (idx !== -1) {
          // Actualizar barco existente
          prev[idx] = {
            ...prev[idx],
            position: [data.latitude, data.longitude],
            azimuth: data.azimuth,
            speed: data.speed,
            lastUpdate: Date.now(),
          };
        } else {
          // Asignar color si no existe
          if (!assignedColors[data.name]) {
            assignedColors[data.name] = colorPalette.shift() || "gray";
          }
          // Agregar nuevo barco
          prev.push({
            id: data.id,
            name: data.name,
            position: [data.latitude, data.longitude],
            speed: data.speed,
            color: assignedColors[data.name],
            azimuth: data.azimuth,
            lastUpdate: Date.now(),
          });
        }
        return [...prev];
      });
    };

    const handleBuoys = (data) => {
      setBuoys(data);
    };

    socket.on("updateLocation", handleUpdateLocation);
    socket.on("buoys", handleBuoys);

    return () => {
      socket.off("updateLocation", handleUpdateLocation);
      socket.off("buoys", handleBuoys);
    };
  }, [raceId]);

  // 3. Si la carrera está en curso (no finalizada) o no hay raceId, limpiar barcos inactivos.
  useEffect(() => {
    const isRealTime = !race || !race.endTmst;
    if (isRealTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        setBoats((prevBoats) =>
          prevBoats.filter((boat) => now - (boat.lastUpdate || 0) <= 10000)
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [race]);

  // 4. Modo replay: si la carrera finalizó, reproducir posiciones según currentTime.
  useEffect(() => {
    if (!race || !race.endTmst) return;
    let intervalId;
    if (isPlaying && race.startTmst && race.endTmst) {
      intervalId = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1000;
          if (next > race.endTmst) {
            clearInterval(intervalId);
            return race.endTmst;
          }
          return next;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, race, playbackSpeed]);

  // 5. Calcular las posiciones de replay a partir de race.positions.
  let replayBoatPositions = [];
  if (race && race.endTmst && race.positions) {
    Object.entries(race.positions).forEach(([boatName, posArray]) => {
      const relevantPos = [...posArray].reverse().find((p) => p.t <= currentTime);
      if (relevantPos) {
        if (!assignedColors[boatName]) {
          assignedColors[boatName] = colorPalette.shift() || "gray";
        }
        replayBoatPositions.push({
          id: boatName,
          name: boatName,
          position: [relevantPos.a, relevantPos.n],
          azimuth: relevantPos.c || 0,
          speed: relevantPos.s || 0,
          color: assignedColors[boatName],
        });
      }
    });
  }

  // 6. Mostrar marcadores solo si se suministra un raceId:
  // Si no se proporcionó raceId, se muestra un mapa vacío.
  const isRaceFinished = race && race.endTmst;
  const finalBoatMarkers = raceId ? (isRaceFinished ? replayBoatPositions : boats) : [];

  // --- Chat simple (solo visible si no hay raceId) ---
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { text: newMessage, sender: "You" }]);
      setNewMessage("");
    }
  };

  return (
    <div className="map">
      <MapContainer center={[41.3851, 2.1734]} zoom={13} style={{ width: "100%", height: "100vh" }}>
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />
        <MapUpdater boats={finalBoatMarkers} />

        {buoys.map((buoy) => (
          <BuoyMarker key={buoy.id} lat={buoy.lat} lng={buoy.lng} name={buoy.name} />
        ))}

        {finalBoatMarkers.map((boat, i) => (
          <BoatMarker
            key={i}
            position={boat.position}
            name={boat.name}
            speed={boat.speed}
            color={boat.color}
            azimuth={boat.azimuth}
          />
        ))}
      </MapContainer>

      <button className="control-btn logout-btn" onClick={() => navigate("/")}>
        🚪 Logout
      </button>
      <button className="control-btn help-btn" onClick={() => setShowHelp(true)}>
        ❓ Help
      </button>
      <button className="control-btn threeD-btn" onClick={() => navigate("/scene")}>
        🌐 3D
      </button>

      {!raceId && (
        <button className="control-btn chat-btn" onClick={() => setShowChat(!showChat)}>
          💬 Chat
        </button>
      )}

      {raceId && isRaceFinished && race.startTmst && race.endTmst && (
        <div className="playback-controls">
          <button onClick={() => setIsPlaying(false)}>Pause</button>
          <button
            onClick={() => {
              setIsPlaying(true);
              setPlaybackSpeed(1000);
            }}
          >
            x1
          </button>
          <button
            onClick={() => {
              setIsPlaying(true);
              setPlaybackSpeed(500);
            }}
          >
            x2
          </button>
          <button
            onClick={() => {
              setIsPlaying(true);
              setPlaybackSpeed(200);
            }}
          >
            x5
          </button>

          <input
            type="range"
            min={race.startTmst}
            max={race.endTmst}
            step={1000}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
          />

          <span className="time-display">
            {new Date(currentTime).toLocaleTimeString()}
          </span>
        </div>
      )}

      {showHelp && (
        <div className="help-popup">
          <div className="help-popup-content">
            <h2>Help Information</h2>
            <p>Welcome to the Smart Navigation platform! Some tips:</p>
            <ul>
              <li>Use the 2D Map to track real-time location or replay old races.</li>
              <li>Switch to 3D View for an immersive experience.</li>
              {!raceId && <li>Use the Chat to communicate with other users in real time.</li>}
              <li>Click on a ship marker to see details.</li>
            </ul>
            <button className="close-help-btn" onClick={() => setShowHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {!raceId && showChat && (
        <div className="chat-popup">
          <div className="chat-header">
            <h3>💬 Chat</h3>
            <button className="close-chat-btn" onClick={() => setShowChat(false)}>
              ×
            </button>
          </div>
          <div className="chat-box">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.sender === "You" ? "sent" : "received"}`}
              >
                <strong>{msg.sender}: </strong>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map2D;
