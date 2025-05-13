import { ViewState } from './ViewState.js';

/**
 * Changes the cursor to a custom image with the click point at center
 * @param {string} cursorName - The name of the cursor image (without extension)
 * @param {string} [fallbackCursor='default'] - Fallback cursor style if the image fails to load
 */
function setCursor(cursorName, fallbackCursor = 'default') {
  // For eyedropper cursor
  if (cursorName === 'eyedropper') {
    const cursorPath = `/images/cursors/${cursorName}.png`;
    document.body.style.cursor = `url('${cursorPath}') 32 32, ${fallbackCursor}`;
  } else if (cursorName === 'box') {
    // For box cursor, create a dynamic cursor based on brush size and zoom level
    import('./ImageEditor.js').then(module => {
        const brushSize = module.getDrawingState().brushSize;
        
        // Debug to check if we're getting the scale correctly
        console.log('Current ViewState.scale:', ViewState.scale);
        const scale = ViewState.scale || 8; // Default to 8 if for some reason it's not available
        
        // Make sure scale is treated as a number
        const numericScale = Number(scale);
        console.log('Using scale for cursor:', numericScale);
        
        // Adjust box size based on zoom level - inverse relationship
        // When zoom is higher (e.g. 16), we need a smaller cursor (1/16 of full size)
        // When zoom is lower (e.g. 2), we need a larger cursor (1/2 of full size)
        const zoomAdjustment = numericScale / 8;
        console.log('zoomAdjustment:', zoomAdjustment);
        
        // Create a canvas to draw the cursor
        const canvas = document.createElement('canvas');
        const size = 64; // Base cursor size
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw a square representing the brush size adjusted for zoom
        // This formula ensures the visual size of the cursor matches the actual drawing area
        const boxSize = brushSize * zoomAdjustment * 4; // Scale by 4 for better visibility
        console.log('Final boxSize:', boxSize);
        
        const offset = (size - boxSize) / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Draw the box outline with a white border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(offset, offset, boxSize, boxSize);
        
        // Add a black outline for contrast
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(offset-1, offset-1, boxSize+2, boxSize+2);
        
        // Add crosshair at center
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size/2, size/2 - 4); // Vertical line top
        ctx.lineTo(size/2, size/2 + 4); // Vertical line bottom
        ctx.moveTo(size/2 - 4, size/2);  // Horizontal line left
        ctx.lineTo(size/2 + 4, size/2);  // Horizontal line right
        ctx.stroke();
        
        // Convert to data URL
        const dataURL = canvas.toDataURL();
        
        // Apply as cursor
        document.body.style.cursor = `url('${dataURL}') 32 32, ${fallbackCursor}`;
    });
  } else {
    // Regular cursor with center hotspot
    const cursorPath = `/images/cursors/${cursorName}.png`;
    document.body.style.cursor = `url('${cursorPath}') 32 32, ${fallbackCursor}`;
  }
}

/**
 * Resets the cursor to the default style
 */
function resetCursor() {
  document.body.style.cursor = 'default';
}

/**
 * Sets cursor for a specific DOM element
 * @param {HTMLElement} element - The element to set cursor for
 * @param {string} cursorName - The name of the cursor image (without extension)
 * @param {string} [fallbackCursor='default'] - Fallback cursor style if the image fails to load
 */
function setElementCursor(element, cursorName, fallbackCursor = 'default') {
  if (!element) return;
  
  const cursorPath = `/images/cursors/${cursorName}.png`;
  element.style.cursor = `url('${cursorPath}') 32 32, ${fallbackCursor}`;
}

/**
 * Preloads cursor images for smoother cursor transitions
 * @param {string[]} cursorNames - Array of cursor names to preload
 * @returns {Promise} - Resolves when all cursors are loaded
 */
function preloadCursors(cursorNames) {
  return Promise.all(
    cursorNames.map(name => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(name);
        img.onerror = () => reject(`Failed to load cursor: ${name}`);
        img.src = `/images/cursors/${name}.png`;
      });
    })
  );
}

// Export all functions
export { setCursor, resetCursor, setElementCursor, preloadCursors };