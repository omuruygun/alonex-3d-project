import * as THREE from 'three';

export class RoomManager {
    constructor(scene) {
        this.scene = scene;
        this.createRoom();
    }

    createRoom() {
        // Create walls
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide
        });

        // Floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorTexture = new THREE.TextureLoader().load('textures/wood_floor.jpg');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(4, 4);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Back wall
        const backWallGeometry = new THREE.PlaneGeometry(20, 10);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.z = -10;
        backWall.position.y = 5;
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Left wall
        const leftWallGeometry = new THREE.PlaneGeometry(20, 10);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.x = -10;
        leftWall.position.y = 5;
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // Right wall
        const rightWallGeometry = new THREE.PlaneGeometry(20, 10);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.x = 10;
        rightWall.position.y = 5;
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        // Add skirting
        this.createSkirting(20, new THREE.Vector3(-10, 0, -10), 0); // Back
        this.createSkirting(20, new THREE.Vector3(-10, 0, -10), Math.PI / 2); // Left
        this.createSkirting(20, new THREE.Vector3(10, 0, -10), -Math.PI / 2); // Right

        // Add window
        this.createWindow();
    }

    createSkirting(length, position, rotation) {
        const skirtingGeometry = new THREE.BoxGeometry(length, 0.5, 0.1);
        const skirtingMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
        const skirting = new THREE.Mesh(skirtingGeometry, skirtingMaterial);
        skirting.position.copy(position);
        skirting.position.y = 0.25; // Half height of skirting
        skirting.rotation.y = rotation;
        skirting.receiveShadow = true;
        skirting.castShadow = true;
        this.scene.add(skirting);
    }

    createWindow() {
        // Window frame
        const frameGeometry = new THREE.BoxGeometry(6, 4, 0.2);
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(0, 6, -9.9);
        frame.castShadow = true;
        this.scene.add(frame);

        // Window panes
        const glassGeometry = new THREE.PlaneGeometry(5.8, 3.8);
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.set(0, 6, -9.8);
        this.scene.add(glass);

        // Window dividers
        const dividerVertical = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 3.8, 0.1),
            frameMaterial
        );
        dividerVertical.position.set(0, 6, -9.7);
        this.scene.add(dividerVertical);

        const dividerHorizontal = new THREE.Mesh(
            new THREE.BoxGeometry(5.8, 0.1, 0.1),
            frameMaterial
        );
        dividerHorizontal.position.set(0, 6, -9.7);
        this.scene.add(dividerHorizontal);
    }
}
