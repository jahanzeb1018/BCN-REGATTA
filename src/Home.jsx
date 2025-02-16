import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";
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


const Home = () => {
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
            Smart Navigation is an innovative platform designed to track and visualize the location of ships in real time. 
            With our advanced technology, you can monitor the position, speed, and direction of multiple vessels through an 
            intuitive and user-friendly interface.
          </p>
        </div>

        {/* 2D Map Section */}
        <div className="map-section" data-aos="fade-up">
          <div className="map-content">
            <div className="map-text">
              <h3>📍 Real-Time 2D Map</h3>
              <p>
                Our platform includes an interactive 2D map that shows the location of ships in real time. 
                With constant updates, you can track vessel movements with precision and detail.
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
                Explore an interactive 3D view that allows you to immerse yourself in a realistic environment. 
                Observe ships in a three-dimensional scenario with precise details and smooth movements.
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
              The goal of <strong>Smart Navigation</strong> is to provide an advanced tool for real-time vessel monitoring and management. 
              We aim to improve efficiency and precision in navigation by offering an intuitive and accessible platform for users worldwide.
            </p>
            <div className="purpose-cards">
              <div className="purpose-card" data-aos="zoom-in" data-aos-delay="200">
                <img src={efficiency} alt="Efficiency" className="purpose-icon" />
                <h4>Efficiency</h4>
                <p>Optimize the tracking and management of maritime fleets.</p>
              </div>
              <div className="purpose-card" data-aos="zoom-in" data-aos-delay="300">
                <img src={precision} alt="Precision" className="purpose-icon" />
                <h4>Precision</h4>
                <p>Provide accurate and reliable real-time data.</p>
              </div>
              <div className="purpose-card" data-aos="zoom-in" data-aos-delay="400">
                <img src={innovation} alt="Innovation" className="purpose-icon" />
                <h4>Innovation</h4>
                <p>Use cutting-edge technology for a unique experience.</p>
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
              <p>Visualize ship locations on an interactive map with real-time updates.</p>
              <div className="feature-overlay"></div>
            </div>
            <div className="feature-card" data-aos="fade-right" data-aos-delay="300">
              <img src={Icon3D} alt="3D View" className="feature-icon" />
              <h4>🌐 Immersive 3D View</h4>
              <p>Explore a 3D interactive view for a more realistic and detailed experience.</p>
              <div className="feature-overlay"></div>
            </div>
            <div className="feature-card" data-aos="fade-right" data-aos-delay="400">
              <img src={chatIcon} alt="Chat" className="feature-icon" />
              <h4>💬 Real-Time Chat</h4>
              <p>Communicate with other users through an integrated chat.</p>
              <div className="feature-overlay"></div>
            </div>
          </div>
        </div>

        {/* Technologies Section */}
        <div className="tech-section" data-aos="fade-up">
          <h3>🔧 Technologies Used</h3>
          <p>
            Our platform uses cutting-edge technologies such as <strong>React</strong>, <strong>Three.js</strong>, 
            <strong>Leaflet</strong>, and <strong>WebSockets</strong> to deliver a seamless and real-time user experience.
          </p>
          <div className="tech-icons">
            <img src={reactIcon} alt="React" className="tech-icon" data-aos="zoom-in" data-aos-delay="200" />
            <img src={threejsIcon} alt="Three.js" className="tech-icon" data-aos="zoom-in" data-aos-delay="300" />
            <img src={leafletIcon} alt="Leaflet" className="tech-icon" data-aos="zoom-in" data-aos-delay="400" />
            <img src={websocketIcon} alt="WebSockets" className="tech-icon" data-aos="zoom-in" data-aos-delay="500" />
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="cta-section" data-aos="fade-up">
          <h3>🚀 Ready to Get Started?</h3>
          <p>
            Sign up or log in to access all the platform's features and start monitoring your vessels.
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

export default Home;