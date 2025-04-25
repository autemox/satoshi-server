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


import { uploadJson, uploadImage, downloadJson, generateImage } from './Actions.js';
import { ViewState } from './ViewState.js';

export class SkeletonRenderer {
  constructor(id, layer, keypoints, getToolFn, selectedPoints, isDraggingPoint, dragTarget) {
    this.id = id;
    this.layer = layer;
    this.keypoints = keypoints;
    this.getActiveTool = getToolFn;
    this.selectedPoints = selectedPoints;
    this.isDraggingPoint = isDraggingPoint;
    this.dragTarget = dragTarget;
    this.generations = []; // 🔥 NEW: holds { status: "generating" | "done", image: optional }
    
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

  approveGeneration(index) {
    const gen = this.generations[index];
    if (!gen || !gen.image) return;
    
    // Move the image to the main skeleton box
    const skeleton = ViewState.skeletons.find(s => s.id === this.id);
    if (skeleton && skeleton.imageEl) {
      // Set the image source
      skeleton.imageEl.setAttribute('href', gen.image);
      
      // Move the image to the beginning of its parent container
      // so it appears below all other elements (including the skeleton)
      const parent = skeleton.imageEl.parentNode;
      if (parent) {
        parent.removeChild(skeleton.imageEl);
        parent.insertBefore(skeleton.imageEl, parent.firstChild);
      }
    }
  
    this.generations.splice(index, 1); // remove from generations
    this.draw();
  }

  rejectGeneration(index) {
    this.generations.splice(index, 1); // just remove
    this.draw();
  }

  draw() {
    
    this.layer.innerHTML = '';

    const map = {};
    for (const kp of this.keypoints) {
      map[kp.label] = kp;
    }

    // background of box (click area)
    const bgHitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgHitbox.setAttribute('x', '0');
    bgHitbox.setAttribute('y', '0');
    bgHitbox.setAttribute('width', '64');
    bgHitbox.setAttribute('height', '64');
    bgHitbox.setAttribute('fill', 'rgba(80, 202, 255, 0.02)');
    bgHitbox.style.cursor = 'pointer';
    bgHitbox.addEventListener('mousedown', (e) => {
      console.log(`(click) Background on skeleton ${this.id}`);
      
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
      
      // If point tool is active and no modifier key, clear point selections
      if (this.getActiveTool() === 'point' && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
        this.selectedPoints.clear();
      }
      
      // Redraw all skeletons to update selection visuals
      ViewState.skeletons.forEach(s => s.renderer.draw());
      
      e.stopPropagation();
    });
    this.layer.appendChild(bgHitbox);

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
      line.setAttribute('stroke-width', '.33');
      this.layer.appendChild(line);
    }

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
      pivotArea.setAttribute('fill', 'rgba(0, 0, 0, 0)');
      pivotArea.setAttribute('r', '1.5');
      pivotArea.style.cursor = 'pointer';

      const pivot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pivot.setAttribute('cx', cx.toString());
      pivot.setAttribute('cy', cy.toString());
      pivot.setAttribute('r', isSelected ? '0.9' : '0.6');
      pivot.setAttribute('fill', color);
      pivot.style.cursor = 'pointer';

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', cx.toString());
      dot.setAttribute('cy', cy.toString());
      dot.setAttribute('r', '0.3');
      dot.setAttribute('fill', 'white');
      dot.style.cursor = 'pointer';

      const handleMouseDownOnPivot = (e) => {
        // this never fires
        this.mouseDownOnPivot(e, kp, key, isSelected);
      }
      pivotArea.addEventListener('mousedown', handleMouseDownOnPivot);
      pivot.addEventListener('mousedown', handleMouseDownOnPivot);
      dot.addEventListener('mousedown', handleMouseDownOnPivot);

      this.layer.appendChild(pivotArea);
      this.layer.appendChild(pivot);
      this.layer.appendChild(dot);
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
    if (this.id === 'skeleton1')  label.textContent = 'Required Reference';
    else if (this.id === 'skeleton2')  label.textContent = 'Optional Reference';
    else {
      const num = parseInt(this.id.replace('skeleton', '')) - 2;
      label.textContent = `Frame ${num}`;
    }
    this.layer.appendChild(label);

    // === MENU BUTTON (☰) ===
    const menuButton = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    menuButton.setAttribute('x', '60');
    menuButton.setAttribute('y', '60');
    menuButton.setAttribute('text-anchor', 'middle');
    menuButton.setAttribute('font-size', '7');
    menuButton.setAttribute('fill', 'white');
    menuButton.style.cursor = 'pointer';
    menuButton.style.userSelect = 'none';
    menuButton.style.fontFamily = 'sans-serif';
    menuButton.textContent = '☰';
    this.layer.appendChild(menuButton);

    // === MENU GROUP CONTAINER ===
    const menuGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    menuGroup.setAttribute('visibility', 'hidden');
    menuGroup.setAttribute('transform', 'translate(54, 66)'); // ⬇️ below ☰
    this.layer.appendChild(menuGroup);

    // Background box for menu
    const menuBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const menuWidth = 70;
    const menuHeight = 47;
    menuBg.setAttribute('x', '0');
    menuBg.setAttribute('y', '0');
    menuBg.setAttribute('width', menuWidth.toString());
    menuBg.setAttribute('height', menuHeight.toString());
    menuBg.setAttribute('rx', '3');
    menuBg.setAttribute('fill', '#2a2a2a');
    menuBg.setAttribute('stroke', '#888');
    menuBg.setAttribute('stroke-width', '0.4');
    menuGroup.appendChild(menuBg);

    const menuItems = [
      ['📄', 'Upload JSON', uploadJson],
      ['🏞️', 'Upload Image', uploadImage],
      ['⬇️', 'Download JSON', downloadJson],
      ['⚡', 'Generate Image', generateImage],
    ];

    menuItems.forEach(([icon, label, callback], i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '6');
      text.setAttribute('y', `${10 + i * 10}`);
      text.setAttribute('font-size', '5');
      text.setAttribute('fill', 'white');
      text.style.cursor = 'pointer';
      text.style.userSelect = 'none';
      text.style.fontFamily = 'sans-serif';
      text.textContent = `${icon} ${label}`;
      text.addEventListener('click', (e) => {
        console.log(`(click) ${label} on skeleton ${this.id}`);
        callback(this.id); // ✅ Trigger action
        menuGroup.setAttribute('visibility', 'hidden'); // auto-close menu
        e.stopPropagation();
      });
      menuGroup.appendChild(text);
    });

    // Toggle menu
    let menuOpen = false;
    menuButton.addEventListener('click', (e) => {

      // make sure that frame is selected
      if (!ViewState.activeSkeletons.has(this.id)) {
        ViewState.activeSkeletons.clear();
        ViewState.activeSkeletons.add(this.id);
        ViewState.skeletons.forEach(s => s.renderer.draw());
        console.log(`Selected skeleton ${this.id}`);
      }
      console.log(`(click) Menu button on skeleton ${this.id}`);
      menuOpen = !menuOpen;
      menuGroup.setAttribute('visibility', menuOpen ? 'visible' : 'hidden');
      e.stopPropagation();
    });

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

        // ✅ Approve Button
        const approve = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        approve.setAttribute('x', '4');
        approve.setAttribute('y', (yOffset + 60).toString());
        approve.setAttribute('font-size', '10');
        approve.setAttribute('fill', 'lime');
        approve.style.cursor = 'pointer';
        approve.textContent = '✅';
        approve.addEventListener('click', (e) => {
          e.stopPropagation();
          this.approveGeneration(i);
        });
        this.layer.appendChild(approve);

        // ❌ Reject Button
        const reject = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        reject.setAttribute('x', '54');
        reject.setAttribute('y', (yOffset + 60).toString());
        reject.setAttribute('font-size', '10');
        reject.setAttribute('fill', 'red');
        reject.style.cursor = 'pointer';
        reject.textContent = '❌';
        reject.addEventListener('click', (e) => {
          e.stopPropagation();
          this.rejectGeneration(i);
        });
        this.layer.appendChild(reject);
      }
    });
  }

  /**
   * Handles selecting and potential drag start
   * @param {MouseEvent} e
   * @param {{ label: string, x: number, y: number }} kp
   * @param {string} key
   * @param {boolean} isSelected
   */
  mouseDownOnPivot(e, kp, key, isSelected) {
    if (this.getActiveTool() !== 'point') return;

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
