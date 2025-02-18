import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { io } from "socket.io-client";
import MiniMap2D from "./MiniMap2D"; // Importa tu mini mapa si lo deseas
import "./App.css";

// Ajusta la URL de tu servidor:
const socket = io("https://server-production-c33c.up.railway.app/");

const Scene = () => {
  const mountRef = useRef(null);
  const navigate = useNavigate();

  // Aquí guardamos un diccionario con las instancias de barcos en Three.js
  // clave: boatId (socket.id del server), valor: objeto con { instance: Boat3D, index: número para posicionamiento }
  const boatsRef = useRef({});

  // Contador para asignar posiciones X
  const boatIndexRef = useRef(0);

  useEffect(() => {
    // Escuchamos las actualizaciones de ubicación de cada barco
    socket.on("updateLocation", (boatInfo) => {
      const { id } = boatInfo;

      // Si no existe el barco en nuestro diccionario, lo creamos
      if (!boatsRef.current[id]) {
        boatsRef.current[id] = {
          instance: null, // se llenará luego
          index: boatIndexRef.current, // se usará para asignar x
        };
        boatIndexRef.current += 1; // incrementamos el índice para el siguiente barco
      }

      // Si no está creada la instancia en Three.js, la creamos:
      if (!boatsRef.current[id].instance) {
        boatsRef.current[id].instance = new Boat3D(boatsRef.current[id].index);
        scene.add(boatsRef.current[id].instance.boatGroup);
      }

      // Actualizamos parámetros en la instancia
      boatsRef.current[id].instance.updateDataFromServer(boatInfo);
    });

    // Escuchamos desconexiones si quieres (podrías implementar un "boatDisconnected")
    // No es parte del ejemplo original, pero podrías añadir un emit en el server para notificar desconexiones

    return () => {
      socket.off("updateLocation");
    };
  }, []);

  let camera, scene, renderer, controls, water, sun;
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(dracoLoader);

  // Clase para cada barco 3D
  class Boat3D {
    constructor(boatIndex) {
      // boatGroup contendrá el modelo en 3D
      this.boatGroup = new THREE.Group();

      // Par de variables para “movimiento realista”
      this.speedValue = 0; // se actualizará con boatInfo.speed
      this.heading = 0; // se actualizará con boatInfo.azimuth (en radianes)

      // Onda “falsa”: le daremos un pequeño balanceo en X/Z
      this.smoothness = 0.01;
      this.balanceAmplitude = 0.07;
      this.balanceFrequency = 0.001;

      // Para poner cada barco uno al lado del otro:
      // Ej: separarlos 30 unidades en X
      this.offsetX = boatIndex * 30;
      this.offsetZ = 50; // por defecto

      // Cargar el modelo 3D del barco
      loader.load("/src/assets/boat/boat2.glb", (gltf) => {
        gltf.scene.scale.set(3, 3, 3);

        // Posición inicial en la escena
        gltf.scene.position.set(this.offsetX, 0, this.offsetZ);
        // Ajusta la rotación si lo necesitas
        // gltf.scene.rotation.y = -1.5;

        this.boatGroup.add(gltf.scene);
      });
    }

    // Actualiza datos que nos vienen del servidor
    updateDataFromServer(boatInfo) {
      // Suponiendo que boatInfo.speed (en nudos, km/h, etc.) lo convertimos a valor “pequeño”
      this.speedValue = (boatInfo.speed || 0) * 0.02;

      // boatInfo.azimuth en grados? Conviértelo a radianes
      const degToRad = (deg) => (deg * Math.PI) / 180;
      this.heading = degToRad(boatInfo.azimuth || 0);
    }

    // Lógica de animación en cada frame
    update() {
      if (!this.boatGroup) return;

      // Tomamos el primer hijo del grupo (el modelo real)
      const boatModel = this.boatGroup.children[0];
      if (!boatModel) return;

      // Rotamos según heading
      // (Si tu barco “mira” al eje -Z, tendrás que sumar o restar un offset)
      boatModel.rotation.y = this.heading;

      // Avanzamos en Z según la speed
      // Pero OJO: heading = 0 => podría querer decir “mirando” a -Z o +Z, revisa la dirección
      // Suponiendo heading=0 apunta en -Z:
      //    x += sin(heading) * speed
      //    z += -cos(heading) * speed
      const deltaX = Math.sin(this.heading) * this.speedValue;
      const deltaZ = -Math.cos(this.heading) * this.speedValue;

      // Actualizamos posición
      boatModel.position.x += deltaX;
      boatModel.position.z += deltaZ;

      // Pequeño “bob” en el agua
      const time = Date.now();
      boatModel.rotation.z = Math.sin(time * this.balanceFrequency) * this.balanceAmplitude;
      boatModel.rotation.x = Math.cos(time * this.balanceFrequency * 0.5) * this.balanceAmplitude * 0.5;
    }
  }

  // Clase para la maqueta de Barcelona
  class Barcelona {
    constructor() {
      loader.load("/src/assets/barcelona/Barcelona.glb", (gltf) => {
        scene.add(gltf.scene);
        gltf.scene.scale.set(3, 3, 3);
        gltf.scene.position.set(-4000, -90, -2000);
        gltf.scene.rotation.y = 2.14;
      });
    }

    update() {}
  }

  // Inicializamos la escena Three.js una sola vez
  useEffect(() => {
    initThree();
    animate();

    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line
  }, []);

  const initThree = () => {
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
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(30, 30, 100);

    sun = new THREE.Vector3();

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-500, 100, 750);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Agua
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load("src/assets/waternormals.jpg", (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
    });

    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    // Cielo
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    const parameters = {
      elevation: 5,
      azimuth: 180,
    };
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sceneEnv = new THREE.Scene();
    let renderTarget;

    function updateSun() {
      const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
      const theta = THREE.MathUtils.degToRad(parameters.azimuth);
      sun.setFromSphericalCoords(1, phi, theta);

      sun.set(-500, 100, 750);
      sky.material.uniforms["sunPosition"].value.copy(sun);
      water.material.uniforms["sunDirection"].value.copy(sun).normalize();

      if (renderTarget !== undefined) renderTarget.dispose();
      sceneEnv.add(sky);
      renderTarget = pmremGenerator.fromScene(sceneEnv);
      scene.add(sky);

      scene.environment = renderTarget.texture;
    }

    updateSun();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 10, 0);
    controls.update();

    window.addEventListener("resize", onWindowResize);

    // Cargamos Barcelona
    const barcelona = new Barcelona();
  };

  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const animate = () => {
    requestAnimationFrame(animate);

    // Actualizamos el agua
    if (water && water.material.uniforms["time"]) {
      water.material.uniforms["time"].value += 1.0 / 60.0;
    }

    // Recorremos todos los barcos y llamamos a update()
    Object.values(boatsRef.current).forEach((boatData) => {
      boatData.instance && boatData.instance.update();
    });

    renderer.render(scene, camera);
  };

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
