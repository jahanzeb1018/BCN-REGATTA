// BoatMarker.jsx
import React from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "./BoatMarker.css";

const createBoatIcon = (color, azimuth, iconSize, segmentProgress = 0) => {
  const radius = (iconSize[0] / 2) - 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - segmentProgress);
  return L.divIcon({
    className: "custom-boat-icon",
    html: `
      <div class="boat-icon-container" style="width: ${iconSize[0]}px; height: ${iconSize[1]}px; transform: rotate(${azimuth}deg);">
        <div class="boat-body" style="width: ${iconSize[0]}px; height: ${iconSize[1] * 0.75}px; background-color: ${color}; border-radius: 5px;"></div>
        <div class="boat-triangle" style="border-left: ${iconSize[0] / 2}px solid transparent; border-right: ${iconSize[0] / 2}px solid transparent; border-bottom: ${iconSize[1] * 0.25}px solid ${color}; position: absolute; top: -${iconSize[1] * 0.175}px; left: 0;"></div>
        <svg class="progress-ring" width="${iconSize[0]}" height="${iconSize[1]}" viewBox="0 0 ${iconSize[0]} ${iconSize[1]}">
          <circle class="progress-ring-circle" stroke="#fff" stroke-width="2" fill="transparent" r="${radius}" cx="${iconSize[0] / 2}" cy="${iconSize[1] / 2}"
          style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${dashoffset};" />
        </svg>
      </div>
    `,
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
  });
};

const BoatMarker = ({ position, name, speed, color = "blue", azimuth = 0, iconSize = [20, 40], segmentProgress = 0 }) => {
  const icon = createBoatIcon(color, azimuth, iconSize, segmentProgress);
  return (
    <Marker position={position} icon={icon}>
      <Tooltip direction="top" offset={[0, -20]} opacity={1}>
        <span>{name} — {speed} kn</span>
      </Tooltip>
    </Marker>
  );
};

export default BoatMarker;
