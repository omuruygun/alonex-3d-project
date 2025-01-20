import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ObjectManager } from './ObjectManager.js';

export class SceneManager {
    constructor(container) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Initialize ObjectManager
        this.objectManager = new ObjectManager();
        
        this.setupRenderer(container);
        this.setupScene();
        this.setupLights();
        this.setupCamera();
        this.setupControls();
        
        // Add click event listener for object selection
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.setupEventListeners();
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
        // Set background color
        this.scene.background = new THREE.Color(0xffffff);

        // Add fog for depth
        this.scene.fog = new THREE.Fog(0xffffff, 20, 40);

        // Create the ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        ground.userData.isGround = true;
        ground.userData.isRoom = true;
        this.scene.add(ground);

        // Create walls
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.1
        });

        // Back wall
        const backWallGeometry = new THREE.PlaneGeometry(20, 10);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.z = -10;
        backWall.position.y = 5;
        backWall.receiveShadow = true;
        backWall.userData.isRoom = true;
        this.scene.add(backWall);

        // Left wall
        const leftWallGeometry = new THREE.PlaneGeometry(20, 10);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.x = -10;
        leftWall.position.y = 5;
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        leftWall.userData.isRoom = true;
        this.scene.add(leftWall);

        // Right wall
        const rightWallGeometry = new THREE.PlaneGeometry(20, 10);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.x = 10;
        rightWall.position.y = 5;
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        rightWall.userData.isRoom = true;
        this.scene.add(rightWall);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(20, 20);
        gridHelper.userData.isRoom = true;
        this.scene.add(gridHelper);
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
        // Set camera reference in ObjectManager
        this.objectManager.setCamera(this.camera);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    onMouseClick(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get all meshes in the scene that can be selected
        const selectableMeshes = [];
        this.scene.traverse((object) => {
            if (object.isMesh && 
                !object.userData.isGround && 
                !object.userData.isOutline && 
                !object.userData.isReflection &&
                object.parent) {
                // Only add meshes that are part of a GLB object
                let parent = object.parent;
                while (parent && !parent.userData.type) {
                    parent = parent.parent;
                }
                if (parent && parent.userData.type === 'glb') {
                    selectableMeshes.push(object);
                }
            }
        });

        const intersects = this.raycaster.intersectObjects(selectableMeshes, false);

        // Remove any existing rotation text
        const existingText = document.querySelector('.rotation-text');
        if (existingText) {
            existingText.remove();
        }

        if (intersects.length > 0) {
            // Find the parent GLB object
            let selectedObject = intersects[0].object;
            while (selectedObject.parent && !selectedObject.parent.userData.type) {
                selectedObject = selectedObject.parent;
            }
            
            // Make sure we have the top-level GLB container
            if (selectedObject.parent && selectedObject.parent.userData.type === 'glb') {
                selectedObject = selectedObject.parent;
            }

            // If we found a valid object, select it
            if (selectedObject.userData.type === 'glb') {
                this.objectManager.selectObject(selectedObject);
            }
        } else {
            // Click on empty space, clear selection
            this.objectManager.clearSelection();
        }
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
        if (object) {
            // Remove from scene
            this.scene.remove(object);
            // Also remove from ObjectManager
            this.objectManager.removeObject(object);
            // Force scene update
            this.scene.updateMatrixWorld(true);
        }
    }

    clearScene() {
        // Only remove non-room objects
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object.isMesh && !object.userData.isRoom) {
                objectsToRemove.push(object);
            }
        });

        // Remove the objects
        objectsToRemove.forEach(object => {
            object.removeFromParent();
        });

        // Clear object manager's list
        if (this.objectManager) {
            this.objectManager.clearObjects();
        }
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

    handleKeyPress(event) {
        if (event.code === 'Space') {
            event.preventDefault();
            // Handle any other space key functionality if needed
        }
    }

    setupEventListeners() {
        window.addEventListener('keydown', this.handleKeyPress.bind(this));
    }
}
