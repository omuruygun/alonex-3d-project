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
        // Remove all objects except ground and grid
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            // Skip ground plane and grid helper
            if (!object.userData.isGround && !(object instanceof THREE.GridHelper) && 
                !(object instanceof THREE.Light) && !(object instanceof THREE.Camera)) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
        });
    }
}
