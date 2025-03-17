// Map2D.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useNavigate, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";
import io from "socket.io-client";
import "./Map2D.css";

/* Socket para modo Live */
const socket = io("https://server-production-c33c.up.railway.app/", {
  query: { role: "viewer" },
});

/* Paleta de colores para asignar automáticamente a cada barco */
const colorPalette = ["red", "blue", "yellow", "green", "purple", "cyan", "orange", "lime", "pink"];
const assignedColors = {}; // Diccionario { boatName: color }

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
  // Determinar si estamos en modo Replay o Live
  const queryParams = new URLSearchParams(location.search);
  const raceId = queryParams.get("raceId");

  // Modo Live: barcos y boyas
  const [boats, setBoats] = useState([]);
  const [buoys, setBuoys] = useState([]);

  // Modo Live: chat
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Popup de ayuda (en ambos modos)
  const [showHelp, setShowHelp] = useState(false);

  // Modo Replay: datos de la carrera, tiempo actual, control de reproducción
  const [race, setRace] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Velocidad de reproducción (interval). Por defecto 1 segundo real = 1 segundo de carrera
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  /* 1) Efecto principal para cargar datos (o conectar socket) */
  useEffect(() => {
    if (raceId) {
      // MODO REPLAY: cargar la carrera
      fetch(`https://server-production-c33c.up.railway.app/api/races/${raceId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Datos de la carrera:", data);
          setRace(data);
          setBuoys(data.buoys || []);
          // El tiempo inicial será la hora de inicio de la regata
          if (data.startTmst) {
            setCurrentTime(data.startTmst);
          }
        })
        .catch((err) => console.error(err));
    } else {
      // MODO LIVE: suscribirse a sockets
      socket.on("updateLocation", (data) => {
        const now = Date.now();
        setBoats((prevBoats) => {
          const boatIndex = prevBoats.findIndex((b) => b.id === data.id);
          if (boatIndex !== -1) {
            prevBoats[boatIndex] = {
              ...prevBoats[boatIndex],
              position: [data.latitude, data.longitude],
              azimuth: data.azimuth,
              lastUpdate: now,
            };
          } else {
            prevBoats.push({
              id: data.id,
              name: data.name,
              position: [data.latitude, data.longitude],
              speed: data.speed,
              color: data.color || "blue",
              azimuth: data.azimuth,
              lastUpdate: now,
            });
          }
          return [...prevBoats];
        });
      });

      socket.on("buoys", (buoysData) => {
        setBuoys(buoysData);
      });

      socket.on("disconnect", () => {
        console.warn("Socket desconectado");
      });
    }

    return () => {
      if (!raceId) {
        socket.off("updateLocation");
        socket.off("buoys");
        socket.off("disconnect");
      }
    };
  }, [raceId]);

  /* 2) Modo Live: limpiar barcos inactivos */
  useEffect(() => {
    if (!raceId) {
      const interval = setInterval(() => {
        const now = Date.now();
        setBoats((prevBoats) =>
          prevBoats.filter((boat) => now - boat.lastUpdate <= 10000)
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [raceId]);

  /* 3) Modo Replay: avanzar tiempo automáticamente según playbackSpeed */
  useEffect(() => {
    if (!raceId || !race) return;
    let intervalId;
    if (isPlaying && race.startTmst && race.endTmst) {
      intervalId = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1000; // Avanzamos 1s en la carrera
          if (next > race.endTmst) {
            clearInterval(intervalId);
            return race.endTmst;
          }
          return next;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, raceId, race, playbackSpeed]);

  /* 4) Modo Replay: calcular boatPositions en cada render, según currentTime */
  let replayBoatPositions = [];
  if (raceId && race && race.positions) {
    Object.entries(race.positions).forEach(([boatName, posArray]) => {
      // Buscar la última posición cuyo timestamp <= currentTime
      const relevantPos = [...posArray].reverse().find((p) => p.t <= currentTime);
      if (relevantPos) {
        // Asignar color si no está ya
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

  /* 5) Función para enviar mensajes de chat (modo Live) */
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { text: newMessage, sender: "You" }]);
      setNewMessage("");
    }
  };

  /* 6) Render final: en modo Replay => replayBoatPositions; en modo Live => boats */
  const finalBoatMarkers = raceId ? replayBoatPositions : boats;

  return (
    <div className="map">
      <MapContainer
        center={[41.3851, 2.1734]}
        zoom={13}
        style={{ width: "100%", height: "100vh" }}
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />
        <MapUpdater boats={finalBoatMarkers} />

        {/* Boyas */}
        {buoys.map((buoy) => (
          <BuoyMarker
            key={buoy.id}
            lat={buoy.lat}
            lng={buoy.lng}
            name={buoy.name}
          />
        ))}

        {/* Barcos */}
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

      {/* Botones de control comunes */}
      <button className="control-btn logout-btn" onClick={() => navigate("/")}>
        🚪 Logout
      </button>
      <button className="control-btn help-btn" onClick={() => setShowHelp(true)}>
        ❓ Help
      </button>
      <button className="control-btn threeD-btn" onClick={() => navigate("/scene")}>
        🌐 3D
      </button>

      {/* Modo Live: Chat */}
      {!raceId && (
        <button
          className="control-btn chat-btn"
          onClick={() => setShowChat(!showChat)}
        >
          💬 Chat
        </button>
      )}

      {/* Modo Replay: Controles (slider, botones de velocidad, mostrar hora) */}
      {raceId && race && race.startTmst && race.endTmst && (
        <div className="playback-controls">
          {/* Botones de velocidad / pausa */}
          <button onClick={() => setIsPlaying(false)}>Pause</button>
          <button
            onClick={() => {
              setIsPlaying(true);
              setPlaybackSpeed(1000); // 1x => 1 seg real avanza 1 seg de carrera
            }}
          >
            x1
          </button>
          <button
            onClick={() => {
              setIsPlaying(true);
              setPlaybackSpeed(500); // 2x => 1 seg real avanza 2 seg de carrera
            }}
          >
            x2
          </button>
          <button
            onClick={() => {
              setIsPlaying(true);
              setPlaybackSpeed(200); // 5x => 1 seg real avanza 5 seg de carrera
            }}
          >
            x5
          </button>

          {/* Slider para saltar manualmente */}
          <input
            type="range"
            min={race.startTmst}
            max={race.endTmst}
            step={1000}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
          />

          {/* Hora actual de la regata */}
          <span className="time-display">
            {new Date(currentTime).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Popup de ayuda */}
      {showHelp && (
        <div className="help-popup">
          <div className="help-popup-content">
            <h2>Help Information</h2>
            <p>Welcome to the Smart Navigation platform! Some tips:</p>
            <ul>
              <li>Use the 2D Map to track real-time location or replay old races.</li>
              <li>Switch to 3D View for an immersive experience.</li>
              {!raceId && (
                <li>Use the Chat to communicate with other users in real time.</li>
              )}
              <li>Click on a ship marker to see details.</li>
            </ul>
            <button className="close-help-btn" onClick={() => setShowHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chat emergente (modo Live) */}
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
                className={`chat-message ${
                  msg.sender === "You" ? "sent" : "received"
                }`}
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
