// NextBuoyArrow.jsx
import React from "react";
import { Polyline } from "react-leaflet";

const NextBuoyArrow = ({ boatPos, targetBuoy, color = "#fff" }) => {
  if (!boatPos || !targetBuoy) return null;
  // Línea de ayuda: desde la posición del barco hasta la boya objetivo
  const positions = [boatPos, [targetBuoy.lat, targetBuoy.lng]];
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: color,
        weight: 3,
        opacity: 0.8,
        dashArray: "4,4"
      }}
    />
  );
};

export default NextBuoyArrow;
