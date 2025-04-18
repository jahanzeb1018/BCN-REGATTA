// Scene.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { io } from "socket.io-client";
import MiniMap2D from "./MiniMap2D";
import "./App.css";

import boatModel from "/src/assets/boat/boat2.glb";
import buoyModel from "/src/assets/buoy/buoy.glb";
import barcelonaModel from "/src/assets/barcelona/BCN v10.glb";
import waterNormals from "/src/assets/waternormals.jpg";

const LAT0 = 41.383787222715334;
const LON0 = 2.1996051201829054;
const METERS_PER_DEG_LAT = 111320;
const WORLD_SCALE = 2;

function latLonToWorld(lat, lon) {
  const dLat = lat - LAT0;
  const dLon = lon - LON0;
  const x = dLon * METERS_PER_DEG_LAT * Math.cos(THREE.MathUtils.degToRad(LAT0));
  const z = -dLat * METERS_PER_DEG_LAT;
  return { x: x * WORLD_SCALE, z: z * WORLD_SCALE };
}

let boatModelCache = null;
let buoyModelCache = null;
let barcelonaModelCache = null;

const parameters = { elevation: 0, azimuth: 65 };

const Scene = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mountRef = useRef(null);

  const isEmbedded = window.self !== window.top;

  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [raceData, setRaceData] = useState(null);
  const [raceDuration, setRaceDuration] = useState({ start: 0, end: 0 });
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const timeRef = useRef(currentTimeState);
  useEffect(() => {
    timeRef.current = currentTimeState;
  }, [currentTimeState]);

  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const speedOptions = [1, 2, 5];
  const [speedIndex, setSpeedIndex] = useState(0);

  const sceneRef = useRef(null);
  const boatsMapRef = useRef({});
  const boatsArrayRef = useRef([]);
  const buoysMapRef = useRef({});
  const buoysArrayRef = useRef([]);

  let camera, renderer, controls, water, sky, sun;
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(dracoLoader);

  const focusCenter = new THREE.Vector3(0, 0, 0);
  const focusCameraPos = new THREE.Vector3(0, 0, 0);
  let userIsInteracting = false;
  let userInteractionTimeout = null;

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { text: newMessage, sender: "You" }]);
      setNewMessage("");
    }
  };

  function updateSun() {
    if (!sun) return;
  
    const timeValue = timeRef.current || Date.now();
    const currentDate = new Date(timeValue);
    const currentMinutes =
      currentDate.getHours() * 60 +
      currentDate.getMinutes() +
      currentDate.getSeconds() / 60;
    const sunriseMinutes = 7 * 60 + 29; 
    const sunsetMinutes = 20 * 60 + 20; 
  
    let fraction;
    if (currentMinutes < sunriseMinutes) {
      fraction = 0;
    } else if (currentMinutes > sunsetMinutes) {
      fraction = 1;
    } else {
      fraction = (currentMinutes - sunriseMinutes) / (sunsetMinutes - sunriseMinutes);
    }
  
    const azimuth = 65 + (-110 - 65) * fraction;
    const elevation = 8 * (4 * fraction * (1 - fraction));
  
    parameters.azimuth = azimuth;
    parameters.elevation = elevation;
  
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
  
    if (sky && water) {
      sky.material.uniforms["sunPosition"].value.copy(sun);
      water.material.uniforms["sunDirection"].value.copy(sun).normalize();
      sky.material.needsUpdate = true;
      water.material.needsUpdate = true;
    }
  
    const exposure = Math.max(0.3, Math.min(1.0, 0.3 + (parameters.elevation + 5) / 20));
    renderer.toneMappingExposure = exposure;
  }
  
  useEffect(() => {
    if (raceData && Number(raceData.startTmst) > 1000000 && currentTimeState === 0) {
      setCurrentTimeState(Number(raceData.startTmst));
    }
  }, [raceData]);
  
  useEffect(() => {
    updateSun();
  }, [currentTimeState]);
  
  function init() {
    sceneRef.current = new THREE.Scene();
    const scene = sceneRef.current;
  
    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      1,
      200000
    );
  
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountRef.current.appendChild(renderer.domElement);
  
    const desiredLat = 41.3915063984166;
    const desiredLon = 2.212475285053475;
    const { x: camX, z: camZ } = latLonToWorld(desiredLat, desiredLon);
    camera.position.set(camX, 100, camZ);
  
    sun = new THREE.Vector3();
  
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-500, 100, 750);
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
  
    const waterGeometry = new THREE.PlaneGeometry(19000, 20000);
    water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        waterNormals,
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
    });
    water.rotation.x = -Math.PI / 2;
    water.position.x = 5000;
    water.position.z = 4000;
    scene.add(water);
  
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
  
    sky.material.uniforms["turbidity"].value = 3;
    sky.material.uniforms["rayleigh"].value = 1.0;
    sky.material.uniforms["mieCoefficient"].value = 0.004;
    sky.material.uniforms["mieDirectionalG"].value = 0.7;
  
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sceneEnv = new THREE.Scene();
    let renderTarget;
    function updateSunInternal() {
      const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
      const theta = THREE.MathUtils.degToRad(parameters.azimuth);
      sun.setFromSphericalCoords(1, phi, theta);
      sky.material.uniforms["sunPosition"].value.copy(sun);
      water.material.uniforms["sunDirection"].value.copy(sun).normalize();
      if (renderTarget !== undefined) renderTarget.dispose();
      sceneEnv.add(sky);
      renderTarget = pmremGenerator.fromScene(sceneEnv);
      scene.add(sky);
      scene.environment = renderTarget.texture;
    }
    updateSunInternal();
  
  
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 10, 0);
    controls.update();
    controls.addEventListener("start", () => {
      userIsInteracting = true;
      if (userInteractionTimeout) clearTimeout(userInteractionTimeout);
    });
    controls.addEventListener("end", () => {
      userInteractionTimeout = setTimeout(() => {
        userIsInteracting = false;
      }, 3000);
    });
  
    window.addEventListener("resize", onWindowResize);
  }
  
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  let lastFrameTime = performance.now();
  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);
    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000.0;
    lastFrameTime = now;
  
    boatsArrayRef.current.forEach((boat) => boat.update(deltaTime));
    buoysArrayRef.current.forEach((buoy) => buoy.update(deltaTime));
  
    updateSun();
  
    if (!userIsInteracting) {
      const boundingBox = new THREE.Box3();
      let anyBoat = false;
      boatsArrayRef.current.forEach((boat) => {
        if (boat.boat) {
          boundingBox.expandByPoint(boat.boat.position);
          anyBoat = true;
        }
      });
      if (anyBoat) {
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const radius = Math.max(size.x, size.y, size.z) * 0.5;
        const minRadius = 30;
        const finalRadius = Math.max(radius, minRadius);
        const lerpFactor = 0.05;
        focusCenter.lerp(center, lerpFactor);
        const offsetX = finalRadius;
        const offsetY = finalRadius * 0.8;
        const offsetZ = finalRadius * 2.2;
        const desiredCameraPos = new THREE.Vector3(
          center.x + offsetX,
          center.y + offsetY,
          center.z + offsetZ
        );
        focusCameraPos.lerp(desiredCameraPos, lerpFactor);
        camera.position.copy(focusCameraPos);
        controls.target.copy(focusCenter);
        controls.update();
      }
    }
  
    if (water && water.material.uniforms["time"]) {
      water.material.uniforms["time"].value += 1.0 / 60.0;
    }
    renderer.render(sceneRef.current, camera);
  }
  
  function computeCenterLocation() {
    if (raceData && raceData.positions) {
      let sumLat = 0;
      let sumLon = 0;
      let count = 0;
      Object.values(raceData.positions).forEach((boatPositions) => {
        if (Array.isArray(boatPositions) && boatPositions.length > 0) {
          const pos = boatPositions[boatPositions.length - 1];
          sumLat += pos.a;
          sumLon += pos.n;
          count++;
        }
      });
      if (count > 0) return { lat: sumLat / count, lon: sumLon / count };
    }
    return { lat: LAT0, lon: LON0 };
  }
  
  class Boat {
    constructor() {
      this.lat = LAT0;
      this.lon = LON0;
      this.azimuth = 0;
      this.speed = 0;
      this.pitch = 0;
      this.roll = 0;
      this.targetLat = LAT0;
      this.targetLon = LON0;
      this.targetAzimuth = 0;
      this.targetSpeed = 0;
      this.targetPitch = 0;
      this.targetRoll = 0;
      this.smoothness = 0.01;
      this.balanceAmplitude = 0.07;
      this.balanceFrequency = 0.001;
      if (boatModelCache) {
        const clone = boatModelCache.scene.clone(true);
        clone.scale.set(2, 2, 2);
        this.boat = clone;
        sceneRef.current.add(clone);
      } else {
        loader.load(boatModel, (gltf) => {
          boatModelCache = gltf;
          const clone = gltf.scene.clone(true);
          clone.scale.set(2, 2, 2);
          this.boat = clone;
          sceneRef.current.add(clone);
        });
      }
    }
    setLocation({ latitude, longitude, azimuth, speed, pitch, roll }) {
      this.targetLat = latitude;
      this.targetLon = longitude;
      this.targetAzimuth = azimuth || 0;
      this.targetSpeed = speed || 0;
      this.targetPitch = pitch || 0;
      this.targetRoll = roll || 0;
    }
    update(deltaTime) {
      if (!this.boat) return;
      const lerpFactor = deltaTime * 0.5;
  
      this.lat = THREE.MathUtils.lerp(this.lat, this.targetLat, lerpFactor);
      this.lon = THREE.MathUtils.lerp(this.lon, this.targetLon, lerpFactor);
      this.azimuth = THREE.MathUtils.lerp(this.azimuth, this.targetAzimuth, lerpFactor);
      this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, lerpFactor);
      this.pitch = THREE.MathUtils.lerp(this.pitch, this.targetPitch, lerpFactor);
      this.roll = THREE.MathUtils.lerp(this.roll, this.targetRoll, lerpFactor);
  
      const { x, z } = latLonToWorld(this.lat, this.lon);
      const waterHeight = this.getWaterHeight(x, z);
      const currentY = this.boat.position.y;
      const targetY = waterHeight;
      this.boat.position.y += (targetY - currentY) * this.smoothness;
      this.boat.position.x = x;
      this.boat.position.z = z;
  
      const headingCorrection = -90;
      const rotationY = THREE.MathUtils.degToRad(360 - this.azimuth + headingCorrection);
      this.boat.rotation.y = rotationY;
  
      const time = Date.now();
      this.boat.rotation.z =
        this.roll + Math.sin(time * this.balanceFrequency) * this.balanceAmplitude;
      this.boat.rotation.x =
        this.pitch +
        Math.cos(time * this.balanceFrequency * 0.5) * this.balanceAmplitude * 0.5;
    }
    getWaterHeight(x, z) {
      return Math.sin(x * 0.1 + Date.now() * 0.005) * 2;
    }
  }
  
  class Buoy {
    constructor(lat, lon, name) {
      this.lat = lat;
      this.lon = lon;
      this.name = name;
      this.mesh = null;
      this.smoothness = 0.01;
      this.balanceAmplitude = 0.05;
      this.balanceFrequency = 0.001;
      if (buoyModelCache) {
        const clone = buoyModelCache.scene.clone(true);
        clone.scale.set(2, 2, 2);
        this.mesh = clone;
        sceneRef.current.add(clone);
      } else {
        loader.load(buoyModel, (gltf) => {
          buoyModelCache = gltf;
          const clone = gltf.scene.clone(true);
          clone.scale.set(2, 2, 2);
          this.mesh = clone;
          sceneRef.current.add(clone);
        });
      }
    }
    update(deltaTime) {
      if (!this.mesh) return;
      const { x, z } = latLonToWorld(this.lat, this.lon);
      const waterHeight = this.getWaterHeight(x, z);
      const currentY = this.mesh.position.y;
      const targetY = waterHeight;
      this.mesh.position.y += (targetY - currentY) * this.smoothness;
      this.mesh.position.x = x;
      this.mesh.position.z = z;
      const time = Date.now();
      this.mesh.rotation.x =
        Math.cos(time * this.balanceFrequency) * this.balanceAmplitude * 0.5;
      this.mesh.rotation.z =
        Math.sin(time * this.balanceFrequency * 0.7) * this.balanceAmplitude;
    }
    getWaterHeight(x, z) {
      return Math.sin(x * 0.1 + Date.now() * 0.005) * 2;
    }
  }
  
  class Barcelona {
    constructor() {
      if (barcelonaModelCache) {
        const clone = barcelonaModelCache.scene.clone(true);
        clone.scale.set(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);
        clone.position.set(0, -50, 0);
        clone.rotation.y = 0;
        sceneRef.current.add(clone);
      } else {
        loader.load(barcelonaModel, (gltf) => {
          barcelonaModelCache = gltf;
          gltf.scene.scale.set(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);
          gltf.scene.position.set(0, -50, 0);
          gltf.scene.rotation.y = 0;
          sceneRef.current.add(gltf.scene);
        });
      }
    }
    update() {
    }
  }
  
  useEffect(() => {
    init();
    new Barcelona();
  
    const queryParams = new URLSearchParams(location.search);
    const raceId = queryParams.get("raceId");
    let socket = null;
  
    if (raceId) {
      fetch(`https://server-production-c33c.up.railway.app/api/races/${raceId}`, {
        headers: { Authorization: localStorage.getItem("token") },
      })
        .then((res) => res.json())
        .then((data) => {
          setRaceData(data);
          setRaceDuration({
            start: Number(data.startTmst),
            end: Number(data.endTmst),
          });
          setCurrentTimeState(Number(data.startTmst) > 0 ? Number(data.startTmst) : Date.now());
          if (data.buoys) {
            data.buoys.forEach((buoy) => {
              if (!buoysMapRef.current[buoy.id]) {
                const newBuoy = new Buoy(buoy.lat, buoy.lng, buoy.name);
                buoysMapRef.current[buoy.id] = newBuoy;
                buoysArrayRef.current.push(newBuoy);
              }
            });
          }
        })
        .catch((err) => console.error(err));
    } else {
      fetch("https://server-production-c33c.up.railway.app/api/active-competition", {
        headers: { Authorization: localStorage.getItem("token") },
      })
        .then((res) => {
          if (res.ok) return res.json();
          else throw new Error("No active competition");
        })
        .then((activeRace) => {
          return fetch(`https://server-production-c33c.up.railway.app/api/races/${activeRace._id}`, {
            headers: { Authorization: localStorage.getItem("token") },
          });
        })
        .then((res) => res.json())
        .then((data) => {
          setRaceData(data);
          setRaceDuration({
            start: Number(data.startTmst),
            end: Number(data.endTmst),
          });
          setCurrentTimeState(Number(data.startTmst) > 0 ? Number(data.startTmst) : Date.now());
          if (data.buoys) {
            data.buoys.forEach((buoy) => {
              if (!buoysMapRef.current[buoy.id]) {
                const newBuoy = new Buoy(buoy.lat, buoy.lng, buoy.name);
                buoysMapRef.current[buoy.id] = newBuoy;
                buoysArrayRef.current.push(newBuoy);
              }
            });
          }
        })
        .catch((err) => {
          console.error("No active competition found, scene remains empty:", err);
        });
    }
  
    animate();
  
    return () => {
      if (socket) {
        socket.disconnect();
      }
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onWindowResize);
      if (controls) controls.dispose();
      sceneRef.current.traverse((object) => {
        if (!object.isMesh) return;
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [location]);
  
  useEffect(() => {
    if (!raceData || raceData.endTmst == null) return;
    Object.entries(raceData.positions || {}).forEach(([boatName, posArray]) => {
      const relevantPos = [...posArray].reverse().find((p) => p.t <= currentTimeState);
      if (relevantPos) {
        if (!boatsMapRef.current[boatName]) {
          const newBoat = new Boat();
          boatsMapRef.current[boatName] = newBoat;
          boatsArrayRef.current.push(newBoat);
        }
        boatsMapRef.current[boatName].setLocation({
          latitude: relevantPos.a,
          longitude: relevantPos.n,
          azimuth: relevantPos.c || 0,
          speed: relevantPos.s || 0,
          pitch: relevantPos.pitch || 0,
          roll: relevantPos.roll || 0,
        });
      }
    });
  }, [currentTimeState, raceData]);
  
  useEffect(() => {
    if (!raceData || raceData.endTmst == null || !isPlaying) return;
    let intervalId = setInterval(() => {
      setCurrentTimeState((prev) => {
        const next = prev + 1000;
        if (next > raceDuration.end) {
          clearInterval(intervalId);
          return raceDuration.end;
        }
        return next;
      });
    }, playbackSpeed);
    return () => clearInterval(intervalId);
  }, [raceData, isPlaying, playbackSpeed, raceDuration]);
  
  useEffect(() => {
    if (raceData && raceData.endTmst == null) {
      const socket = io("https://server-production-c33c.up.railway.app/", {
        query: { role: "viewer" },
      });
      socket.on("updateLocation", (data) => {
        if (data.raceId !== raceData._id) return;
        if (!boatsMapRef.current[data.boatName]) {
          const newBoat = new Boat();
          boatsMapRef.current[data.boatName] = newBoat;
          boatsArrayRef.current.push(newBoat);
        }
        boatsMapRef.current[data.boatName].setLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          azimuth: data.azimuth || 0,
          speed: data.speed || 0,
          pitch: data.pitch || 0,
          roll: data.roll || 0,
        });
      });
      socket.on("buoys", (buoysData) => {
        buoysData.forEach((buoy) => {
          if (!buoysMapRef.current[buoy.id]) {
            const newBuoy = new Buoy(buoy.lat, buoy.lng, buoy.name);
            buoysMapRef.current[buoy.id] = newBuoy;
            buoysArrayRef.current.push(newBuoy);
          }
        });
      });
      return () => {
        socket.disconnect();
      };
    }
  }, [raceData]);
  
  const handleCycleSpeed = () => {
    const newIndex = (speedIndex + 1) % speedOptions.length;
    setSpeedIndex(newIndex);
    const newSpeedValue = speedOptions[newIndex];
    if (newSpeedValue === 1) setPlaybackSpeed(1000);
    if (newSpeedValue === 2) setPlaybackSpeed(500);
    if (newSpeedValue === 5) setPlaybackSpeed(200);
  };
  
  const handleExit = () => {
    navigate("/menu");
  };
  
  const handle2DRedirect = () => {
    const queryParams = new URLSearchParams(location.search);
    const raceId = queryParams.get("raceId");
    if (raceId) {
      navigate(`/map?raceId=${raceId}`);
    } else {
      navigate("/map");
    }
  };
  
  function removeBoatFromScene(boatName) {
    if (!boatsMapRef.current[boatName]) return;
    const boat = boatsMapRef.current[boatName];
    if (boat.boat && sceneRef.current) {
      sceneRef.current.remove(boat.boat);
    }
    delete boatsMapRef.current[boatName];
    boatsArrayRef.current = boatsArrayRef.current.filter((b) => b !== boat);
  }
  
  return (
    <div ref={mountRef} id="scene-container" style={{ width: "100vw", height: "100vh" }}>
      {!isEmbedded && (
        <button
          onClick={handleExit}
          title="Back to Old Recordings"
          style={{
            position: "absolute",
            top: "20px",
            left: "7px",
            zIndex: 9999,
            width: "30px",
            height: "35px",
            border: "none",
            borderRadius: "8px",
            background: "#f44336",
            color: "#fff",
            fontSize: "1.4rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#d32f2f"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f44336"; }}
        >
          ↩
        </button>
      )}
  
      {!isEmbedded && (
        <div className="mini-map-container">
          {raceData && raceData.endTmst ? (
            <MiniMap2D replayData={raceData} currentTime={currentTimeState} />
          ) : (
            <MiniMap2D />
          )}
        </div>
      )}
  
      {raceData && raceData.endTmst && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 20px",
            borderRadius: "15px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <button
            style={{
              fontSize: "1.4rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#333",
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#007bff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
  
          <button
            style={{
              fontSize: "0.95rem",
              background: "none",
              border: "1px solid #333",
              borderRadius: "5px",
              padding: "6px 10px",
              cursor: "pointer",
              color: "#333",
              transition: "background-color 0.3s ease, color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#007bff";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#333";
            }}
            onClick={handleCycleSpeed}
            title="Change speed"
          >
            x{speedOptions[speedIndex]}
          </button>
  
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="range"
              min={raceDuration.start}
              max={raceDuration.end}
              step={1000}
              value={currentTimeState}
              onChange={(e) => setCurrentTimeState(Number(e.target.value))}
              style={{
                width: isEmbedded ? "100%" : "150px",
                cursor: "pointer",
                verticalAlign: "middle",
              }}
            />
            <span
              style={{
                fontWeight: "bold",
                minWidth: "70px",
                textAlign: "center",
                color: "#333",
              }}
            >
              {new Date(currentTimeState).toLocaleTimeString()}
            </span>
          </div>
  
          {!isEmbedded && (
            <button
              style={{
                fontSize: "0.9rem",
                background: "linear-gradient(135deg, #42a5f5, #1e88e5)",
                border: "none",
                borderRadius: "5px",
                color: "#fff",
                padding: "6px 12px",
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.15)",
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              onClick={handle2DRedirect}
              title="Go to 2D View"
            >
              2D
            </button>
          )}
        </div>
      )}
  
      {raceData && raceData.endTmst == null && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 20px",
            borderRadius: "15px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          {!isEmbedded && (
            <>
              <button
                style={{
                  fontSize: "0.9rem",
                  background: "linear-gradient(135deg, #42a5f5, #1e88e5)",
                  border: "none",
                  borderRadius: "5px",
                  color: "#fff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.15)",
                  transition: "opacity 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                onClick={handle2DRedirect}
                title="Go to 2D View"
              >
                2D
              </button>
  
              <button
                style={{
                  fontSize: "0.9rem",
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "5px",
                  color: "#333",
                  padding: "6px 12px",
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.15)",
                  transition: "background-color 0.3s ease, color 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#007bff";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.color = "#333";
                }}
                onClick={() => setShowChat(!showChat)}
                title="Toggle Chat"
              >
                💬 Chat
              </button>
            </>
          )}
        </div>
      )}
  
      {raceData && raceData.endTmst == null && showChat && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "350px",
            height: "500px",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(6px)",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #6a11cb, #2575fc)",
              color: "white",
              padding: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0 }}>💬 Chat</h3>
            <button
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => setShowChat(false)}
            >
              ×
            </button>
          </div>
          <div
            style={{
              flex: 1,
              padding: "1rem",
              overflowY: "auto",
              background: "#f9f9f9",
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "1rem",
                  padding: "0.8rem",
                  borderRadius: "10px",
                  maxWidth: "80%",
                  wordWrap: "break-word",
                  background: msg.sender === "You" ? "#6a11cb" : "#e0e0e0",
                  color: msg.sender === "You" ? "#fff" : "#333",
                  marginLeft: msg.sender === "You" ? "auto" : "0",
                }}
              >
                <strong>{msg.sender}: </strong>
                {msg.text}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              padding: "1rem",
              background: "white",
              borderTop: "1px solid #ddd",
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              style={{
                flex: 1,
                padding: "0.8rem",
                border: "1px solid #ccc",
                borderRadius: "10px",
                marginRight: "0.5rem",
                fontSize: "1rem",
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                padding: "0.8rem 1.5rem",
                border: "none",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
  
      {raceData && raceData.endTmst == null && !isEmbedded && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            padding: "8px 12px",
            backdropFilter: "blur(6px)",
            borderRadius: "10px",
            border: "none",
            fontSize: "0.95rem",
            color: "#333",
            transition: "background-color 0.3s ease, color 0.3s ease",
          }}
        >
          <div
            style={{
              background: "rgba(255, 0, 0, 0.8)",
              color: "#fff",
              fontWeight: "bold",
              padding: "6px 12px",
              borderRadius: "5px",
            }}
          >
            LIVE
          </div>
        </div>
      )}
    </div>
  );
};
  
export default Scene;
