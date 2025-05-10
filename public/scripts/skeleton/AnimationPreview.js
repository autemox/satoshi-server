// AnimationPreview.js
import { ViewState } from './ViewState.js';
import { getSvg } from './utils.js';

let animationPreviewElement = null;
let isPlaying = false;
let currentFrameIndex = 0;
let animationInterval = null;
let selectedFrameIds = []; // Store just the IDs of selected frames
const FPS = 4; // Frames per second for the animation

/**
 * Creates or updates the animation preview element
 */
function createOrUpdatePreviewElement() {
  // If the element already exists, just return it
  if (animationPreviewElement) return animationPreviewElement;
  
  // Create container for the animation preview
  animationPreviewElement = document.createElement('div');
  animationPreviewElement.id = 'animation-preview';
  animationPreviewElement.style.position = 'fixed';
  animationPreviewElement.style.top = '20px';
  animationPreviewElement.style.right = '20px';
  animationPreviewElement.style.width = '128px';
  animationPreviewElement.style.height = '128px';
  animationPreviewElement.style.backgroundColor = '#222';
  animationPreviewElement.style.border = '2px solid #3399ff';
  animationPreviewElement.style.borderRadius = '8px';
  animationPreviewElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  animationPreviewElement.style.overflow = 'hidden';
  animationPreviewElement.style.zIndex = '1000';
  animationPreviewElement.style.display = 'flex';
  animationPreviewElement.style.flexDirection = 'column';
  
  // Create the image element for the frames
  const imageElement = document.createElement('img');
  imageElement.id = 'animation-preview-image';
  imageElement.style.width = '100%';
  imageElement.style.height = '100px';
  imageElement.style.objectFit = 'contain';
  imageElement.style.backgroundColor = '#111';
  animationPreviewElement.appendChild(imageElement);
  
  // Create controls container
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.justifyContent = 'space-between';
  controls.style.padding = '4px';
  controls.style.alignItems = 'center';
  
  // Play/pause button
  const playButton = document.createElement('button');
  playButton.textContent = '▶️';
  playButton.style.backgroundColor = 'transparent';
  playButton.style.border = 'none';
  playButton.style.fontSize = '16px';
  playButton.style.cursor = 'pointer';
  playButton.onclick = togglePlayPause;
  controls.appendChild(playButton);
  
  // Frame counter
  const frameCounter = document.createElement('span');
  frameCounter.id = 'animation-frame-counter';
  frameCounter.textContent = '0/0';
  frameCounter.style.color = 'white';
  frameCounter.style.fontSize = '12px';
  controls.appendChild(frameCounter);
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '⏏️';
  closeButton.style.backgroundColor = 'transparent';
  closeButton.style.border = 'none';
  closeButton.style.fontSize = '16px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = closeAnimationPreview;
  controls.appendChild(closeButton);
  
  animationPreviewElement.appendChild(controls);
  document.body.appendChild(animationPreviewElement);
  
  return animationPreviewElement;
}

/**
 * Initially captures the selected frame IDs when animation preview is opened
 */
function captureSelectedFrameIds() {
  // Store just the IDs of currently selected frames
  selectedFrameIds = Array.from(ViewState.activeSkeletons);
  console.log(`Captured ${selectedFrameIds.length} frames for animation`, selectedFrameIds);
}

/**
 * Gets the current images from the saved selection of frames
 * @returns {Array} Array of frame image data objects
 */
function getCurrentFrameImages() {
  const frameImages = [];
  
  // Only look for frames that were in our original selection
  for (const direction in ViewState.skeletonsByDirection) {
    ViewState.skeletonsByDirection[direction].forEach(skeleton => {
      if (selectedFrameIds.includes(skeleton.id)) {
        // Get the current image source
        const imgSrc = skeleton.imageEl.getAttribute('href');
        if (imgSrc && imgSrc !== 'data:,') {
          frameImages.push({
            id: skeleton.id,
            direction,
            src: imgSrc
          });
        }
      }
    });
  }
  
  return frameImages;
}

/**
 * Updates the animation frame display with the latest images
 */
function updateFrameDisplay() {
  if (!animationPreviewElement) return;
  
  // Get the current images from the selected frames
  const currentImages = getCurrentFrameImages();
  
  const frameCounter = document.getElementById('animation-frame-counter');
  if (frameCounter) {
    frameCounter.textContent = `${currentFrameIndex + 1}/${currentImages.length}`;
  }
  
  const imageElement = document.getElementById('animation-preview-image');
  if (imageElement && currentImages.length > 0) {
    imageElement.src = currentImages[currentFrameIndex].src;
  } else if (imageElement) {
    imageElement.src = '';
    if (frameCounter) {
      frameCounter.textContent = 'No images';
    }
  }
}

/**
 * Advances the animation to the next frame
 */
function nextFrame() {
  const currentImages = getCurrentFrameImages();
  if (currentImages.length === 0) return;
  
  currentFrameIndex = (currentFrameIndex + 1) % currentImages.length;
  updateFrameDisplay();
}

/**
 * Toggles play/pause of the animation
 */
function togglePlayPause() {
  isPlaying = !isPlaying;
  
  const playButton = animationPreviewElement.querySelector('button');
  if (playButton) {
    playButton.textContent = isPlaying ? '⏸️' : '▶️';
  }
  
  if (isPlaying) {
    // Start animation
    animationInterval = setInterval(nextFrame, 1000 / FPS);
  } else {
    // Stop animation
    clearInterval(animationInterval);
    animationInterval = null;
  }
}

/**
 * Opens the animation preview
 */
export function openAnimationPreview() {
  // Create or get the preview element
  createOrUpdatePreviewElement();
  
  // Capture the initial selection - these are the frames we'll use
  captureSelectedFrameIds();
  
  // Get initial images
  const currentImages = getCurrentFrameImages();
  const hasFrames = currentImages.length > 0;
  
  if (!hasFrames) {
    // No frames selected or no images to display
    const imageElement = document.getElementById('animation-preview-image');
    if (imageElement) {
      imageElement.src = '';
    }
    
    const frameCounter = document.getElementById('animation-frame-counter');
    if (frameCounter) {
      frameCounter.textContent = 'No images';
    }
    return;
  }
  
  // Reset animation state
  currentFrameIndex = 0;
  updateFrameDisplay();
  
  // Auto-play if we have frames
  if (currentImages.length > 1 && !isPlaying) {
    togglePlayPause();
  }
}

/**
 * Closes the animation preview
 */
export function closeAnimationPreview() {
  // Stop any running animation
  if (isPlaying) {
    clearInterval(animationInterval);
    isPlaying = false;
    animationInterval = null;
  }
  
  // Reset selected frame IDs
  selectedFrameIds = [];
  
  // Remove the element from the DOM
  if (animationPreviewElement) {
    document.body.removeChild(animationPreviewElement);
    animationPreviewElement = null;
  }
}

/**
 * Manually refreshes the animation preview with current images
 * Can be called when images are modified
 */
export function refreshAnimationPreview() {
  if (animationPreviewElement) {
    updateFrameDisplay();
  }
}

// Add an event listener for image changes
// This can be called when images are generated or modified
document.addEventListener('imagesChanged', refreshAnimationPreview);