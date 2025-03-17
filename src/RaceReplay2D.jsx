// RaceReplay2D.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";

const colorPalette = ["red", "blue", "yellow", "green", "purple", "cyan", "orange", "lime", "pink"];
const assignedColors = {}; // Diccionario para evitar repeticiones

const RaceReplay2D = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [race, setRace] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch(`https://server-production-c33c.up.railway.app/api/races/${id}`, {
      headers: { Authorization: localStorage.getItem("token") },
    })
      .then((res) => res.json())
      .then((data) => {
        setRace(data);
        setCurrentTime(data.startTmst);
      })
      .catch((err) => console.error(err));

    return () => setIsPlaying(false);
  }, [id]);

  useEffect(() => {
    let intervalId;
    if (isPlaying && race) {
      intervalId = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1000;
          if (next > race.endTmst) {
            clearInterval(intervalId);
            return race.endTmst;
          }
          return next;
        });
      }, 250);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, race]);

  if (!race) return <div>Loading race data...</div>;

  const boatPositions = [];
  if (race.positions) {
    Object.entries(race.positions).forEach(([boatName, posArray]) => {
      const relevantPos = [...posArray].reverse().find((p) => p.t <= currentTime);
      if (relevantPos) {
        if (!assignedColors[boatName]) {
          assignedColors[boatName] = colorPalette.shift() || "gray";
        }

        boatPositions.push({
          name: boatName,
          lat: relevantPos.a,
          lng: relevantPos.n,
          azimuth: relevantPos.c,
          speed: relevantPos.s,
          color: assignedColors[boatName],
        });
      }
    });
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Replaying: {race.name}</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="range"
          min={race.startTmst}
          max={race.endTmst}
          step={1000}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          style={{ width: "300px" }}
        />
        <p>Current time: {new Date(currentTime).toLocaleTimeString()}</p>
      </div>

      <button onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? "Pause" : "Play"}
      </button>

      <button style={{ marginLeft: "1rem" }} onClick={() => navigate(`/old-records/${id}/3d`)}>
        View in 3D
      </button>

      <MapContainer center={[41.3851, 2.1734]} zoom={13} style={{ width: "100%", height: "80vh" }}>
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />
        {race.buoys.map((buoy) => (
          <BuoyMarker key={buoy.id} lat={buoy.lat} lng={buoy.lng} name={buoy.name} />
        ))}
        {boatPositions.map((boat, i) => (
          <BoatMarker key={i} position={[boat.lat, boat.lng]} name={boat.name} azimuth={boat.azimuth} speed={boat.speed} color={boat.color} />
        ))}
      </MapContainer>
    </div>
  );
};

export default RaceReplay2D;
