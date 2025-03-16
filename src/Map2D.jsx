// Map2D.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";
import io from "socket.io-client";
import "./Map2D.css";

// Conectar con el servidor como "viewer"
const socket = io("https://server-production-c33c.up.railway.app/", {
  query: { role: "viewer" },
});

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

  const [boats, setBoats] = useState([]);
  const [buoys, setBuoys] = useState([]); // Boyas dinámicas
  const [showHelp, setShowHelp] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Escuchar las actualizaciones de posición de barcos
  useEffect(() => {
    socket.on("updateLocation", (data) => {
      console.log("📡 Datos de ubicación recibidos:", data);
      setBoats((prevBoats) => {
        const now = Date.now();
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
            color: data.color,
            azimuth: data.azimuth,
            lastUpdate: now,
          });
        }
        return [...prevBoats];
      });
    });

    // Escuchar el evento "buoys" para recibir la lista de boyas
    socket.on("buoys", (buoysData) => {
      console.log("Boyas recibidas:", buoysData);
      setBuoys(buoysData);
    });

    // Escuchar desconexión del socket (opcional)
    socket.on("disconnect", () => {
      console.warn("Socket desconectado");
    });

    // Limpiar efectos al desmontar
    return () => {
      socket.off("updateLocation");
      socket.off("buoys");
      socket.off("disconnect");
    };
  }, []);

  // Eliminar barcos que no se actualizan en los últimos 10s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBoats((prevBoats) =>
        prevBoats.filter((boat) => now - boat.lastUpdate <= 10000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Chat local (no está implementado en el servidor, pero sigue tu ejemplo)
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { text: newMessage, sender: "You" }]);
      setNewMessage("");
    }
  };

  return (
    <div className="map">
      <MapContainer
        center={[41.3851, 2.1734]}
        zoom={13}
        style={{ width: "100%", height: "100vh" }}
      >
        {/* TileLayer para vista satelital */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />

        {/* Ajustar vista al conjunto de barcos */}
        <MapUpdater boats={boats} />

        {/* Marcadores de barcos */}
        {boats.map((boat) => (
          <BoatMarker
            key={boat.id}
            position={boat.position}
            name={boat.name}
            speed={boat.speed}
            color={boat.color}
            azimuth={boat.azimuth}
          />
        ))}

        {/* Boyas (círculos amarillos) recibidas desde el servidor */}
        {buoys.map((buoy) => (
          <BuoyMarker
            key={buoy.id}
            lat={buoy.lat}
            lng={buoy.lng}
            name={buoy.name}
            // radius={60} // Ajusta si quieres otro tamaño
          />
        ))}
      </MapContainer>

      {/* Botones de control */}
      <button className="control-btn logout-btn" onClick={() => navigate("/")}>
        <span className="icon">🚪</span>
        <span className="text">Logout</span>
      </button>
      <button className="control-btn help-btn" onClick={() => setShowHelp(true)}>
        <span className="icon">❓</span>
        <span className="text">Help</span>
      </button>
      <button
        className="control-btn chat-btn"
        onClick={() => setShowChat(!showChat)}
      >
        <span className="icon">💬</span>
        <span className="text">Chat</span>
      </button>
      <button className="control-btn threeD-btn" onClick={() => navigate("/scene")}>
        <span className="icon">🌐</span>
        <span className="text">3D</span>
      </button>

      {/* Popup de Ayuda */}
      {showHelp && (
        <div className="help-popup">
          <div className="help-popup-content">
            <h2>Help Information</h2>
            <p>
              Welcome to the Smart Navigation platform! Here are some tips to help you get started:
            </p>
            <ul>
              <li>Use the <strong>2D Map</strong> to track the real-time location of ships.</li>
              <li>Switch to the <strong>3D View</strong> for an immersive experience.</li>
              <li>Use the <strong>Chat</strong> to communicate with other users in real time.</li>
              <li>Click on a ship marker to see detailed information.</li>
            </ul>
            <button
              className="close-help-btn"
              onClick={() => setShowHelp(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chat emergente */}
      {showChat && (
        <div className="chat-popup">
          <div className="chat-header">
            <h3>💬 Chat</h3>
            <button
              className="close-chat-btn"
              onClick={() => setShowChat(false)}
            >
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
