// BoatMarker.jsx
import React from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

// Crea un ícono en div con rotación e color
const createBoatIcon = (color, azimuth, iconSize) => {
  return L.divIcon({
    className: "custom-boat-icon",
    html: `
      <div
        style="
          position: relative;
          width: ${iconSize[0]}px;
          height: ${iconSize[1]}px;
          transform: rotate(${azimuth}deg);
          transform-origin: center center;
        "
      >
        <div
          style="
            width: ${iconSize[0]}px;
            height: ${iconSize[1] * 0.75}px;
            background-color: ${color};
            border-radius: 5px;
          "
        ></div>
        <div
          style="
            width: 0;
            height: 0;
            border-left: ${iconSize[0] / 2}px solid transparent;
            border-right: ${iconSize[0] / 2}px solid transparent;
            border-bottom: ${iconSize[1] * 0.25}px solid ${color};
            position: absolute;
            top: -${iconSize[1] * 0.175}px;
            left: 0;
          "
        ></div>
      </div>
    `,
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
  });
};

const BoatMarker = ({ position, name, speed, color = "blue", azimuth = 0, iconSize = [20, 40] }) => {
  const icon = createBoatIcon(color, azimuth, iconSize);

  return (
    <Marker position={position} icon={icon}>
      <Tooltip direction="top" offset={[0, -20]} opacity={1}>
        <span>{name} — {speed} kn</span>
      </Tooltip>
    </Marker>
  );
};

export default BoatMarker;
