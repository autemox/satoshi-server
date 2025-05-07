import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';
import { reflowRows, updateAllPlusBoxes, updateDirectionLabels, getDirectionRowOffset } from './Main.js';
import { SkeletonRenderer } from './SkeletonRenderer.js';
import { getFrameForDirection, loadImage } from './LysleSheetManager.js';

/**
 * Imports a spritesheet PNG and loads its frames into the editor
 * @param {Function} getActiveTool - Function to get the active tool
 * @param {Set<string>} selectedPoints - Set of selected points
 * @param {{ current: boolean }} isDraggingPoint - Is dragging point state
 * @param {{ current: object | null }} dragTarget - Drag target object
 */
export async function importSpriteSheet(getActiveTool, selectedPoints, isDraggingPoint, dragTarget) {
  console.log('[SPRITESHEET] Importing sprite sheet...');

  // Create file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.png, .jpg, .jpeg';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Define the directions in the expected order
  const directions = ['north', 'east', 'south', 'west'];

  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) {
      document.body.removeChild(fileInput);
      return;
    }

    try {
      // Read the file as a data URL
      const imageUrl = await readFileAsDataURL(file);
      
      // Create an image element to get dimensions
      const img = await loadImage(imageUrl);
      const frameSize = 64; // Each frame is 64x64
      
      // Calculate frames and verify dimensions
      const totalWidth = img.width;
      const totalHeight = img.height;
      
      if (totalWidth % frameSize !== 0 || totalHeight % frameSize !== 0) {
        showToast('Spritesheet dimensions must be multiples of 64px', 'red');
        document.body.removeChild(fileInput);
        return;
      }
      
      const framesWide = totalWidth / frameSize;
      const framesHigh = totalHeight / frameSize;
      
      // We expect 4 rows (directions) with varying frames per direction
      if (framesHigh < directions.length) {
        showToast(`Spritesheet must have at least ${directions.length} rows for directions`, 'red');
        document.body.removeChild(fileInput);
        return;
      }
      
      // Slice the spritesheet into individual frames
      await processSpritesheetFrames(img, frameSize, framesWide, directions, getActiveTool, selectedPoints, isDraggingPoint, dragTarget);
      
      showToast('Spritesheet imported successfully', 'green');
    } catch (err) {
      console.error('[SPRITESHEET] Import failed:', err);
      showToast('Failed to import spritesheet: ' + err.message, 'red');
    }
    
    document.body.removeChild(fileInput);
  });

  fileInput.click();
}

/**
 * Reads a file as a data URL
 * @param {File} file - The file to read
 * @returns {Promise<string>} - Promise resolving to the data URL
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Process all frames in the spritesheet
 * @param {HTMLImageElement} img - The spritesheet image
 * @param {number} frameSize - Size of each frame (width and height)
 * @param {number} framesWide - Number of frames horizontally
 * @param {string[]} directions - Array of directions
 * @param {Function} getActiveTool - Function to get the active tool
 * @param {Set<string>} selectedPoints - Set of selected points
 * @param {{ current: boolean }} isDraggingPoint - Is dragging point state
 * @param {{ current: object | null }} dragTarget - Drag target object
 */
async function processSpritesheetFrames(img, frameSize, framesWide, directions, getActiveTool, selectedPoints, isDraggingPoint, dragTarget) {
  const canvas = document.createElement('canvas');
  canvas.width = frameSize;
  canvas.height = frameSize;
  const ctx = canvas.getContext('2d');
  
  // Process each direction row
  for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
    const direction = directions[dirIndex];
    const dirSkeletons = ViewState.skeletonsByDirection[direction];
    
    // For each column in the spritesheet
    for (let col = 0; col < framesWide; col++) {
      // Skip if we're past the reference frames and don't have enough skeletons
      if (col >= 2 && col >= dirSkeletons.length) {
        // Add a new skeleton if needed - using the same approach as in Main.js
        const keypoints = JSON.parse(JSON.stringify(dirSkeletons[0].renderer.keypoints));
        const newId = `${direction}-skeleton${dirSkeletons.length + 1}`;
        
        // Create the skeleton using internal functions - here we need to recreate most of addSkeleton functionality
        const scene = document.getElementById('scene');
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', newId);
        scene.appendChild(group);
        
        // Create the image element
        const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imageEl.setAttribute('x', '0');
        imageEl.setAttribute('y', '0');
        imageEl.setAttribute('width', '64');
        imageEl.setAttribute('height', '64');
        imageEl.setAttribute('pointer-events', 'none');
        group.appendChild(imageEl);
        
        // Create skeleton layer
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.appendChild(layer);
        
        // Position based on direction and column
        const offsetX = col * 70 + (col > 1 ? 15 : 0);
        const offsetY = getDirectionRowOffset(direction);
        group.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
        
        // Create renderer
        const renderer = new SkeletonRenderer(
          newId,
          layer,
          keypoints,
          getActiveTool,
          selectedPoints,
          isDraggingPoint,
          dragTarget,
          direction
        );
        
        // Store in ViewState
        ViewState.skeletonsByDirection[direction].push({
          id: newId,
          group,
          renderer,
          imageEl
        });
        
        renderer.draw();
        console.log(`Added new skeleton frame for ${direction}: ${newId}`);
      }
      
      // Extract the frame from the spritesheet
      ctx.clearRect(0, 0, frameSize, frameSize);
      ctx.drawImage(
        img,
        col * frameSize,       // source x
        dirIndex * frameSize,  // source y
        frameSize,             // source width
        frameSize,             // source height
        0,                     // dest x
        0,                     // dest y
        frameSize,             // dest width
        frameSize              // dest height
      );
      
      // Convert to data URL
      const frameDataURL = canvas.toDataURL('image/png');
      
      // Skip if this is beyond the number of frames (empty frames)
      if (col < dirSkeletons.length) {
        // Set the image for this skeleton
        const skeleton = dirSkeletons[col];
        if (skeleton.imageEl) {
          skeleton.imageEl.setAttribute('href', frameDataURL);
          skeleton.imageEl.style.display = '';
        }
      }
    }
  }
  
  // Make sure to update the UI
  reflowRows();
  updateAllPlusBoxes();
  updateDirectionLabels();
}



/**
 * Exports the current sprite sheet as a PNG
 */
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