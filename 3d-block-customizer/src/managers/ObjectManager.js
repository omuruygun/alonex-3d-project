import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ObjectManager {
    constructor() {
        this.objects = [];
        this.gltfLoader = new GLTFLoader();
        this.previewMesh = null;
        this.selectedObject = null;
        this.objectRotation = 0;
    }

    createObject(blockType, position) {
        return new Promise((resolve) => {
            if (blockType.type === 'geometry') {
                const mesh = this.createGeometryObject(blockType);
                const height = this.getObjectHeight(mesh);
                position.y += height / 2;
                mesh.position.copy(position);
                resolve(mesh);
            } else if (blockType.isGLB) {
                this.createGLBObject(blockType, position).then(resolve);
            }
        });
    }

    getObjectHeight(object) {
        const bbox = new THREE.Box3().setFromObject(object);
        return bbox.max.y - bbox.min.y;
    }

    createGeometryObject(blockType) {
        const geometry = this.createGeometry(blockType);
        const material = new THREE.MeshStandardMaterial({
            color: blockType.color || 0xcccccc,
            metalness: 0.3,
            roughness: 0.4,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.type = 'geometry';
        mesh.userData.isInteractive = true;

        return mesh;
    }

    createGeometry(blockType) {
        switch (blockType.geometry) {
            case 'cube':
                return new THREE.BoxGeometry(
                    blockType.size.width,
                    blockType.size.height,
                    blockType.size.depth
                );
            case 'sphere':
                return new THREE.SphereGeometry(blockType.size.radius, 32, 32);
            case 'cylinder':
                return new THREE.CylinderGeometry(
                    blockType.size.radius,
                    blockType.size.radius,
                    blockType.size.height,
                    32
                );
            default:
                throw new Error(`Unknown geometry type: ${blockType.geometry}`);
        }
    }

    createGLBObject(blockType, position) {
        return new Promise((resolve) => {
            this.gltfLoader.load(blockType.path, (gltf) => {
                const container = new THREE.Group();
                container.userData.type = 'glb';
                container.userData.isInteractive = true;

                const model = gltf.scene;
                
                // Apply initial scale
                model.scale.setScalar(blockType.scale || 1);
                
                // Update world matrix to ensure correct positions
                model.updateWorldMatrix(true, true);
                
                // Create a new group for the processed model
                const processedGroup = new THREE.Group();
                
                // Process all meshes
                model.traverse((node) => {
                    if (node.isMesh) {
                        // Clone the mesh to preserve materials
                        const clonedMesh = node.clone();
                        
                        // Get world position and apply it
                        const worldPos = new THREE.Vector3();
                        node.getWorldPosition(worldPos);
                        clonedMesh.position.copy(worldPos);
                        
                        // Get world quaternion and apply it
                        const worldQuat = new THREE.Quaternion();
                        node.getWorldQuaternion(worldQuat);
                        clonedMesh.quaternion.copy(worldQuat);
                        
                        // Get world scale and apply it
                        const worldScale = new THREE.Vector3();
                        node.getWorldScale(worldScale);
                        clonedMesh.scale.copy(worldScale);
                        
                        // Setup shadows
                        clonedMesh.castShadow = true;
                        clonedMesh.receiveShadow = true;
                        
                        // Adjust material properties
                        if (clonedMesh.material) {
                            clonedMesh.material = clonedMesh.material.clone();
                            clonedMesh.material.metalness = 0.1;
                            clonedMesh.material.roughness = 0.8;
                        }
                        
                        processedGroup.add(clonedMesh);
                    }
                });
                
                // Calculate bounding box
                const bbox = new THREE.Box3().setFromObject(processedGroup);
                const center = bbox.getCenter(new THREE.Vector3());
                
                // Center the processed group
                processedGroup.position.set(-center.x, -bbox.min.y, -center.z);
                
                // Add to container
                container.add(processedGroup);
                
                // Position container if specified
                if (position) {
                    container.position.copy(position);
                }

                resolve(container);
            });
        });
    }

    createPreview(blockType) {
        return this.createGLBObject(blockType, new THREE.Vector3(0, 0, 0)).then(preview => {
            if (this.previewMesh) {
                this.removePreview();
            }
            
            preview.traverse((child) => {
                if (child.isMesh) {
                    const material = child.material.clone();
                    material.transparent = true;
                    material.opacity = 0.5;
                    child.material = material;
                }
            });
            
            this.previewMesh = preview;
            return preview;
        });
    }

    selectObject(object) {
        // Deselect previous object if any
        if (this.selectedObject) {
            this.deselectObject();
        }

        // Select new object
        this.selectedObject = object;
        if (object) {
            console.log('Object selected:', object);
            // Store current rotation
            this.objectRotation = (Math.round(object.rotation.y * (180/Math.PI)) + 360) % 360;
            // Add selection visual feedback
            object.traverse((node) => {
                if (node.isMesh && node.material) {
                    node.material.emissive = new THREE.Color(0x555555);
                }
            });
        }
    }

    deselectObject() {
        if (this.selectedObject) {
            console.log('Object deselected');
            // Remove selection visual feedback
            this.selectedObject.traverse((node) => {
                if (node.isMesh && node.material) {
                    node.material.emissive = new THREE.Color(0x000000);
                }
            });
            this.selectedObject = null;
            this.objectRotation = 0;
        }
    }

    rotateSelectedObject() {
        if (this.selectedObject) {
            console.log('Rotating selected object');
            this.objectRotation = (this.objectRotation + 90) % 360;
            this.selectedObject.rotation.y = THREE.MathUtils.degToRad(this.objectRotation);
            return true;
        }
        return false;
    }

    addObject(object) {
        this.objects.push(object);
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
        if (object === this.selectedObject) {
            this.deselectObject();
        }
    }

    checkCollision(object1, object2) {
        const box1 = new THREE.Box3().setFromObject(object1);
        const box2 = new THREE.Box3().setFromObject(object2);
        return box1.intersectsBox(box2);
    }
}
