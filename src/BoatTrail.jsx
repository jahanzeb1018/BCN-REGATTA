// BoatTrail.jsx
import React from "react";
import { Polyline } from "react-leaflet";

const BoatTrail = ({ trail, color, currentTime }) => {
  // Definir el umbral de 15 minutos en milisegundos
  const fadeThreshold = 10 * 60 * 1000; // 900000 ms

  // Generar segmentos de la estela con opacidad progresiva
  const segments = [];
  for (let i = 0; i < trail.length - 1; i++) {
    // Calculamos el promedio de tiempo entre dos puntos consecutivos
    const avgTime = (trail[i].t + trail[i + 1].t) / 2;
    let age = currentTime - avgTime;
    if (age < 0) age = 0;
    let opacity = 1 - age / fadeThreshold;
    if (opacity < 0) opacity = 0;
    // Solo agregamos el segmento si aún tiene algo de opacidad
    if (opacity > 0) {
      segments.push({
        positions: [trail[i].pos, trail[i + 1].pos],
        opacity,
      });
    }
  }

  return (
    <>
      {segments.map((seg, idx) => (
        <Polyline
          key={idx}
          positions={seg.positions}
          pathOptions={{ color, weight: 2, opacity: seg.opacity }}
        />
      ))}
    </>
  );
};

export default BoatTrail;
