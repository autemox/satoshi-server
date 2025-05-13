/*
Manages the undo/redo functionality for the application
*/

import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';
import { findSkeletonById } from './utils.js';

// Constant for max undo steps
const MAX_UNDO_HISTORY = 50;

// Undo/Redo history stacks
const undoStack = [];
const redoStack = [];

// Currently executing undo/redo operation (to prevent recursive operations)
let isPerformingUndoRedo = false;

/**
 * Record an action for potential undo
 * @param {string} actionType - Type of action (e.g., 'brush', 'erase', 'movePivot')
 * @param {Object} details - Action-specific details needed for undo/redo
 */
export function recordAction(actionType, details) {
  // If we're currently performing an undo/redo, don't record this action
  if (isPerformingUndoRedo) return;
  
  console.log(`[UNDO] Recording action: ${actionType}`);
  
  // Clear redo stack when a new action is performed
  redoStack.length = 0;
  
  // Add the new action to the undo stack
  undoStack.push({
    type: actionType,
    details: details,
    timestamp: Date.now()
  });
  
  // Limit stack size
  if (undoStack.length > MAX_UNDO_HISTORY) {
    undoStack.shift(); // Remove oldest item
  }
}

/**
 * Perform undo operation
 */
export function undo() {
  if (undoStack.length === 0) {
    showToast('Undo button is limited to brush strokes', 'gray');
    return;
  }
  
  isPerformingUndoRedo = true;
  try {
    const action = undoStack.pop();
    console.log(`[UNDO] Undoing action: ${action.type}`);
    
    // Perform the undo based on action type
    switch (action.type) {
      case 'brush':
        undoBrushAction(action.details);
        break;
      
      // Additional action types will be added here in the future
      
      default:
        console.warn(`[UNDO] Unknown action type: ${action.type}`);
        break;
    }
    
    // Add to redo stack
    redoStack.push(action);
    
    showToast(`Undid ${action.type} action`, 'gray');
  } finally {
    isPerformingUndoRedo = false;
  }
}

/**
 * Perform redo operation
 */
export function redo() {
  if (redoStack.length === 0) {
    showToast('Nothing to redo', 'gray');
    return;
  }
  
  isPerformingUndoRedo = true;
  try {
    const action = redoStack.pop();
    console.log(`[REDO] Redoing action: ${action.type}`);
    
    // Perform the redo based on action type
    switch (action.type) {
      case 'brush':
        redoBrushAction(action.details);
        break;
      
      // Additional action types will be added here in the future
      
      default:
        console.warn(`[REDO] Unknown action type: ${action.type}`);
        break;
    }
    
    // Add back to undo stack
    undoStack.push(action);
    
    showToast(`Redid ${action.type} action`, 'gray');
  } finally {
    isPerformingUndoRedo = false;
  }
}

/**
 * Undo a brush stroke action
 * @param {Object} details - Details of the brush action
 */
function undoBrushAction(details) {
  const { skeletonId, beforeImageData } = details;
  
  // Find the skeleton
  const skeleton = findSkeletonById(skeletonId);
  if (!skeleton) {
    console.warn(`[UNDO] Skeleton not found for id: ${skeletonId}`);
    return;
  }
  
  // Store current state for redo if image element exists
  if (skeleton.imageEl) {
    const currentImageData = skeleton.imageEl.getAttribute('href');
    details.afterImageData = currentImageData;
  }
  
  // Handle case where there was no image before (beforeImageData is undefined or empty)
  if (!beforeImageData || beforeImageData === 'data:,' || beforeImageData === '') {
    // If we had no image before, we should remove the image element
    if (skeleton.imageEl) {
      // Store the current image for redo first
      if (!details.afterImageData) {
        details.afterImageData = skeleton.imageEl.getAttribute('href');
      }
      
      // Remove the image element from the DOM
      const parent = skeleton.imageEl.parentNode;
      if (parent) parent.removeChild(skeleton.imageEl);
      
      // Remove the reference to the image element
      skeleton.imageEl = null;
      
      console.log(`[UNDO] Removed image element for ${skeletonId}`);
    }
  } else if (skeleton.imageEl) {
    // Normal case: restore previous image state
    skeleton.imageEl.setAttribute('href', beforeImageData);
    console.log(`[UNDO] Restored previous image state for ${skeletonId}`);
  } else {
    console.warn(`[UNDO] Image element missing for skeleton: ${skeletonId}`);
  }
}

/**
 * Redo a brush stroke action
 * @param {Object} details - Details of the brush action
 */
function redoBrushAction(details) {
  const { skeletonId, afterImageData } = details;
  
  // Find the skeleton
  const skeleton = findSkeletonById(skeletonId);
  if (!skeleton) {
    console.warn(`[REDO] Skeleton not found for id: ${skeletonId}`);
    return;
  }
  
  // If we don't have an image element but we have afterImageData, create a new one
  if (!skeleton.imageEl && afterImageData && afterImageData !== 'data:,') {
    // Create image element if it doesn't exist
    const imageLayer = skeleton.group.querySelector('.image-layer');
    if (imageLayer) {
      const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      imageEl.setAttribute('x', '0');
      imageEl.setAttribute('y', '0');
      imageEl.setAttribute('width', '64');
      imageEl.setAttribute('height', '64');
      imageEl.setAttribute('href', afterImageData);
      imageEl.setAttribute('pointer-events', 'none');
      imageLayer.appendChild(imageEl);
      skeleton.imageEl = imageEl;
      
      console.log(`[REDO] Created new image element for ${skeletonId}`);
    }
  } else if (skeleton.imageEl) {
    // Restore the "after" state to existing element
    skeleton.imageEl.setAttribute('href', afterImageData);
    console.log(`[REDO] Restored modified image state for ${skeletonId}`);
  } else {
    console.warn(`[REDO] Image layer not found for skeleton: ${skeletonId}`);
  }
}

/**
 * Clear all undo/redo history
 */
export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  console.log('[UNDO] History cleared');
}