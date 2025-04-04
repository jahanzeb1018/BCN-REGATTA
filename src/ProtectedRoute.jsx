// ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const DEMO_RACE_ID = "67d803b1dc9e83d822cfe941";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  // Si estamos en la ruta "/scene" y el query raceId es el de demo, se muestra la escena sin login.
  if (location.pathname === "/scene") {
    const queryParams = new URLSearchParams(location.search);
    const raceId = queryParams.get("raceId");
    if (raceId === DEMO_RACE_ID) {
      return children;
    }
  }

  // Para todas las demás rutas se requiere el token.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
