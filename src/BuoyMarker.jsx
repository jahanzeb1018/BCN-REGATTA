// BuoyMarker.jsx
import React from "react";
import { Circle, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const BuoyMarker = ({ lat, lng, name, radius = 50 }) => {
  return (
    <Circle
      center={[lat, lng]}
      radius={radius}
      pathOptions={{
        color: "yellow",
        fillColor: "yellow",
        fillOpacity: 0.4,
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
        <span>Boya {name}</span>
      </Tooltip>
    </Circle>
  );
};

export default BuoyMarker;
