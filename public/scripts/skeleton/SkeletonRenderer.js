/*
visualizes and manipulates skeleton data with methods like draw(), addGeneration(), and mouseDownOnPivot() for rendering and interaction
*/

const bones = [
  // Face
  ['LEFT EAR', 'LEFT EYE'],
  ['LEFT EYE', 'NOSE'],
  ['RIGHT EAR', 'RIGHT EYE'],
  ['RIGHT EYE', 'NOSE'],
  ['NOSE', 'NECK'],
  // Core
  ['NECK', 'RIGHT SHOULDER'],
  ['NECK', 'LEFT SHOULDER'],
  ['LEFT SHOULDER', 'LEFT ELBOW'],
  ['LEFT ELBOW', 'LEFT ARM'],
  ['RIGHT SHOULDER', 'RIGHT ELBOW'],
  ['RIGHT ELBOW', 'RIGHT ARM'],
  // Hips & Legs
  ['NECK', 'LEFT HIP'],
  ['NECK', 'RIGHT HIP'],
  ['LEFT HIP', 'LEFT KNEE'],
  ['LEFT KNEE', 'LEFT LEG'],
  ['RIGHT HIP', 'RIGHT KNEE'],
  ['RIGHT KNEE', 'RIGHT LEG'],
];


function getColorForLabel(label) {
  const map = {
    'LEFT EYE': 'royalblue',
    'LEFT EAR': 'royalblue',
    'RIGHT EYE': 'pink',
    'RIGHT EAR': 'pink',
    'NOSE': 'yellow',
    'NECK': 'yellow',
    'RIGHT SHOULDER': 'red',
    'RIGHT ARM': 'red',
    'RIGHT ELBOW': 'red',
    'RIGHT HIP': 'orange',
    'RIGHT KNEE': 'orange',
    'RIGHT LEG': 'orange',
    'LEFT SHOULDER': 'purple',
    'LEFT ARM': 'purple',
    'LEFT ELBOW': 'purple',
    'LEFT HIP': 'purple',
    'LEFT KNEE': 'purple',
    'LEFT LEG': 'purple'
  };
  return map[label] || 'gray';
}


import { uploadJson, uploadImage, downloadImage, downloadJson, generateImage } from './Actions.js';
import { ViewState } from './ViewState.js';
import { handleImageToClipboard, handleImageFromClipboard, handleSkeletonToClipboard, handleSkeletonFromClipboard } from './Bindings.js';
import { showToast, findSkeletonById, getOppositeDirection } from './utils.js';
import { showRotationGenerationDialog } from './RotationScreen.js';
import { reflectImageFromOpposite, reflectSkeletonFromOpposite } from './ReflectionOperations.js';
import { estimateSelectedSkeletons } from './SkeletonEstimator.js';
import * as DrawingToolbar from './DrawingToolbar.js';

export class SkeletonRenderer {
  constructor(id, layer, keypoints, getToolFn, selectedPoints, isDraggingPoint, dragTarget, direction) {
    this.id = id;
    this.layer = layer;
    this.keypoints = keypoints;
    this.getActiveTool = getToolFn;
    this.selectedPoints = selectedPoints;
    this.isDraggingPoint = isDraggingPoint;
    this.dragTarget = dragTarget;
    this.direction = direction; // New property
    this.generations = []; // holds { status: "generating" | "done", image: optional }
  }

  addGeneration() {
    this.generations.push({ status: 'generating', image: null });
    this.draw();
  }

  completeGeneration(index, imageDataUrl) {
    if (this.generations[index]) {
      this.generations[index].status = 'done';
      this.generations[index].image = imageDataUrl;
      this.draw();
    }
  }

  approveGeneration(index) { // accept generation
    const gen = this.generations[index];
    if (!gen || !gen.image) return;
    
    // Move the image to the main skeleton box
    const skeleton = findSkeletonById(this.id);
    if (skeleton && skeleton.imageEl) {
      // Set the image source
      skeleton.imageEl.setAttribute('href', gen.image);
      
      // Ensure the image is visible (this is important!)
      skeleton.imageEl.style.display = '';
      
      // Make sure the image is in the correct layer
      const imageLayer = skeleton.group.querySelector('.image-layer');
      if (imageLayer) {
        // Remove the image from its current parent
        const parent = skeleton.imageEl.parentNode;
        if (parent) {
          parent.removeChild(skeleton.imageEl);
        }
        
        // Add it to the proper image layer at the beginning
        imageLayer.insertBefore(skeleton.imageEl, imageLayer.firstChild);
      }
    }
  
    this.generations.splice(index, 1); // remove from generations
    this.draw();
  }

  rejectGeneration(index) {
    this.generations.splice(index, 1); // just remove
    this.draw();
  }

  changeDirection(direction) {

    ViewState.activeDirection = direction;
    ViewState.activeSkeletons.clear(); // change in direction: clear all active
    Object.values(ViewState.skeletonsByDirection).forEach(skeletonList => {
      skeletonList.forEach(s => s.renderer.draw());
    });
    console.log(`Direction changed to ${direction}`);
  }

  draw() {
    
    this.layer.innerHTML = '';

    const map = {};
    for (const kp of this.keypoints) {
      map[kp.label] = kp;
    }

    this.drawBgHitBox();
    
    // Only draw bones and pivots if NOT in pencil mode
    if (this.getActiveTool() === 'pencil') {
      DrawingToolbar.showToolbar();
    } else {
      DrawingToolbar.hideToolbar();
      this.drawBones();
      this.drawPivots();
    }

    // box
    const isActive = ViewState.activeSkeletons.has(this.id);
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('x', '0');
    box.setAttribute('y', '0');
    box.setAttribute('width', '64');
    box.setAttribute('height', '64');
    box.setAttribute('fill', 'none');
    box.setAttribute('stroke', isActive ? '#3399ff' : 'white'); // bright light blue
    box.setAttribute('stroke-width', '1');
    box.style.cursor = 'pointer';
    this.layer.appendChild(box);

    // labels above boxes
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '0');
    label.setAttribute('y', '-4');
    label.setAttribute('text-anchor', 'left');
    label.setAttribute('fill', 'white');
    label.setAttribute('font-size', '4');
    label.setAttribute('font-family', 'sans-serif');
    const skeletonNumber = parseInt(this.id.split('skeleton')[1]); // Get skeleton number from the ID (e.g., "north-skeleton1" -> 1)
    if (skeletonNumber === 1) label.textContent = 'Required Reference';
    else if (skeletonNumber === 2) label.textContent = 'Optional Reference';
    else {
      const num = skeletonNumber - 2;
      label.textContent = `Frame ${num}`;
    }
    this.layer.appendChild(label);

    // Draw the menu button
    this.drawFrameButtons(); // this calls to drawMenu() if needed

    // Draw generations
    const generationStartY = 70; // below the main 64x64 box
    this.generations.forEach((gen, i) => {
      const yOffset = generationStartY + i * 70;

      // Black background box
      const genBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      genBox.setAttribute('x', '0');
      genBox.setAttribute('y', yOffset.toString());
      genBox.setAttribute('width', '64');
      genBox.setAttribute('height', '64');
      genBox.setAttribute('fill', '#111');
      genBox.setAttribute('stroke', 'white');
      genBox.setAttribute('stroke-width', '0.5');
      this.layer.appendChild(genBox);

      if (gen.status === 'generating') {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '32');
        text.setAttribute('y', (yOffset + 35).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '6');
        text.setAttribute('font-family', 'sans-serif');
        text.textContent = 'Generating...';
        this.layer.appendChild(text);
      } else if (gen.status === 'done' && gen.image) {
        // Draw the image
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('x', '0');
        img.setAttribute('y', yOffset.toString());
        img.setAttribute('width', '64');
        img.setAttribute('height', '64');
        img.setAttribute('href', gen.image);
        this.layer.appendChild(img);

        // ✅ Approve Button (accept)
        const approve = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        approve.setAttribute('x', '4');
        approve.setAttribute('y', (yOffset + 60).toString());
        approve.setAttribute('font-size', '10');
        approve.setAttribute('fill', 'lime');
        approve.setAttribute('pointer-events', 'all');
        approve.style.cursor = 'pointer';
        approve.textContent = '✅';
        approve.addEventListener('click', (e) => {
          e.stopPropagation();
          this.approveGeneration(i);
        });
        this.layer.appendChild(approve);

        // ❌ Reject Button
        const reject = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        reject.setAttribute('x', '52');
        reject.setAttribute('y', (yOffset + 60).toString());
        reject.setAttribute('font-size', '10');
        reject.setAttribute('fill', 'red');
        reject.setAttribute('pointer-events', 'all');
        reject.style.cursor = 'pointer';
        reject.textContent = '🚫';
        reject.addEventListener('click', (e) => {
          e.preventDefault();   // <-- new: cancel default SVG behavior
          e.stopPropagation();  // <-- already good: don't bubble to SVG
          console.log(`(click) Reject generation ${i} on skeleton ${this.id}`);
          this.rejectGeneration(i);
        });
        this.layer.appendChild(reject);
      }
    });
  }
  // In SkeletonRenderer.js
createCheckerboardPattern() {
  // Same implementation as before
  const svg = this.layer.ownerSVGElement;
  let pattern = svg.getElementById('checkerboard-pattern');
  
  if (!pattern) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'checkerboard-pattern');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '16');
    pattern.setAttribute('height', '16');
    
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', '16');
    bgRect.setAttribute('height', '16');
    bgRect.setAttribute('fill', '#AAAAAA');
    
    const square1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    square1.setAttribute('x', '0');
    square1.setAttribute('y', '0');
    square1.setAttribute('width', '8');
    square1.setAttribute('height', '8');
    square1.setAttribute('fill', '#CCCCCC');
    
    const square2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    square2.setAttribute('x', '8');
    square2.setAttribute('y', '8');
    square2.setAttribute('width', '8');
    square2.setAttribute('height', '8');
    square2.setAttribute('fill', '#CCCCCC');
    
    pattern.appendChild(bgRect);
    pattern.appendChild(square1);
    pattern.appendChild(square2);
    
    defs.appendChild(pattern);
    svg.appendChild(defs);
  }
  
  return 'url(#checkerboard-pattern)';
}

drawBgHitBox() {
  // Get the checkerboard pattern
  const patternFill = this.createCheckerboardPattern();
  
  // Find our bg layer
  const parentGroup = this.layer.parentNode;
  let bgLayer = parentGroup.querySelector('.bg-layer');
  
  // Create it if it doesn't exist
  if (!bgLayer) {
    bgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bgLayer.setAttribute('class', 'bg-layer');
    parentGroup.insertBefore(bgLayer, parentGroup.firstChild);
  }
  
  // Clear existing background
  bgLayer.innerHTML = '';
  
  // Create the background rectangle
  const bgHitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgHitbox.setAttribute('x', '0');
  bgHitbox.setAttribute('y', '0');
  bgHitbox.setAttribute('width', '64');
  bgHitbox.setAttribute('height', '64');
  bgHitbox.setAttribute('fill', patternFill);
  
  // Add the event listeners
  bgHitbox.addEventListener('mousedown', (e) => {
    console.log(`(click) Background on skeleton ${this.id}`);
    
    // first and foremost, check if we are selecting references
    const isSelectingReferences = window.isSelectingReferences;
    console.log(`isSelectingReferences: ${isSelectingReferences}`);
    if (isSelectingReferences) {
      // Import the reference selection handler to avoid circular dependencies
      console.log(`(click) Reference skeleton ${this.id}`);
      import('./GenerationManager.js').then(module => {
        module.handleReferenceSkeletonSelection(this.id);
      });
      e.stopPropagation();
      return;
    }

    // Check if pencil tool is active
    if (this.getActiveTool() === 'pencil') {

      // Calculate position within the frame
      const rect = this.layer.ownerSVGElement.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) * (this.layer.ownerSVGElement.viewBox.baseVal.width / rect.width);
      const svgY = (e.clientY - rect.top) * (this.layer.ownerSVGElement.viewBox.baseVal.height / rect.height);
      
      // Get the transform of this skeleton group to calculate local coordinates
      const transform = this.layer.parentNode.getAttribute('transform');
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      const skeletonX = match ? parseFloat(match[1]) : 0;
      const skeletonY = match ? parseFloat(match[2]) : 0;
      
      // Calculate coordinates relative to the frame (0-64 range)
      const x = (svgX - ViewState.offsetX) / ViewState.scale - skeletonX;
      const y = (svgY - ViewState.offsetY) / ViewState.scale - skeletonY;
      
      // Call the drawing function from ImageEditor
      import('./ImageEditor.js').then(module => {
        module.detectedMouseDown(this.id, x, y, e);
      });
    }

    // Set active direction based on this skeleton's direction
    const previousDirection = ViewState.activeDirection;
    if (previousDirection !== this.direction) this.changeDirection(this.direction);

    // Handle frame selection with modifier keys
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle selection for this skeleton
      if (ViewState.activeSkeletons.has(this.id)) {
        ViewState.activeSkeletons.delete(this.id);
        console.log(`Removed skeleton ${this.id} from selection`);
      } else {
        ViewState.activeSkeletons.add(this.id);
        console.log(`Added skeleton ${this.id} to selection`);
      }
    } else {
      // If no modifier key, select only this skeleton
      ViewState.activeSkeletons.clear();
      ViewState.activeSkeletons.add(this.id);
      console.log(`Selected only skeleton ${this.id}`);
    }
    
    // Dispatch an event if direction changed
    if (previousDirection !== this.direction) {
      const changeEvent = new CustomEvent('directionChanged', {
        detail: { direction: this.direction }
      });
      document.dispatchEvent(changeEvent);
    }
    
    // If point tool is active and no modifier key, clear point selections
    if (this.getActiveTool() === 'point' && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
      this.selectedPoints.clear();
    }
    
    // Redraw all skeletons in all directions
    ViewState.skeletons.forEach(s => s.renderer.draw());

    e.stopPropagation();
  });

  bgHitbox.addEventListener('mousemove', (e) => {
    if (this.getActiveTool() === 'pencil' && ViewState.isDrawing) {
      // Calculate position within the frame (same as in mousedown)
      const rect = this.layer.ownerSVGElement.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) * (this.layer.ownerSVGElement.viewBox.baseVal.width / rect.width);
      const svgY = (e.clientY - rect.top) * (this.layer.ownerSVGElement.viewBox.baseVal.height / rect.height);
      
      const transform = this.layer.parentNode.getAttribute('transform');
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      const skeletonX = match ? parseFloat(match[1]) : 0;
      const skeletonY = match ? parseFloat(match[2]) : 0;
      
      const x = (svgX - ViewState.offsetX) / ViewState.scale - skeletonX;
      const y = (svgY - ViewState.offsetY) / ViewState.scale - skeletonY;
      
      import('./ImageEditor.js').then(module => {
        module.detectedMouseMove(this.id, x, y, e);
      });
      e.stopPropagation();
    }
  });
  
  // Add to the bg layer
  bgLayer.appendChild(bgHitbox);
}


  drawBones() {
    
    const map = {};
    for (const kp of this.keypoints) {
      map[kp.label] = kp;
    }
  
    // bones
    for (const [aLabel, bLabel] of bones) {
      const a = map[aLabel];
      const b = map[bLabel];
      if (!a || !b) continue;
  
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', (a.x * 64).toString());
      line.setAttribute('y1', (a.y * 64).toString());
      line.setAttribute('x2', (b.x * 64).toString());
      line.setAttribute('y2', (b.y * 64).toString());
      line.setAttribute('stroke', getColorForLabel(a.label));
      line.setAttribute('stroke-width', '.5');
      line.setAttribute('vector-effect', 'non-scaling-stroke'); // This makes the stroke width constant regardless of zoom
      this.layer.appendChild(line);
    }
  }
  
  drawPivots() {

    // keypoints
    for (const kp of this.keypoints) {
      const key = `${this.id}::${kp.label}`;
      const isSelected = this.selectedPoints.has(key);
  
      const cx = kp.x * 64;
      const cy = kp.y * 64;
      const color = getColorForLabel(kp.label);
  
      const pivotArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pivotArea.setAttribute('cx', cx.toString());
      pivotArea.setAttribute('cy', cy.toString());
      pivotArea.setAttribute('fill', 'rgba(0, 0, 0, 1)');
      pivotArea.setAttribute('r', isSelected ? '2.2' : '1.7');
      // Add this to make size stay constant regardless of zoom
      pivotArea.setAttribute('transform', `scale(${7/(9+ViewState.scale)})`);
      pivotArea.setAttribute('transform-origin', `${cx} ${cy}`);
      pivotArea.style.cursor = 'pointer';
  
      const pivot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pivot.setAttribute('cx', cx.toString());
      pivot.setAttribute('cy', cy.toString());
      pivot.setAttribute('r', isSelected ? '2' : '1.5');
      pivot.setAttribute('fill', color);
      // Add this to make size stay constant regardless of zoom
      pivot.setAttribute('transform', `scale(${7/(9+ViewState.scale)})`);
      pivot.setAttribute('transform-origin', `${cx} ${cy}`);
      pivot.style.cursor = 'pointer';
  
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', cx.toString());
      dot.setAttribute('cy', cy.toString());
      dot.setAttribute('r', '0.5');
      dot.setAttribute('fill', 'white');
      // Add this to make size stay constant regardless of zoom
      dot.setAttribute('transform', `scale(${7/(9+ViewState.scale)})`);
      dot.setAttribute('transform-origin', `${cx} ${cy}`);
      dot.style.cursor = 'pointer';
  
      const handleMouseDownOnPivot = (e) => {
        this.mouseDownOnPivot(e, kp, key, isSelected);
      }
      pivotArea.addEventListener('mousedown', handleMouseDownOnPivot);
      pivot.addEventListener('mousedown', handleMouseDownOnPivot);
      dot.addEventListener('mousedown', handleMouseDownOnPivot);
  
      this.layer.appendChild(pivotArea);
      this.layer.appendChild(pivot);
      this.layer.appendChild(dot);
    }
  }

  drawFrameButtons() {
    // only draw menu button if this direction is active
    if (!ViewState.activeSkeletons.has(this.id)) return;
  
    // Create a group for the buttons
    const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    buttonGroup.setAttribute('id', `frame-buttons-${this.id}`);
  
    // Create a darker background for the lightning button
    const lightningBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    lightningBg.setAttribute('cx', '6');
    lightningBg.setAttribute('cy', '57');
    lightningBg.setAttribute('r', '5');
    lightningBg.setAttribute('fill', '#333333'); // Dark background
    lightningBg.setAttribute('stroke', '#555555');
    lightningBg.setAttribute('stroke-width', '0.5');
    buttonGroup.appendChild(lightningBg);
  
    // ⚡ Lightning bolt button
    const lightningButton = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lightningButton.setAttribute('x', '6'); // adjust left of menu
    lightningButton.setAttribute('y', '60');
    lightningButton.setAttribute('text-anchor', 'middle');
    lightningButton.setAttribute('font-size', '7');
    lightningButton.setAttribute('fill', '#FFDD00'); // Brighter yellow
    lightningButton.setAttribute('stroke', '#000000'); // Black outline
    lightningButton.setAttribute('stroke-width', '0.3');
    lightningButton.setAttribute('pointer-events', 'all'); // allow clicks
    lightningButton.style.cursor = 'pointer';
    lightningButton.style.userSelect = 'none';
    lightningButton.textContent = '⚡';
  
    // Create a darker background for the menu button
    const menuBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    menuBg.setAttribute('cx', '58');
    menuBg.setAttribute('cy', '57');
    menuBg.setAttribute('r', '5');
    menuBg.setAttribute('fill', '#333333'); // Dark background
    menuBg.setAttribute('stroke', '#555555');
    menuBg.setAttribute('stroke-width', '0.5');
    buttonGroup.appendChild(menuBg);
  
    // ☰ Menu button
    const menuButton = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    menuButton.setAttribute('x', '58');
    menuButton.setAttribute('y', '59');
    menuButton.setAttribute('text-anchor', 'middle');
    menuButton.setAttribute('font-size', '7');
    menuButton.setAttribute('fill', '#FFFFFF'); // White text
    menuButton.setAttribute('stroke', '#000000'); // Black outline
    menuButton.setAttribute('stroke-width', '0.3');
    menuButton.setAttribute('pointer-events', 'none');
    menuButton.style.userSelect = 'none';
    menuButton.textContent = '☰';
  
    // Add both buttons into the group
    buttonGroup.appendChild(lightningButton);
    buttonGroup.appendChild(menuButton);
    this.layer.appendChild(buttonGroup);
  
    // Add the click handler for the lightning
    lightningButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[⚡] Quick generate pressed!');
      generateImage();
    });
  
    // Add a larger invisible hit area for the menu button
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hitArea.setAttribute('x', '53');
    hitArea.setAttribute('y', '52');
    hitArea.setAttribute('width', '10');
    hitArea.setAttribute('height', '10');
    hitArea.setAttribute('fill', 'rgba(255, 255, 255, 0.01)'); // Nearly invisible
    hitArea.style.cursor = 'pointer';
    
    // Add elements to the group
    buttonGroup.appendChild(hitArea);
    
    // Add the click handler to the hit area
    hitArea.addEventListener('mousedown', (e) => {
      // Prevent event propagation to avoid triggering other handlers
      e.preventDefault();
      e.stopPropagation();
      
      console.log(`(click) Menu button on skeleton ${this.id}`);
      
      // Make sure that frame is selected
      if (!ViewState.activeSkeletons.has(this.id)) {
        ViewState.activeSkeletons.clear();
        ViewState.activeSkeletons.add(this.id);
        ViewState.skeletonsByDirection[this.direction].forEach(s => s.renderer.draw());
      }
      
      // Toggle the menu
      const existingMenu = document.getElementById(`menu-${this.id}`);
      if (existingMenu) {
        existingMenu.remove();
      } else {
        this.drawMenu();
      }
    });
  }
  

  /**
   * Draws the menu content when opened
   */
  drawMenu() {
    // Remove any existing menus
    const existingMenu = document.getElementById(`menu-${this.id}`);
    if (existingMenu) {
      existingMenu.remove();
    }
  
    // Create a modal-style window overlay outside the SVG
    const overlay = document.createElement('div');
    overlay.setAttribute('id', `menu-${this.id}`);
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#2a2a2a';
    modalContent.style.border = '1px solid #888';
    modalContent.style.borderRadius = '5px';
    modalContent.style.padding = '20px';
    modalContent.style.width = '600px'; 
    modalContent.style.color = 'white';
    modalContent.style.fontFamily = 'sans-serif';
    
    // Add title
    const title = document.createElement('h3');
    const selectedIds = Array.from(ViewState.activeSkeletons).sort();
    title.textContent = selectedIds.join(', ');
    title.style.margin = '0 0 20px 0';
    title.style.borderBottom = '1px solid #888';
    title.style.paddingBottom = '10px';
    title.style.fontSize = '16px'; // Smaller text
    modalContent.appendChild(title);
    
    // Create grid container for two columns
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = '1fr 1fr'; // Two equal columns
    gridContainer.style.gap = '10px'; // Space between columns and rows
    modalContent.appendChild(gridContainer);
    
    // Get the opposite direction
    const oppositeDirection = getOppositeDirection(this.direction);
    const oppositeCapitalized = oppositeDirection.charAt(0).toUpperCase() + oppositeDirection.slice(1);
    
    // Menu items
    const menuItems = [
      ['📄', 'Upload JSON', uploadJson],
      ['⬇️', 'Download JSON', downloadJson],
      ['🏞️', 'Upload Image', uploadImage],
      ['🏞️', 'Download Image', downloadImage],
      ['📋', 'Copy to Clipboard', handleImageToClipboard],
      ['📝', 'Paste from Clipboard', handleImageFromClipboard],
      ['📋', 'Skeleton to Clipboard', handleSkeletonToClipboard],
      ['📝', 'Skeleton from Clipboard', handleSkeletonFromClipboard],
      ['🪞', `Mirror Image from ${oppositeCapitalized}`, reflectImageFromOpposite],
      ['🦴', `Mirror Skeleton from ${oppositeCapitalized}`, reflectSkeletonFromOpposite],
      ['⚡', 'Generate Image from Skeleton', generateImage],
      ['⚡', 'Generate Skeleton from Image', () => estimateSelectedSkeletons()],
      ['⚡', 'Generate Using Rotation', showRotationGenerationDialog],
    ];
    
    
    // Create buttons for each menu item
    menuItems.forEach(([icon, label, callback]) => {
      // Skip empty items
      if (!label) return;
      
      const button = document.createElement('button');
      button.textContent = `${icon} ${label}`;
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '8px'; // Smaller padding
      button.style.margin = '2px 0'; // Smaller margin
      button.style.backgroundColor = '#444';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '3px';
      button.style.cursor = 'pointer';
      button.style.fontSize = '14px'; // Smaller text
      button.style.textAlign = 'left';
      
      // Hover effect
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#3399ff';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#444';
      });
      
      // Click handler
      button.addEventListener('click', () => {
        console.log(`(click) ${label} on skeleton ${this.id}`);
        callback(this.id);
        overlay.remove();
      });
      
      gridContainer.appendChild(button);
    });

    // Add cancel button - full width below the grid
    const cancelContainer = document.createElement('div');
    cancelContainer.style.gridColumn = '1 / span 2'; // Span both columns
    cancelContainer.style.marginTop = '20px'; // Space above the container
    cancelContainer.style.padding = '0';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '❌ Close';
    cancelButton.style.display = 'block';
    cancelButton.style.width = '100%';
    cancelButton.style.padding = '10px';
    cancelButton.style.backgroundColor = '#333';
    cancelButton.style.color = 'white';
    cancelButton.style.border = '1px solid #666';
    cancelButton.style.borderRadius = '5px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '16px';

    // Add event listener
    cancelButton.addEventListener('click', () => {
      overlay.remove();
    });

    // Nest the button inside the container
    cancelContainer.appendChild(cancelButton);

    // Then append the container to modalContent
    modalContent.appendChild(cancelContainer);
    overlay.appendChild(modalContent);
    
    // Allow clicking outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Add to document body
    document.body.appendChild(overlay);

    // Close on ESC
    const escListener = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escListener);
      }
    };
    document.addEventListener('keydown', escListener);
  }

  /**
   * Handles selecting and potential drag start
   * @param {MouseEvent} e
   * @param {{ label: string, x: number, y: number }} kp
   * @param {string} key
   * @param {boolean} isSelected
   */
  mouseDownOnPivot(e, kp, key, isSelected) {
    console.log(`(click) Pivot on skeleton ${this.id} (${kp.label} tool ${this.getActiveTool()})`);
    if (this.getActiveTool() !== 'point') return;

    // make sure this direction is active by getting the direction from the skeleton
    //get this skeletons direction
    if (this.direction !== ViewState.activeDirection) {
      this.changeDirection(this.direction);
      console.log(`Direction changed to ${this.direction}`);
    }
    else console.log(`Direction already active: ${this.direction}`);
    

    // make sure that frame is selected
    if (!ViewState.activeSkeletons.has(this.id)) {
      
      // If shift/ctrl/meta is pressed, add to selection, otherwise clear and select just this one
      if (e.shiftKey || e.ctrlKey || e.metaKey) ViewState.activeSkeletons.add(this.id);
      else {
        this.selectedPoints.clear(); // clear all active pivot points
        ViewState.activeSkeletons.clear(); // clear other active skeletons
        ViewState.activeSkeletons.add(this.id);
      }
      // Redraw all skeletons to update selection visuals
      ViewState.skeletons.forEach(s => s.renderer.draw());
    }

    ViewState.mouseDownTime = performance.now();
    ViewState.notAClick = false;
    ViewState.dragKey = key;

    if (!isSelected) {
      console.log(`(click) Selecting ${key} before dragging`);
      this.mouseClick(e, key, isSelected); // select BEFORE drag
    }

    if (this.selectedPoints.size >= 1) {
      this.isDraggingPoint.current = true;
      this.dragTarget.current = { skeleton: this, point: kp };

      const rect = this.layer.ownerSVGElement.getBoundingClientRect();
      const svg = this.layer.ownerSVGElement;
      const svgX = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / svg.clientWidth);
      const svgY = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / svg.clientHeight);
      const sceneX = (svgX - ViewState.offsetX) / ViewState.scale;
      const sceneY = (svgY - ViewState.offsetY) / ViewState.scale;
      ViewState.dragStartSceneX = sceneX;
      ViewState.dragStartSceneY = sceneY;
    }

    e.stopPropagation();
  }

  /**
   * Handles selection or deselection on click
   * @param {MouseEvent} e
   * @param {string} key
   * @param {boolean} isSelected
   */
  mouseClick(e, key, isSelected) {
    if (isSelected && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      this.selectedPoints.delete(key);
    } else {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        this.selectedPoints.clear();
      }
      this.selectedPoints.add(key);
    }

    ViewState.notAClick = true;
    this.draw();
    e.stopPropagation();
  }
}
