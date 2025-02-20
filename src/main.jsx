import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom"; // Usamos HashRouter sin basename
import App from "./App";
import "aos/dist/aos.css"; // Importar los estilos de AOS
import AOS from "aos"; // Importar AOS
import "./index.css";

// Inicializar AOS
AOS.init({
  duration: 1000, // Duración de las animaciones
  once: true, // Las animaciones solo se ejecutan una vez
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);
