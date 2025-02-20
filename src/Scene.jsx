import React, { useEffect, useRef } from "react";
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

// Importa los modelos y la textura desde tus assets
import boatModel from "/src/assets/boat/boat2.glb";
import buoyModel from "/src/assets/buoy/buoy.glb";
import barcelonaModel from "/src/assets/barcelona/BarcelonV4.glb";
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
  return {
    x: x * WORLD_SCALE,
    z: z * WORLD_SCALE,
  };
}

const Scene = () => {
  const location = useLocation();
  const mountRef = useRef(null);
  const navigate = useNavigate();

  // Variables globales de Three.js
  let camera, scene, renderer, controls, water, sun;
  let sky; // Referencia al cielo
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(dracoLoader);

  // Diccionarios y arrays para barcos y boyas
  const boatsMap = {};
  const boatsArray = [];
  const buoysMap = {};
  const buoysArray = [];

  // Variables para autofocus
  const focusCenter = new THREE.Vector3(0, 0, 0);
  const focusCameraPos = new THREE.Vector3(0, 0, 0);
  let userIsInteracting = false;
  let userInteractionTimeout = null;

  // Parámetros para el GUI
  const parameters = { elevation: 2, azimuth: 180 };

  // Función para actualizar la posición del sol (usada por el GUI)
  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    if (sky && water) {
      sky.material.uniforms["sunPosition"].value.copy(sun);
      water.material.uniforms["sunDirection"].value.copy(sun).normalize();
    }
  }

  // Inicialización de la escena
  function init() {
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

    scene = new THREE.Scene();

    // Posición inicial de la cámara
    const desiredLat = 41.3915063984166;
    const desiredLon = 2.212475285053475;
    const { x: camX, z: camZ } = latLonToWorld(desiredLat, desiredLon);
    camera.position.set(camX, 100, camZ);

    sun = new THREE.Vector3();

    // Luces
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-500, 100, 750);
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Agua
    const waterGeometry = new THREE.PlaneGeometry(100000, 100000);
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
    scene.add(water);

    // Cielo
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    sky.material.uniforms["turbidity"].value = 10;
    sky.material.uniforms["rayleigh"].value = 2;
    sky.material.uniforms["mieCoefficient"].value = 0.005;
    sky.material.uniforms["mieDirectionalG"].value = 0.8;

    // Actualizar sol y entorno
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

    // Controles de cámara
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
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000.0;
    lastFrameTime = now;

    // Actualizar barcos y boyas
    boatsArray.forEach((boat) => {
      boat.update(deltaTime);
    });
    buoysArray.forEach((buoy) => {
      buoy.update(deltaTime);
    });

    // Ajuste automático de cámara si no hay interacción
    if (!userIsInteracting) {
      const boundingBox = new THREE.Box3();
      let anyBoat = false;
      boatsArray.forEach((boat) => {
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
    renderer.render(scene, camera);
  }

  let barcelona = null;
  // Clases para Barco, Boya y Barcelona

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
      loader.load(boatModel, (gltf) => {
        scene.add(gltf.scene);
        gltf.scene.scale.set(2, 2, 2);
        gltf.scene.position.set(0, 0, 0);
        gltf.scene.rotation.y = 0;
        this.boat = gltf.scene;
      });
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
      loader.load(buoyModel, (gltf) => {
        scene.add(gltf.scene);
        gltf.scene.scale.set(2, 2, 2);
        gltf.scene.position.set(0, 0, 0);
        gltf.scene.rotation.y = 0;
        this.mesh = gltf.scene;
      });
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
      loader.load(barcelonaModel, (gltf) => {
        scene.add(gltf.scene);
        gltf.scene.scale.set(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);
        gltf.scene.position.set(0, 10, 0);
        gltf.scene.rotation.y = 0;
      });
    }
    update() {
      // Si se requiere animar algo de la ciudad
    }
  }

  useEffect(() => {
    init();
    barcelona = new Barcelona();

    const socket = io("https://server-production-c33c.up.railway.app", {
      query: { role: "viewer" },
    });

    socket.on("assignBoatInfo", (boatData) => {
      const { name } = boatData;
      if (!name) return;
      if (!boatsMap[name]) {
        const newBoat = new Boat();
        boatsMap[name] = newBoat;
        boatsArray.push(newBoat);
      }
    });

    socket.on("updateLocation", (boatInfo) => {
      const { name } = boatInfo;
      if (!name) return;
      if (!boatsMap[name]) {
        const newBoat = new Boat();
        boatsMap[name] = newBoat;
        boatsArray.push(newBoat);
      }
      boatsMap[name].setLocation({
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
        if (!buoysMap[b.id]) {
          const newBuoy = new Buoy(b.lat, b.lng, b.name);
          buoysMap[b.id] = newBuoy;
          buoysArray.push(newBuoy);
        }
      });
    });

    function removeBoatFromScene(boatName) {
      const boatInstance = boatsMap[boatName];
      if (boatInstance && boatInstance.boat) {
        scene.remove(boatInstance.boat);
      }
      delete boatsMap[boatName];
      const index = boatsArray.indexOf(boatInstance);
      if (index !== -1) {
        boatsArray.splice(index, 1);
      }
    }

    animate();

    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // useEffect para crear el GUI solo en "/scene" y destruirlo al salir
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
        <MiniMap2D />
      </div>
    </div>
  );
};

export default Scene;
