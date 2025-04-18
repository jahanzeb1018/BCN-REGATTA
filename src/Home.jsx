// Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import BoatMarker from "./BoatMarker";
import BuoyMarker from "./BuoyMarker";
import "./Home.css";
import "./index.css";

import map2d from "/src/assets/map2d-example.png";
import map3d from "/src/assets/map3d-example.png";
import efficiency from "/src/assets/efficiency-icon.png";
import precision from "/src/assets/precision-icon.png";
import innovation from "/src/assets/innovation-icon.png";
import mapIcon from "/src/assets/map-icon.png";
import Icon3D from "/src/assets/3d-icon.png";
import chatIcon from "/src/assets/chat-icon.png";
import reactIcon from "/src/assets/react-icon.png";
import threejsIcon from "/src/assets/threejs-icon.png";
import leafletIcon from "/src/assets/leaflet-icon.png";
import websocketIcon from "/src/assets/websocket-icon.png";

const DEMO_RACE_ID = "67d803b1dc9e83d822cfe941";

const colorPalette = ["red", "blue", "green", "purple", "cyan", "orange", "lime", "pink", "yellow"];
const assignedColors = {};

const Home = () => {
  
  const [race, setRace] = useState(null);
  const [buoys, setBuoys] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  
  const speedOptions = [1, 2, 5];
  const [speedIndex, setSpeedIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  useEffect(() => {
    fetch(`https://server-production-c33c.up.railway.app/api/races/${DEMO_RACE_ID}`)
      .then((res) => res.json())
      .then((data) => {
        setRace(data);
        setBuoys(data.buoys || []);
        if (data.startTmst) {
          setCurrentTime(data.startTmst);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!race || !race.endTmst) return;
    let intervalId;
    if (isPlaying && race.startTmst && race.endTmst) {
      intervalId = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1000;
          if (next > race.endTmst) {
            clearInterval(intervalId);
            return race.endTmst;
          }
          return next;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, race, playbackSpeed]);

  // Calcular los barcos en cada frame 2D
  let demoBoats = [];
  if (race && race.endTmst && race.positions) {
    Object.entries(race.positions).forEach(([boatName, posArray]) => {
      const relevantPos = [...posArray].reverse().find((p) => p.t <= currentTime);
      if (relevantPos) {
        if (!assignedColors[boatName]) {
          assignedColors[boatName] = colorPalette.shift() || "gray";
        }
        demoBoats.push({
          name: boatName,
          position: [relevantPos.a, relevantPos.n],
          speed: relevantPos.s || 0,
          azimuth: relevantPos.c || 0,
          color: assignedColors[boatName],
        });
      }
    });
  }

  const handleCycleSpeed = () => {
    const newIndex = (speedIndex + 1) % speedOptions.length;
    setSpeedIndex(newIndex);
    const val = speedOptions[newIndex];
    if (val === 1) setPlaybackSpeed(1000);
    if (val === 2) setPlaybackSpeed(500);
    if (val === 5) setPlaybackSpeed(200);
  };

  return (
    <div className="home-container">
      {/* Top Banner */}
      <div className="home-banner" data-aos="fade-down">
        <div className="banner-content">
          <h1>🌊 Smart Navigation</h1>
          <div className="auth-buttons">
            <Link to="/login" className="auth-btn">Log In</Link>
            <Link to="/register" className="auth-btn">Sign Up</Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="home-content">
        {/* Introduction Section */}
        <div className="intro-section" data-aos="fade-up">
          <h2>🚀 Welcome to Smart Navigation</h2>
          <p className="intro-text">
            Smart Navigation is an innovative platform designed to track and visualize the location of ships 
            in real time. With our advanced technology, you can monitor the position, speed, and direction 
            of multiple vessels via a clean and intuitive interface.
          </p>
        </div>

        {/* 2D Map Section */}
        <div className="map-section" data-aos="fade-up">
          <div className="map-content">
            <div className="map-text">
              <h3>📍 Real-Time 2D Map</h3>
              <p>
                Our platform includes an interactive 2D map that displays the location of ships in real time.
                With continuous updates, you can follow vessel movements with precision and detail, 
                providing a straightforward way to oversee multiple ships simultaneously.
              </p>
            </div>
            <div className="map-image">
              <img src={map2d} alt="2D Map" />
            </div>
          </div>
        </div>

        {/* 3D Map Section */}
        <div className="map-section" data-aos="fade-up">
          <div className="map-content reverse">
            <div className="map-text">
              <h3>🌐 Immersive 3D View</h3>
              <p>
                Step into an engaging 3D environment that offers a realistic perspective. 
                Watch ships move in three dimensions with accurate physics and dynamic camera angles, 
                giving you a more comprehensive view of your fleet’s movements.
              </p>
            </div>
            <div className="map-image">
              <img src={map3d} alt="3D Map" />
            </div>
          </div>
        </div>

        {/* Project Purpose Section */}
        <div className="purpose-section" data-aos="fade-up">
          <div className="purpose-content">
            <h3>🎯 Project Purpose</h3>
            <p className="purpose-text">
              The aim of <strong>Smart Navigation</strong> is to deliver an advanced tool for real-time vessel 
              monitoring and management. Our vision is to elevate efficiency, accuracy, and accessibility 
              within the maritime sector, making it easier for users worldwide to track and optimize fleet operations.
            </p>
            <div className="purpose-cards">
              <div className="purpose-card" data-aos="zoom-in" data-aos-delay="200">
                <img src={efficiency} alt="Efficiency" className="purpose-icon" />
                <h4>Efficiency</h4>
                <p>Streamline fleet tracking and optimize vessel management workflows.</p>
              </div>
              <div className="purpose-card" data-aos="zoom-in" data-aos-delay="300">
                <img src={precision} alt="Precision" className="purpose-icon" />
                <h4>Precision</h4>
                <p>Achieve high accuracy and reliable real-time data insights.</p>
              </div>
              <div className="purpose-card" data-aos="zoom-in" data-aos-delay="400">
                <img src={innovation} alt="Innovation" className="purpose-icon" />
                <h4>Innovation</h4>
                <p>Utilize modern technology to create an unmatched user experience.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h3 data-aos="fade-up">🌟 Key Features</h3>
          <div className="feature-cards">
            <div className="feature-card" data-aos="fade-right" data-aos-delay="200">
              <img src={mapIcon} alt="2D Map" className="feature-icon" />
              <h4>📍 Real-Time 2D Map</h4>
              <p>
                Visualize vessel positions on a real-time, interactive map 
                that provides up-to-the-moment insight into ship movements.
              </p>
              <div className="feature-overlay"></div>
            </div>
            <div className="feature-card" data-aos="fade-right" data-aos-delay="300">
              <img src={Icon3D} alt="3D View" className="feature-icon" />
              <h4>🌐 Immersive 3D View</h4>
              <p>
                Investigate ship dynamics in a 3D environment, offering precise details 
                and smooth transitions for an immersive perspective.
              </p>
              <div className="feature-overlay"></div>
            </div>
            <div className="feature-card" data-aos="fade-right" data-aos-delay="400">
              <img src={chatIcon} alt="Chat" className="feature-icon" />
              <h4>💬 Real-Time Chat</h4>
              <p>
                Collaborate effortlessly with other users through an integrated 
                communication feature designed for efficiency.
              </p>
              <div className="feature-overlay"></div>
            </div>
          </div>
        </div>

        {/* Technologies Section */}
        <div className="tech-section" data-aos="fade-up">
          <h3>🔧 Technologies Used</h3>
          <p>
            We leverage cutting-edge frameworks and libraries, including 
            <strong> React</strong>, <strong>Three.js</strong>, <strong>Leaflet</strong>, 
            and <strong>WebSockets</strong>, to ensure a smooth, real-time experience 
            for end-users.
          </p>
          <div className="tech-icons">
            <img
              src={reactIcon}
              alt="React"
              className="tech-icon"
              data-aos="zoom-in"
              data-aos-delay="200"
            />
            <img
              src={threejsIcon}
              alt="Three.js"
              className="tech-icon"
              data-aos="zoom-in"
              data-aos-delay="300"
            />
            <img
              src={leafletIcon}
              alt="Leaflet"
              className="tech-icon"
              data-aos="zoom-in"
              data-aos-delay="400"
            />
            <img
              src={websocketIcon}
              alt="WebSockets"
              className="tech-icon"
              data-aos="zoom-in"
              data-aos-delay="500"
            />
          </div>
        </div>

        {/* DEMO SECTION: 2D + 3D */}
        <div className="demo-section" data-aos="fade-up">
          <h3>🚢 Demo Regatta</h3>
          <p className="demo-description">
            Below is a live demonstration of one regatta. 
            First, you’ll see a real-time 2D playback that lets you adjust speed, pause, or jump 
            through the entire race timeline.
          </p>

          {/* Mapa 2D con Replay */}
          <div className="demo-map-container">
            <MapContainer
              center={[41.3851, 2.1734]}
              zoom={13}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
              />
              {buoys.map((b, idx) => (
                <BuoyMarker
                  key={idx}
                  lat={b.lat}
                  lng={b.lng}
                  name={b.name || "Buoy"}
                />
              ))}
              {demoBoats.map((boat, i) => (
                <BoatMarker
                  key={i}
                  position={boat.position}
                  name={boat.name}
                  speed={boat.speed}
                  azimuth={boat.azimuth}
                  color={boat.color}
                />
              ))}
              <DemoAutoCenter boats={demoBoats} buoys={buoys} />
            </MapContainer>
          </div>

          {race && race.endTmst && (
            <div className="demo-controls">
              <button
                className="play-pause-btn"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <button className="speed-btn" onClick={handleCycleSpeed}>
                x{speedOptions[speedIndex]}
              </button>

              <input
                className="time-slider"
                type="range"
                min={race.startTmst}
                max={race.endTmst}
                step={1000}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
              />

              <span className="time-display">
                {new Date(currentTime).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* DEMO 3D EMBEBIDO */}
          <h3 className="demo-3d-title">Interactive 3D Scene</h3>
          <p className="demo-description">
            We also provide an immersive 3D view for the same race. This environment uses accurate 
            physics and smooth camera movements to create a vivid perspective. 
            Check it out below — the window size is responsive for demonstration.
          </p>
          <div className="demo-scene-container">
            <iframe
              src={`./#/scene?raceId=${DEMO_RACE_ID}`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="3D Demo"
            />
          </div>
        </div>

        {/* Call to Action al final */}
        <div className="cta-section" data-aos="fade-up">
          <h3>🚀 Ready to Get Started?</h3>
          <p>
            Sign up or log in to access all the platform’s features and begin overseeing your fleet in real time.
            Smart Navigation stands ready to boost efficiency, accuracy, and clarity for your maritime operations.
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="cta-btn" data-aos="zoom-in" data-aos-delay="200">Sign Up</Link>
            <Link to="/login" className="cta-btn" data-aos="zoom-in" data-aos-delay="300">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Auto-centra boyas y barcos (2D) */
function DemoAutoCenter({ boats, buoys }) {
  const map = useMap();
  useEffect(() => {
    const positions = [
      ...boats.map((b) => b.position),
      ...buoys.map((by) => [by.lat, by.lng]),
    ];
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [boats, buoys, map]);
  return null;
}

export default Home;
