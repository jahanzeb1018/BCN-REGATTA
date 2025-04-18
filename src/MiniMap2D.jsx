// MiniMap2D.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";
import BoatTrail from "./BoatTrail";
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

  const availableColors = useMemo(
    () => ["red", "blue", "green", "purple", "orange", "yellow", "cyan", "magenta", "lime"],
    []
  );

  const assignedColorsRef = useRef({});

  useEffect(() => {
    if (replayData && currentTime) {
      const boatsFromReplay = [];
      Object.entries(replayData.positions || {}).forEach(([boatName, posArray]) => {
        const trailPoints = posArray
          .filter((p) => p.t <= currentTime)
          .map((p) => ({ pos: [p.a, p.n], t: p.t, c: p.c, s: p.s }));
        if (trailPoints.length > 0) {
          if (!assignedColorsRef.current[boatName]) {
            const usedColors = Object.values(assignedColorsRef.current);
            const availableColor =
              availableColors.find((c) => !usedColors.includes(c)) || "gray";
            assignedColorsRef.current[boatName] = availableColor;
          }
          const lastPoint = trailPoints[trailPoints.length - 1];
          boatsFromReplay.push({
            id: boatName,
            name: boatName,
            position: lastPoint.pos,
            speed: lastPoint.s || 0,
            color: assignedColorsRef.current[boatName],
            azimuth: lastPoint.c || 0,
            trail: trailPoints,
          });
        }
      });
      setBoats(boatsFromReplay);
      setBuoys(replayData.buoys || []);
    }
  }, [replayData, currentTime, availableColors]);

  useEffect(() => {
    if (!replayData) {
      const socket = io("https://server-production-c33c.up.railway.app/", {
        query: { role: "viewer" },
      });
      socket.on("updateLocation", (data) => {
        setBoats((prevBoats) => {
          const now = Date.now();
          const newPoint = { pos: [data.latitude, data.longitude], t: now };
          const boatIndex = prevBoats.findIndex((boat) => boat.id === data.id);
          if (boatIndex !== -1) {
            const updatedBoat = { ...prevBoats[boatIndex] };
            updatedBoat.position = [data.latitude, data.longitude];
            updatedBoat.azimuth = data.azimuth;
            updatedBoat.lastUpdate = now;
            let newTrail = updatedBoat.trail ? [...updatedBoat.trail, newPoint] : [newPoint];
            newTrail = newTrail.filter((pt) => now - pt.t <= 15 * 60 * 1000);
            updatedBoat.trail = newTrail;
            prevBoats[boatIndex] = updatedBoat;
          } else {
            prevBoats.push({
              id: data.id,
              name: data.name,
              position: [data.latitude, data.longitude],
              speed: data.speed,
              color: data.color,
              azimuth: data.azimuth,
              lastUpdate: now,
              trail: [{ pos: [data.latitude, data.longitude], t: now }],
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
            <React.Fragment key={boat.id}>
              <BoatMarker
                position={boat.position}
                name={boat.name}
                speed={boat.speed}
                color={boat.color}
                azimuth={boat.azimuth}
                iconSize={[10, 20]}
              />
              {boat.trail && boat.trail.length > 1 && (
                <BoatTrail
                  trail={boat.trail}
                  color={boat.color}
                  currentTime={replayData ? currentTime : Date.now()}
                />
              )}
            </React.Fragment>
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
