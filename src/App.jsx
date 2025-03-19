// App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Register from "./Register";
import Map2D from "./Map2D";
import Scene from "./Scene";
import Menu from "./Menu";
import OldRecordings from "./OldRecordings";
import RaceReplay2D from "./RaceReplay2D";
import RaceReplay3D from "./RaceReplay3D"; // NUEVO COMPONENTE
import ProtectedRoute from "./ProtectedRoute"; // Ruta protegida
import CreateCompetition from "./CreateCompetition";
import AddRace from "./AddRace";

const App = () => {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Home />} />
      <Route path="/create-competition" element={<CreateCompetition />} />
      <Route path="/add-race" element={<ProtectedRoute><AddRace /></ProtectedRoute>} />
        
      {/* Rutas protegidas */}
      <Route path="/map" element={<ProtectedRoute><Map2D /></ProtectedRoute>} />
      <Route path="/scene" element={<ProtectedRoute><Scene /></ProtectedRoute>} />
      <Route path="/old-records" element={<ProtectedRoute><OldRecordings /></ProtectedRoute>} />
      <Route path="/old-records/:id" element={<ProtectedRoute><RaceReplay2D /></ProtectedRoute>} />
      <Route path="/old-records/:id/3d" element={<ProtectedRoute><RaceReplay3D /></ProtectedRoute>} />

      {/* Menú */}
      <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
    </Routes>
  );
};

export default App;
