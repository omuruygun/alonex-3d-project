import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(container) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.raycaster = new THREE.Raycaster();
        
        this.setupRenderer(container);
        this.setupScene();
        this.setupLights();
        this.setupCamera();
        this.setupControls();
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupRenderer(container) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.physicallyCorrectLights = true;
        container.appendChild(this.renderer.domElement);
    }

    setupScene() {
        // Set modern white background
        this.scene.background = new THREE.Color(0xffffff);
        this.scene.fog = new THREE.Fog(0xffffff, 20, 100);

        // Create modern room
        this.createModernRoom();
    }

    createModernRoom() {
        // Floor with grid for placement
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5f5f5,
            roughness: 0.1,
            metalness: 0.1
        });
        this.groundPlane = new THREE.Mesh(floorGeometry, floorMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.receiveShadow = true;
        this.groundPlane.userData.isGround = true;  // Important for raycasting
        this.scene.add(this.groundPlane);

        // Add grid helper for placement
        const size = 50;
        const divisions = 50;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0x888888);
        gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
        gridHelper.material.opacity = 0.1;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // Store grid size for snapping calculations
        this.gridSize = size / divisions;

        // Back wall
        const wallGeometry = new THREE.PlaneGeometry(50, 20);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1
        });
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.z = -25;
        backWall.position.y = 10;
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Side wall
        const sideWall = new THREE.Mesh(wallGeometry, wallMaterial);
        sideWall.position.x = -25;
        sideWall.position.y = 10;
        sideWall.rotation.y = Math.PI / 2;
        sideWall.receiveShadow = true;
        this.scene.add(sideWall);
    }

    setupLights() {
        // Ambient light for soft overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        // Main directional light (simulating sunlight)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(10, 15, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -20;
        mainLight.shadow.camera.right = 20;
        mainLight.shadow.camera.top = 20;
        mainLight.shadow.camera.bottom = -20;
        mainLight.shadow.bias = -0.001;
        this.scene.add(mainLight);

        // Fill light for softer shadows
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);

        // Additional soft light for better material visibility
        const softLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
        this.scene.add(softLight);
    }

    setupCamera() {
        this.camera.position.set(12, 8, 12);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2;
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

    clearScene() {
        // Remove all objects except ground, grid, and room elements
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            // Skip ground plane, grid helper, lights, camera, and room elements
            if (!object.userData.isGround && 
                !(object instanceof THREE.GridHelper) && 
                !(object instanceof THREE.Light) && 
                !(object instanceof THREE.Camera) &&
                !object.userData.isRoomElement) {  
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
        });
    }

    getGroundIntersection(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersects = this.raycaster.intersectObjects([this.groundPlane]);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            // Snap to grid
            point.x = Math.round(point.x / this.gridSize) * this.gridSize;
            point.z = Math.round(point.z / this.gridSize) * this.gridSize;
            return point;
        }
        return null;
    }
}
