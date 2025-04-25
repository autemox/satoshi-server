// @ts-check
import { SkeletonRenderer } from './SkeletonRenderer.js';
import { getSvg } from './utils.js';
import { ViewState } from './ViewState.js';
import { bindShortcuts } from './Bindings.js';
import { generateImage } from './GenerationManager.js';
import { saveLysleSheet, loadLysleSheet, exportSpriteSheet } from './LysleSheetManager.js';

// listen for CTRL C and CTRL V
bindShortcuts(); 

const svg = getSvg('viewport');
const scene = /** @type {SVGGElement} */ (svg.getElementById('scene'));

ViewState.skeletons = [];

const MIN_SKELETONS = 3;

/** @type {Set<string>} */
const selectedSkeletons = new Set();

/** @type {Set<string>} */
const selectedPoints = new Set();

/** @type {{ current: boolean }} */
const isDraggingPoint = { current: false };

/** @type {{ current: { skeleton: SkeletonRenderer, point: {label: string, x: number, y: number} } | null }} */
const dragTarget = { current: null };

// --- Add skeleton ---
function addSkeleton(id, keypoints) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', id);
    scene.appendChild(group);
  
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.appendChild(layer);
  
    // 💡 Create and insert the image element BEFORE the renderer draws on top
    const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    imageEl.setAttribute('x', '0');
    imageEl.setAttribute('y', '0');
    imageEl.setAttribute('width', '64');
    imageEl.setAttribute('height', '64');
    imageEl.setAttribute('href', ''); // empty initially
    imageEl.setAttribute('pointer-events', 'none');
    group.appendChild(imageEl); // must be below bones/joints
  
    const offsetX = ViewState.skeletons.length * 70;
    group.setAttribute('transform', `translate(${offsetX}, 0)`);
  
    const renderer = new SkeletonRenderer(
      id,
      layer,
      JSON.parse(JSON.stringify(keypoints)), // deep copy
      () => activeTool,
      selectedPoints,
      isDraggingPoint,
      dragTarget
    );
  
    // ✅ Store imageEl too
    ViewState.skeletons.push({ id, group, renderer, imageEl });
    renderer.draw();
  
    updatePlusBox();
  }
  
  // --- Add the plus (+) box ---
  function addPlusBox() {
    let plusBox = svg.getElementById('plus-box');
    if (plusBox) plusBox.remove();
  
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', 'plus-box');
    const x = ViewState.skeletons.length * 70;
  
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x.toString());
    rect.setAttribute('y', '0');
    rect.setAttribute('width', '64');
    rect.setAttribute('height', '64');
    rect.setAttribute('stroke', 'white');
    rect.setAttribute('fill', '#222');
  
    const plus = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    plus.textContent = '+';
    plus.setAttribute('x', (x + 32).toString());
    plus.setAttribute('y', '38');
    plus.setAttribute('fill', 'white');
    plus.setAttribute('font-size', '32');
    plus.setAttribute('text-anchor', 'middle');
    plus.setAttribute('pointer-events', 'none');
  
    group.appendChild(rect);
    group.appendChild(plus);
    scene.appendChild(group);
  
    rect.addEventListener('mousedown', () => {
      console.log('(click) Adding new skeleton');
      const keypointsCopy = JSON.parse(JSON.stringify(ViewState.skeletons[0].renderer.keypoints));
      const newId = `skeleton${ViewState.skeletons.length + 1}`;
      addSkeleton(newId, keypointsCopy);
    });
  }
  
  function updatePlusBox() {
    addPlusBox(); // always regenerate the + box at new right side
  }
  
  // --- Deselect active skeleton if clicking outside ---
  /*svg.addEventListener('mousedown', (e) => {
    console.log('(click) attempt deselect active skeleton');
    const target = /** @type {HTMLElement} *//* (e.target);
    const isInsideBox = target.closest('g[id^="skeleton"]');
    if (!isInsideBox || target.id === 'plus-box') {
      ViewState.activeSkeleton = '';
      ViewState.skeletons.forEach(s => s.renderer.draw());
    }
  });*/

(async function () {
  try {
    const res = await fetch('/default-west.json');
    const data = await res.json();
    const keypoints = data.pose_keypoints[0];

    const svg = getSvg('viewport');
    const scene = /** @type {SVGGElement} */ (svg.getElementById('scene'));

    if (!scene) throw new Error('Scene group not found');

    const layer = /** @type {SVGGElement} */ (svg.getElementById('joints-layer'));

    // create 3 skeletons
    for (let i = 1; i <= MIN_SKELETONS; i++) {
        addSkeleton(`skeleton${i}`, keypoints);
    }

    enablePanAndZoom(scene, svg);

  } catch (err) {
    console.error('Failed to load keypoints:', err);
  }
})();

let activeTool = 'point';
document.querySelectorAll('.tool-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTool = /** @type {HTMLButtonElement} */ (btn).dataset.tool || 'select';
  });
});
const saveButton = document.querySelector('[data-button="save"]');
if (saveButton) saveButton.addEventListener('click', saveLysleSheet);
const loadButton = document.querySelector('[data-button="load"]');
if (loadButton) loadButton.addEventListener('click', loadLysleSheet);

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
      // Handle panning
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.style.cursor = 'grabbing';
      
      // If clicked on empty space (not a skeleton) and no modifier key, clear selections
      const isInsideSkeleton = target.closest('g[id^="skeleton"]');
      if (!isInsideSkeleton && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
        ViewState.activeSkeletons.clear();
        // Redraw all skeletons
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

    svg.addEventListener('mouseup', () => {
        isPanning = false;
        isDraggingPoint.current = false;
        dragTarget.current = null;
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