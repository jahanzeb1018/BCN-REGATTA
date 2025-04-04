// Map2D.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker } from "react-leaflet";
import { useNavigate, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";
import BoatTrail from "./BoatTrail";
import Podio from "./Podio";
import NextBuoyArrow from "./NextBuoyArrow"; // Asegúrate de tener este componente
import io from "socket.io-client";
import "./Map2D.css";

const socket = io("https://server-production-c33c.up.railway.app/", {
  query: { role: "viewer" },
});

const colorPalette = ["red", "blue", "yellow", "green", "purple", "cyan", "orange", "lime", "pink"];
const assignedColors = {};

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

// Función para calcular la distancia entre dos puntos (fórmula Haversine)
const computeDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Función que detecta en qué segmento (fase) se encuentra el barco
 * y devuelve un objeto con la fase, la fracción de avance (t de 0 a 1) y el progreso acumulado.
 */
const getBoatSegmentProgress = (boatPos, buoys) => {
  if (!buoys || buoys.length === 0) return null;
  const cumDistances = [0];
  for (let i = 1; i < buoys.length; i++) {
    cumDistances[i] = cumDistances[i - 1] + computeDistance(buoys[i - 1].lat, buoys[i - 1].lng, buoys[i].lat, buoys[i].lng);
  }
  let best = null;
  for (let i = 0; i < buoys.length; i++) {
    const j = (i + 1) % buoys.length;
    const A = { lat: buoys[i].lat, lng: buoys[i].lng };
    const B = { lat: buoys[j].lat, lng: buoys[j].lng };
    const segmentLength = computeDistance(A.lat, A.lng, B.lat, B.lng);
    const ABx = B.lat - A.lat;
    const ABy = B.lng - A.lng;
    const APx = boatPos[0] - A.lat;
    const APy = boatPos[1] - A.lng;
    const ab2 = ABx * ABx + ABy * ABy;
    if (ab2 === 0) continue;
    const dot = ABx * APx + ABy * APy;
    const t = dot / ab2;
    if (t >= 0 && t <= 1) {
      const projLat = A.lat + t * ABx;
      const projLng = A.lng + t * ABy;
      const perpDist = computeDistance(boatPos[0], boatPos[1], projLat, projLng);
      const progress = (i < cumDistances.length ? cumDistances[i] : 0) + t * segmentLength;
      if (best === null || perpDist < best.perp) {
        best = { phase: i, t, perp: perpDist, progress };
      }
    }
  }
  return best;
};

/**
 * Calcula el recorrido total (suma de tramos, incluido el tramo final circular)
 */
const computeTotalCourse = (buoys) => {
  if (!buoys || buoys.length === 0) return 0;
  let total = 0;
  for (let i = 1; i < buoys.length; i++) {
    total += computeDistance(buoys[i - 1].lat, buoys[i - 1].lng, buoys[i].lat, buoys[i].lng);
  }
  total += computeDistance(buoys[buoys.length - 1].lat, buoys[buoys.length - 1].lng, buoys[0].lat, buoys[0].lng);
  return total;
};

const Map2D = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const raceIdParam = queryParams.get("raceId");

  const [activeRaceId, setActiveRaceId] = useState(null);
  const effectiveRaceId = raceIdParam || activeRaceId;

  const [boats, setBoats] = useState([]);
  const [buoys, setBuoys] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [race, setRace] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const speedOptions = [1, 2, 5];
  const [speedIndex, setSpeedIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Cargar la carrera
  useEffect(() => {
    if (effectiveRaceId) {
      fetch(`https://server-production-c33c.up.railway.app/api/races/${effectiveRaceId}`, {
        headers: { Authorization: localStorage.getItem("token") },
      })
        .then((res) => res.json())
        .then((data) => {
          setRace(data);
          setBuoys(data.buoys || []);
          if (data.startTmst) setCurrentTime(data.startTmst);
        })
        .catch(console.error);
    }
  }, [effectiveRaceId]);

  // Buscar competición activa
  useEffect(() => {
    if (!raceIdParam) {
      fetch("https://server-production-c33c.up.railway.app/api/active-competition", {
        headers: { Authorization: localStorage.getItem("token") },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject("No active competition")))
        .then((data) => setActiveRaceId(data._id))
        .catch(console.error);
    }
  }, [raceIdParam]);

  // Actualizar barcos y boyas vía socket
  useEffect(() => {
    const handleUpdateLocation = (data) => {
      if (effectiveRaceId && data.raceId !== effectiveRaceId) return;
      setBoats((prev) => {
        const now = Date.now();
        const newPoint = { pos: [data.latitude, data.longitude], t: now };
        const idx = prev.findIndex((b) => b.id === data.id);
        if (idx !== -1) {
          const updatedBoat = { ...prev[idx] };
          updatedBoat.position = [data.latitude, data.longitude];
          updatedBoat.azimuth = data.azimuth;
          updatedBoat.speed = data.speed;
          updatedBoat.lastUpdate = now;
          let newTrail = updatedBoat.trail ? [...updatedBoat.trail, newPoint] : [newPoint];
          newTrail = newTrail.filter((pt) => now - pt.t <= 10 * 60 * 1000);
          updatedBoat.trail = newTrail;
          prev[idx] = updatedBoat;
        } else {
          if (!assignedColors[data.name]) {
            assignedColors[data.name] = colorPalette.shift() || "gray";
          }
          prev.push({
            id: data.id,
            name: data.name,
            position: [data.latitude, data.longitude],
            speed: data.speed,
            color: assignedColors[data.name],
            azimuth: data.azimuth,
            lastUpdate: now,
            trail: [{ pos: [data.latitude, data.longitude], t: now }],
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
  }, [effectiveRaceId]);

  // Limpiar barcos inactivos
  useEffect(() => {
    const isRealTime = !race || !race.endTmst;
    if (isRealTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        setBoats((prevBoats) => prevBoats.filter((boat) => now - (boat.lastUpdate || 0) <= 10000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [race]);

  // Modo replay
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

  // Extraer posiciones en replay
  let replayBoatPositions = [];
  if (race && race.endTmst && race.positions) {
    Object.entries(race.positions).forEach(([boatName, posArray]) => {
      const trailPoints = posArray
        .filter((p) => p.t <= currentTime)
        .map((p) => ({ pos: [p.a, p.n], t: p.t, c: p.c, s: p.s }));
      if (trailPoints.length > 0) {
        if (!assignedColors[boatName]) {
          assignedColors[boatName] = colorPalette.shift() || "gray";
        }
        const lastPoint = trailPoints[trailPoints.length - 1];
        replayBoatPositions.push({
          id: boatName,
          name: boatName,
          position: lastPoint.pos,
          azimuth: lastPoint.c || 0,
          speed: lastPoint.s || 0,
          color: assignedColors[boatName],
          trail: trailPoints,
        });
      }
    });
  }

  const isRaceFinished = race && race.endTmst;
  const finalBoatMarkers = effectiveRaceId
    ? isRaceFinished
      ? replayBoatPositions
      : boats
    : [];

  // Cálculo del podio usando getBoatSegmentProgress
  const rankedBoats = [...finalBoatMarkers].sort((a, b) => {
    if (buoys.length > 0) {
      const segA = getBoatSegmentProgress(a.position, buoys);
      const segB = getBoatSegmentProgress(b.position, buoys);
      const progressA = segA ? segA.progress : 0;
      const progressB = segB ? segB.progress : 0;
      return progressB - progressA;
    } else {
      return 0;
    }
  });

  // Determinar la boya siguiente a la que debe dirigirse el líder
  let nextBuoyIndex = null;
  if (buoys.length > 0 && rankedBoats.length > 0) {
    const leaderSeg = getBoatSegmentProgress(rankedBoats[0].position, buoys);
    if (leaderSeg) nextBuoyIndex = (leaderSeg.phase + 1) % buoys.length;
  }

  // Calcular el recorrido total (tramos + tramo final circular)
  const totalCourse = computeTotalCourse(buoys);

  // Para el líder, determinar la boya siguiente
  let leaderNextBuoy = null;
  if (buoys.length > 0 && rankedBoats.length > 0) {
    const leaderSeg = getBoatSegmentProgress(rankedBoats[0].position, buoys);
    if (leaderSeg) {
      const nextIndex = (leaderSeg.phase + 1) % buoys.length;
      leaderNextBuoy = buoys[nextIndex];
    }
  }

  const buoyLinePositions = buoys.map((b) => [b.lat, b.lng]);
  if (buoys.length > 1) buoyLinePositions.push([buoys[0].lat, buoys[0].lng]);

  // --- INNOVATIVO: LeaderHalo ---
  // Agregar un halo alrededor del barco líder para resaltar su ventaja.
  let leaderHalo = null;
  if (rankedBoats.length > 0) {
    const leader = rankedBoats[0];
    let leadMargin = 0;
    if (rankedBoats.length > 1) {
      const segLeader = getBoatSegmentProgress(leader.position, buoys);
      const segSecond = getBoatSegmentProgress(rankedBoats[1].position, buoys);
      const progressLeader = segLeader ? segLeader.progress : 0;
      const progressSecond = segSecond ? segSecond.progress : 0;
      leadMargin = progressLeader - progressSecond;
    }
    // Mapear el margen a un incremento en radio (ajusta la constante según necesites)
    const extraRadius = Math.min(Math.max(leadMargin / 50, 5), 20);
    leaderHalo = (
      <CircleMarker
        center={leader.position}
        radius={15 + extraRadius}
        pathOptions={{ color: "gold", fillColor: "gold", fillOpacity: 0.3, weight: 0 }}
      />
    );
  }
  // --- FIN LeaderHalo ---

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { text: newMessage, sender: "You" }]);
      setNewMessage("");
    }
  };

  const handleCycleSpeed = () => {
    const newIndex = (speedIndex + 1) % speedOptions.length;
    setSpeedIndex(newIndex);
    const val = speedOptions[newIndex];
    if (val === 1) setPlaybackSpeed(1000);
    if (val === 2) setPlaybackSpeed(500);
    if (val === 5) setPlaybackSpeed(200);
  };

  const handle3DRedirect = () => {
    if (effectiveRaceId) navigate(`/scene?raceId=${effectiveRaceId}`);
  };

  const handleExit = () => {
    navigate("/menu");
  };

  return (
    <div className="map-container" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", margin: 0, padding: 0 }}>
      <MapContainer center={[41.3851, 2.1734]} zoom={13} style={{ width: "100%", height: "100%" }}>
        <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
        <MapUpdater boats={finalBoatMarkers} />
        {buoys.map((buoy, index) => (
          <BuoyMarker key={buoy.id} lat={buoy.lat} lng={buoy.lng} name={buoy.name} highlight={index === nextBuoyIndex} />
        ))}
        {buoys.length > 1 && (
          <Polyline positions={buoyLinePositions} pathOptions={{ color: "#007bff", weight: 2, dashArray: "5,5" }} />
        )}
        {finalBoatMarkers.map((boat, i) => {
          const seg = getBoatSegmentProgress(boat.position, buoys);
          return (
            <React.Fragment key={i}>
              <BoatMarker
                position={boat.position}
                name={boat.name}
                speed={boat.speed}
                color={boat.color}
                azimuth={boat.azimuth}
                segmentProgress={seg ? seg.t : 0}
              />
              {boat.trail && boat.trail.length > 1 && (
                <BoatTrail trail={boat.trail} color={boat.color} currentTime={race && race.endTmst ? currentTime : Date.now()} />
              )}
            </React.Fragment>
          );
        })}
        {/* Flecha indicadora del líder hacia la siguiente boya */}
        {rankedBoats.length > 0 && leaderNextBuoy && (
          <NextBuoyArrow boatPos={rankedBoats[0].position} targetBuoy={leaderNextBuoy} color="#ffeb3b" />
        )}
        {/* Halo alrededor del líder */}
        {leaderHalo}
      </MapContainer>

      {/* Podio */}
      <Podio boats={rankedBoats} />

      {/* Botón "volver atrás" */}
      <button
        onClick={handleExit}
        title="Back to Old Recordings"
        style={{
          position: "absolute",
          top: "80px",
          left: "7px",
          zIndex: 9999,
          width: "30px",
          height: "35px",
          border: "none",
          borderRadius: "8px",
          background: "#f44336",
          color: "#fff",
          fontSize: "1.4rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          transition: "background-color 0.2s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#d32f2f"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f44336"; }}
      >
        ↩
      </button>

      {/* Controles de replay y live */}
      {race && race.endTmst ? (
        <div style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 20px",
            borderRadius: "15px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}>
          <button
            style={{
              fontSize: "1.4rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#333",
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#007bff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            style={{
              fontSize: "0.95rem",
              background: "none",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              color: "#333",
              transition: "background-color 0.3s ease, color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#007bff";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#333";
            }}
            onClick={handleCycleSpeed}
          >
            x{speedOptions[speedIndex]}
          </button>
          <input
            type="range"
            min={race.startTmst}
            max={race.endTmst}
            step={1000}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            style={{ width: "140px", cursor: "pointer" }}
          />
          <span style={{ fontWeight: "bold", minWidth: "70px", textAlign: "center", color: "#333" }}>
            {new Date(currentTime).toLocaleTimeString()}
          </span>
          <button
            style={{
              fontSize: "0.95rem",
              background: "linear-gradient(135deg, #42a5f5, #1e88e5)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              padding: "6px 12px",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
              transition: "opacity 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            onClick={handle3DRedirect}
            title="Go to 3D View"
          >
            3D
          </button>
        </div>
      ) : (
        <div style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 20px",
            borderRadius: "15px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}>
          <button
            style={{
              fontSize: "0.95rem",
              background: "linear-gradient(135deg, #42a5f5, #1e88e5)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              padding: "6px 12px",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
              transition: "opacity 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            onClick={handle3DRedirect}
            title="Go to 3D View"
          >
            3D
          </button>
          <button
            style={{
              fontSize: "0.95rem",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "10px",
              padding: "8px 12px",
              cursor: "pointer",
              color: "#333",
              transition: "background-color 0.3s ease, color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#007bff";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
              e.currentTarget.style.color = "#333";
            }}
            onClick={() => setShowChat(!showChat)}
            title="Chat"
          >
            💬 Chat
          </button>
        </div>
      )}

      {!effectiveRaceId && (
        <>
          <button
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              zIndex: 9999,
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(6px)",
              padding: "8px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              border: "none",
              fontSize: "0.95rem",
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              transition: "background-color 0.3s ease, color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#007bff";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.color = "#333";
            }}
            onClick={() => setShowChat(!showChat)}
          >
            <span>💬</span>
            <span>Chat</span>
          </button>
          <button
            style={{
              position: "absolute",
              top: "20px",
              right: "100px",
              zIndex: 9999,
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(6px)",
              padding: "8px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              border: "none",
              fontSize: "0.95rem",
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              transition: "background-color 0.3s ease, color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e53935";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.color = "#333";
            }}
            onClick={() => navigate("/")}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </>
      )}
    </div>
  );
};

export default Map2D;
