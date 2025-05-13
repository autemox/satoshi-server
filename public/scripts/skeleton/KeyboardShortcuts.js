/*
Centralized keyboard shortcut manager for the application
*/

import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';
import * as ImageEditor from './ImageEditor.js';
import * as DrawingToolbar from './DrawingToolbar.js';
import { undo, redo } from './UndoManager.js';

// Reference to the active tool management function from Main.js
let switchToToolFunction = null;

/**
 * Initialize the keyboard shortcut manager
 * @param {Function} switchToTool - Function to switch between main tools (from Main.js)
 */
export function init(switchToTool) {
  // Store reference to the tool switching function
  switchToToolFunction = switchToTool;
  
  // Bind global keyboard shortcuts
  bindGlobalShortcuts();
}

/**
 * Bind all keyboard shortcuts for the application
 */
function bindGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore keydown events in input elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Check for Ctrl+Z and Ctrl+Y for undo/redo
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault(); // Prevent browser's default undo
        console.log('[SHORTCUT] CTRL+Z pressed, performing undo');
        undo();
        return;
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault(); // Prevent browser's default redo
        console.log('[SHORTCUT] CTRL+Y pressed, performing redo');
        redo();
        return;
      }
    }
    
    const key = e.key.toUpperCase();
    
    // Global tool switching shortcuts
    switch (key) {
      // Main tool switching
      case 'D':
        // Switch to Drawing tool (Pencil) 
        switchToToolFunction('pencil');
        
        // We'll handle the eyedropper selection separately
        // after the drawing toolbar is visible
        setTimeout(() => {
          // Only change to eyedropper if we're still in pencil mode
          if (document.querySelector('[data-tool="pencil"]').classList.contains('active')) {
            // Use DrawingToolbar's eyedropper directly
            DrawingToolbar.selectTool('eyedropper');
          }
        }, 100); // Small delay to ensure toolbar is visible
        break;
        
      case 'S':
        // Switch to Skeleton tool (Point)
        switchToToolFunction('point');
        break;
      
      // Drawing tool shortcuts - switch to pencil mode if not already in it
      case 'B':
        // First switch to pencil tool if not already
        if (!DrawingToolbar.isToolbarVisible()) {
          switchToToolFunction('pencil');
          // Wait for toolbar to appear before selecting the brush tool
          setTimeout(() => {
            DrawingToolbar.selectTool('brush');
          }, 100);
        } else {
          DrawingToolbar.selectTool('brush');
        }
        break;
        
      case 'E':
        // First switch to pencil tool if not already
        if (!DrawingToolbar.isToolbarVisible()) {
          switchToToolFunction('pencil');
          // Wait for toolbar to appear before selecting the eraser tool
          setTimeout(() => {
            DrawingToolbar.selectTool('erase');
          }, 100);
        } else {
          DrawingToolbar.selectTool('erase');
        }
        break;
        
      case 'I':
        // First switch to pencil tool if not already
        if (!DrawingToolbar.isToolbarVisible()) {
          switchToToolFunction('pencil');
          // Wait for toolbar to appear before selecting the eyedropper tool
          setTimeout(() => {
            DrawingToolbar.selectTool('eyedropper');
          }, 100);
        } else {
          DrawingToolbar.selectTool('eyedropper');
        }
        break;
        
      // Brush size controls
      case '[': // Decrease brush size
        // If not in drawing mode, switch to it
        if (!DrawingToolbar.isToolbarVisible()) {
          switchToToolFunction('pencil');
          
          // Wait for toolbar to appear before adjusting size and selecting brush
          setTimeout(() => {
            const currentSize = ImageEditor.getDrawingState().brushSize;
            if (currentSize > 1) { // Don't go below 1
              ImageEditor.setBrushSize(currentSize - 1);
              DrawingToolbar.updateToolbar();
            }
            // Switch to brush tool if not already using eraser
            const currentTool = DrawingToolbar.getCurrentToolId();
            if (currentTool !== 'erase') {
              DrawingToolbar.selectTool('brush');
            }
          }, 100);
        } else {
          // Already in drawing mode, adjust size
          const currentSize = ImageEditor.getDrawingState().brushSize;
          if (currentSize > 1) { // Don't go below 1
            ImageEditor.setBrushSize(currentSize - 1);
            DrawingToolbar.updateToolbar();
            
            // Switch to brush tool if currently using eyedropper (but not if using eraser)
            const currentTool = DrawingToolbar.getCurrentToolId();
            if (currentTool === 'eyedropper') {
              DrawingToolbar.selectTool('brush');
            }
          }
        }
        break;
        
      case ']': // Increase brush size
        // If not in drawing mode, switch to it
        if (!DrawingToolbar.isToolbarVisible()) {
          switchToToolFunction('pencil');
          
          // Wait for toolbar to appear before adjusting size and selecting brush
          setTimeout(() => {
            const currentSize = ImageEditor.getDrawingState().brushSize;
            if (currentSize < 16) { // Don't exceed max size of 16
              ImageEditor.setBrushSize(currentSize + 1);
              DrawingToolbar.updateToolbar();
            }
            // Switch to brush tool if not already using eraser
            const currentTool = DrawingToolbar.getCurrentToolId();
            if (currentTool !== 'erase') {
              DrawingToolbar.selectTool('brush');
            }
          }, 100);
        } else {
          // Already in drawing mode, adjust size
          const currentSize = ImageEditor.getDrawingState().brushSize;
          if (currentSize < 16) { // Don't exceed max size of 16
            ImageEditor.setBrushSize(currentSize + 1);
            DrawingToolbar.updateToolbar();
            
            // Switch to brush tool if currently using eyedropper (but not if using eraser)
            const currentTool = DrawingToolbar.getCurrentToolId();
            if (currentTool === 'eyedropper') {
              DrawingToolbar.selectTool('brush');
            }
          }
        }
        break;
    }
  });
}