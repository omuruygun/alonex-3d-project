class Sidebar {
    constructor() {
        this.selectedImage = null;
        this.modelGroups = {
            '1': ['1', '2', '5'],
            '2': ['2', '3', '6'],
            '3': ['1', '3', '4'],
            '4': ['2', '4', '6'],
            '5': ['1', '3', '5'],
            '6': ['2', '4', '5']
        };
        this.init();
    }

    init() {
        this.createSidebar();
        this.createPreviewModal();
        this.loadImages();
    }

    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        sidebar.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 250px;
            background: #f5f5f5;
            padding: 20px;
            overflow-y: auto;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        `;

        const heading = document.createElement('h2');
        heading.textContent = 'Wardrobe Styles';
        heading.style.marginBottom = '20px';
        sidebar.appendChild(heading);

        // Add Create Room button
        const createRoomBtn = document.createElement('button');
        createRoomBtn.textContent = 'Create Modern Room';
        createRoomBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        `;
        createRoomBtn.addEventListener('mouseenter', () => {
            createRoomBtn.style.background = '#45a049';
        });
        createRoomBtn.addEventListener('mouseleave', () => {
            createRoomBtn.style.background = '#4CAF50';
        });
        createRoomBtn.addEventListener('click', () => {
            const event = new CustomEvent('createModernRoom');
            document.dispatchEvent(event);
        });
        sidebar.appendChild(createRoomBtn);

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        imageContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        `;
        sidebar.appendChild(imageContainer);

        document.body.appendChild(sidebar);
        this.imageContainer = imageContainer;
    }

    createPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        
        const previewImage = document.createElement('img');
        previewImage.alt = 'Wardrobe Preview';
        
        const previewTitle = document.createElement('div');
        previewTitle.className = 'preview-title';
        
        modal.appendChild(previewImage);
        modal.appendChild(previewTitle);
        document.body.appendChild(modal);
        
        this.previewModal = modal;
        this.previewImage = previewImage;
        this.previewTitle = previewTitle;
    }

    loadImages() {
        for (let i = 1; i <= 6; i++) {
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'image-wrapper';
            imgWrapper.style.cssText = `
                position: relative;
                cursor: pointer;
                border-radius: 8px;
                overflow: hidden;
                transition: transform 0.2s;
            `;

            const img = document.createElement('img');
            img.src = `src/images/${i}.jpg`;
            img.alt = `Wardrobe Style ${i}`;
            img.style.cssText = `
                width: 100%;
                height: auto;
                display: block;
            `;

            imgWrapper.appendChild(img);
            this.imageContainer.appendChild(imgWrapper);

            // Add click handler for model selection
            imgWrapper.addEventListener('click', () => this.handleImageClick(i.toString()));

            // Add hover handlers for preview
            imgWrapper.addEventListener('mouseenter', () => {
                this.showPreview(i, img.src);
            });

            imgWrapper.addEventListener('mouseleave', () => {
                this.hidePreview();
            });
        }
    }

    showPreview(index, imageSrc) {
        this.previewImage.src = imageSrc;
        this.previewTitle.textContent = `Wardrobe Style ${index}`;
        this.previewModal.classList.add('visible');
    }

    hidePreview() {
        this.previewModal.classList.remove('visible');
    }

    handleImageClick(imageId) {
        // Remove previous selection
        const allImages = this.imageContainer.querySelectorAll('.image-wrapper');
        allImages.forEach(img => {
            img.classList.remove('selected');
            img.style.opacity = '1';
        });

        // Highlight selected image
        const selectedWrapper = this.imageContainer.children[parseInt(imageId) - 1];
        selectedWrapper.classList.add('selected');

        // Update selected models
        this.selectedImage = imageId;
        const availableModels = this.modelGroups[imageId];
        
        // Dispatch custom event for model filtering
        const event = new CustomEvent('wardrobeSelected', {
            detail: {
                selectedImage: imageId,
                availableModels: availableModels
            }
        });
        document.dispatchEvent(event);
    }
}

export default Sidebar;
