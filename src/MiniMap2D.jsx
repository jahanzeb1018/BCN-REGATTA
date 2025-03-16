import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import io from "socket.io-client";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker"; // Importamos nuestro componente de boyas
import "./MiniMap2D.css";

// Conectar con el servidor como "viewer"
const socket = io("https://server-production-c33c.up.railway.app/", {
  query: { role: "viewer" },
});

// Componente que ajusta el mapa a la posición de los barcos
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
  const [buoys, setBuoys] = useState([]); // Estado para almacenar las boyas

  // Escuchamos las actualizaciones de barcos
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

    // Escuchamos la lista de boyas
    socket.on("buoys", (buoysData) => {
      console.log("Boyas recibidas en MiniMap:", buoysData);
      setBuoys(buoysData);
    });

    // Cleanup al desmontar
    return () => {
      socket.off("updateLocation");
      socket.off("buoys");
    };
  }, []);

  // Eliminar barcos inactivos >10 segundos
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
    <div className="mini-map-container">
      <div className="mini-map">
        <MapContainer
          center={[41.3851, 2.1734]}
          zoom={13}
          style={{ width: "300px", height: "200px" }}
        >
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution='&copy; Google Maps'
          />

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
              iconSize={[10, 20]} // Tamaño reducido para mini-mapa
            />
          ))}

          {/* Boyas (círculos amarillos) */}
          {buoys.map((buoy) => (
            <BuoyMarker
              key={buoy.id}
              lat={buoy.lat}
              lng={buoy.lng}
              name={buoy.name}
              radius={30} // Radio un poco menor para el mini-mapa
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MiniMap2D;
