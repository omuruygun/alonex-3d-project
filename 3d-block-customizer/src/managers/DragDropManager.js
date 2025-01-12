import * as THREE from 'three';

export class DragDropManager {
    constructor(sceneManager, objectManager) {
        console.log('DragDropManager initialized');
        this.sceneManager = sceneManager;
        this.objectManager = objectManager;
        this.raycaster = new THREE.Raycaster();
        this.currentDragBlockType = null;
        this.lastIntersectedObject = null;
        this.currentRotation = 0;
        this.isDragging = false;
        this.mousePosition = new THREE.Vector2();
        
        // Create rotation indicator
        this.rotationIndicator = document.createElement('div');
        this.rotationIndicator.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            pointer-events: none;
            display: none;
            z-index: 1000;
        `;
        document.body.appendChild(this.rotationIndicator);

        // Track mouse position for rotation indicator
        window.addEventListener('mousemove', (e) => {
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
            if (this.isDragging) {
                this.updateRotationIndicator(e);
            }
        });

        // Handle clicks for object selection
        this.sceneManager.renderer.domElement.addEventListener('click', (e) => {
            if (!this.isDragging) {
                const intersect = this.getIntersectedObject(e);
                if (intersect && intersect.object.userData.isInteractive) {
                    this.objectManager.selectObject(intersect.object);
                    this.updateRotationIndicator(e);
                } else {
                    this.objectManager.deselectObject();
                    this.rotationIndicator.style.display = 'none';
                }
            }
        });

        // Global keydown handler
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isDragging && this.objectManager.previewMesh) {
                    console.log('Space pressed during drag, rotating preview');
                    this.rotateObject(this.objectManager.previewMesh);
                } else if (!this.isDragging) {
                    console.log('Space pressed, rotating selected object');
                    if (this.objectManager.rotateSelectedObject()) {
                        this.updateRotationIndicator({ 
                            clientX: this.mousePosition.x, 
                            clientY: this.mousePosition.y 
                        });
                    }
                }
            }
        });
    }

    getIntersectedObject(e) {
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.camera);
        
        const intersects = this.raycaster.intersectObjects(this.objectManager.objects, true);
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj.parent && !obj.userData.isInteractive) {
                obj = obj.parent;
            }
            return { point: intersects[0].point, object: obj };
        }
        return null;
    }

    updateRotationIndicator(e) {
        if (this.isDragging && this.objectManager.previewMesh) {
            this.rotationIndicator.style.display = 'block';
            this.rotationIndicator.style.left = (e.clientX + 20) + 'px';
            this.rotationIndicator.style.top = (e.clientY + 20) + 'px';
            this.rotationIndicator.textContent = `Rotation: ${this.currentRotation}° (Press SPACE to rotate)`;
        } else if (!this.isDragging && this.objectManager.selectedObject) {
            this.rotationIndicator.style.display = 'block';
            this.rotationIndicator.style.left = (e.clientX + 20) + 'px';
            this.rotationIndicator.style.top = (e.clientY + 20) + 'px';
            const rotation = Math.round(this.objectManager.selectedObject.rotation.y * (180/Math.PI));
            this.rotationIndicator.textContent = `Selected Object Rotation: ${rotation}° (Press SPACE to rotate)`;
        } else {
            this.rotationIndicator.style.display = 'none';
        }
    }

    rotateObject(object) {
        if (!object) {
            console.log('No object to rotate');
            return;
        }
        console.log('Rotating object');
        this.currentRotation = (this.currentRotation + 90) % 360;
        object.rotation.y = THREE.MathUtils.degToRad(this.currentRotation);
        console.log('New rotation:', this.currentRotation);
        this.updateRotationIndicator({ clientX: this.mousePosition.x, clientY: this.mousePosition.y });
    }

    handleDragStart(e, blockType) {
        console.log('Drag started', blockType);
        e.dataTransfer.setData('blockType', blockType.name);
        e.dataTransfer.effectAllowed = 'move';
        this.currentDragBlockType = blockType;
        this.isDragging = true;
        this.currentRotation = 0;
        console.log('Set isDragging to true');
        
        // Create preview immediately
        this.objectManager.createPreview(blockType).then(preview => {
            console.log('Preview created:', preview, 'isDragging:', this.isDragging);
            if (preview) {
                this.sceneManager.addObject(preview);
                this.updateRotationIndicator(e);
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (!this.isDragging) {
            console.log('DragOver but isDragging is false');
            return;
        }
        
        if (!this.currentDragBlockType || !this.objectManager.previewMesh) {
            console.log('DragOver but no blockType or previewMesh');
            return;
        }

        console.log('DragOver - isDragging:', this.isDragging);

        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.camera);
        
        const validTargets = [
            this.sceneManager.groundPlane,
            ...this.objectManager.objects.filter(obj => obj !== this.objectManager.previewMesh)
        ];

        const intersects = this.raycaster.intersectObjects(validTargets, true);
        
        if (intersects.length > 0) {
            const intersectionPoint = intersects[0].point;
            let intersectedObject = intersects[0].object;
            
            while (intersectedObject.parent && !intersectedObject.userData.isInteractive) {
                intersectedObject = intersectedObject.parent;
            }

            let finalPosition = intersectionPoint.clone();

            if (intersectedObject && intersectedObject.userData.isInteractive) {
                const existingBBox = new THREE.Box3().setFromObject(intersectedObject);
                const previewBBox = new THREE.Box3().setFromObject(this.objectManager.previewMesh);
                
                // If we're near the top, stack
                if (intersectionPoint.y > existingBBox.max.y - 0.2) {
                    const center = existingBBox.getCenter(new THREE.Vector3());
                    finalPosition.x = center.x;
                    finalPosition.z = center.z;
                    finalPosition.y = existingBBox.max.y;
                } else {
                    // Place beside based on closest edge
                    const center = existingBBox.getCenter(new THREE.Vector3());
                    const toPoint = new THREE.Vector2(
                        intersectionPoint.x - center.x,
                        intersectionPoint.z - center.z
                    );
                    
                    // Determine the closest edge using bounding box dimensions
                    const angle = Math.atan2(toPoint.y, toPoint.x);
                    const PI4 = Math.PI / 4;
                    
                    if (angle > -PI4 && angle <= PI4) {
                        // Right side
                        finalPosition.x = existingBBox.max.x + (previewBBox.max.x - previewBBox.min.x) / 2;
                        finalPosition.z = center.z;
                    } else if (angle > PI4 && angle <= 3 * PI4) {
                        // Front side
                        finalPosition.x = center.x;
                        finalPosition.z = existingBBox.max.z + (previewBBox.max.z - previewBBox.min.z) / 2;
                    } else if (angle > -3 * PI4 && angle <= -PI4) {
                        // Back side
                        finalPosition.x = center.x;
                        finalPosition.z = existingBBox.min.z - (previewBBox.max.z - previewBBox.min.z) / 2;
                    } else {
                        // Left side
                        finalPosition.x = existingBBox.min.x - (previewBBox.max.x - previewBBox.min.x) / 2;
                        finalPosition.z = center.z;
                    }
                    finalPosition.y = 0;
                }
                this.lastIntersectedObject = intersectedObject;
            } else {
                this.lastIntersectedObject = null;
                finalPosition.x = this.snapToGrid(finalPosition.x);
                finalPosition.z = this.snapToGrid(finalPosition.z);
                finalPosition.y = 0;
            }

            if (this.objectManager.previewMesh) {
                this.objectManager.previewMesh.position.copy(finalPosition);
            }
        }

        this.updateRotationIndicator(e);
    }

    handleDragLeave(e) {
        console.log('Drag leave, was dragging:', this.isDragging);
        e.preventDefault();
        if (this.objectManager.previewMesh) {
            this.sceneManager.removeObject(this.objectManager.previewMesh);
            this.objectManager.previewMesh = null;
        }
        this.lastIntersectedObject = null;
        this.isDragging = false;
        this.rotationIndicator.style.display = 'none';
    }

    handleDrop(e) {
        console.log('Drop event, was dragging:', this.isDragging);
        e.preventDefault();
        if (!this.currentDragBlockType) {
            console.log('No current drag block type');
            return;
        }

        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.camera);
        
        const validTargets = [
            this.sceneManager.groundPlane,
            ...this.objectManager.objects.filter(obj => obj !== this.objectManager.previewMesh)
        ];

        const intersects = this.raycaster.intersectObjects(validTargets, true);
        
        if (intersects.length > 0) {
            console.log('Drop intersection:', intersects[0]);
            const intersectionPoint = intersects[0].point;
            let intersectedObject = intersects[0].object;
            
            while (intersectedObject.parent && !intersectedObject.userData.isInteractive) {
                intersectedObject = intersectedObject.parent;
            }

            let finalPosition = intersectionPoint.clone();

            if (intersectedObject && intersectedObject.userData.isInteractive) {
                const existingBBox = new THREE.Box3().setFromObject(intersectedObject);
                const previewBBox = new THREE.Box3().setFromObject(this.objectManager.previewMesh);
                
                // If we're near the top, stack
                if (intersectionPoint.y > existingBBox.max.y - 0.2) {
                    const center = existingBBox.getCenter(new THREE.Vector3());
                    finalPosition.x = center.x;
                    finalPosition.z = center.z;
                    finalPosition.y = existingBBox.max.y;
                } else {
                    // Place beside based on closest edge
                    const center = existingBBox.getCenter(new THREE.Vector3());
                    const toPoint = new THREE.Vector2(
                        intersectionPoint.x - center.x,
                        intersectionPoint.z - center.z
                    );
                    
                    // Determine the closest edge using bounding box dimensions
                    const angle = Math.atan2(toPoint.y, toPoint.x);
                    const PI4 = Math.PI / 4;
                    
                    if (angle > -PI4 && angle <= PI4) {
                        // Right side
                        finalPosition.x = existingBBox.max.x + (previewBBox.max.x - previewBBox.min.x) / 2;
                        finalPosition.z = center.z;
                    } else if (angle > PI4 && angle <= 3 * PI4) {
                        // Front side
                        finalPosition.x = center.x;
                        finalPosition.z = existingBBox.max.z + (previewBBox.max.z - previewBBox.min.z) / 2;
                    } else if (angle > -3 * PI4 && angle <= -PI4) {
                        // Back side
                        finalPosition.x = center.x;
                        finalPosition.z = existingBBox.min.z - (previewBBox.max.z - previewBBox.min.z) / 2;
                    } else {
                        // Left side
                        finalPosition.x = existingBBox.min.x - (previewBBox.max.x - previewBBox.min.x) / 2;
                        finalPosition.z = center.z;
                    }
                    finalPosition.y = 0;
                }
                
                this.lastIntersectedObject = intersectedObject;
            } else {
                finalPosition.x = this.snapToGrid(finalPosition.x);
                finalPosition.z = this.snapToGrid(finalPosition.z);
                finalPosition.y = 0;  // Reset Y to ground level for non-object intersections
            }

            this.objectManager.createObject(this.currentDragBlockType, finalPosition).then(object => {
                console.log('Object created:', object);
                if (object) {
                    // Apply current rotation
                    object.rotation.y = THREE.MathUtils.degToRad(this.currentRotation);

                    if (this.objectManager.previewMesh) {
                        this.sceneManager.removeObject(this.objectManager.previewMesh);
                        this.objectManager.previewMesh = null;
                    }

                    this.sceneManager.addObject(object);
                    this.objectManager.objects.push(object);

                    if (intersectedObject && intersectedObject.userData.isInteractive) {
                        object.userData.parent = intersectedObject;
                        if (!intersectedObject.userData.children) {
                            intersectedObject.userData.children = [];
                        }
                        intersectedObject.userData.children.push(object);
                    }
                }
            });
        }

        this.currentDragBlockType = null;
        this.lastIntersectedObject = null;
        this.isDragging = false;
        this.currentRotation = 0;
        this.rotationIndicator.style.display = 'none';
    }

    snapToGrid(value) {
        const gridSize = this.sceneManager.gridSize;
        return Math.round(value / gridSize) * gridSize;
    }
}