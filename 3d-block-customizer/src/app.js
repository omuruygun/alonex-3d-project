import { SceneManager } from './managers/SceneManager.js';
import { ObjectManager } from './managers/ObjectManager.js';
import { DragDropManager } from './managers/DragDropManager.js';
import Sidebar from './components/Sidebar.js';

class BlockCustomizer {
    constructor() {
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

        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Initialize scene and managers
        const container = document.getElementById('canvas-container');
        if (!container) {
            console.error('Canvas container not found');
            return;
        }

        this.sceneManager = new SceneManager(container);
        this.objectManager = new ObjectManager(this.sceneManager);
        this.dragDropManager = new DragDropManager(this.sceneManager, this.objectManager);

        // Initialize sidebar
        this.sidebar = new Sidebar();

        // Listen for wardrobe selection
        document.addEventListener('wardrobeSelected', (event) => {
            const { selectedImage, availableModels } = event.detail;
            this.filterModels(availableModels);
        });

        this.setupEventListeners();
        
        // Start the animation loop
        this.sceneManager.animate();
    }

    filterModels(availableModels) {
        // Create or get the models container
        let modelsContainer = document.querySelector('.models-container');
        if (!modelsContainer) {
            modelsContainer = document.createElement('div');
            modelsContainer.className = 'models-container';
            modelsContainer.style.cssText = `
                position: fixed;
                right: 20px;
                top: 20px;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-height: 80vh;
                overflow-y: auto;
                z-index: 1000;
            `;
            document.body.appendChild(modelsContainer);
        }

        // Clear existing content
        modelsContainer.innerHTML = '<h3 style="margin-bottom: 15px;">Available Models</h3>';

        // Filter and display available models
        this.models.forEach((model, index) => {
            if (availableModels.includes((index + 1).toString())) {
                const modelBtn = document.createElement('div');
                modelBtn.textContent = model.name;
                modelBtn.className = 'model-option';
                modelBtn.draggable = true;
                modelBtn.dataset.modelId = (index + 1).toString();
                modelBtn.style.cssText = `
                    display: block;
                    width: 100%;
                    padding: 10px;
                    margin: 5px 0;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: move;
                    transition: all 0.2s;
                    user-select: none;
                `;

                // Add hover effects
                modelBtn.addEventListener('mouseenter', () => {
                    modelBtn.style.transform = 'translateX(5px)';
                    modelBtn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    modelBtn.style.borderColor = '#4CAF50';
                });

                modelBtn.addEventListener('mouseleave', () => {
                    modelBtn.style.transform = 'translateX(0)';
                    modelBtn.style.boxShadow = 'none';
                    modelBtn.style.borderColor = '#ddd';
                });

                // Add drag and drop functionality
                modelBtn.addEventListener('dragstart', (e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    modelBtn.style.opacity = '0.5';
                    this.dragDropManager.handleDragStart(e, model);
                });

                modelBtn.addEventListener('dragend', (e) => {
                    e.preventDefault();
                    modelBtn.style.opacity = '1';
                    if (this.dragDropManager.isDragging) {
                        this.dragDropManager.isDragging = false;
                        if (this.dragDropManager.objectManager.previewMesh) {
                            this.dragDropManager.sceneManager.removeObject(this.dragDropManager.objectManager.previewMesh);
                            this.dragDropManager.objectManager.previewMesh = null;
                        }
                    }
                });

                modelsContainer.appendChild(modelBtn);
            }
        });
    }

    setupEventListeners() {
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        const clearBtn = document.getElementById('clear-btn');

        if (saveBtn) saveBtn.addEventListener('click', () => this.sceneManager.saveScene());
        if (loadBtn) loadBtn.addEventListener('click', () => this.sceneManager.loadScene());
        if (clearBtn) clearBtn.addEventListener('click', () => this.resetScene());

        const canvasContainer = document.getElementById('canvas-container');
        
        canvasContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            this.dragDropManager.handleDragEnter(e);
        });

        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dragDropManager.handleDragOver(e);
        });

        canvasContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dragDropManager.handleDragLeave(e);
        });

        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dragDropManager.handleDrop(e);
        });

        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
        });
    }

    animate() {
        if (this.sceneManager) {
            this.sceneManager.render();
            requestAnimationFrame(() => this.animate());
        }
    }

    resetScene() {
        if (this.sceneManager) {
            this.sceneManager.clearScene();
        }
    }
}

// Create instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlockCustomizer();
});
