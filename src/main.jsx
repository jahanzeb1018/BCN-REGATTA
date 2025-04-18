import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom"; 
import App from "./App";
import "aos/dist/aos.css"; 
import AOS from "aos"; 
import "./index.css";


AOS.init({
  duration: 1000, 
  once: true, 
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);
