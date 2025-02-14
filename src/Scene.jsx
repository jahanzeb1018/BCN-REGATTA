import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./App.css";

const Scene = () => {
  const mountRef = useRef(null);
  const navigate = useNavigate(); // 🔹 Hook para redirección

  useEffect(() => {
    let camera, scene, renderer, controls, water, sun, boat, barcelona;
    const loader = new GLTFLoader();

    class Boat {
      constructor() {
        this.boat = null;
        this.speed = { vel: 0, rot: 0 };
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetHeight = 0;
        this.smoothness = 0.01;
        this.balanceAmplitude = 0.07;
        this.balanceFrequency = 0.001;

        // 🚀 Cargar el modelo de manera asíncrona
        loader.load("/src/assets/boat/scene.gltf", (gltf) => {
          scene.add(gltf.scene);
          gltf.scene.scale.set(3, 3, 3);
          gltf.scene.position.set(5, 1.9, 50);
          gltf.scene.rotation.y = -1.5;

          this.boat = gltf.scene;
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.material.needsUpdate = true;
            }
          });
        });
      }

      update() {
        if (this.boat) {
          this.boat.rotation.y += this.speed.rot;
          this.boat.position.z += this.speed.vel;

          const waterHeight = this.getWaterHeight(this.boat.position.x, this.boat.position.z);
          this.targetHeight = waterHeight;
          this.boat.position.y += (this.targetHeight - this.boat.position.y) * this.smoothness;

          const time = Date.now();
          this.boat.rotation.z = Math.sin(time * this.balanceFrequency) * this.balanceAmplitude;
          this.boat.rotation.x = Math.cos(time * this.balanceFrequency * 0.5) * this.balanceAmplitude * 0.5;

          this.velocity.z = this.speed.vel * 0.95;
          this.boat.position.z += this.velocity.z;
        }
      }

      getWaterHeight(x, z) {
        return Math.sin(x * 0.1 + Date.now() * 0.005) * 2;
      }
    }

    class Barcelona {
      constructor() {
        loader.load("/src/assets/barcelona/Barcelona.gltf", (gltf) => {
          scene.add(gltf.scene);
          gltf.scene.scale.set(3, 3, 3);
          gltf.scene.position.set(-4000, -90, -2000);
          gltf.scene.rotation.y = 2.14;
        });
      }

      update() {}
    }

    function init() {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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

      const sky = new Sky();
      sky.scale.setScalar(10000);
      scene.add(sky);

      const skyUniforms = sky.material.uniforms;
      skyUniforms["turbidity"].value = 10;
      skyUniforms["rayleigh"].value = 2;
      skyUniforms["mieCoefficient"].value = 0.005;
      skyUniforms["mieDirectionalG"].value = 0.8;

      const parameters = { elevation: 5, azimuth: 180 };
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
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);

      if (boat) boat.update();
      if (barcelona) barcelona.update();

      if (water && water.material.uniforms["time"]) {
        water.material.uniforms["time"].value += 1.0 / 60.0;
      }

      renderer.render(scene, camera);
    }

    boat = new Boat();
    barcelona = new Barcelona();

    init();
    animate();

    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={mountRef} id="scene-container">
      <div className="floating-menu">
        <button className="menu-btn" onClick={() => navigate("/map")}>🗺️ Vista 2D</button>
      </div>
    </div>
  );
};

export default Scene;
