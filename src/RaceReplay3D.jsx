// RaceReplay3D.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Importar modelos y texturas
import boatModel from "/src/assets/boat/boat2.glb";
import buoyModel from "/src/assets/buoy/buoy.glb";
import barcelonaModel from "/src/assets/barcelona/BCN v10.glb";
import waterNormals from "/src/assets/waternormals.jpg";

// Configuración de geolocalización y escala
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

const RaceReplay3D = () => {
  const { id } = useParams();
  const mountRef = useRef(null);
  const [race, setRace] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Three.js variables
  let camera, scene, renderer, controls, water, sun, sky;
  let animationId;
  let boatsMap = {}; // Diccionario para los barcos

  // **1. Configurar el GLTFLoader con DRACO**
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(dracoLoader);

  // Cargar la regata desde el backend
  useEffect(() => {
    fetch(`https://server-production-c33c.up.railway.app/api/races/${id}`, {
      headers: { Authorization: localStorage.getItem("token") },
    })
      .then((res) => res.json())
      .then((data) => {
        setRace(data);
        setCurrentTime(data.startTmst);
      })
      .catch((err) => console.error("Error fetching race data:", err));
  }, [id]);

  // Inicializar Three.js cuando la carrera esté lista
  useEffect(() => {
    if (!race || !mountRef.current) return;
    initThree();
    animate();
    window.addEventListener("resize", onWindowResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onWindowResize);
      renderer.dispose();
    };
  }, [race]);

  // Timer de reproducción
  useEffect(() => {
    let intervalId;
    if (isPlaying && race) {
      intervalId = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1000;
          if (next > race.endTmst) {
            clearInterval(intervalId);
            return race.endTmst;
          }
          return next;
        });
      }, 250);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, race]);

  function initThree() {
    // Configurar Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountRef.current.appendChild(renderer.domElement);

    // Escena
    scene = new THREE.Scene();

    // Cámara
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 200000);
    camera.position.set(0, 100, 300);

    // Controles de órbita
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 10, 0);
    controls.update();

    // Luces
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(-500, 100, 750);
    scene.add(directionalLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Agua
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
    water.position.set(5000, 0, 4000);
    scene.add(water);

    // **2. Cargar la ciudad de Barcelona**
    loadBarcelonaModel();

    // Cielo
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    sun = new THREE.Vector3();
    updateSun();
  }

  function loadBarcelonaModel() {
    loader.load(
      barcelonaModel,
      (gltf) => {
        gltf.scene.scale.set(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);
        gltf.scene.position.set(0, -50, 0);
        gltf.scene.rotation.y = Math.PI;
        scene.add(gltf.scene);
        console.log("✅ Barcelona model loaded");
      },
      undefined,
      (error) => console.error("❌ Error loading Barcelona model:", error)
    );
  }

  function updateSun() {
    const parameters = { elevation: 2, azimuth: 180 };
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    if (sky && water) {
      sky.material.uniforms["sunPosition"].value.copy(sun);
      water.material.uniforms["sunDirection"].value.copy(sun).normalize();
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (water && water.material.uniforms["time"]) {
      water.material.uniforms["time"].value += 1.0 / 60.0;
    }
    renderer.render(scene, camera);
  }

  if (!race) return <div>Loading Race Data...</div>;

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
};

export default RaceReplay3D;
