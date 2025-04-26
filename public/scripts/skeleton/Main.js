// @ts-check
import { SkeletonRenderer } from './SkeletonRenderer.js';
import { getSvg, showToast } from './utils.js';
import { ViewState } from './ViewState.js';
import { bindShortcuts } from './Bindings.js';
import { generateImage } from './GenerationManager.js';
import { saveLysleSheet, loadLysleSheet, exportSpriteSheet } from './LysleSheetManager.js';

console.log('Main.js loaded');

// listen for CTRL C and CTRL V
bindShortcuts(); 

const svg = getSvg('viewport');
const scene = /** @type {SVGGElement} */ (svg.getElementById('scene'));

const MIN_SKELETONS = 3;

/** @type {Set<string>} */
const selectedSkeletons = new Set();

/** @type {Set<string>} */
const selectedPoints = new Set();

/** @type {{ current: boolean }} */
const isDraggingPoint = { current: false };

/** @type {{ current: { skeleton: SkeletonRenderer, point: {label: string, x: number, y: number} } | null }} */
const dragTarget = { current: null };

let activeTool = 'point';
const getActiveTool = () => activeTool;

// constants
const BASE_ROW_HEIGHT = 80; // normal height for direction rows
const EXTRA_ROW_HEIGHT = 70; // extra height for each generation row

export function getDirectionRowOffset(direction) {
  const directions = ['north', 'east', 'south', 'west'];
  const index = directions.indexOf(direction);
  if (index === -1) return 0;

  // calculate total "base" offset from the order (north first, then east, south, west)
  let offset = index * BASE_ROW_HEIGHT;

  // Now, add extra height for previous directions if they have tall frames
  for (let i = 0; i < index; i++) {
    const dir = directions[i];
    const extraRows = getMaxGenerationsPerDirection(dir);
    offset += extraRows * EXTRA_ROW_HEIGHT;
  }

  return offset;
}
function getMaxGenerationsPerDirection(direction) {
  const skeletons = ViewState.skeletonsByDirection[direction] || [];
  let maxGenerations = 0;
  
  for (const skel of skeletons) {
    const genCount = skel.renderer.generations.length;
    if (genCount > maxGenerations) {
      maxGenerations = genCount;
    }
  }

  return maxGenerations;
}

export function reflowRows() {
  const directions = ['north', 'east', 'south', 'west'];
  
  let y = 0; // start from top

  directions.forEach(direction => {
    const skeletons = ViewState.skeletonsByDirection[direction] || [];

    skeletons.forEach((skeleton, i) => {
      const x = i * 70;
      skeleton.group.setAttribute('transform', `translate(${x}, ${y})`);
    });

    const baseHeight = BASE_ROW_HEIGHT;
    const maxGen = getMaxGenerationsPerDirection(direction);
    const extraHeight = maxGen * EXTRA_ROW_HEIGHT;
    
    y += baseHeight + extraHeight;
  });

  updateAllPlusBoxes();
  repositionDirectionLabels(); // <<< 🔥 call it here
  updateDirectionLabels(); 
}

function repositionDirectionLabels() {
  const labelGroup = svg.getElementById('direction-labels');
  if (!labelGroup) return;

  const directions = ['north', 'east', 'south', 'west'];
  directions.forEach((dir, index) => {
    const label = labelGroup.children[index];
    if (!label) return;

    const y = getDirectionRowOffset(dir) + 32; // consistent with addDirectionLabels
    label.setAttribute('y', y.toString());
  });
}

// --- Add skeleton ---
// Modified addSkeleton function
function addSkeleton(id, keypoints, direction) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('id', id);
  scene.appendChild(group);

  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.appendChild(layer);

  // Create and insert the image element BEFORE the renderer draws on top
  const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  imageEl.setAttribute('x', '0');
  imageEl.setAttribute('y', '0');
  imageEl.setAttribute('width', '64');
  imageEl.setAttribute('height', '64');
  imageEl.setAttribute('href', ''); // empty initially
  imageEl.setAttribute('pointer-events', 'none');
  group.appendChild(imageEl); // must be below bones/joints

  // Calculate position based on direction and number of skeletons in that direction
  const directionSkeletons = ViewState.skeletonsByDirection[direction];
  const offsetX = directionSkeletons.length * 70;
  const offsetY = getDirectionRowOffset(direction);
  group.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);

  const renderer = new SkeletonRenderer(
    id,
    layer,
    JSON.parse(JSON.stringify(keypoints)), // deep copy
    () => activeTool,
    selectedPoints,
    isDraggingPoint,
    dragTarget,
    direction,
  );

  // Store imageEl too
  const skeletonObj = { id, group, renderer, imageEl, direction };
  ViewState.skeletonsByDirection[direction].push(skeletonObj);
  renderer.draw();

  updatePlusBox(direction);
}
  
  // --- Add the plus (+) box ---
  // Modified addPlusBox function
function addPlusBox(direction) {
  let plusBoxId = `plus-box-${direction}`;
  let plusBox = svg.getElementById(plusBoxId);
  if (plusBox) plusBox.remove();

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('id', plusBoxId);
  
  const directionSkeletons = ViewState.skeletonsByDirection[direction];
  const x = directionSkeletons.length * 70;
  const y = getDirectionRowOffset(direction);

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x.toString());
  rect.setAttribute('y', y.toString());
  rect.setAttribute('width', '64');
  rect.setAttribute('height', '64');
  rect.setAttribute('stroke', 'white');
  rect.setAttribute('fill', '#222');

  const plus = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  plus.textContent = '+';
  plus.setAttribute('x', (x + 32).toString());
  plus.setAttribute('y', (y + 38).toString());
  plus.setAttribute('fill', 'white');
  plus.setAttribute('font-size', '32');
  plus.setAttribute('text-anchor', 'middle');
  plus.setAttribute('pointer-events', 'none');

  group.appendChild(rect);
  group.appendChild(plus);
  scene.appendChild(group);

  rect.addEventListener('mousedown', () => {
    console.log(`(click) Adding new skeleton to ${direction}`);
    ViewState.activeDirection = direction; // Set active direction when adding
    const dirSkeletons = ViewState.skeletonsByDirection[direction];
    
    // Use the first skeleton of this direction as template, or the first skeleton of any direction if empty
    let templateSkeleton;
    if (dirSkeletons.length > 0) {
      templateSkeleton = dirSkeletons[0].renderer.keypoints;
    } else {
      // Find first available skeleton from any direction
      for (const dir of ['north', 'east', 'south', 'west']) {
        if (ViewState.skeletonsByDirection[dir].length > 0) {
          templateSkeleton = ViewState.skeletonsByDirection[dir][0].renderer.keypoints;
          break;
        }
      }
    }
    
    if (templateSkeleton) {
      const keypointsCopy = JSON.parse(JSON.stringify(templateSkeleton));
      const newId = `${direction}-skeleton${dirSkeletons.length + 1}`;
      addSkeleton(newId, keypointsCopy, direction);
    } else {
      console.error('No template skeleton found');
    }
  });
}

export function updateAllPlusBoxes() {
  ['north', 'east', 'south', 'west'].forEach(dir => {
    updatePlusBox(dir);
  });
}

function updatePlusBox(direction) {
  addPlusBox(direction); // regenerate the + box for specified direction
}

// Function to add direction labels
function addDirectionLabels() {
  const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  labelGroup.setAttribute('id', 'direction-labels');
  
  const directions = ['North', 'East', 'South', "West"];
  directions.forEach((dir, index) => {
    const y = getDirectionRowOffset(dir.toLowerCase()) + 32; // Center vertically in row
    
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '-60'); // Position to the left of skeletons
    label.setAttribute('y', y.toString());
    label.setAttribute('fill', 'white');
    label.setAttribute('font-size', '14');
    label.setAttribute('text-anchor', 'start');
    label.setAttribute('dominant-baseline', 'middle');
    label.textContent = dir;
    
    // Make the label clickable to set active direction
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => {
      ViewState.activeDirection = dir.toLowerCase();
      // Update visual indication of active direction
      updateDirectionLabels();
    });
    
    labelGroup.appendChild(label);
  });
  
  scene.appendChild(labelGroup);
}

// Function to update the visual state of direction labels
export function updateDirectionLabels() {
  const labelGroup = svg.getElementById('direction-labels');
  if (!labelGroup) return;
  
  // Update all labels
  Array.from(labelGroup.children).forEach(label => {
    const labelText = label.textContent?.toLowerCase();
    if (labelText === ViewState.activeDirection) {
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('fill', '#3399ff'); // Highlight active direction
    } else {
      label.setAttribute('font-weight', 'normal');
      label.setAttribute('fill', 'white');
    }
  });
}
  

  function disableTextSelection() {
    const style = document.createElement('style');
    style.textContent = `
      svg text {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        cursor: default;
      }
    `;
    document.head.appendChild(style);
  }
  
  if (!window.__MAIN_INITIALIZED__) {
    window.__MAIN_INITIALIZED__ = true;
  
    (async function () {
      try {
        console.warn('Initializing...');

      const res = await fetch('/default-west.json');
      const data = await res.json();
      const keypoints = data.pose_keypoints[0];
  
      if (!scene) throw new Error('Scene group not found');

      console.log('Initializing load button listener.');
      const saveButton = document.querySelector('[data-button="save"]');
      if (saveButton) saveButton.addEventListener('click', saveLysleSheet);
      const exportButton = document.querySelector('[data-button="export"]');
      if (exportButton) exportButton.addEventListener('click', exportSpriteSheet);
      const loadButton = document.querySelector('[data-button="load"]');
      if (loadButton) loadButton.addEventListener('click', () => loadLysleSheet(getActiveTool, selectedPoints, isDraggingPoint, dragTarget, getDirectionRowOffset));
  
      // Initialize all directions with reference skeletons
      const directions = ['north', 'east', 'south', 'west'];
      directions.forEach(direction => {
        // Create 3 skeletons for each direction (reference, optional reference, and frame 1)
        for (let i = 1; i <= MIN_SKELETONS; i++) {
          addSkeleton(`${direction}-skeleton${i}`, keypoints, direction);
        }
      });
  
      // Set initial active direction
      ViewState.activeDirection = 'north';
      
      // Add direction labels
      addDirectionLabels();
      updateDirectionLabels();
      document.addEventListener('directionChanged', (e) => {
        updateDirectionLabels();
      });
  
      enablePanAndZoom(scene, svg);

      // Call this function in your initialization
      disableTextSelection();
    } catch (err) {
      console.error('Failed to load keypoints:', err);
    }
  })();
  
// only allow one active tool at at time
document.querySelectorAll('.tool-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTool = /** @type {HTMLButtonElement} */ (btn).dataset.tool || 'select';
    console.log(`Active tool set to ${activeTool}`);
    showToast(`Tool mode set to: ${activeTool}`, "gray");
  });
});
document.querySelectorAll('.clipboard-mode-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.clipboard-mode-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ViewState.clipboardMode = btn.getAttribute('clipboard-mode') || 'image';
    console.log(`Clipboard (CTRL+C) mode set to ${ViewState.clipboardMode}`);
    showToast(`Clipboard mode set to: ${ViewState.clipboardMode}`, "gray");
  });
});

/**
 * Enables pan and zoom interaction
 * @param {SVGGElement} scene
 * @param {SVGSVGElement} svg
 */
function enablePanAndZoom(scene, svg) {
  let isPanning = false; // is the user dragging/panning?
  let lastX = 0, lastY = 0;

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
  
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
  
    // Convert screen -> SVG space
    const svgX = (mouseX / svg.clientWidth) * svg.viewBox.baseVal.width;
    const svgY = (mouseY / svg.clientHeight) * svg.viewBox.baseVal.height;
  
    // Convert to scene-space (pre-zoom)
    const worldX = (svgX - ViewState.offsetX) / ViewState.scale;
    const worldY = (svgY - ViewState.offsetY) / ViewState.scale;
  
    const zoom = e.deltaY < 0 ? 1.02 : 0.98;
    ViewState.scale *= zoom;

    // dont allow scale to be too small or too large
    if (ViewState.scale < 0.5) ViewState.scale = 0.5;
    if (ViewState.scale > 25) ViewState.scale = 25;
  
    // Recalculate offset so point under mouse stays fixed
    ViewState.offsetX = svgX - worldX * ViewState.scale;
    ViewState.offsetY = svgY - worldY * ViewState.scale;
  
    updateTransform();
  });

  svg.addEventListener('mouseup', (e) => {
    if (isDraggingPoint.current && dragTarget.current) {
      const wasDrag = ViewState.notAClick === true;
      const { skeleton } = dragTarget.current;
  
      if (!wasDrag && ViewState.dragKey) {
        const [skeletonId, label] = ViewState.dragKey.split('::');
        if (skeleton.id === skeletonId) {
          const isSelected = selectedPoints.has(ViewState.dragKey);
          skeleton.mouseClick(e, ViewState.dragKey, isSelected); 
        }
      }
    }
  
    isPanning = false;
    isDraggingPoint.current = false;
    dragTarget.current = null;
    ViewState.dragKey = null;
    ViewState.notAClick = false;
    svg.style.cursor = activeTool === 'hand' ? 'grab' : 'pointer';
  });

  // handles panning and skeleton frame selection
  svg.addEventListener('mousedown', (e) => {
    console.log('(click) Mouse down on SVG');
    const rect = svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / svg.clientWidth);
    const svgY = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / svg.clientHeight);
    
    // Check if we clicked on a point or other interactive element
    const target = /** @type {HTMLElement} */ (e.target);
    const isPivot = target?.tagName === 'circle';
    
    if (!isPivot) {

      console.log('(click) Mouse down on SVG, not a point');
      // Handle panning
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.style.cursor = 'grabbing';
      
      // If clicked on empty space (not a skeleton) and no modifier key, clear selections'
      const isInsideInteractive =
        target.closest('g[id^="skeleton"]') ||
        (target.closest('text') && (
          target.textContent === '✅' ||
          target.textContent === '🚫' ||
          target.textContent === '⚡' ||
          target.textContent === '☰'
        ));
      if (!isInsideInteractive && !(e.shiftKey || e.ctrlKey || e.metaKey)) {

        console.log('(click) Mouse down on SVG, not a skeleton, point, or generation');
        ViewState.activeSkeletons.clear();
        ViewState.skeletons.forEach(s => s.renderer.draw());
      }
    }
  });
  
  // Helper function to determine which skeleton was clicked
  function getSkeletonAtPosition(x, y) {
    for (const skeleton of ViewState.skeletons) {
      // Extract transform info for the skeleton
      const transform = skeleton.group.getAttribute('transform');
      let skeletonX = 0;
      if (transform) {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) skeletonX = parseFloat(match[1]);
      }
      
      // Check if click is within this skeleton's bounds (assuming 64 width)
      if (x >= skeletonX && x < skeletonX + 64 && y >= 0 && y < 64) {
        return skeleton;
      }
    }
    return null;
  }

  svg.addEventListener('mouseup', () => {
    isPanning = false;
    isDraggingPoint.current = false;
    dragTarget.current = null;
    if (activeTool === 'hand') svg.style.cursor = 'grab';
    else svg.style.cursor = 'pointer';
  });

  svg.addEventListener('mouseleave', () => {
    isPanning = false;
    if (activeTool === 'hand') svg.style.cursor = 'grab';
    else svg.style.cursor = 'pointer';
  });

    svg.addEventListener('mousemove', (e) => {
      if (isDraggingPoint.current && dragTarget.current) {
        const rect = svg.getBoundingClientRect();
        const svgX = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / svg.clientWidth);
        const svgY = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / svg.clientHeight);
        const sceneX = (svgX - ViewState.offsetX) / ViewState.scale;
        const sceneY = (svgY - ViewState.offsetY) / ViewState.scale;
      
        const dx = sceneX - ViewState.dragStartSceneX;
        const dy = sceneY - ViewState.dragStartSceneY;
    
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) ViewState.notAClick = true;
        console.log(`dx: ${dx.toFixed(4)}, dy: ${dy.toFixed(4)}`);
      
        ViewState.dragStartSceneX = sceneX;
        ViewState.dragStartSceneY = sceneY;
      
        const target = dragTarget.current;
        const skeletonMap = new Map();
        
        // Function to move a point in a skeleton by dx, dy
        function movePoint(skeletonId, pointLabel, deltaX, deltaY) {
          // Find the skeleton renderer
          const skeleton = ViewState.skeletons.find(s => s.id === skeletonId)?.renderer;
          if (!skeleton) return;
          
          // Find the keypoint
          const kp = skeleton.keypoints.find(k => k.label === pointLabel);
          if (!kp) return;
          
          // Move the point
          kp.x += deltaX / 64;
          kp.y += deltaY / 64;
          console.log(`Moved ${pointLabel} in ${skeletonId} to x: ${kp.x.toFixed(4)}, y: ${kp.y.toFixed(4)}`);
          
          // Add to the map of skeletons to redraw
          skeletonMap.set(skeletonId, skeleton);
        }
        
        // Make sure the currently dragged skeleton is in activeSkeletons
        const skeletonId = target.skeleton.id;
        if (!ViewState.activeSkeletons.has(skeletonId)) {
          ViewState.activeSkeletons.add(skeletonId);
        }
        
        // Get the point being dragged
        const [sourceSkeletonId, draggedPointLabel] = ViewState.dragKey.split('::');
        
        // If there are selected points, only move those points in all selected skeletons
        if (selectedPoints.size > 0) {
          // Get all the point labels from selectedPoints
          const pointLabels = new Set();
          selectedPoints.forEach(key => {
            const [_, label] = key.split('::');
            pointLabels.add(label);
          });
          
          // For each selected skeleton, move all the selected points
          ViewState.activeSkeletons.forEach(skelId => {
            pointLabels.forEach(label => {
              movePoint(skelId, label, dx, dy);
            });
          });
        } 
        else console.log('No points selected to move');
      
        skeletonMap.forEach(s => s.draw());
        return;
      }
    
      if (!isPanning) return; // ⛔ exit early if not dragging
      
      // Only allow pan if tool is hand OR mouse is outside frame
      const rectX = ViewState.offsetX;
      const rectY = ViewState.offsetY;
      const rectW = 64 * ViewState.scale;
      const rectH = 64 * ViewState.scale;
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const insideFrame =
        mouseX >= rectX && mouseX <= rectX + rectW &&
        mouseY >= rectY && mouseY <= rectY + rectH;
      
      if (isDraggingPoint.current) return;
      
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      
      const panSpeed = 1;
      ViewState.offsetX += (dx) * panSpeed;
      ViewState.offsetY += (dy) * panSpeed;
      
      lastX = e.clientX;
      lastY = e.clientY;
      
      updateTransform();
    });

  function updateTransform() {
    scene.setAttribute('transform', `translate(${ViewState.offsetX}, ${ViewState.offsetY}) scale(${ViewState.scale})`);
  }

  updateTransform(); // initialize
}
  }