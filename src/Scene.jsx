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
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import boatModel from "/src/assets/boat/boat2.glb";
import buoyModel from "/src/assets/buoy/buoy.glb";
import barcelonaModel from "/src/assets/barcelona/BCN v10.glb";
import waterNormals from "/src/assets/waternormals.jpg";

// Constantes de geolocalización y escala
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

const Scene = () => {
  const location = useLocation();
  const mountRef = useRef(null);
  const navigate = useNavigate();

  // Ref para la escena y para persistir barcos y boyas
  const sceneRef = useRef(null);
  const boatsMapRef = useRef({});
  const boatsArrayRef = useRef([]);
  const buoysMapRef = useRef({});
  const buoysArrayRef = useRef([]);

  // Estados para la reproducción de la carrera (modo Replay)
  const [raceData, setRaceData] = useState(null);
  const [raceDuration, setRaceDuration] = useState({ start: 0, end: 0 });
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackMultiplier, setPlaybackMultiplier] = useState(1); // x1 por defecto

  // Variables globales de Three.js (se asignan en init)
  let camera, renderer, controls, water, sun;
  let sky;
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(dracoLoader);

  // Variables para el autofocus
  const focusCenter = new THREE.Vector3(0, 0, 0);
  const focusCameraPos = new THREE.Vector3(0, 0, 0);
  let userIsInteracting = false;
  let userInteractionTimeout = null;

  const parameters = { elevation: 2, azimuth: 180 };

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    if (sky && water) {
      sky.material.uniforms["sunPosition"].value.copy(sun);
      water.material.uniforms["sunDirection"].value.copy(sun).normalize();
    }
  }

  function init() {
    // Crear la escena y guardarla en sceneRef
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
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountRef.current.appendChild(renderer.domElement);

    // Posición inicial de la cámara
    const desiredLat = 41.3915063984166;
    const desiredLon = 2.212475285053475;
    const { x: camX, z: camZ } = latLonToWorld(desiredLat, desiredLon);
    camera.position.set(camX, 100, camZ);

    sun = new THREE.Vector3();

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-500, 100, 750);
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
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
    sky.material.uniforms["turbidity"].value = 10;
    sky.material.uniforms["rayleigh"].value = 2;
    sky.material.uniforms["mieCoefficient"].value = 0.005;
    sky.material.uniforms["mieDirectionalG"].value = 0.8;

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

    boatsArrayRef.current.forEach((boat) => {
      boat.update(deltaTime);
    });
    buoysArrayRef.current.forEach((buoy) => {
      buoy.update(deltaTime);
    });

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
        const offsetX = finalRadius * 1.0;
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

  class Boat {
    constructor() {
      this.boat = null;
      this.lat = LAT0;
      this.lon = LON0;
      this.azimuth = 0;
      this.speed = 0;
      this.pitch = 0;
      this.roll = 0;
      this.smoothness = 0.01;
      this.balanceAmplitude = 0.07;
      this.balanceFrequency = 0.001;
      if (boatModelCache) {
        const clone = boatModelCache.scene.clone(true);
        clone.scale.set(2, 2, 2);
        clone.position.set(0, 0, 0);
        clone.rotation.y = 0;
        this.boat = clone;
        sceneRef.current.add(clone);
      } else {
        loader.load(boatModel, (gltf) => {
          boatModelCache = gltf;
          const clone = gltf.scene.clone(true);
          clone.scale.set(2, 2, 2);
          clone.position.set(0, 0, 0);
          clone.rotation.y = 0;
          this.boat = clone;
          sceneRef.current.add(clone);
        });
      }
    }
    setLocation({ latitude, longitude, azimuth, speed, pitch, roll }) {
      this.lat = latitude;
      this.lon = longitude;
      this.azimuth = azimuth || 0;
      this.speed = speed || 0;
      this.pitch = pitch || 0;
      this.roll = roll || 0;
    }
    update(deltaTime) {
      if (!this.boat) return;
      const { x, z } = latLonToWorld(this.lat, this.lon);
      const waterHeight = this.getWaterHeight(x, z);
      const currentY = this.boat.position.y;
      const targetY = waterHeight;
      this.boat.position.y += (targetY - currentY) * this.smoothness;
      this.boat.position.x = x;
      this.boat.position.z = z;
      const rotationY = THREE.MathUtils.degToRad(360 - this.azimuth);
      this.boat.rotation.y = rotationY;
      const time = Date.now();
      this.boat.rotation.z =
        this.roll + Math.sin(time * this.balanceFrequency) * this.balanceAmplitude;
      this.boat.rotation.x =
        this.pitch +
        Math.cos(time * this.balanceFrequency * 0.5) *
          this.balanceAmplitude *
          0.5;
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
        clone.position.set(0, 0, 0);
        clone.rotation.y = 0;
        this.mesh = clone;
        sceneRef.current.add(clone);
      } else {
        loader.load(buoyModel, (gltf) => {
          buoyModelCache = gltf;
          const clone = gltf.scene.clone(true);
          clone.scale.set(2, 2, 2);
          clone.position.set(0, 0, 0);
          clone.rotation.y = 0;
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
      // Actualizaciones para la ciudad si se requieren
    }
  }

  useEffect(() => {
    // No retornamos temprano, sino que usamos una variable para almacenar el socket (si se usa)
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
          setRaceDuration({ start: data.startTmst, end: data.endTmst });
          setCurrentTimeState(data.startTmst);
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
      socket = io("https://server-production-c33c.up.railway.app", {
        query: { role: "viewer" },
      });
      socket.on("assignBoatInfo", (boatData) => {
        const { name } = boatData;
        if (!name) return;
        if (!boatsMapRef.current[name]) {
          const newBoat = new Boat();
          boatsMapRef.current[name] = newBoat;
          boatsArrayRef.current.push(newBoat);
        }
      });
      socket.on("updateLocation", (boatInfo) => {
        const { name } = boatInfo;
        if (!name) return;
        if (!boatsMapRef.current[name]) {
          const newBoat = new Boat();
          boatsMapRef.current[name] = newBoat;
          boatsArrayRef.current.push(newBoat);
        }
        boatsMapRef.current[name].setLocation({
          latitude: boatInfo.latitude,
          longitude: boatInfo.longitude,
          azimuth: boatInfo.azimuth,
          speed: boatInfo.speed,
          pitch: boatInfo.pitch,
          roll: boatInfo.roll,
        });
      });
      socket.on("boatFinished", (data) => {
        const { name } = data;
        removeBoatFromScene(name);
      });
      socket.on("buoys", (buoysData) => {
        buoysData.forEach((b) => {
          if (!buoysMapRef.current[b.id]) {
            const newBuoy = new Buoy(b.lat, b.lng, b.name);
            buoysMapRef.current[b.id] = newBuoy;
            buoysArrayRef.current.push(newBuoy);
          }
        });
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
            object.material.forEach((material) => material.dispose());
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
    if (!raceData) return;
    Object.entries(raceData.positions).forEach(([boatName, posArray]) => {
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
    if (!raceData || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeState((prev) => {
        const next = prev + playbackMultiplier * 1000;
        if (next > raceDuration.end) {
          clearInterval(interval);
          return raceDuration.end;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [raceData, isPlaying, playbackMultiplier, raceDuration]);

  useEffect(() => {
    let gui;
    if (location.pathname === "/scene" && water) {
      gui = new GUI();
      const folderSky = gui.addFolder("Sky");
      folderSky
        .add(parameters, "elevation", 0, 90, 0.1)
        .onChange(() => updateSun());
      folderSky
        .add(parameters, "azimuth", -180, 180, 0.1)
        .onChange(() => updateSun());
      folderSky.open();

      const waterUniforms = water.material.uniforms;
      const folderWater = gui.addFolder("Water");
      folderWater
        .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
        .name("distortionScale");
      folderWater
        .add(waterUniforms.size, "value", 0.1, 10, 0.1)
        .name("size");
      folderWater.open();
    }
    return () => {
      if (gui) gui.destroy();
    };
  }, [location.pathname, water]);

  return (
    <div ref={mountRef} id="scene-container">
      <div className="floating-menu">
        <button className="menu-btn" onClick={() => navigate("/map")}>
          🗺️ Vista 2D
        </button>
      </div>
      <div className="mini-map-container">
        {raceData ? (
          <MiniMap2D replayData={raceData} currentTime={currentTimeState} />
        ) : (
          <MiniMap2D />
        )}
      </div>
      {raceData && (
        <div
          className="playback-controls"
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            zIndex: 1000,
            backgroundColor: "rgba(255,255,255,0.8)",
            padding: "10px",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setIsPlaying(false)}>Pause</button>
            <button onClick={() => { setIsPlaying(true); setPlaybackMultiplier(1); }}>
              x1
            </button>
            <button onClick={() => { setIsPlaying(true); setPlaybackMultiplier(5); }}>
              x5
            </button>
            <button onClick={() => { setIsPlaying(true); setPlaybackMultiplier(10); }}>
              x10
            </button>
            <button onClick={() => { setIsPlaying(true); setPlaybackMultiplier(20); }}>
              x20
            </button>
          </div>
          <input
            type="range"
            min={raceDuration.start}
            max={raceDuration.end}
            step={1000}
            value={currentTimeState}
            onChange={(e) => setCurrentTimeState(Number(e.target.value))}
          />
          <span>{new Date(currentTimeState).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};

export default Scene;
