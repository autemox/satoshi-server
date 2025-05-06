/*
handles saving and loading project files with saveLysleSheet() and loadLysleSheet() functions that preserve all skeleton and image data
*/

import { ViewState } from './ViewState.js';
import { SkeletonRenderer } from './SkeletonRenderer.js';
import { reflowRows, updateAllPlusBoxes, updateDirectionLabels } from './Main.js';
import { Settings } from './Settings.js';
import { showToast } from './utils.js';
import { clearCurrentProject, enablePanAndZoom } from './Main.js';

// Helper function to horizontally flip an image
function flipImageHorizontally(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  // Flip horizontally
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  
  return canvas;
}

export function newProject() {
  console.log('[LYSLESHEET] Starting new project...');

  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = 0;
  modal.style.left = 0;
  modal.style.width = '100vw';
  modal.style.fontFamily = 'Arial, sans-serif';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0, 0, 0, 0.7)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = 1000;

  // Modal content
  const box = document.createElement('div');
  box.style.background = '#333';
  box.style.padding = '30px';
  box.style.borderRadius = '20px';
  box.style.color = 'white';
  box.style.fontSize = '14px';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.gap = '10px';
  box.style.width = '350px';
  box.style.textAlign = 'center';

  box.innerHTML = `
    <div style="font-size: 18px; font-weight: bold;">New Project</div>
    <div>⚠️ This will erase your current project. Have you saved?</div>
    <input type="text" id="new-project-name" placeholder="Enter new project name" style="padding: 6px; border-radius: 5px; border: none;">
    <div style="display: flex; justify-content: center; gap: 10px;">
      <button id="confirm-new-project" style="padding: 6px 12px; background: green; color: white; border: none; border-radius: 5px; cursor: pointer;">Start New</button>
      <button id="cancel-new-project" style="padding: 6px 12px; background: red; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
    </div>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  // Button actions
  document.getElementById('confirm-new-project').onclick = () => {
    const nameInput = document.getElementById('new-project-name');
    const newName = nameInput.value.trim();

    if (!newName) {
      alert('Please enter a project name.');
      return;
    }

    // Set the new project name
    Settings.projectName = newName;

    // Clear and reinitialize everything properly
    clearCurrentProject(); 

    // Show toast
    showToast(`Started new project: ${newName}`, 'green');

    // Remove modal
    document.body.removeChild(modal);

  };

  document.getElementById('cancel-new-project').onclick = () => {
    document.body.removeChild(modal);
  };
}

// Helper to get corresponding frame from opposite direction when missing
async function getFrameForDirection(col, dir, skeletonsByDirection) {
  const skeletons = skeletonsByDirection[dir] || [];
  // Skip first two (reference + optional reference)
  const frames = skeletons.slice(2);
  
  if (col < frames.length) {
    const skeleton = frames[col];
    const imageHref = skeleton.imageEl?.getAttribute('href');
    
    if (imageHref && imageHref !== 'data:,' && imageHref.trim() !== '') {
      return await loadImage(imageHref);
    }
  }
  
  // If we're here, the frame is missing - check the opposite direction
  const oppositeDir = dir === 'east' ? 'west' : (dir === 'west' ? 'east' : null);
  if (!oppositeDir) return null; // Only handle east/west mirroring
  
  const oppositeSkeletons = skeletonsByDirection[oppositeDir] || [];
  const oppositeFrames = oppositeSkeletons.slice(2);
  
  if (col < oppositeFrames.length) {
    const oppositeSkeleton = oppositeFrames[col];
    const oppositeImageHref = oppositeSkeleton.imageEl?.getAttribute('href');
    
    if (oppositeImageHref && oppositeImageHref !== 'data:,' && oppositeImageHref.trim() !== '') {
      const img = await loadImage(oppositeImageHref);
      // Flip the image horizontally
      return flipImageHorizontally(img);
    }
  }
  
  return null; // Nothing found in either direction
}

export async function exportSpriteSheet() {
  console.log('[SPRITESHEET] Exporting sprite sheet...');

  const directions = ['north', 'east', 'south', 'west'];

  // Find max number of frames (excluding reference frames)
  let maxFrames = 0;
  for (const dir of directions) {
    const skeletons = ViewState.skeletonsByDirection[dir] || [];
    const frames = skeletons.length - 2; // skip required and optional reference
    if (frames > maxFrames) maxFrames = frames;
  }

  const frameSize = 64; // each frame is 64x64
  const canvasWidth = maxFrames * frameSize;
  const canvasHeight = directions.length * frameSize;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (let row = 0; row < directions.length; row++) {
    const dir = directions[row];
    
    for (let col = 0; col < maxFrames; col++) {
      // Try to get frame or its flipped counterpart if it's east/west
      let img = null;
      
      if (dir === 'east' || dir === 'west') {
        img = await getFrameForDirection(col, dir, ViewState.skeletonsByDirection);
      } else {
        // For north/south, just get the regular frame
        const skeletons = ViewState.skeletonsByDirection[dir] || [];
        const frames = skeletons.slice(2);
        
        if (col < frames.length) {
          const skeleton = frames[col];
          const imageHref = skeleton.imageEl?.getAttribute('href');
          
          if (imageHref && imageHref !== 'data:,' && imageHref.trim() !== '') {
            img = await loadImage(imageHref);
          }
        }
      }
      
      if (img) {
        ctx.drawImage(
          img,
          col * frameSize,
          row * frameSize,
          frameSize,
          frameSize
        );
      }
    }
  }

  // Download the canvas as PNG with project name
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    
    // Use project name for the file name (sanitized for file system)
    const safeProjectName = Settings.projectName
      .replace(/[^a-z0-9]/gi, '-') // Replace non-alphanumeric chars with -
      .toLowerCase();
    
    a.download = `${safeProjectName}.png`;
    document.body.appendChild(a);
    a.click();

    showToast(`Saved ${safeProjectName}.png to your downloads folder`, 'green');

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, 'image/png');

  console.log('[SPRITESHEET] Export complete.');
}

// Helper to load image from href
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // important if images are data: URLs
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}


export function saveLysleSheet(isAutoSave = false) {
  console.log(`[LYSLESHEET] ${isAutoSave ? 'Auto-saving' : 'Saving'}...`);

  // Build the export data
  const data = {
    version: 1, 
    projectName: Settings.projectName,
    skeletonsByDirection: {},
    view: {
      offsetX: ViewState.offsetX,
      offsetY: ViewState.offsetY,
      scale: ViewState.scale,
    }
  };

  for (const [direction, skeletons] of Object.entries(ViewState.skeletonsByDirection)) {
    data.skeletonsByDirection[direction] = skeletons.map(s => ({
      id: s.id,
      keypoints: s.renderer.keypoints,
      imageHref: s.imageEl?.getAttribute('href') || '',
    }));
  }

  const jsonString = JSON.stringify(data, null, 2);
  
  // For auto-save, store in localStorage instead of downloading
  if (isAutoSave) {
    try {
      localStorage.setItem('skeletonToolAutoSave', jsonString);
      console.log('[LYSLESHEET] Auto-save complete');
      return;
    } catch (err) {
      console.error('[LYSLESHEET] Auto-save failed:', err);
      // If localStorage fails, fall back to regular save
    }
  }
  
  // Regular save - download the file with project name
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  
  // Use project name for the file name (sanitized for file system)
  const safeProjectName = Settings.projectName
    .replace(/[^a-z0-9]/gi, '-') // Replace non-alphanumeric chars with -
    .toLowerCase();
  
  a.download = `${safeProjectName}.lyslesheet`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  if (!isAutoSave) {
    showToast(`Saved ${safeProjectName}.lyslesheet to your downloads folder`, 'green');
  }
}

export async function loadLysleSheet(getActiveTool, selectedPoints, isDraggingPoint, dragTarget, getDirectionRowOffset) {
  console.log('[LYSLESHEET] Loading...');

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.lyslesheet';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const data = JSON.parse(event.target.result);

        if (!data.skeletonsByDirection || typeof data.skeletonsByDirection !== 'object') {
          throw new Error('Invalid lyslesheet file structure.');
        }

        // Clear existing skeletons
        for (const dir of Object.keys(ViewState.skeletonsByDirection)) {
          ViewState.skeletonsByDirection[dir].forEach(s => {
            if (s.group?.parentNode) {
              s.group.parentNode.removeChild(s.group);
            }
          });
          ViewState.skeletonsByDirection[dir] = [];
        }

        const scene = document.getElementById('scene');

        for (const [direction, skeletons] of Object.entries(data.skeletonsByDirection)) {
          for (let i = 0; i < skeletons.length; i++) {
            const s = skeletons[i];

            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('id', s.id);

            const offsetX = i * 70;
            const offsetY = getDirectionRowOffset(direction);

            group.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);

            const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            imageEl.setAttribute('x', '0');
            imageEl.setAttribute('y', '0');
            imageEl.setAttribute('width', '64');
            imageEl.setAttribute('height', '64');
            if (s.imageHref && s.imageHref !== 'data:,' && s.imageHref.trim() !== '' && 
              !s.imageHref.includes('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP')) {
                imageEl.setAttribute('href', s.imageHref);
            } else imageEl.removeAttribute('href');
            imageEl.setAttribute('pointer-events', 'none');
            group.appendChild(imageEl); // Add image first

            const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.appendChild(layer); // Then bones and keypoints

            scene.appendChild(group);

            const renderer = new SkeletonRenderer(
              s.id,
              layer,
              s.keypoints,
              getActiveTool,
              selectedPoints,
              isDraggingPoint, 
              dragTarget, 
              direction
            );

            ViewState.skeletonsByDirection[direction].push({
              id: s.id,
              group,
              renderer,
              imageEl
            });

            renderer.draw();
          }
        }

        // Load view settings
        if (data.view) {
          ViewState.offsetX = data.view.offsetX ?? 480;
          ViewState.offsetY = data.view.offsetY ?? 480;
          ViewState.scale = data.view.scale ?? 8;
        }

        const sceneGroup = document.getElementById('scene');
        if (sceneGroup) {
          sceneGroup.setAttribute('transform', `translate(${ViewState.offsetX}, ${ViewState.offsetY}) scale(${ViewState.scale})`);
        }

        reflowRows();
        updateAllPlusBoxes();
        updateDirectionLabels();

        console.log('[LYSLESHEET] Loaded successfully');
      } catch (err) {
        console.error('[LYSLESHEET] Load failed:', err);
        alert('Failed to load .lyslesheet: ' + err.message);
      }
    };

    reader.onerror = function () {
      console.error('[LYSLESHEET] File read failed');
      alert('Failed to read file');
    };

    reader.readAsText(file);
    document.body.removeChild(fileInput);
  });

  fileInput.click();
}

/**
 * Saves the entire project to localStorage
 * @param {boolean} isAutoSave - Whether this is an auto-save operation
 * @returns {boolean} - Whether the save was successful
 */
export function saveProjectToStorage(isAutoSave = false) {
  console.log(`[STORAGE] ${isAutoSave ? 'Auto-saving' : 'Saving'} project to localStorage...`);
  
  try {
    // Build the export data
    const data = {
      version: 1, 
      projectName: Settings.projectName,
      skeletonsByDirection: {},
      view: {
        offsetX: ViewState.offsetX,
        offsetY: ViewState.offsetY,
        scale: ViewState.scale,
      },
      timestamp: new Date().toISOString()
    };

    // Save all skeleton data for each direction
    for (const [direction, skeletons] of Object.entries(ViewState.skeletonsByDirection)) {
      data.skeletonsByDirection[direction] = skeletons.map(s => ({
        id: s.id,
        keypoints: s.renderer.keypoints,
        imageHref: s.imageEl?.getAttribute('href') || '',
      }));
    }

    const jsonString = JSON.stringify(data);
    
    // Save to localStorage - use a simple obfuscation to reduce size
    localStorage.setItem('lysleToolProject', jsonString);
    
    if (!isAutoSave) {
      showToast('Project saved to browser storage', 'green');
    }
    
    return true;
  } catch (err) {
    console.error('[STORAGE] Save failed:', err);
    if (!isAutoSave) {
      showToast('Failed to save project to browser storage', 'red');
    }
    return false;
  }
}

/**
 * Loads the project from localStorage
 * @param {Function} getActiveTool - The function to get active tool
 * @param {Set<string>} selectedPoints - The selected points set
 * @param {{ current: boolean }} isDraggingPoint - Dragging point state
 * @param {{ current: object | null }} dragTarget - Drag target object
 * @param {Function} getDirectionRowOffset - Function to get row offset
 * @returns {boolean} - Whether load was successful
 */
export function loadProjectFromStorage(getActiveTool, selectedPoints, isDraggingPoint, dragTarget, getDirectionRowOffset) {
  console.log('[STORAGE] Loading project from localStorage...');
  
  try {
    const jsonString = localStorage.getItem('lysleToolProject');
    if (!jsonString) {
      console.log('[STORAGE] No saved project found in localStorage');
      return false;
    }
    
    const data = JSON.parse(jsonString);
    
    if (!data.skeletonsByDirection || typeof data.skeletonsByDirection !== 'object') {
      throw new Error('Invalid project structure in localStorage');
    }

    if (data.projectName) {
      Settings.projectName = data.projectName;
    }
    
    // Clear existing skeletons
    for (const dir of Object.keys(ViewState.skeletonsByDirection)) {
      ViewState.skeletonsByDirection[dir].forEach(s => {
        if (s.group?.parentNode) {
          s.group.parentNode.removeChild(s.group);
        }
      });
      ViewState.skeletonsByDirection[dir] = [];
    }
    
    const scene = document.getElementById('scene');
    
    for (const [direction, skeletons] of Object.entries(data.skeletonsByDirection)) {
      for (let i = 0; i < skeletons.length; i++) {
        const s = skeletons[i];
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', s.id);
        
        const offsetX = i * 70;
        const offsetY = getDirectionRowOffset(direction);
        
        group.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
        
        const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imageEl.setAttribute('x', '0');
        imageEl.setAttribute('y', '0');
        imageEl.setAttribute('width', '64');
        imageEl.setAttribute('height', '64');
        
        if (s.imageHref && s.imageHref !== 'data:,' && s.imageHref.trim() !== '' && 
          !s.imageHref.includes('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP')) {
            imageEl.setAttribute('href', s.imageHref);
        } else {
          imageEl.removeAttribute('href');
        }
        
        imageEl.setAttribute('pointer-events', 'none');
        group.appendChild(imageEl); // Add image first
        
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.appendChild(layer); // Then bones and keypoints
        
        scene.appendChild(group);
        
        const renderer = new SkeletonRenderer(
          s.id,
          layer,
          s.keypoints,
          getActiveTool,
          selectedPoints,
          isDraggingPoint, 
          dragTarget, 
          direction
        );
        
        ViewState.skeletonsByDirection[direction].push({
          id: s.id,
          group,
          renderer,
          imageEl
        });
        
        renderer.draw();
      }
    }
    
    // Load view settings
    if (data.view) {
      ViewState.offsetX = data.view.offsetX ?? 480;
      ViewState.offsetY = data.view.offsetY ?? 480;
      ViewState.scale = data.view.scale ?? 8;
    }
    
    const sceneGroup = document.getElementById('scene');
    if (sceneGroup) {
      sceneGroup.setAttribute('transform', `translate(${ViewState.offsetX}, ${ViewState.offsetY}) scale(${ViewState.scale})`);
    }
    
    reflowRows();
    updateAllPlusBoxes();
    updateDirectionLabels();
    
    console.log('[STORAGE] Project loaded successfully from localStorage');
    return true;
  } catch (err) {
    console.error('[STORAGE] Load failed:', err);
    return false;
  }
}

/**
 * Clears any saved project data from localStorage
 */
export function clearStoredProject() {
  localStorage.removeItem('lysleToolProject');
  console.log('[STORAGE] Project data cleared from localStorage');
}

/**
 * Checks if there's a stored project available
 * @returns {boolean} Whether a project exists in storage
 */
export function hasStoredProject() {
  const projectData = localStorage.getItem('lysleToolProject');
  return !!projectData;
}