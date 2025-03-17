// BuoyMarker.jsx
import React from "react";
import { CircleMarker, Tooltip } from "react-leaflet";

const BuoyMarker = ({ lat, lng, name, radius = 60 }) => {
  return (
    <CircleMarker
      center={[lat, lng]}
      radius={5}
      pathOptions={{ color: "yellow", fillColor: "yellow" }}
    >
      <Tooltip>{name}</Tooltip>
    </CircleMarker>
  );
};

export default BuoyMarker;
