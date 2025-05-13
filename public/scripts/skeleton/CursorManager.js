/*
Manages cursor styles and custom cursors throughout the application
*/

import { ViewState } from './ViewState.js';

// Base path for cursor images
const CURSOR_PATH = 'images/cursors/';

// Cursor types
export const CURSOR_TYPES = {
  DEFAULT: 'default',
  HAND: 'hand',
  HAND_GRABBING: 'hand-grabbing',
  EYEDROPPER: 'eyedropper',
  BRUSH: 'brush',
  ERASER: 'eraser',
  ARROW: 'arrow',
  POINTER: 'pointer'
};

// Cursor style cache to avoid recreating the same cursor multiple times
const cursorCache = new Map();

// DOM style element for custom cursors
let cursorStyleElement = null;

/**
 * Initialize the cursor manager
 */
export function init() {
  // Create style element if it doesn't exist
  if (!cursorStyleElement) {
    cursorStyleElement = document.createElement('style');
    cursorStyleElement.id = 'custom-cursor-styles';
    document.head.appendChild(cursorStyleElement);
  }
  
  // Preload cursor images
  preloadCursorImages();
}

/**
 * Preload cursor images to avoid flicker on first use
 */
function preloadCursorImages() {
  const imagesToPreload = [
    `${CURSOR_PATH}hand.png`,
    `${CURSOR_PATH}eyedropper.png`,
    `${CURSOR_PATH}arrow.png`
  ];
  
  imagesToPreload.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

/**
 * Set cursor for an element
 * @param {HTMLElement} element - The element to set cursor for
 * @param {string} cursorType - The type of cursor to use
 * @param {number} [size] - Size for brush/eraser cursors
 */
export function setCursor(element, cursorType, size = 1) {
  if (!element) return;
  
  switch (cursorType) {
    case CURSOR_TYPES.DEFAULT:
      element.style.cursor = 'default';
      break;
      
    case CURSOR_TYPES.HAND:
      element.style.cursor = `url('${CURSOR_PATH}hand.png') 10 10, grab`;
      break;
      
    case CURSOR_TYPES.HAND_GRABBING:
      // We don't have grabbing.png, so we'll use hand.png with the grabbing fallback
      element.style.cursor = `url('${CURSOR_PATH}hand.png') 10 10, grabbing`;
      break;
      
    case CURSOR_TYPES.EYEDROPPER:
      element.style.cursor = `url('${CURSOR_PATH}eyedropper.png') 1 16, crosshair`;
      break;
      
    case CURSOR_TYPES.ARROW:
      element.style.cursor = `url('${CURSOR_PATH}arrow.png') 1 1, pointer`;
      break;
      
    case CURSOR_TYPES.POINTER:
      element.style.cursor = 'pointer';
      break;
      
    case CURSOR_TYPES.BRUSH:
    case CURSOR_TYPES.ERASER:
      // Generate dynamic brush cursor based on size
      const cursorClass = generateBrushCursor(cursorType, size);
      element.style.cursor = `${cursorClass}, crosshair`;
      break;
      
    default:
      element.style.cursor = 'default';
  }
}

/**
 * Generate a custom brush/eraser cursor based on size
 * @param {string} cursorType - BRUSH or ERASER
 * @param {number} size - Size of the brush
 * @returns {string} CSS cursor definition
 */
function generateBrushCursor(cursorType, size) {
  // Cache key for this cursor
  const cacheKey = `${cursorType}-${size}`;
  
  // Return from cache if it exists
  if (cursorCache.has(cacheKey)) {
    return cursorCache.get(cacheKey);
  }
  
  // Calculate dimensions
  const dimension = Math.max(5, size); // Minimum size 5px for visibility
  const halfDim = Math.floor(dimension / 2);
  
  // Create a canvas for the cursor
  const canvas = document.createElement('canvas');
  canvas.width = dimension + 2; // Add border
  canvas.height = dimension + 2;
  const ctx = canvas.getContext('2d');
  
  if (cursorType === CURSOR_TYPES.BRUSH) {
    // Draw filled square for brush
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
    ctx.fillRect(1, 1, dimension, dimension);
    
    // Draw border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, dimension + 1, dimension + 1);
    
    // Inner border
    ctx.strokeStyle = 'black';
    ctx.strokeRect(1.5, 1.5, dimension - 1, dimension - 1);
  } else {
    // For eraser, use a different style
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white
    ctx.fillRect(1, 1, dimension, dimension);
    
    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, dimension + 1, dimension + 1);
    
    // Draw X
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(dimension + 1, dimension + 1);
    ctx.moveTo(dimension + 1, 1);
    ctx.lineTo(1, dimension + 1);
    ctx.stroke();
  }
  
  // Convert to data URL
  const dataURL = canvas.toDataURL('image/png');
  const cursorValue = `url('${dataURL}') ${halfDim + 1} ${halfDim + 1}`;
  
  // Cache this cursor
  cursorCache.set(cacheKey, cursorValue);
  
  return cursorValue;
}

/**
 * Set the global cursor for the SVG viewport
 * @param {string} cursorType - The type of cursor to use
 * @param {number} [size] - Size for brush/eraser cursors
 */
export function setGlobalCursor(cursorType, size = 1) {
  const svg = document.getElementById('viewport');
  if (svg) {
    setCursor(svg, cursorType, size);
  }
}

/**
 * Get the appropriate cursor type based on active tool and current state
 * @param {string} activeTool - The currently active tool
 * @param {boolean} [isDown=false] - Whether the mouse is pressed down
 * @returns {string} The appropriate cursor type
 */
export function getCursorForTool(activeTool, isDown = false) {
  switch (activeTool) {
    case 'hand':
      return isDown ? CURSOR_TYPES.HAND_GRABBING : CURSOR_TYPES.HAND;
    
    case 'point':
      return CURSOR_TYPES.ARROW;
    
    case 'pencil':
      // Get the current drawing tool mode from ViewState
      const drawingMode = ViewState.drawingMode || 'brush';
      const size = ViewState.brushSize || 1;
      
      switch (drawingMode) {
        case 'brush':
          return CURSOR_TYPES.BRUSH;
        case 'erase':
          return CURSOR_TYPES.ERASER;
        case 'eyedropper':
          return CURSOR_TYPES.EYEDROPPER;
        default:
          return CURSOR_TYPES.BRUSH;
      }
    
    default:
      return CURSOR_TYPES.DEFAULT;
  }
}

/**
 * Update all cursors to reflect the current tool state
 */
export function updateAllCursors() {
  const activeTool = ViewState.activeTool || 'point';
  const drawingMode = ViewState.drawingMode || 'brush';
  const brushSize = ViewState.brushSize || 1;
  
  // Get the appropriate cursor type
  const cursorType = getCursorForTool(activeTool);
  
  // Apply to SVG viewport
  setGlobalCursor(cursorType, brushSize);
  
  // Apply to all interactive elements
  if (activeTool === 'pencil') {
    // For pencil tool, apply drawing-specific cursors to appropriate elements
    applyDrawingCursors(drawingMode, brushSize);
  } else {
    // For other tools, apply general cursors
    applyGeneralCursors(activeTool);
  }
}

/**
 * Apply drawing-specific cursors to elements
 * @param {string} drawingMode - Current drawing mode (brush/erase/eyedropper)
 * @param {number} brushSize - Current brush size
 */
function applyDrawingCursors(drawingMode, brushSize) {
  // Set cursor for all frame backgrounds
  document.querySelectorAll('.bg-layer rect').forEach(rect => {
    switch (drawingMode) {
      case 'brush':
        setCursor(rect, CURSOR_TYPES.BRUSH, brushSize);
        break;
      case 'erase':
        setCursor(rect, CURSOR_TYPES.ERASER, brushSize);
        break;
      case 'eyedropper':
        setCursor(rect, CURSOR_TYPES.EYEDROPPER);
        break;
    }
  });
  
  // Set pointer cursor for UI elements that should remain clickable
  document.querySelectorAll('.tool-button, #frame-buttons-* text, #menu-* button').forEach(el => {
    setCursor(el, CURSOR_TYPES.POINTER);
  });
}

/**
 * Apply general cursors for non-drawing tools
 * @param {string} activeTool - The active tool
 */
function applyGeneralCursors(activeTool) {
  // Set cursor for SVG elements based on tool
  if (activeTool === 'hand') {
    setGlobalCursor(CURSOR_TYPES.HAND);
  } else if (activeTool === 'point') {
    setGlobalCursor(CURSOR_TYPES.ARROW);
    
    // Set pointer cursor for all pivots
    document.querySelectorAll('.skeleton-layer circle').forEach(circle => {
      setCursor(circle, CURSOR_TYPES.ARROW);
    });
  }
  
  // Set pointer cursor for interactive UI elements
  document.querySelectorAll('.tool-button, #frame-buttons-* text, #menu-* button').forEach(el => {
    setCursor(el, CURSOR_TYPES.POINTER);
  });
}

// Initialize when the file is imported
init();