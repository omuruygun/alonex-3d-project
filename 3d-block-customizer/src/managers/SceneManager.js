import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomManager } from './RoomManager.js';

export class SceneManager {
    constructor(container) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.setupRenderer(container);
        this.setupCamera();
        this.setupLights();
        this.setupGround();
        this.setupControls();
        
        // Create room
        this.roomManager = new RoomManager(this.scene);
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupRenderer(container) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera.position.set(8, 5, 12);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 8, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Window light
        const windowLight = new THREE.SpotLight(0xffffff, 0.5);
        windowLight.position.set(0, 8, -8);
        windowLight.angle = Math.PI / 4;
        windowLight.penumbra = 0.5;
        windowLight.decay = 2;
        windowLight.distance = 15;
        windowLight.castShadow = true;
        this.scene.add(windowLight);
    }

    setupGround() {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide
        });
        
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = 0;
        this.groundPlane.receiveShadow = true;
        this.groundPlane.userData.isGround = true;
        
        this.scene.add(this.groundPlane);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    addObject(object) {
        this.scene.add(object);
    }

    removeObject(object) {
        this.scene.remove(object);
    }
}
