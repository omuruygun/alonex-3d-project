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
                model.scale.setScalar(blockType.scale || 1);
                
                // Reset position and rotation
                model.position.set(0, 0, 0);
                model.rotation.set(0, 0, 0);
                
                // Add model to container
                container.add(model);
                
                // Calculate bounding box
                const bbox = new THREE.Box3().setFromObject(model);
                const dimensions = new THREE.Vector3();
                bbox.getSize(dimensions);
                
                // Center model in container
                const center = bbox.getCenter(new THREE.Vector3());
                model.position.sub(center);
                model.position.y = -dimensions.y / 2;
                
                // Set container position
                if (position) {
                    if (position.y === 0) {
                        position.y = dimensions.y / 2;
                    } else {
                        position.y += dimensions.y / 2;
                    }
                    container.position.copy(position);
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

                resolve(container);
            });
        });
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
                const mesh = new THREE.Mesh(geometry, previewMaterial);
                mesh.userData.type = 'geometry';
                mesh.userData.isInteractive = true;
                this.previewMesh = mesh;
                resolve(mesh);
            } else if (blockType.isGLB) {
                this.createGLBObject(blockType).then(container => {
                    container.traverse((node) => {
                        if (node.isMesh) {
                            node.material = previewMaterial.clone();
                        }
                    });
                    this.previewMesh = container;
                    resolve(container);
                });
            }
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
