import * as THREE from 'three';

export class DragDropManager {
    constructor(sceneManager, objectManager) {
        this.sceneManager = sceneManager;
        this.objectManager = objectManager;
        this.raycaster = new THREE.Raycaster();
        this.currentDragBlockType = null;
        this.lastIntersectedObject = null;
    }

    handleDragStart(e, blockType) {
        e.dataTransfer.setData('blockType', blockType.name);
        this.currentDragBlockType = blockType;

        // Create and show preview
        this.objectManager.createPreview(blockType).then(preview => {
            if (preview) {
                this.sceneManager.addObject(preview);
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.currentDragBlockType || !this.objectManager.previewMesh) return;

        const intersectionInfo = this.getIntersectionPoint(e);
        if (intersectionInfo) {
            const { point, object: intersectedObject } = intersectionInfo;
            let finalPosition = point.clone();

            // If intersecting with an object (not ground), align and stack
            if (intersectedObject && intersectedObject.userData.isInteractive) {
                const targetBox = new THREE.Box3().setFromObject(intersectedObject);
                const previewBox = new THREE.Box3().setFromObject(this.objectManager.previewMesh);
                
                // Calculate center position of target object
                const targetCenter = new THREE.Vector3();
                targetBox.getCenter(targetCenter);
                
                // Set position to be centered on target object and at the correct height
                finalPosition.x = targetCenter.x;
                finalPosition.z = targetCenter.z;
                finalPosition.y = targetBox.max.y;

                // Update last intersected object
                this.lastIntersectedObject = intersectedObject;
            } else {
                // If not intersecting with an object, clear last intersected
                this.lastIntersectedObject = null;
                
                // Snap to grid when placing on ground
                finalPosition.x = Math.round(finalPosition.x);
                finalPosition.z = Math.round(finalPosition.z);
            }

            // Update preview position
            this.objectManager.previewMesh.position.copy(finalPosition);
        }
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.currentDragBlockType) return;

        const intersectionInfo = this.getIntersectionPoint(e);
        if (intersectionInfo) {
            const { point, object: intersectedObject } = intersectionInfo;
            let finalPosition = point.clone();
            let canPlace = true;

            // If dropping on an object, check for collisions with other objects
            if (intersectedObject && intersectedObject.userData.isInteractive) {
                const targetBox = new THREE.Box3().setFromObject(intersectedObject);
                const targetCenter = new THREE.Vector3();
                targetBox.getCenter(targetCenter);
                
                finalPosition.x = targetCenter.x;
                finalPosition.z = targetCenter.z;
                finalPosition.y = targetBox.max.y;

                // Create a temporary object to check collisions
                this.objectManager.createObject(this.currentDragBlockType, finalPosition)
                    .then(tempObject => {
                        // Check collisions with all other objects
                        for (const existingObject of this.objectManager.objects) {
                            if (existingObject !== intersectedObject && 
                                this.objectManager.checkCollision(tempObject, existingObject)) {
                                canPlace = false;
                                break;
                            }
                        }

                        if (canPlace) {
                            // Remove preview
                            if (this.objectManager.previewMesh) {
                                this.sceneManager.removeObject(this.objectManager.previewMesh);
                                this.objectManager.removePreview();
                            }

                            // Add the new object
                            this.sceneManager.addObject(tempObject);
                            this.objectManager.addObject(tempObject);
                            this.objectManager.selectObject(tempObject);

                            // Establish parent-child relationship
                            tempObject.userData.parent = intersectedObject;
                            if (!intersectedObject.userData.children) {
                                intersectedObject.userData.children = [];
                            }
                            intersectedObject.userData.children.push(tempObject);
                        } else {
                            // If can't place, remove the temporary object
                            this.sceneManager.removeObject(tempObject);
                        }
                    });
            } else {
                // Placing on ground
                finalPosition.x = Math.round(finalPosition.x);
                finalPosition.z = Math.round(finalPosition.z);

                this.objectManager.createObject(this.currentDragBlockType, finalPosition)
                    .then(object => {
                        // Check collisions with existing objects
                        for (const existingObject of this.objectManager.objects) {
                            if (this.objectManager.checkCollision(object, existingObject)) {
                                canPlace = false;
                                break;
                            }
                        }

                        if (canPlace) {
                            // Remove preview
                            if (this.objectManager.previewMesh) {
                                this.sceneManager.removeObject(this.objectManager.previewMesh);
                                this.objectManager.removePreview();
                            }

                            // Add the new object
                            this.sceneManager.addObject(object);
                            this.objectManager.addObject(object);
                            this.objectManager.selectObject(object);
                        } else {
                            // If can't place, remove the object
                            this.sceneManager.removeObject(object);
                        }
                    });
            }
        }

        this.currentDragBlockType = null;
        this.lastIntersectedObject = null;
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (this.objectManager.previewMesh) {
            this.sceneManager.removeObject(this.objectManager.previewMesh);
            this.objectManager.removePreview();
        }
        this.lastIntersectedObject = null;
    }

    getIntersectionPoint(e) {
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.camera);
        
        // Get all valid targets for intersection, excluding the preview mesh
        const validTargets = [
            this.sceneManager.groundPlane,
            ...this.objectManager.objects.filter(obj => obj !== this.objectManager.previewMesh)
        ];

        const intersects = this.raycaster.intersectObjects(validTargets, true);
        
        if (intersects.length > 0) {
            // Find the actual object that was intersected (might be a child mesh)
            let intersectedObject = intersects[0].object;
            while (intersectedObject.parent && !intersectedObject.userData.isInteractive) {
                intersectedObject = intersectedObject.parent;
            }

            return {
                point: intersects[0].point,
                object: intersectedObject
            };
        }

        return null;
    }
}
