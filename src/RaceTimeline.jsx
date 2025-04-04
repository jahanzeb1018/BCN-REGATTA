// RaceTimeline.jsx
import React from "react";
import "./RaceTimeline.css";

const RaceTimeline = ({ buoys, leaderProgress, totalCourse }) => {
  if (!buoys || buoys.length === 0 || !totalCourse) return null;

  // Calcular posición (en %) del líder sobre la línea de tiempo
  const progressPercent = Math.min((leaderProgress / totalCourse) * 100, 100);

  return (
    <div className="timeline-container">
      <div className="timeline-bar">
        <div className="timeline-progress" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
};

export default RaceTimeline;
