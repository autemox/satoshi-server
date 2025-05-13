// ------ DrawingToolbar.js ------
/*
Creates and manages a drawing toolbar with tool selection buttons
*/

import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';
import * as ImageEditor from './ImageEditor.js';

let toolbarVisible = false;
let toolbarElement = null;
let activeTool = 'brush'; // Default tool

/**
 * Initialize the drawing toolbar
 */
export function initToolbar() {
  // Create toolbar if it doesn't exist
  if (!toolbarElement) {
    createToolbar();
  }
  
  // Bind keyboard shortcuts
  bindKeyboardShortcuts();
}

/**
 * Create the toolbar element
 */
function createToolbar() {
  // Create toolbar container
  toolbarElement = document.createElement('div');
  toolbarElement.id = 'drawing-toolbar';
  toolbarElement.style.position = 'fixed';
  toolbarElement.style.bottom = '20px';
  toolbarElement.style.left = '50%';
  toolbarElement.style.transform = 'translateX(-50%)';
  toolbarElement.style.backgroundColor = '#333';
  toolbarElement.style.borderRadius = '8px';
  toolbarElement.style.padding = '8px';
  toolbarElement.style.display = 'flex';
  toolbarElement.style.alignItems = 'center';
  toolbarElement.style.gap = '12px';
  toolbarElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  toolbarElement.style.zIndex = '1000';
  toolbarElement.style.transition = 'opacity 0.2s';
  toolbarElement.style.opacity = '0';
  toolbarElement.style.pointerEvents = 'none';
  
  // Add size control
  const sizeLabel = document.createElement('span');
  sizeLabel.textContent = 'Size:';
  sizeLabel.style.color = 'white';
  sizeLabel.style.marginRight = '4px';
  
  const sizeInput = document.createElement('input');
  sizeInput.type = 'number';
  sizeInput.min = '1';
  sizeInput.max = '16';
  sizeInput.value = '1';
  sizeInput.style.width = '40px';
  sizeInput.style.marginRight = '12px';
  sizeInput.style.backgroundColor = '#555';
  sizeInput.style.color = 'white';
  sizeInput.style.border = 'none';
  sizeInput.style.borderRadius = '4px';
  sizeInput.style.padding = '4px';
  
  sizeInput.addEventListener('change', () => {
    const size = parseInt(sizeInput.value);
    if (size > 0) {
      ImageEditor.setBrushSize(size);
    }
  });
  
  toolbarElement.appendChild(sizeLabel);
  toolbarElement.appendChild(sizeInput);
  
  // Create tool buttons
  const tools = [
    { id: 'brush', icon: 'images/icons/pencil.png', tooltip: 'Brush (B)', shortcut: 'B' },
    { id: 'erase', icon: 'images/icons/eraser.png', tooltip: 'Eraser (E)', shortcut: 'E' },
    { id: 'eyedropper', icon: 'images/icons/eyedropper.png', tooltip: 'Eyedropper (I)', shortcut: 'I' }
  ];
  
  tools.forEach(tool => {
    const button = document.createElement('button');
    button.id = `tool-${tool.id}`;
    button.classList.add('tool-button');
    button.dataset.tool = tool.id;
    button.title = tool.tooltip;
    
    button.style.width = '32px';
    button.style.height = '32px';
    button.style.padding = '4px';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.backgroundColor = tool.id === activeTool ? '#5e89fb' : '#555';
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.justifyContent = 'center';
    button.style.alignItems = 'center';
    button.style.transition = 'background-color 0.2s';
    
    const icon = document.createElement('img');
    icon.src = tool.icon;
    icon.alt = tool.tooltip;
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.pointerEvents = 'none'; // Prevent img from catching click events
    
    button.appendChild(icon);
    
    button.addEventListener('mouseenter', () => {
      if (button.dataset.tool !== activeTool) {
        button.style.backgroundColor = '#777';
      }
    });
    
    button.addEventListener('mouseleave', () => {
      if (button.dataset.tool !== activeTool) {
        button.style.backgroundColor = '#555';
      }
    });
    
    button.addEventListener('click', () => {
      selectTool(tool.id);
    });
    
    toolbarElement.appendChild(button);
  });
  
  // Add color picker
  const colorLabel = document.createElement('span');
  colorLabel.textContent = 'Color:';
  colorLabel.style.color = 'white';
  colorLabel.style.marginLeft = '8px';
  colorLabel.style.marginRight = '4px';
  
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#000000';
  colorInput.style.width = '32px';
  colorInput.style.height = '32px';
  colorInput.style.border = 'none';
  colorInput.style.background = 'none';
  colorInput.style.cursor = 'pointer';
  
  colorInput.addEventListener('input', () => {
    ImageEditor.setBrushColor(colorInput.value);
  });
  
  colorInput.addEventListener('change', () => {
    ImageEditor.setBrushColor(colorInput.value);
  });
  
  toolbarElement.appendChild(colorLabel);
  toolbarElement.appendChild(colorInput);
  
  // Add the toolbar to the document
  document.body.appendChild(toolbarElement);
}

/**
 * Bind keyboard shortcuts for tool selection
 */
function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only process if pencil tool is active
    if (!toolbarVisible) return;
    
    // Ignore keydown events in input elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const key = e.key.toUpperCase();
    
    switch (key) {
      case 'B':
        selectTool('brush');
        break;
      case 'E':
        selectTool('erase');
        break;
      case 'I':
        selectTool('eyedropper');
        break;
    }
  });
}

/**
 * Select a drawing tool
 * @param {string} toolId - The ID of the tool to select
 */
export function selectTool(toolId) {
  // Update active tool
  activeTool = toolId;
  
  // Update button appearance
  const buttons = document.querySelectorAll('.tool-button');
  buttons.forEach(button => {
    if (button.dataset.tool === toolId) {
      button.style.backgroundColor = '#5e89fb';
    } else {
      button.style.backgroundColor = '#555';
    }
  });
  
  // Change the mode in ImageEditor
  ImageEditor.changeMode(toolId);
  
  // Show toast notification
  let toolName = '';
  let shortcut = '';
  
  switch (toolId) {
    case 'brush':
      toolName = 'Brush';
      shortcut = 'B';
      break;
    case 'erase':
      toolName = 'Eraser';
      shortcut = 'E';
      break;
    case 'eyedropper':
      toolName = 'Eyedropper';
      shortcut = 'I';
      break;
  }
  
  showToast(`Selected ${toolName} (${shortcut}) Drawing Tool`, 'blue');
}

/**
 * Show the drawing toolbar
 */
export function showToolbar() {
  if (!toolbarElement) {
    initToolbar();
  }
  
  toolbarElement.style.opacity = '1';
  toolbarElement.style.pointerEvents = 'auto';
  toolbarVisible = true;
}

/**
 * Hide the drawing toolbar
 */
export function hideToolbar() {
  if (!toolbarElement) return;
  
  toolbarElement.style.opacity = '0';
  toolbarElement.style.pointerEvents = 'none';
  toolbarVisible = false;
}

/**
 * Toggle the toolbar visibility
 * @param {boolean} visible - Whether the toolbar should be visible
 */
export function toggleToolbar(visible) {
  if (visible) {
    showToolbar();
  } else {
    hideToolbar();
  }
}

/**
 * Update the toolbar to match the current state
 */
export function updateToolbar() {
  // Update size input
  const sizeInput = document.querySelector('#drawing-toolbar input[type="number"]');
  if (sizeInput) {
    sizeInput.value = ImageEditor.getDrawingState().brushSize.toString();
  }
  
  // Update color input
  const colorInput = document.querySelector('#drawing-toolbar input[type="color"]');
  if (colorInput) {
    colorInput.value = ImageEditor.getDrawingState().brushColor;
  }
  
  // Update active tool
  activeTool = ImageEditor.getDrawingState().mode;
  const buttons = document.querySelectorAll('.tool-button');
  buttons.forEach(button => {
    if (button.dataset.tool === activeTool) {
      button.style.backgroundColor = '#5e89fb';
    } else {
      button.style.backgroundColor = '#555';
    }
  });
}