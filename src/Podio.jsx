// Podio.jsx
import React from "react";
import "./Podio.css";

const Podio = ({ boats }) => {
  return (
    <div className="podio-container">
      <h3 className="podio-title">Classification</h3>
      <ul className="podio-list">
        {boats.map((boat, index) => (
          <li key={boat.id} className="podio-item">
            <span className="podio-rank" style={{ color: boat.color }}>
              {index + 1}.
            </span>
            <span className="podio-boat">{boat.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Podio;
