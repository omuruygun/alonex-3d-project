import { SceneManager } from './managers/SceneManager.js';
import { ObjectManager } from './managers/ObjectManager.js';
import { DragDropManager } from './managers/DragDropManager.js';

class BlockCustomizer {
    constructor() {
        // Remove the old customModels array and replace with categorized furniture
        this.productCategories = {
            'Living Room': {
                'TV Units': [
                    { name: 'Modern TV Unit', path: 'models/1.glb', isGLB: true, scale: 1 },
                    { name: 'Classic TV Unit', path: 'models/2.glb', isGLB: true, scale: 1 }
                ],
                'Sofas': [
                    { name: 'L-Shaped Sofa', path: 'models/3.glb', isGLB: true, scale: 1 },
                    { name: '3-Seater Sofa', path: 'models/4.glb', isGLB: true, scale: 1 }
                ]
            },
            'Bedroom': {
                'Beds': [
                    { name: 'Double Bed', path: 'models/5.glb', isGLB: true, scale: 1 },
                    { name: 'Single Bed', path: 'models/6.glb', isGLB: true, scale: 1 }
                ],
                'Wardrobes': [
                    { name: 'Sliding Wardrobe', path: 'models/7.glb', isGLB: true, scale: 1 },
                    { name: '2-Door Wardrobe', path: 'models/8.glb', isGLB: true, scale: 1 }
                ]
            },
            'Dining': {
                'Tables': [
                    { name: 'Dining Table', path: 'models/9.glb', isGLB: true, scale: 1 },
                    { name: 'Coffee Table', path: 'models/10.glb', isGLB: true, scale: 1 }
                ],
                'Chairs': [
                    { name: 'Dining Chair', path: 'models/11.glb', isGLB: true, scale: 1 },
                    { name: 'Bar Stool', path: 'models/12.glb', isGLB: true, scale: 1 }
                ]
            },
            'Utility': {
                'Storage': [
                    { name: 'Bookshelf', path: 'models/13.glb', isGLB: true, scale: 1 },
                    { name: 'Cabinet', path: 'models/14.glb', isGLB: true, scale: 1 }
                ],
                'Decor': [
                    { name: 'Table Lamp', path: 'models/15.glb', isGLB: true, scale: 1 },
                    { name: 'Plant Pot', path: 'models/16.glb', isGLB: true, scale: 1 }
                ]
            }
        };

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
        // Remove any existing palette
        const existingPalette = document.getElementById('block-palette');
        if (existingPalette) {
            existingPalette.remove();
        }

        // Create main container
        const sidebar = document.createElement('div');
        sidebar.id = 'block-palette';
        sidebar.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 300px;
            background-color: rgba(255, 255, 255, 0.95);
            padding: 20px;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
            font-family: 'Arial', sans-serif;
            overflow-y: auto;
            backdrop-filter: blur(10px);
            border-right: 1px solid rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            gap: 20px;
        `;

        // Add header with clear button
        const header = document.createElement('div');
        header.style.cssText = `
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            background: rgba(255, 255, 255, 0.95);
            z-index: 1;
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

        // Add clear room button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Room';
        clearButton.style.cssText = `
            background-color: #ff4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        `;

        // Add hover effect
        clearButton.addEventListener('mouseenter', () => {
            clearButton.style.backgroundColor = '#ff6666';
            clearButton.style.transform = 'translateY(-1px)';
            clearButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        });

        clearButton.addEventListener('mouseleave', () => {
            clearButton.style.backgroundColor = '#ff4444';
            clearButton.style.transform = 'translateY(0)';
            clearButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        });

        // Add click handler
        clearButton.addEventListener('click', () => {
            // Remove all objects
            [...this.objectManager.objects].forEach(object => {
                this.sceneManager.removeObject(object);
                this.objectManager.removeObject(object);
            });
        });

        titleContainer.appendChild(title);
        titleContainer.appendChild(clearButton);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Design your perfect space';
        subtitle.style.cssText = `
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
        `;

        header.appendChild(titleContainer);
        header.appendChild(subtitle);
        sidebar.appendChild(header);

        // Create category accordion
        Object.entries(this.productCategories).forEach(([category, subcategories]) => {
            const categorySection = document.createElement('div');
            categorySection.className = 'category-section';
            categorySection.style.cssText = `
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                overflow: hidden;
            `;

            // Category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.style.cssText = `
                padding: 15px;
                background: #f5f5f5;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 500;
            `;
            categoryHeader.innerHTML = `
                ${category}
                <span class="arrow">▼</span>
            `;

            // Category content
            const categoryContent = document.createElement('div');
            categoryContent.className = 'category-content';
            categoryContent.style.cssText = `
                padding: 15px;
                display: none;
            `;

            // Toggle category content
            categoryHeader.addEventListener('click', () => {
                const isExpanded = categoryContent.style.display === 'block';
                categoryContent.style.display = isExpanded ? 'none' : 'block';
                categoryHeader.querySelector('.arrow').textContent = isExpanded ? '▼' : '▲';
            });

            // Add subcategories
            Object.entries(subcategories).forEach(([subcategory, items]) => {
                const subcategoryDiv = document.createElement('div');
                subcategoryDiv.style.cssText = `
                    margin-bottom: 15px;
                `;

                const subcategoryTitle = document.createElement('h4');
                subcategoryTitle.textContent = subcategory;
                subcategoryTitle.style.cssText = `
                    margin: 0 0 10px 0;
                    color: #444;
                    font-size: 14px;
                    font-weight: 500;
                `;

                const itemsGrid = document.createElement('div');
                itemsGrid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                `;

                items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'furniture-item';
                    itemElement.draggable = true;
                    itemElement.style.cssText = `
                        padding: 10px;
                        background: white;
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        border-radius: 6px;
                        cursor: move;
                        text-align: center;
                        font-size: 12px;
                        transition: all 0.2s;
                    `;

                    itemElement.textContent = item.name;

                    // Add hover effects
                    itemElement.addEventListener('mouseenter', () => {
                        itemElement.style.transform = 'translateY(-2px)';
                        itemElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    });

                    itemElement.addEventListener('mouseleave', () => {
                        itemElement.style.transform = 'translateY(0)';
                        itemElement.style.boxShadow = 'none';
                    });

                    itemElement.addEventListener('dragstart', (e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        this.dragDropManager.handleDragStart(e, item);
                    });

                    itemElement.addEventListener('dragend', (e) => {
                        e.preventDefault();
                        if (this.dragDropManager.isDragging) {
                            this.dragDropManager.isDragging = false;
                            this.dragDropManager.rotationIndicator.style.display = 'none';
                            if (this.dragDropManager.objectManager.previewMesh) {
                                this.dragDropManager.sceneManager.removeObject(this.dragDropManager.objectManager.previewMesh);
                                this.dragDropManager.objectManager.previewMesh = null;
                            }
                        }
                    });

                    itemsGrid.appendChild(itemElement);
                });

                subcategoryDiv.appendChild(subcategoryTitle);
                subcategoryDiv.appendChild(itemsGrid);
                categoryContent.appendChild(subcategoryDiv);
            });

            categorySection.appendChild(categoryHeader);
            categorySection.appendChild(categoryContent);
            sidebar.appendChild(categorySection);
        });

        document.body.appendChild(sidebar);

        // Add global styles
        const style = document.createElement('style');
        style.textContent = `
            .furniture-item:active {
                cursor: grabbing;
            }
            
            @keyframes slideIn {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
            }
            
            #block-palette {
                animation: slideIn 0.3s ease-out;
            }

            /* Custom scrollbar */
            #block-palette::-webkit-scrollbar {
                width: 8px;
            }

            #block-palette::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05);
            }

            #block-palette::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
            }

            #block-palette::-webkit-scrollbar-thumb:hover {
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

        const undoBtn = document.createElement('button');
        undoBtn.id = 'undo-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.style.marginRight = '10px';

        const redoBtn = document.createElement('button');
        redoBtn.id = 'redo-btn';
        redoBtn.textContent = 'Redo';
        redoBtn.style.marginRight = '10px';

        const resetBtn = document.createElement('button');
        resetBtn.id = 'reset-btn';
        resetBtn.textContent = 'Reset Scene';

        buttonContainer.appendChild(undoBtn);
        buttonContainer.appendChild(redoBtn);
        buttonContainer.appendChild(resetBtn);
        document.body.appendChild(buttonContainer);
    }

    setupEventListeners() {
        const canvasContainer = document.getElementById('canvas-container');
        
        // Prevent default drag behaviors
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

        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetScene());
    }

    animate() {
        this.sceneManager.animate();
    }

    undo() {
        // Implement undo functionality
    }

    redo() {
        // Implement redo functionality
    }

    resetScene() {
        // Remove all objects
        this.objectManager.objects.forEach(obj => {
            this.sceneManager.removeObject(obj);
        });
        this.objectManager.objects = [];
        
        // Reset camera
        this.sceneManager.camera.position.set(5, 5, 10);
        this.sceneManager.camera.lookAt(0, 0, 0);
        this.sceneManager.controls.reset();
    }
}

// Create instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlockCustomizer();
});
