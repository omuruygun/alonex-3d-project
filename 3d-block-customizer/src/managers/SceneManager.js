import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupRenderer(container) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.physicallyCorrectLights = true;
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
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    setupLights() {
        // Ambient light for overall scene illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Main directional light with shadows
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        // Additional fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    setupGround() {
        // Create ground plane with grid
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        
        // Create canvas for the text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 2048;  // Higher resolution
        canvas.height = 2048;
        
        // Set background
        context.fillStyle = '#333333';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add text
        context.font = 'bold 80px Arial';
        context.fillStyle = '#FFFF00';  // Same yellow as grid
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add multiple instances of text for tiling effect
        for(let y = canvas.height/4; y < canvas.height; y += canvas.height/2) {
            for(let x = canvas.width/4; x < canvas.width; x += canvas.width/2) {
                context.fillText('ALONEX MOBİLYA', x, y);
            }
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: texture,
            side: THREE.DoubleSide
        });
        
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = 0;
        this.groundPlane.receiveShadow = true;
        this.groundPlane.userData.isGround = true;
        
        // Add grid helper
        const size = 100;
        const divisions = 100;
        const gridHelper = new THREE.GridHelper(size, divisions, 0xFFFF00, 0xFFFF00);
        gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        
        this.scene.add(this.groundPlane);
        this.scene.add(gridHelper);
        
        // Store grid size for snapping calculations
        this.gridSize = size / divisions;
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

    createModernRoom() {
        // Remove any existing walls but keep the ground
        this.scene.traverse((object) => {
            if (object.userData.isRoomElement) {
                this.scene.remove(object);
            }
        });

        // Room dimensions
        const roomWidth = 10;  
        const roomLength = 10; 
        const roomHeight = 3;  
        const wallThickness = 0.1; 

        // Create walls with a warm beige color
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xF5E6D3,
            roughness: 0.7,
            metalness: 0.1
        });

        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(roomWidth, roomHeight, wallThickness),
            wallMaterial
        );
        backWall.position.set(0, roomHeight/2, -roomLength/2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        backWall.userData.isRoomElement = true;
        this.scene.add(backWall);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, roomHeight, roomLength),
            wallMaterial
        );
        leftWall.position.set(-roomWidth/2, roomHeight/2, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        leftWall.userData.isRoomElement = true;
        this.scene.add(leftWall);

        // Right wall with window
        const windowHeight = 2;    
        const windowWidth = 3;     
        const windowBottom = 0.8;  

        // Lower wall
        const rightWallLower = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, windowBottom, roomLength),
            wallMaterial
        );
        rightWallLower.position.set(roomWidth/2, windowBottom/2, 0);
        rightWallLower.castShadow = true;
        rightWallLower.receiveShadow = true;
        rightWallLower.userData.isRoomElement = true;
        this.scene.add(rightWallLower);

        // Upper wall
        const upperWallHeight = roomHeight - (windowBottom + windowHeight);
        const rightWallUpper = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, upperWallHeight, roomLength),
            wallMaterial
        );
        rightWallUpper.position.set(roomWidth/2, roomHeight - upperWallHeight/2, 0);
        rightWallUpper.castShadow = true;
        rightWallUpper.receiveShadow = true;
        rightWallUpper.userData.isRoomElement = true;
        this.scene.add(rightWallUpper);

        // Update camera position for better view
        this.camera.position.set(roomWidth/3, roomHeight/2, roomLength/3);
        this.camera.lookAt(0, roomHeight/3, 0);
        this.controls.target.set(0, roomHeight/3, 0);
        this.controls.update();
    }
}
