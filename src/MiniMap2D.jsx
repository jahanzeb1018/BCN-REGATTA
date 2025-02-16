import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import BoatMarker from "./BoatMarker";
import io from "socket.io-client";
import "./MiniMap2D.css";

const socket = io("https://server-production-c33c.up.railway.app/");

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

const MiniMap2D = () => {
  const [boats, setBoats] = useState([]);

  useEffect(() => {
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

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBoats((prevBoats) =>
        prevBoats.filter((boat) => now - boat.lastUpdate <= 10000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mini-map">
      <MapContainer center={[41.3851, 2.1734]} zoom={13} style={{ width: "300px", height: "200px" }}>
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution='&copy; Google Maps'
        />
        <MapUpdater boats={boats} />
        {boats.map((boat, index) => (
          <BoatMarker
            key={index}
            position={boat.position}
            name={boat.name}
            speed={boat.speed}
            color={boat.color}
            azimuth={boat.azimuth}
            iconSize={[10, 20]} // Tamaño más pequeño para el mini mapa
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default MiniMap2D;