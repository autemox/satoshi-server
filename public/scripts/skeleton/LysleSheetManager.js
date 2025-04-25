/**
 * Save and Load .lyslesheet format for multiple directions
 */

import { ViewState } from './ViewState.js';
import { SkeletonRenderer } from './SkeletonRenderer.js';

export function exportSpriteSheet() {
  // Placeholder for future sprite sheet export
  console.log('[SPRITESHEET] Export feature coming soon...');
}

export function saveLysleSheet() {
  console.log('[LYSLESHEET] Saving...');

  // Build the export data
  const data = {
    version: 1, 
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
            imageEl.setAttribute('href', s.imageHref || '');
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