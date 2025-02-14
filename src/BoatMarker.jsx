import React, { useEffect, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

// 📌 Función para crear un ícono de barco con orientación y color
const createBoatIcon = (color, azimuth) => {
  return L.divIcon({
    className: "custom-boat-icon",
    html: `
      <div style="position: relative; width: 20px; height: 40px; transform: rotate(${azimuth}deg); transform-origin: center center;">
        <div style="width: 20px; height: 30px; background-color: ${color}; border-radius: 5px;"></div>
        <div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid ${color}; position: absolute; top: -7px; left: 0;"></div>
      </div>
    `,
    iconSize: [20, 40],
    iconAnchor: [10, 20],
  });
};

const BoatMarker = ({ position, name, speed, color, azimuth }) => {
  return (
    <Marker position={position} icon={createBoatIcon(color, azimuth)}>
      <Tooltip direction="top" offset={[0, -20]} opacity={1}>
        <span>{name} - {speed} kn</span>
      </Tooltip>
    </Marker>
  );
};

export default BoatMarker;
