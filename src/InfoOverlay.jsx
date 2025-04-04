// InfoOverlay.jsx
import React, { useState, useEffect } from "react";
import "./InfoOverlay.css";

const infoMessages = [
  "Bienvenido a la regata 2D. Aquí se muestra el recorrido completo de la competición.",
  "Las boyas indican los puntos de referencia del recorrido. Sigue el orden de las boyas para entender la trayectoria.",
  "La clasificación se actualiza en tiempo real basándose en el avance de cada barco a lo largo del recorrido.",
  "Observa cómo se conectan las boyas mediante líneas guías para que puedas visualizar el trayecto a seguir.",
  "Si eres nuevo en este deporte, presta atención a las notas informativas que te explican cada fase de la regata.",
];

const InfoOverlay = () => {
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Cambiar mensaje cada 8 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % infoMessages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="info-overlay">
      <div className="info-content">
        <p>{infoMessages[currentMsgIndex]}</p>
        <button className="close-info" onClick={() => setVisible(false)}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default InfoOverlay;
