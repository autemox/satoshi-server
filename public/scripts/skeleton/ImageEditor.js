// ------ ImageEditor.js ------
/*
Provides drawing functionality for editing sprite images directly in the canvas
*/

import { findSkeletonById } from './utils.js';
import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';

// Drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let drawingContext = null;
let tempCanvas = null;
let currentSkeletonId = null;
let skeletonGroupTransform = null; // Store the skeleton's transform

// Tool settings
export const TOOL_MODES = {
  BRUSH: 'brush',
  ERASE: 'erase',
  EYEDROPPER: 'eyedropper'
};

let currentMode = TOOL_MODES.BRUSH;  // Start in brush mode
let brushSize = 1;                   // Default size: 1 pixel
let brushColor = '#000000';          // Default color: black

/**
 * Change the current drawing mode
 * @param {string} mode - The mode to switch to (from TOOL_MODES)
 */
export function changeMode(mode) {
  if (!TOOL_MODES[mode.toUpperCase()]) {
    console.error(`Invalid mode: ${mode}`);
    return;
  }
  
  currentMode = TOOL_MODES[mode.toUpperCase()];
  console.log(`Drawing mode changed to: ${currentMode}`);
  showToast(`Pencil mode: ${currentMode}`, 'blue');
}

/**
 * Set the brush size (in pixels)
 * @param {number} size - Size in pixels (integer)
 */
export function setBrushSize(size) {
  const newSize = Math.max(1, Math.floor(size)); // Ensure it's an integer >= 1
  brushSize = newSize;
  console.log(`Brush size set to ${brushSize}px`);
  showToast(`Brush size: ${brushSize}px`, 'blue');
  
  // Update cursor to reflect new size
  import('./DrawingToolbar.js').then(module => {
    module.selectTool(currentMode); // This will trigger cursor update
  });
}

/**
 * Set the brush color
 * @param {string} color - Color in hex format (#RRGGBB)
 */
export function setBrushColor(color) {
  brushColor = color;
  console.log(`Brush color set to ${color}`);
  showToast(`Brush color set to ${color}`, 'blue');
}

/**
 * Handle mouse down on a skeleton for drawing
 * @param {string} skeletonId - ID of the skeleton being drawn on
 * @param {number} x - X coordinate in the frame (0-64)
 * @param {number} y - Y coordinate in the frame (0-64)
 * @param {MouseEvent} e - Original mouse event
 */
export function detectedMouseDown(skeletonId, x, y, e) {
  if (x < 0 || x > 64 || y < 0 || y > 64) return; // Out of bounds
  
  console.log(`Starting ${currentMode} on skeleton ${skeletonId} at (${x}, ${y})`);
  
  const skeleton = findSkeletonById(skeletonId);
  if (!skeleton || !skeleton.group) return;
  
  // Store the skeleton's transform for later use with SVG mousemove
  skeletonGroupTransform = skeleton.group.getAttribute('transform');
  
  // Convert to integer pixel coordinates for pixel art
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);
  
  // Create or get the temporary canvas
  tempCanvas = document.createElement('canvas');
  tempCanvas.width = 64;
  tempCanvas.height = 64;
  drawingContext = tempCanvas.getContext('2d');
  drawingContext.imageSmoothingEnabled = false; // Disable anti-aliasing for pixel art
  
  // Load the existing image to the canvas if there is one
  if (skeleton.imageEl) {
    const imageUrl = skeleton.imageEl.getAttribute('href');
    if (imageUrl && imageUrl !== 'data:,' && imageUrl !== '') {
      const img = new Image();
      img.onload = () => {
        drawingContext.drawImage(img, 0, 0, 64, 64);
        
        // Handle different tools
        handleToolAtPosition(pixelX, pixelY);
        
        // Update image element
        updateImageElement(skeleton);
      };
      img.src = imageUrl;
    } else {
      // Start with a transparent canvas
      drawingContext.clearRect(0, 0, 64, 64);
      
      // Handle different tools
      handleToolAtPosition(pixelX, pixelY);
      
      // Update image element
      updateImageElement(skeleton);
    }
  } else {
    // Start with a transparent canvas
    drawingContext.clearRect(0, 0, 64, 64);
    
    // Handle different tools
    handleToolAtPosition(pixelX, pixelY);
    
    // Update image element
    updateImageElement(skeleton);
  }
  
  isDrawing = true;
  ViewState.isDrawing = true;
  lastX = pixelX;
  lastY = pixelY;
  currentSkeletonId = skeletonId;
  
  // Prevent the background click event
  e.stopPropagation();
}

/**
 * Handle mouse move within a skeleton frame
 * @param {string} skeletonId - ID of the skeleton being drawn on
 * @param {number} x - X coordinate in the frame (0-64)
 * @param {number} y - Y coordinate in the frame (0-64)
 * @param {MouseEvent} e - Original mouse event
 */
export function detectedMouseMove(skeletonId, x, y, e) {
  if (!isDrawing || skeletonId !== currentSkeletonId || !drawingContext) return;
  if (x < 0 || x > 64 || y < 0 || y > 64) return; // Out of bounds
  
  // Convert to integer pixel coordinates for pixel art
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);
  
  // Skip if we're still on the same pixel (important for pixel art)
  if (pixelX === lastX && pixelY === lastY) return;
  
  // For pixel art, we need to draw a perfect line of pixels
  drawPixelPerfectLine(lastX, lastY, pixelX, pixelY);
  
  lastX = pixelX;
  lastY = pixelY;
  
  // Update the image on the SVG
  const skeleton = findSkeletonById(skeletonId);
  if (skeleton && skeleton.imageEl) {
    updateImageElement(skeleton);
  }
  
  e.stopPropagation();
}

/**
 * Handle mouse move over the SVG (might be outside the original skeleton)
 * @param {number} sceneX - X coordinate in scene space
 * @param {number} sceneY - Y coordinate in scene space
 * @param {MouseEvent} e - Original mouse event
 */
export function detectedSvgMouseMove(sceneX, sceneY, e) {
  if (!isDrawing || !currentSkeletonId || !drawingContext) return;
  
  // We need to convert scene coordinates to the current skeleton's local coordinates
  const skeleton = findSkeletonById(currentSkeletonId);
  if (!skeleton) return;
  
  // Parse the skeleton's transform to get its offset
  let skeletonX = 0;
  let skeletonY = 0;
  
  if (skeletonGroupTransform) {
    const match = skeletonGroupTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (match) {
      skeletonX = parseFloat(match[1]);
      skeletonY = parseFloat(match[2]);
    }
  }
  
  // Calculate coordinates relative to the skeleton frame
  const x = sceneX - skeletonX;
  const y = sceneY - skeletonY;
  
  // Convert to integer pixel coordinates for pixel art
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);
  
  // Only draw if we're within the frame bounds
  if (pixelX >= 0 && pixelX < 64 && pixelY >= 0 && pixelY < 64) {
    // Skip if we're still on the same pixel (important for pixel art)
    if (pixelX === lastX && pixelY === lastY) return;
    
    // For pixel art, we need to draw a perfect line of pixels
    drawPixelPerfectLine(lastX, lastY, pixelX, pixelY);
    
    lastX = pixelX;
    lastY = pixelY;
    
    // Update the image on the SVG
    updateImageElement(skeleton);
  }
  
  e.stopPropagation();
}

/**
 * Handle mouse up anywhere on the SVG
 * @param {MouseEvent} e - Original mouse event
 */
export function detectedMouseUp(e) {
  if (!isDrawing) return;
  
  console.log(`Ending ${currentMode} on skeleton ${currentSkeletonId}`);
  
  // Finalize the image and update the skeleton
  const skeleton = findSkeletonById(currentSkeletonId);
  if (skeleton && tempCanvas) {
    const imageData = tempCanvas.toDataURL('image/png');
    
    if (!skeleton.imageEl) {
      // Create image element if it doesn't exist
      const imageLayer = skeleton.group.querySelector('.image-layer');
      if (imageLayer) {
        const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imageEl.setAttribute('x', '0');
        imageEl.setAttribute('y', '0');
        imageEl.setAttribute('width', '64');
        imageEl.setAttribute('height', '64');
        imageEl.setAttribute('href', imageData);
        imageEl.setAttribute('pointer-events', 'none');
        imageLayer.appendChild(imageEl);
        skeleton.imageEl = imageEl;
      }
    } else {
      // Update existing image
      skeleton.imageEl.setAttribute('href', imageData);
      skeleton.imageEl.style.display = '';
      
      // Make sure the image is in the correct layer
      const imageLayer = skeleton.group.querySelector('.image-layer');
      if (imageLayer) {
        // Remove the image from its current parent if needed
        const parent = skeleton.imageEl.parentNode;
        if (parent && parent !== imageLayer) {
          parent.removeChild(skeleton.imageEl);
          imageLayer.insertBefore(skeleton.imageEl, imageLayer.firstChild);
        }
      }
    }
    
    if (currentMode !== TOOL_MODES.EYEDROPPER) {
      showToast(`Image updated with ${currentMode} tool`, "green");
    }
  }
  
  // Reset drawing state
  isDrawing = false;
  ViewState.isDrawing = false;
  drawingContext = null;
  tempCanvas = null;
  currentSkeletonId = null;
  skeletonGroupTransform = null;
  
  e.stopPropagation();
}

/**
 * Draw a pixel-perfect line between two points using Bresenham's line algorithm
 * @param {number} x0 - Start X coordinate
 * @param {number} y0 - Start Y coordinate
 * @param {number} x1 - End X coordinate
 * @param {number} y1 - End Y coordinate
 */
function drawPixelPerfectLine(x0, y0, x1, y1) {
  if (!drawingContext) return;
  
  // Skip eyedropper for line drawing
  if (currentMode === TOOL_MODES.EYEDROPPER) return;
  
  // Bresenham's line algorithm
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;
  
  while (true) {
    // Draw the current pixel
    drawPixelSquare(x0, y0);
    
    // Check if we've reached the endpoint
    if (x0 === x1 && y0 === y1) break;
    
    // Calculate the next pixel
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/**
 * Draw a square of pixels centered at the specified coordinates
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function drawPixelSquare(x, y) {
  if (!drawingContext) return;
  
  // Calculate the offset for the brush size
  const offset = Math.floor(brushSize / 2);
  
  // Draw a square of pixels
  for (let i = 0; i < brushSize; i++) {
    for (let j = 0; j < brushSize; j++) {
      const posX = x - offset + i;
      const posY = y - offset + j;
      
      // Skip if outside canvas bounds
      if (posX < 0 || posX >= 64 || posY < 0 || posY >= 64) continue;
      
      // Draw or erase the pixel
      if (currentMode === TOOL_MODES.BRUSH) {
        drawingContext.fillStyle = brushColor;
        drawingContext.fillRect(posX, posY, 1, 1);
      } else if (currentMode === TOOL_MODES.ERASE) {
        // Use clearRect for erasing to make transparent
        drawingContext.clearRect(posX, posY, 1, 1);
      }
    }
  }
}

/**
 * Handle different tool actions at the given position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function handleToolAtPosition(x, y) {
  if (!drawingContext) return;
  
  if (currentMode === TOOL_MODES.EYEDROPPER) {
    // Get the color at this pixel
    const pixelData = drawingContext.getImageData(x, y, 1, 1).data;
    
    // Convert to hex format
    if (pixelData[3] === 0) {
      // Transparent pixel
      console.log('Picked transparent pixel');
      showToast('Picked: transparent', 'blue');
      // Don't change brush color for transparent pixels
    } else {
      const hexColor = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
      brushColor = hexColor;
      console.log(`Picked color: ${hexColor}`);
      showToast(`Picked color: ${hexColor}`, 'blue');
      
      // Switch back to brush mode after picking a color
      changeMode(TOOL_MODES.BRUSH);
    }
  } else {
    // For brush or erase, draw a pixel square at the given position
    drawPixelSquare(x, y);
  }
}

/**
 * Update the image element from the canvas
 * @param {Object} skeleton - The skeleton object with the image element
 */
function updateImageElement(skeleton) {
  if (!tempCanvas || !skeleton) return;
  
  const imageData = tempCanvas.toDataURL('image/png');
  
  if (!skeleton.imageEl) {
    // Create image element if it doesn't exist
    const imageLayer = skeleton.group.querySelector('.image-layer');
    if (imageLayer) {
      const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      imageEl.setAttribute('x', '0');
      imageEl.setAttribute('y', '0');
      imageEl.setAttribute('width', '64');
      imageEl.setAttribute('height', '64');
      imageEl.setAttribute('href', imageData);
      imageEl.setAttribute('pointer-events', 'none');
      imageLayer.appendChild(imageEl);
      skeleton.imageEl = imageEl;
    }
  } else {
    // Update existing image
    skeleton.imageEl.setAttribute('href', imageData);
    skeleton.imageEl.style.display = '';
  }
}

/**
 * Convert RGB values to a hex color string
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color (#RRGGBB)
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Get current drawing state
 * @returns {Object} The current drawing state
 */
export function getDrawingState() {
  return {
    isDrawing,
    currentSkeletonId,
    mode: currentMode,
    brushSize,
    brushColor
  };
}

// Export advanced drawing functions
export const advancedDrawingFunctions = {
  // Clear the canvas
  clearCanvas: (skeletonId) => {
    const skeleton = findSkeletonById(skeletonId);
    if (skeleton && skeleton.imageEl) {
      // Clear the image
      skeleton.imageEl.setAttribute('href', 'data:,');
      skeleton.imageEl.style.display = 'none';
      showToast("Canvas cleared", "green");
    }
  },
  
  // Fill the entire canvas with current color
  fillCanvas: (skeletonId) => {
    const skeleton = findSkeletonById(skeletonId);
    if (!skeleton) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Fill with current brush color
    ctx.fillStyle = brushColor;
    ctx.fillRect(0, 0, 64, 64);
    
    const imageData = canvas.toDataURL('image/png');
    
    if (!skeleton.imageEl) {
      // Create image element if it doesn't exist
      const imageLayer = skeleton.group.querySelector('.image-layer');
      if (imageLayer) {
        const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imageEl.setAttribute('x', '0');
        imageEl.setAttribute('y', '0');
        imageEl.setAttribute('width', '64');
        imageEl.setAttribute('height', '64');
        imageEl.setAttribute('href', imageData);
        imageEl.setAttribute('pointer-events', 'none');
        imageLayer.appendChild(imageEl);
        skeleton.imageEl = imageEl;
      }
    } else {
      skeleton.imageEl.setAttribute('href', imageData);
      skeleton.imageEl.style.display = '';
    }
    
    showToast("Canvas filled with current color", "green");
  },
  
  // Add more functions as needed
};

// Initialize drawing state in ViewState
ViewState.isDrawing = false;
ViewState.drawingMode = TOOL_MODES.BRUSH;
ViewState.brushSize = 1;
ViewState.brushColor = '#000000';