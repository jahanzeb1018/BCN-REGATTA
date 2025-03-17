import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";
import "./MiniMap2D.css";
import { io } from "socket.io-client";

const MapUpdater = ({ boats }) => {
  const map = useMap();

  useEffect(() => {
    if (boats.length > 0) {
      const bounds = boats.map((boat) => boat.position);
      map.fitBounds(bounds, { padding: [10, 10] });
    }
  }, [boats, map]);

  return null;
};

const MiniMap2D = ({ replayData, currentTime }) => {
  const [boats, setBoats] = useState([]);
  const [buoys, setBuoys] = useState([]);

  // Memoriza la paleta de colores para que no se recree en cada render
  const availableColors = useMemo(
    () => ["red", "blue", "green", "purple", "orange", "yellow", "cyan", "magenta", "lime"],
    []
  );

  // Ref para almacenar los colores asignados a cada barco de forma persistente
  const assignedColorsRef = useRef({});

  // Si se reciben datos de replay, calcular posiciones a partir de replayData.positions
  useEffect(() => {
    if (replayData && currentTime) {
      const boatsFromReplay = [];
      Object.entries(replayData.positions || {}).forEach(([boatName, posArray]) => {
        // Buscar la última posición cuyo timestamp sea menor o igual al currentTime
        const relevantPos = [...posArray].reverse().find((p) => p.t <= currentTime);
        if (relevantPos) {
          // Si aún no se le ha asignado un color a este barco, se asigna uno disponible
          if (!assignedColorsRef.current[boatName]) {
            const usedColors = Object.values(assignedColorsRef.current);
            const availableColor = availableColors.find((c) => !usedColors.includes(c)) || "gray";
            assignedColorsRef.current[boatName] = availableColor;
          }
          boatsFromReplay.push({
            id: boatName,
            name: boatName,
            position: [relevantPos.a, relevantPos.n],
            speed: relevantPos.s || 0,
            color: assignedColorsRef.current[boatName],
            azimuth: relevantPos.c || 0,
          });
        }
      });
      setBoats(boatsFromReplay);
      setBuoys(replayData.buoys || []);
    }
  }, [replayData, currentTime, availableColors]);

  // Si no se reciben datos de replay, funciona en modo live con socket
  useEffect(() => {
    if (!replayData) {
      const socket = io("https://server-production-c33c.up.railway.app/", {
        query: { role: "viewer" },
      });
      socket.on("updateLocation", (data) => {
        setBoats((prevBoats) => {
          const now = Date.now();
          const boatIndex = prevBoats.findIndex((boat) => boat.id === data.id);
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
      socket.on("buoys", (buoysData) => {
        setBuoys(buoysData);
      });
      return () => {
        socket.disconnect();
      };
    }
  }, [replayData]);

  // Solo en modo live, se eliminan barcos inactivos
  useEffect(() => {
    if (!replayData) {
      const interval = setInterval(() => {
        const now = Date.now();
        setBoats((prevBoats) =>
          prevBoats.filter((boat) => now - boat.lastUpdate <= 10000)
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [replayData]);

  return (
    <div className="mini-map-container">
      <div className="mini-map">
        <MapContainer
          center={[41.3851, 2.1734]}
          zoom={13}
          style={{ width: "300px", height: "200px" }}
        >
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps"
          />
          <MapUpdater boats={boats} />
          {boats.map((boat) => (
            <BoatMarker
              key={boat.id}
              position={boat.position}
              name={boat.name}
              speed={boat.speed}
              color={boat.color}
              azimuth={boat.azimuth}
              iconSize={[10, 20]}
            />
          ))}
          {buoys.map((buoy) => (
            <BuoyMarker
              key={buoy.id}
              lat={buoy.lat}
              lng={buoy.lng}
              name={buoy.name}
              radius={30}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MiniMap2D;
