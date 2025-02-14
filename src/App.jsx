import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Register from "./Register";
import Map2D from "./Map2D";
import Scene from "./Scene";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/map" element={<Map2D />} />
      <Route path="/scene" element={<Scene />} />
    </Routes>
  );
};

export default App;