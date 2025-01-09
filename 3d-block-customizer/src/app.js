import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class BlockCustomizer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.blocks = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.addedObjects = [];
        this.selectedBlock = null;
        this.previewMesh = null;
        this.gltfLoader = new GLTFLoader();
        this.currentDragBlockType = null;

        // Define simple geometric shapes for testing
        this.customModels = [
            { 
                name: 'RedCube',
                type: 'geometry',
                geometry: 'cube',
                color: 0xff0000,
                scale: 1.0,
                size: { width: 1, height: 1, depth: 1 }
            },
            { 
                name: 'BlueSphere',
                type: 'geometry',
                geometry: 'sphere',
                color: 0x0000ff,
                scale: 1.0,
                size: { radius: 0.5 }
            },
            { 
                name: 'GreenCylinder',
                type: 'geometry',
                geometry: 'cylinder',
                color: 0x00ff00,
                scale: 1.0,
                size: { radius: 0.5, height: 1 }
            },
            { 
                name: 'Box',
                path: 'models/Box.glb',
                scale: 2.0,
                preview: true,
                position: { x: 0, y: -0.5, z: 0 },
                rotation: { x: 0, y: Math.PI/4, z: 0 },
                isGLB: true
            },
            { 
                name: 'Duck',
                path: 'models/Duck.glb',
                scale: 1.5,
                preview: true,
                position: { x: 0, y: -0.5, z: 0 },
                rotation: { x: 0, y: Math.PI/4, z: 0 },
                isGLB: true
            },
            { 
                name: 'Commode',
                path: 'models/commode.glb',
                scale: 1.8,
                preview: true,
                position: { x: 0, y: -0.5, z: 0 },
                rotation: { x: 0, y: Math.PI/4, z: 0 },
                isGLB: true
            },
            { 
                name: 'Bed',
                path: 'models/bed.glb',
                scale: 2.0,
                preview: true,
                position: { x: 0, y: -0.5, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                isGLB: true
            },
            { 
                name: 'Table',
                path: 'models/table.glb',
                scale: 1.5,
                preview: true,
                position: { x: 0, y: -0.5, z: 0 },
                rotation: { x: 0, y: Math.PI/4, z: 0 },
                isGLB: true
            }
        ];
        this.currentScale = 1.0;
        this.isMovingBlock = false;
        this.transformMode = 'translate';
        this.history = [];
        this.redoStack = [];

        // Create ground plane for raycasting
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.0
        });
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = 0;
        this.groundPlane.userData.isGround = true; // Mark as ground for raycasting
        this.scene.add(this.groundPlane);

        this.createResetButton();

        this.setupScene();
        this.setupLights();
        this.setupControls();
        this.createRoom();
        this.createBlockPalette();

        // Add button event listeners
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetScene());

        // Add drag over event listener to canvas
        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.addEventListener('dragover', this.handleDragOver.bind(this));
        canvasContainer.addEventListener('dragleave', this.handleDragLeave.bind(this));
        canvasContainer.addEventListener('drop', this.handleDrop.bind(this));

        // Start animation loop
        this.animate();
    }

    createResetButton() {
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset Room';
        resetButton.className = 'reset-button';
        resetButton.addEventListener('click', () => this.resetRoom());
        document.getElementById('block-palette').appendChild(resetButton);
    }

    resetRoom() {
        // Remove all added objects
        this.addedObjects.forEach(obj => {
            this.scene.remove(obj);
        });
        this.addedObjects = [];
        
        // Clear selection
        if (this.selectedBlock) {
            this.selectedBlock.material.emissive.setHex(0x000000);
            this.selectedBlock = null;
        }

        // Remove preview mesh if exists
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
            this.previewMesh = null;
        }
    }

    setupScene() {
        const container = document.getElementById('canvas-container');
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
        this.scene.background = new THREE.Color(0xf0f0f0);
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 0, 0);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    createRoom() {
        // Modern room materials
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5f5f5,
            roughness: 0.2,
            metalness: 0.1
        });

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0e0e0,
            roughness: 0.3,
            metalness: 0.2,
            map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/hardwood2_diffuse.jpg')
        });

        const windowMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            roughness: 0,
            metalness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        // Floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls
        const wallHeight = 10;
        
        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(20, wallHeight, 0.2),
            wallMaterial
        );
        backWall.position.set(0, wallHeight/2, -10);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, wallHeight, 20),
            wallMaterial
        );
        leftWall.position.set(-10, wallHeight/2, 0);
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // Right wall with window
        const rightWallLower = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 3, 20),
            wallMaterial
        );
        rightWallLower.position.set(10, 1.5, 0);
        rightWallLower.receiveShadow = true;
        this.scene.add(rightWallLower);

        const rightWallUpper = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 3, 20),
            wallMaterial
        );
        rightWallUpper.position.set(10, 8.5, 0);
        rightWallUpper.receiveShadow = true;
        this.scene.add(rightWallUpper);

        // Window
        const windowFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 4, 8),
            windowMaterial
        );
        windowFrame.position.set(10, 5, 0);
        this.scene.add(windowFrame);

        // Window frame details
        const frameThickness = 0.1;
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.2,
            metalness: 0.8
        });

        // Horizontal frame
        const horizontalFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, frameThickness, 8),
            frameMaterial
        );
        horizontalFrame.position.set(10, 5, 0);
        this.scene.add(horizontalFrame);

        // Vertical frame
        const verticalFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 4, frameThickness),
            frameMaterial
        );
        verticalFrame.position.set(10, 5, 0);
        this.scene.add(verticalFrame);

        // Add modern skirting boards
        const skirtingMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.3,
            metalness: 0.4
        });

        const createSkirting = (length, position, rotation) => {
            const skirting = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.4, length),
                skirtingMaterial
            );
            skirting.position.copy(position);
            skirting.rotation.y = rotation;
            this.scene.add(skirting);
        };

        // Add skirting boards to walls
        createSkirting(20, new THREE.Vector3(-10, 0.2, 0), 0);
        createSkirting(20, new THREE.Vector3(10, 0.2, 0), 0);
        createSkirting(20, new THREE.Vector3(0, 0.2, -10), Math.PI/2);

        // Update lighting for modern look
        this.setupModernLighting();

        // Add furniture to the room
        this.addRoomFurniture();
    }

    addRoomFurniture() {
        // Create sofa
        const sofaGroup = new THREE.Group();
        
        // Sofa base
        const sofaBase = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        sofaBase.position.y = 0.25;
        sofaBase.castShadow = true;
        sofaBase.receiveShadow = true;
        sofaGroup.add(sofaBase);
        
        // Sofa back
        const sofaBack = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.8, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        sofaBack.position.set(0, 0.8, -0.6);
        sofaBack.castShadow = true;
        sofaGroup.add(sofaBack);
        
        // Sofa arms
        const armGeometry = new THREE.BoxGeometry(0.3, 0.7, 1.5);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-1.35, 0.6, 0);
        leftArm.castShadow = true;
        sofaGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(1.35, 0.6, 0);
        rightArm.castShadow = true;
        sofaGroup.add(rightArm);

        // Position sofa against back wall
        sofaGroup.position.set(0, 0, -8);
        this.scene.add(sofaGroup);

        // Create coffee table
        const tableGroup = new THREE.Group();
        
        // Table top
        const tableTop = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.1, 1),
            new THREE.MeshStandardMaterial({ 
                color: 0xDEB887,
                roughness: 0.3,
                metalness: 0.3
            })
        );
        tableTop.position.y = 0.5;
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        tableGroup.add(tableTop);
        
        // Table legs
        const legGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887 });
        const legPositions = [
            [-0.9, 0.25, -0.4],
            [0.9, 0.25, -0.4],
            [-0.9, 0.25, 0.4],
            [0.9, 0.25, 0.4]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...pos);
            leg.castShadow = true;
            tableGroup.add(leg);
        });

        // Position coffee table in front of sofa
        tableGroup.position.set(0, 0, -6);
        this.scene.add(tableGroup);

        // Create chairs
        const createChair = (x, z, rotation) => {
            const chairGroup = new THREE.Group();
            
            // Seat
            const seat = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.1, 0.8),
                new THREE.MeshStandardMaterial({ color: 0xA0522D })
            );
            seat.position.y = 0.5;
            seat.castShadow = true;
            chairGroup.add(seat);
            
            // Back
            const back = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.8, 0.1),
                new THREE.MeshStandardMaterial({ color: 0xA0522D })
            );
            back.position.set(0, 0.9, -0.35);
            back.castShadow = true;
            chairGroup.add(back);
            
            // Legs
            const chairLegGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.05);
            const chairLegPositions = [
                [-0.35, 0.25, -0.35],
                [0.35, 0.25, -0.35],
                [-0.35, 0.25, 0.35],
                [0.35, 0.25, 0.35]
            ];
            
            chairLegPositions.forEach(pos => {
                const leg = new THREE.Mesh(chairLegGeometry, new THREE.MeshStandardMaterial({ color: 0xA0522D }));
                leg.position.set(...pos);
                leg.castShadow = true;
                chairGroup.add(leg);
            });

            chairGroup.position.set(x, 0, z);
            chairGroup.rotation.y = rotation;
            this.scene.add(chairGroup);
        };

        // Add chairs around the coffee table
        createChair(-2, -6, Math.PI / 4);
        createChair(2, -6, -Math.PI / 4);
        createChair(0, -4, Math.PI);

        // Create TV stand
        const tvStandGroup = new THREE.Group();
        
        // Main body
        const tvStand = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.6, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        tvStand.position.y = 0.3;
        tvStand.castShadow = true;
        tvStand.receiveShadow = true;
        tvStandGroup.add(tvStand);
        
        // Shelves
        const shelfGeometry = new THREE.BoxGeometry(2.3, 0.05, 0.45);
        const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        [0.2, 0.4].forEach(y => {
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.position.set(0, y, 0);
            shelf.castShadow = true;
            tvStandGroup.add(shelf);
        });

        // Position TV stand against back wall
        tvStandGroup.position.set(-6, 0, -9.5);
        this.scene.add(tvStandGroup);
    }

    setupModernLighting() {
        // Clear existing lights
        this.scene.children
            .filter(child => child.isLight)
            .forEach(light => this.scene.remove(light));

        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (sunlight through window)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(15, 8, 5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        // Soft area light for window
        const windowLight = new THREE.RectAreaLight(0xffffff, 2, 8, 4);
        windowLight.position.set(9.9, 5, 0);
        windowLight.lookAt(0, 5, 0);
        this.scene.add(windowLight);

        // Add some accent lights
        const createSpotLight = (position, target) => {
            const spotLight = new THREE.SpotLight(0xffffff, 0.5);
            spotLight.position.copy(position);
            spotLight.target.position.copy(target);
            spotLight.angle = Math.PI / 6;
            spotLight.penumbra = 1;
            spotLight.decay = 2;
            spotLight.distance = 15;
            spotLight.castShadow = true;
            this.scene.add(spotLight);
            this.scene.add(spotLight.target);
        };

        createSpotLight(
            new THREE.Vector3(-5, 8, -5),
            new THREE.Vector3(-5, 0, -5)
        );
        createSpotLight(
            new THREE.Vector3(5, 8, -5),
            new THREE.Vector3(5, 0, -5)
        );
    }

    createBlockPalette() {
        const palette = document.getElementById('block-palette');
        
        // Create a shared renderer for previews
        const previewRenderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: true
        });
        previewRenderer.setSize(80, 80); // Larger preview size
        previewRenderer.setClearColor(0x000000, 0);
        previewRenderer.shadowMap.enabled = true;

        // Add custom models to palette
        this.customModels.forEach(model => {
            const modelElement = document.createElement('div');
            modelElement.className = 'palette-block model-block';
            
            // Add label
            const label = document.createElement('div');
            label.className = 'model-label';
            label.textContent = model.name;
            modelElement.appendChild(label);
            
            // Create a preview scene
            const previewScene = new THREE.Scene();
            const previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
            previewCamera.position.set(2, 2, 2);
            previewCamera.lookAt(0, 0, 0);
            
            // Add lights to preview scene
            const previewLight = new THREE.DirectionalLight(0xffffff, 1);
            previewLight.position.set(1, 1, 1);
            previewScene.add(previewLight);
            previewScene.add(new THREE.AmbientLight(0xffffff, 0.5));
            
            // Create canvas for preview
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 80;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            modelElement.appendChild(canvas);
            
            const renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });
            renderer.setSize(80, 80);
            renderer.setClearColor(0x000000, 0);
            renderer.shadowMap.enabled = true;
            
            // Load and add model to preview scene
            if (model.type === 'geometry') {
                let geometry;
                switch (model.geometry) {
                    case 'cube':
                        geometry = new THREE.BoxGeometry(
                            model.size.width,
                            model.size.height,
                            model.size.depth
                        );
                        break;
                    case 'sphere':
                        geometry = new THREE.SphereGeometry(model.size.radius, 32, 32);
                        break;
                    case 'cylinder':
                        geometry = new THREE.CylinderGeometry(
                            model.size.radius,
                            model.size.radius,
                            model.size.height,
                            32
                        );
                        break;
                }

                const material = new THREE.MeshStandardMaterial({
                    color: model.color,
                    metalness: 0.3,
                    roughness: 0.4,
                });

                const mesh = new THREE.Mesh(geometry, material);
                previewScene.add(mesh);
                
                // Setup animation
                function animate() {
                    mesh.rotation.y += 0.01;
                    renderer.render(previewScene, previewCamera);
                    requestAnimationFrame(animate);
                }
                animate();
            } else if (model.isGLB) {
                this.gltfLoader.load(model.path, (gltf) => {
                    const modelMesh = gltf.scene;
                    
                    // Apply model-specific transformations
                    modelMesh.scale.setScalar(model.scale * 0.3);
                    if (model.position) {
                        modelMesh.position.set(
                            model.position.x,
                            model.position.y,
                            model.position.z
                        );
                    }
                    if (model.rotation) {
                        modelMesh.rotation.set(
                            model.rotation.x,
                            model.rotation.y,
                            model.rotation.z
                        );
                    }
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(modelMesh);
                    const center = box.getCenter(new THREE.Vector3());
                    modelMesh.position.sub(center);
                    
                    previewScene.add(modelMesh);
                    
                    // Setup animation
                    function animate() {
                        modelMesh.rotation.y += 0.01;
                        renderer.render(previewScene, previewCamera);
                        requestAnimationFrame(animate);
                    }
                    animate();
                });
            }
            
            modelElement.setAttribute('data-block-type', model.name);
            modelElement.draggable = true;
            modelElement.addEventListener('dragstart', (e) => this.handleDragStart(e, model));
            
            palette.appendChild(modelElement);
        });
    }

    handleDragStart(e, blockType) {
        e.dataTransfer.setData('blockType', blockType.name);
        e.dataTransfer.setData('blockColor', blockType.color || '#ffffff');
        e.dataTransfer.setData('isGLB', blockType.isGLB || false);
        e.dataTransfer.setData('modelPath', blockType.path || '');
        e.dataTransfer.setData('modelScale', blockType.scale || 1.0);
        e.dataTransfer.setData('geometryType', blockType.type || '');
        
        // Store the current blockType for use during drag
        this.currentDragBlockType = blockType;
        
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
        }

        // Create preview mesh
        if (blockType.type === 'geometry') {
            let geometry;
            switch (blockType.geometry) {
                case 'cube':
                    geometry = new THREE.BoxGeometry(
                        blockType.size.width,
                        blockType.size.height,
                        blockType.size.depth
                    );
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(blockType.size.radius, 32, 32);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(
                        blockType.size.radius,
                        blockType.size.radius,
                        blockType.size.height,
                        32
                    );
                    break;
            }

            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5,
                wireframe: true
            });

            this.previewMesh = new THREE.Mesh(geometry, material);
            this.scene.add(this.previewMesh);
        } else if (blockType.isGLB) {
            // Existing GLB preview logic
            this.gltfLoader.load(blockType.path, (gltf) => {
                const model = gltf.scene;
                model.scale.setScalar(blockType.scale || 1.0);
                
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.material = new THREE.MeshBasicMaterial({
                            color: 0x00ff00,
                            transparent: true,
                            opacity: 0.5,
                            wireframe: true
                        });
                    }
                });
                
                this.previewMesh = model;
                this.scene.add(this.previewMesh);
            });
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        
        if (!this.previewMesh) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        
        const validTargets = this.scene.children.filter(obj => 
            obj !== this.previewMesh && (obj.userData.isGround || obj.userData.isInteractive)
        );
        
        const intersects = this.raycaster.intersectObjects(validTargets, true);
        
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            const intersectedObj = intersects[0].object;
            
            let position;
            if (intersectedObj.userData.isInteractive) {
                // Place on top of other objects
                const targetBox = new THREE.Box3().setFromObject(intersectedObj);
                position = new THREE.Vector3(
                    intersectPoint.x,
                    targetBox.max.y,
                    intersectPoint.z
                );
            } else if (intersectedObj.userData.isGround) {
                // Get height offset based on geometry type
                let heightOffset = 0;
                if (this.currentDragBlockType.type === 'geometry') {
                    switch (this.currentDragBlockType.geometry) {
                        case 'cube':
                            heightOffset = this.currentDragBlockType.size.height / 2;
                            break;
                        case 'sphere':
                            heightOffset = this.currentDragBlockType.size.radius;
                            break;
                        case 'cylinder':
                            heightOffset = this.currentDragBlockType.size.height / 2;
                            break;
                    }
                }
                
                position = new THREE.Vector3(
                    intersectPoint.x,
                    heightOffset, // Place at correct height based on object type
                    intersectPoint.z
                );
            }
            
            if (position) {
                this.previewMesh.position.copy(position);
                this.previewMesh.visible = true;
            }
        } else {
            this.previewMesh.visible = false;
        }
    }

    handleDragLeave(e) {
        if (this.previewMesh) {
            this.previewMesh.visible = false;
        }
    }

    handleDrop(e) {
        e.preventDefault();
        
        if (!this.previewMesh || !this.previewMesh.visible) return; // Only allow drops on valid surfaces
        
        const blockType = e.dataTransfer.getData('blockType');
        const modelPath = e.dataTransfer.getData('modelPath');
        const modelScale = parseFloat(e.dataTransfer.getData('modelScale')) || 1.0;
        const geometryType = e.dataTransfer.getData('geometryType');
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        
        // Only raycast against the ground plane and interactive objects
        const validTargets = this.scene.children.filter(obj => 
            obj !== this.previewMesh && (obj.userData.isGround || obj.userData.isInteractive)
        );
        
        const intersects = this.raycaster.intersectObjects(validTargets, true);
        
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            const intersectedObj = intersects[0].object;
            
            // Find the original model data
            const modelData = this.customModels.find(m => m.name === blockType);
            
            let position;
            if (intersectedObj.userData.isInteractive) {
                // Place on top of other objects
                const targetBox = new THREE.Box3().setFromObject(intersectedObj);
                position = new THREE.Vector3(
                    intersectPoint.x,
                    targetBox.max.y,
                    intersectPoint.z
                );
            } else if (intersectedObj.userData.isGround) {
                // Place directly on the ground
                position = new THREE.Vector3(
                    intersectPoint.x,
                    0,
                    intersectPoint.z
                );
            }
            
            const blockTypeObj = modelData || {
                isGLB: true,
                path: modelPath,
                scale: modelScale,
                name: blockType,
                position: position,
                rotation: { x: 0, y: 0, z: 0 }
            };

            this.createBlock(blockTypeObj, position).then(block => {
                if (this.previewMesh) {
                    this.scene.remove(this.previewMesh);
                    this.previewMesh = null;
                }
                
                this.currentDragBlockType = null;
                
                // Mark the block as interactive for future stacking
                block.userData.isInteractive = true;
                
                this.scene.add(block);
                this.addedObjects.push(block);
                
                if (this.selectedBlock) {
                    this.selectedBlock.material.emissive.setHex(0x000000);
                }
                this.selectedBlock = block;
            });
        }
    }

    createBlock(blockType, position) {
        return new Promise((resolve) => {
            if (blockType.type === 'geometry') {
                // Create basic geometric shape
                let geometry;
                let heightOffset = 0;
                
                switch (blockType.geometry) {
                    case 'cube':
                        geometry = new THREE.BoxGeometry(
                            blockType.size.width,
                            blockType.size.height,
                            blockType.size.depth
                        );
                        heightOffset = blockType.size.height / 2;
                        break;
                    case 'sphere':
                        geometry = new THREE.SphereGeometry(blockType.size.radius, 32, 32);
                        heightOffset = blockType.size.radius;
                        break;
                    case 'cylinder':
                        geometry = new THREE.CylinderGeometry(
                            blockType.size.radius,
                            blockType.size.radius,
                            blockType.size.height,
                            32
                        );
                        heightOffset = blockType.size.height / 2;
                        break;
                }

                const material = new THREE.MeshStandardMaterial({
                    color: blockType.color,
                    metalness: 0.3,
                    roughness: 0.4,
                });

                const mesh = new THREE.Mesh(geometry, material);
                
                // Adjust position based on geometry type
                const adjustedPosition = position.clone();
                if (position.y === 0) {
                    // If placing on ground, add height offset
                    adjustedPosition.y = heightOffset;
                } else {
                    // If stacking, add height offset to the target position
                    adjustedPosition.y += heightOffset;
                }
                
                mesh.position.copy(adjustedPosition);
                mesh.userData.isInteractive = true;
                mesh.userData.type = blockType.geometry;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                resolve(mesh);
            } else if (blockType.isGLB) {
                // Existing GLB loading logic
                this.gltfLoader.load(blockType.path, (gltf) => {
                    const model = gltf.scene;
                    model.scale.setScalar(blockType.scale);
                    
                    // Calculate the height offset for GLB models
                    const box = new THREE.Box3().setFromObject(model);
                    const heightOffset = (box.max.y - box.min.y) / 2;
                    
                    // Adjust position based on model height
                    const adjustedPosition = position.clone();
                    if (position.y === 0) {
                        adjustedPosition.y = heightOffset;
                    } else {
                        adjustedPosition.y += heightOffset;
                    }
                    
                    model.position.copy(adjustedPosition);
                    model.userData.isInteractive = true;
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    
                    resolve(model);
                });
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    createTestBlocks() {
        // Add some test blocks to the scene
        const cube = this.createNewBlock('cube');
        cube.position.set(-2, 0.5, 0);
        this.blocks.push(cube);
        this.scene.add(cube);

        const sphere = this.createNewBlock('sphere');
        sphere.position.set(0, 0.5, 0);
        this.blocks.push(sphere);
        this.scene.add(sphere);

        const cylinder = this.createNewBlock('cylinder');
        cylinder.position.set(2, 0.5, 0);
        this.blocks.push(cylinder);
        this.scene.add(cylinder);
    }

    createNewBlock(blockType) {
        let geometry;
        switch(blockType.toLowerCase()) {
            case 'cube':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(0.5, 1);
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        const material = new THREE.MeshStandardMaterial({ 
            color: Math.random() * 0xffffff,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    undo() {
        if (this.history.length === 0) return;

        const action = this.history.pop();
        this.redoStack.push(action);

        switch (action.type) {
            case 'add':
                // Remove the object from its parent's children array if it has a parent
                if (action.object.userData.parent) {
                    const parent = action.object.userData.parent;
                    const index = parent.userData.children.indexOf(action.object);
                    if (index > -1) {
                        parent.userData.children.splice(index, 1);
                    }
                }

                // Remove the object and all its children recursively
                this.removeObjectAndChildren(action.object);
                break;
        }

        this.updateUndoRedoButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const action = this.redoStack.pop();
        this.history.push(action);

        switch (action.type) {
            case 'add':
                // Restore the object
                this.scene.add(action.object);
                this.blocks.push(action.object);

                // Restore parent-child relationship
                if (action.parent) {
                    action.object.userData.parent = action.parent;
                    if (!action.parent.userData.children) {
                        action.parent.userData.children = [];
                    }
                    action.parent.userData.children.push(action.object);
                }
                break;
        }

        this.updateUndoRedoButtons();
    }

    resetScene() {
        // Remove all blocks except the ground plane
        while (this.blocks.length > 0) {
            const block = this.blocks.pop();
            this.removeObjectAndChildren(block);
        }

        // Clear history and redo stack
        this.history = [];
        this.redoStack = [];

        // Reset camera position
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();

        this.updateUndoRedoButtons();
    }

    removeObjectAndChildren(object) {
        // Recursively remove all children
        if (object.userData.children) {
            [...object.userData.children].forEach(child => {
                this.removeObjectAndChildren(child);
            });
        }

        // Remove from blocks array
        const index = this.blocks.indexOf(object);
        if (index > -1) {
            this.blocks.splice(index, 1);
        }

        // Remove from scene
        this.scene.remove(object);
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.disabled = this.history.length === 0;
            undoBtn.style.opacity = this.history.length === 0 ? '0.5' : '1';
        }

        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
            redoBtn.style.opacity = this.redoStack.length === 0 ? '0.5' : '1';
        }
    }
}

// Create instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlockCustomizer();
});
