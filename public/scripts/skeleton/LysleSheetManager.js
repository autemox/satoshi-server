/**
 * Saves the current editor state into a .lyslesheet file.
 */

import { ViewState } from './ViewState.js';
import { SkeletonRenderer } from './SkeletonRenderer.js';

export function exportSpriteSheet() {
    // popup asking for filename, # of columns
    // tbd
}

export function saveLysleSheet() {
  console.log('[LYSLESHEET] Saving...');

  // Build the export data
  const data = {
    version: 1,
    skeletons: ViewState.skeletons.map(s => ({
      id: s.id,
      keypoints: s.renderer.keypoints,
      imageHref: s.imageEl.getAttribute('href') || '',
    })),
    view: {
      offsetX: ViewState.offsetX,
      offsetY: ViewState.offsetY,
      scale: ViewState.scale,
    }
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'project.lyslesheet';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Loads a .lyslesheet file into the editor.
 */
export async function loadLysleSheet() {
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

        if (!Array.isArray(data.skeletons)) {
          throw new Error('Invalid lyslesheet file');
        }

        // No dynamic import needed here anymore!

        ViewState.skeletons.forEach(s => {
          if (s.group && s.group.parentNode) {
            s.group.parentNode.removeChild(s.group);
          }
        });
        ViewState.skeletons = [];

        const scene = document.getElementById('scene');

        for (const s of data.skeletons) {

          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          group.setAttribute('id', s.id);

          const offsetX = ViewState.skeletons.length * 70;
          group.setAttribute('transform', `translate(${offsetX}, 0)`);

          const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          imageEl.setAttribute('x', '0');
          imageEl.setAttribute('y', '0');
          imageEl.setAttribute('width', '64');
          imageEl.setAttribute('height', '64');
          imageEl.setAttribute('href', s.imageHref || '');
          imageEl.setAttribute('pointer-events', 'none');
          group.appendChild(imageEl); // image first

          const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          group.appendChild(layer);   // then bones

          scene.appendChild(group);

          const selectedPoints = new Set(); 
          const isDraggingPoint = { current: false };
          const dragTarget = { current: null };
          const activeTool = () => 'point';

          const renderer = new SkeletonRenderer(
            s.id,
            layer,
            s.keypoints,
            activeTool,
            selectedPoints,
            isDraggingPoint,
            dragTarget
          );

          ViewState.skeletons.push({ id: s.id, group, renderer, imageEl });
          renderer.draw();
        }

        if (data.view) {
          ViewState.offsetX = data.view.offsetX ?? 480;
          ViewState.offsetY = data.view.offsetY ?? 480;
          ViewState.scale = data.view.scale ?? 8;
        }

        const sceneGroup = document.getElementById('scene');
        if (sceneGroup) {
          sceneGroup.setAttribute('transform', `translate(${ViewState.offsetX}, ${ViewState.offsetY}) scale(${ViewState.scale})`);
        }

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