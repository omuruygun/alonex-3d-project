import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ObjectManager {
    constructor() {
        this.objects = [];
        this.gltfLoader = new GLTFLoader();
        this.selectedObject = null;
        this.previewMesh = null;
    }

    createObject(blockType, position) {
        return new Promise((resolve) => {
            if (blockType.type === 'geometry') {
                const mesh = this.createGeometryObject(blockType);
                // Adjust position to account for object height
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
            color: blockType.color,
            metalness: 0.3,
            roughness: 0.4,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.type = blockType.geometry;
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
                const model = gltf.scene;
                
                // Create a container for the model
                const container = new THREE.Group();
                
                // Reset model rotation and position
                model.rotation.set(0, 0, 0);
                model.position.set(0, 0, 0);
                model.updateMatrix();
                
                container.add(model);
                
                // Apply scale first
                model.scale.setScalar(blockType.scale);
                
                // Calculate the accurate bounding box after scaling
                const bbox = new THREE.Box3();
                bbox.setFromObject(model);
                
                // Get actual dimensions
                const dimensions = new THREE.Vector3();
                bbox.getSize(dimensions);
                
                // Create a collision box (slightly smaller than the actual model)
                const collisionGeometry = new THREE.BoxGeometry(
                    dimensions.x * 0.95,
                    dimensions.y * 0.95,
                    dimensions.z * 0.95
                );
                const collisionMaterial = new THREE.MeshBasicMaterial({
                    visible: false
                });
                const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
                collisionMesh.userData.isCollider = true;
                container.add(collisionMesh);
                
                // Position the model within the container
                const center = bbox.getCenter(new THREE.Vector3());
                model.position.sub(center);
                model.position.y = -dimensions.y / 2; // Align bottom with container bottom
                collisionMesh.position.copy(model.position);
                collisionMesh.position.y = -dimensions.y / 2;
                
                // Adjust container position
                if (position.y === 0) {
                    // If placing on ground, set Y to half the height
                    position.y = dimensions.y / 2;
                } else {
                    // If stacking, add half the height to the target position
                    position.y += dimensions.y / 2;
                }
                
                // Snap position to grid
                position.x = Math.round(position.x);
                position.z = Math.round(position.z);
                container.position.copy(position);
                
                // Apply default front-facing rotation
                if (!blockType.rotation) {
                    model.rotation.y = Math.PI;
                } else {
                    model.rotation.set(
                        THREE.MathUtils.degToRad(blockType.rotation.x || 0),
                        THREE.MathUtils.degToRad(blockType.rotation.y || 0),
                        THREE.MathUtils.degToRad(blockType.rotation.z || 0)
                    );
                }
                
                // Set up shadows and materials
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.material) {
                            node.material.metalness = 0.3;
                            node.material.roughness = 0.4;
                        }
                    }
                });

                // Store dimensions and metadata
                container.userData = {
                    type: 'glb',
                    isInteractive: true,
                    model: model,
                    dimensions: dimensions,
                    collider: collisionMesh
                };

                resolve(container);
            });
        });
    }

    checkCollision(object1, object2) {
        const box1 = new THREE.Box3().setFromObject(object1.userData.collider || object1);
        const box2 = new THREE.Box3().setFromObject(object2.userData.collider || object2);
        return box1.intersectsBox(box2);
    }

    createPreview(blockType) {
        return new Promise((resolve) => {
            const previewMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });

            if (blockType.type === 'geometry') {
                const geometry = this.createGeometry(blockType);
                this.previewMesh = new THREE.Mesh(geometry, previewMaterial);
                resolve(this.previewMesh);
            } else if (blockType.isGLB) {
                this.gltfLoader.load(blockType.path, (gltf) => {
                    const model = gltf.scene.clone();
                    
                    // Reset model rotation and position
                    model.rotation.set(0, 0, 0);
                    model.position.set(0, 0, 0);
                    model.updateMatrix();
                    
                    // Create a container for the preview
                    const container = new THREE.Group();
                    container.add(model);
                    
                    // Calculate bounding box and center the model
                    const bbox = new THREE.Box3().setFromObject(model);
                    const modelHeight = bbox.max.y - bbox.min.y;
                    const center = bbox.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                    
                    // Apply scale
                    model.scale.setScalar(blockType.scale);
                    
                    // Apply default front-facing rotation (if not specified in blockType)
                    if (!blockType.rotation) {
                        model.rotation.y = Math.PI; // Rotate 180 degrees to face front
                    } else {
                        model.rotation.set(
                            THREE.MathUtils.degToRad(blockType.rotation.x || 0),
                            THREE.MathUtils.degToRad(blockType.rotation.y || 0),
                            THREE.MathUtils.degToRad(blockType.rotation.z || 0)
                        );
                    }
                    
                    // Create a bounding box helper for better visibility
                    const scaledBbox = new THREE.Box3().setFromObject(model);
                    const boxHelper = new THREE.Box3Helper(scaledBbox, 0x00ff00);
                    boxHelper.material.transparent = true;
                    boxHelper.material.opacity = 0.3;
                    container.add(boxHelper);
                    
                    // Apply preview materials
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.userData.originalMaterial = node.material;
                            const meshPreviewMaterial = previewMaterial.clone();
                            meshPreviewMaterial.color.set(0x00ff00);
                            meshPreviewMaterial.opacity = 0.3;
                            node.material = meshPreviewMaterial;
                        }
                    });

                    this.previewMesh = container;
                    resolve(container);
                });
            }
        });
    }

    removePreview() {
        if (this.previewMesh) {
            // Restore original materials if it's a GLB model
            if (this.previewMesh.userData.type === 'glb') {
                this.previewMesh.userData.model.traverse((node) => {
                    if (node.isMesh && node.userData.originalMaterial) {
                        node.material = node.userData.originalMaterial;
                    }
                });
            }
            this.previewMesh = null;
        }
    }

    addObject(object) {
        this.objects.push(object);
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    selectObject(object) {
        if (this.selectedObject) {
            if (this.selectedObject.userData.model) {
                this.selectedObject.userData.model.traverse((node) => {
                    if (node.isMesh && node.material) {
                        node.material.emissive.setHex(0x000000);
                    }
                });
            } else if (this.selectedObject.material) {
                this.selectedObject.material.emissive.setHex(0x000000);
            }
        }
        
        this.selectedObject = object;
        
        if (object) {
            if (object.userData.model) {
                object.userData.model.traverse((node) => {
                    if (node.isMesh && node.material) {
                        node.material.emissive.setHex(0x333333);
                    }
                });
            } else if (object.material) {
                object.material.emissive.setHex(0x333333);
            }
        }
    }
}
