import { SceneManager } from './managers/SceneManager.js';
import { ObjectManager } from './managers/ObjectManager.js';
import { DragDropManager } from './managers/DragDropManager.js';

class BlockCustomizer {
    constructor() {
        // Simple array of models
        this.models = [
            { name: 'Modern TV Unit', path: 'models/1.glb', isGLB: true, scale: 1 },
            { name: 'Classic TV Unit', path: 'models/2.glb', isGLB: true, scale: 1 },
            { name: 'L-Shaped Sofa', path: 'models/3.glb', isGLB: true, scale: 1 },
            { name: '3-Seater Sofa', path: 'models/4.glb', isGLB: true, scale: 1 },
            { name: 'Double Bed', path: 'models/5.glb', isGLB: true, scale: 1 },
            { name: 'Single Bed', path: 'models/6.glb', isGLB: true, scale: 1 },
            { name: 'Sliding Wardrobe', path: 'models/7.glb', isGLB: true, scale: 1 },
            { name: '2-Door Wardrobe', path: 'models/8.glb', isGLB: true, scale: 1 },
            { name: 'Dining Table', path: 'models/9.glb', isGLB: true, scale: 1 },
            { name: 'Coffee Table', path: 'models/10.glb', isGLB: true, scale: 1 },
            { name: 'Dining Chair', path: 'models/11.glb', isGLB: true, scale: 1 },
            { name: 'Bar Stool', path: 'models/12.glb', isGLB: true, scale: 1 },
            { name: 'Bookshelf', path: 'models/13.glb', isGLB: true, scale: 1 },
            { name: 'Cabinet', path: 'models/14.glb', isGLB: true, scale: 1 },
            { name: 'Table Lamp', path: 'models/15.glb', isGLB: true, scale: 1 },
            { name: 'Plant Pot', path: 'models/16.glb', isGLB: true, scale: 1 }
        ];

        // Initialize managers and scene
        this.sceneManager = new SceneManager(document.getElementById('canvas-container'));
        this.objectManager = new ObjectManager();
        this.dragDropManager = new DragDropManager(this.sceneManager, this.objectManager);
        
        this.setupUI();
        this.setupEventListeners();
        this.animate();
    }

    setupUI() {
        this.createBlockPalette();
        this.createButtons();
    }

    createBlockPalette() {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = ''; // Clear existing content
        
        // Add header with clear button
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            background: #f5f5f5;
        `;

        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Furniture Library';
        title.style.cssText = `
            margin: 0;
            color: #333;
            font-size: 20px;
            font-weight: 600;
        `;

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Room';
        clearButton.style.cssText = `
            background-color: #ff4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;

        clearButton.addEventListener('click', () => {
            [...this.objectManager.objects].forEach(object => {
                this.sceneManager.removeObject(object);
                this.objectManager.removeObject(object);
            });
        });

        titleContainer.appendChild(title);
        titleContainer.appendChild(clearButton);
        header.appendChild(titleContainer);
        sidebar.appendChild(header);

        // Create model list container
        const modelList = document.createElement('div');
        modelList.style.cssText = `
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            overflow-y: auto;
            max-height: calc(100vh - 100px);
        `;

        // Add models
        this.models.forEach(item => {
            const modelItem = document.createElement('div');
            modelItem.draggable = true;
            modelItem.style.cssText = `
                padding: 15px;
                background: white;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 6px;
                cursor: move;
                font-size: 14px;
                transition: all 0.2s;
                user-select: none;
            `;

            modelItem.textContent = item.name;

            // Add hover effects
            modelItem.addEventListener('mouseenter', () => {
                modelItem.style.transform = 'translateX(5px)';
                modelItem.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                modelItem.style.borderColor = '#4CAF50';
            });

            modelItem.addEventListener('mouseleave', () => {
                modelItem.style.transform = 'translateX(0)';
                modelItem.style.boxShadow = 'none';
                modelItem.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            });

            modelItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                modelItem.style.opacity = '0.5';
                this.dragDropManager.handleDragStart(e, item);
            });

            modelItem.addEventListener('dragend', (e) => {
                e.preventDefault();
                modelItem.style.opacity = '1';
                if (this.dragDropManager.isDragging) {
                    this.dragDropManager.isDragging = false;
                    if (this.dragDropManager.objectManager.previewMesh) {
                        this.dragDropManager.sceneManager.removeObject(this.dragDropManager.objectManager.previewMesh);
                        this.dragDropManager.objectManager.previewMesh = null;
                    }
                }
            });

            modelList.appendChild(modelItem);
        });

        sidebar.appendChild(modelList);

        // Add custom scrollbar styles
        const style = document.createElement('style');
        style.textContent = `
            #sidebar::-webkit-scrollbar {
                width: 8px;
            }

            #sidebar::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05);
            }

            #sidebar::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
            }

            #sidebar::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    createButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.bottom = '20px';
        buttonContainer.style.left = '50%';
        buttonContainer.style.transform = 'translateX(-50%)';
        buttonContainer.style.zIndex = '100';

        const resetBtn = document.createElement('button');
        resetBtn.id = 'reset-btn';
        resetBtn.textContent = 'Reset Scene';
        resetBtn.style.cssText = `
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;

        buttonContainer.appendChild(resetBtn);
        document.body.appendChild(buttonContainer);
    }

    setupEventListeners() {
        const canvasContainer = document.getElementById('canvas-container');
        
        canvasContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragDropManager.handleDragOver(e);
        });
        
        canvasContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragDropManager.handleDragLeave(e);
        });
        
        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragDropManager.handleDrop(e);
        });

        document.getElementById('reset-btn').addEventListener('click', () => this.resetScene());

        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
        });
    }

    animate() {
        this.sceneManager.animate();
    }

    resetScene() {
        // Remove all objects
        this.objectManager.objects.forEach(obj => {
            this.sceneManager.removeObject(obj);
        });
        this.objectManager.objects = [];
        
        // Reset camera
        this.sceneManager.camera.position.set(8, 5, 12);
        this.sceneManager.camera.lookAt(0, 0, 0);
        this.sceneManager.controls.reset();
    }
}

// Create instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlockCustomizer();
});
