// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  // Verificamos si hay token en localStorage
  const token = localStorage.getItem("token");

  if (!token) {
    // Si NO hay token, redirigir a /login
    return <Navigate to="/login" replace />;
  }

  // Si sí hay token, se renderiza el contenido (children)
  return children;
};

export default ProtectedRoute;
