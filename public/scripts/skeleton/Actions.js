/* 
handles file upload/download operations with functions like uploadJson(), downloadJson(), uploadImage(), and downloadImage() that interact with skeleton data
*/

import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';
import { findSkeletonById } from './utils.js';

export function uploadJson() {
  console.log('[ACTION] Upload JSON');

  const activeSkeletons = Array.from(ViewState.activeSkeletons);
  if (activeSkeletons.length === 0) {
    alert('Please select at least one skeleton');
    return;
  }

  const allSkeletons = Object.values(ViewState.skeletonsByDirection).flat();
  console.log('[DEBUG] All skeleton ids:', allSkeletons.map(s => s.id));

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) {
      document.body.removeChild(fileInput);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const jsonData = JSON.parse(event.target.result);
        if (!jsonData.pose_keypoints || !Array.isArray(jsonData.pose_keypoints) || !Array.isArray(jsonData.pose_keypoints[0])) {
          throw new Error('Invalid JSON format. Expected "pose_keypoints" array.');
        }

        activeSkeletons.forEach(activeId => {
          const skeleton = findSkeletonById(activeId);
          if (!skeleton) {
            console.warn('[UPLOAD] Skeleton not found for id:', activeId);
            return;
          }

          skeleton.renderer.keypoints = JSON.parse(JSON.stringify(jsonData.pose_keypoints[0]));
          skeleton.renderer.draw();
          console.log(`[UPLOAD] Successfully loaded keypoints for ${activeId}`);
        });

      } catch (err) {
        console.error('[UPLOAD] Failed to parse JSON:', err);
        alert('Failed to parse JSON: ' + err.message);
      }
    };

    reader.onerror = () => {
      console.error('[UPLOAD] File read failed');
      alert('File read failed');
    };

    reader.readAsText(file);
    document.body.removeChild(fileInput);
  });

  fileInput.click();
}

export function downloadJson() {
  console.log('[ACTION] Download JSON');

  const activeSkeletons = Array.from(ViewState.activeSkeletons);
  if (activeSkeletons.length === 0) {
    alert('Please select at least one skeleton');
    return;
  }

  const allSkeletons = Object.values(ViewState.skeletonsByDirection).flat();
  console.log('[DEBUG] All skeleton ids:', allSkeletons.map(s => s.id));

  activeSkeletons.forEach(activeId => {
    const skeleton = findSkeletonById(activeId);
    if (!skeleton) {
      console.warn('[DOWNLOAD] Skeleton not found for id:', activeId);
      return;
    }

    const exportData = { pose_keypoints: [skeleton.renderer.keypoints] };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeId}.json`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });
}

export function downloadImage(skeletonId) {
  console.log('[ACTION] Download Image');

  const active = skeletonId || ViewState.activeSkeleton;
  if (!active) {
    alert('Please select a skeleton first');
    return;
  }

  const skeleton = findSkeletonById(skeletonId);
  if (!skeleton || !skeleton.imageEl) {
    console.warn('[DOWNLOAD IMAGE] Skeleton or image not found');
    return;
  }

  const href = skeleton.imageEl.getAttribute('href');
  if (!href) {
    alert('No image to download');
    return;
  }

  const a = document.createElement('a');
  a.href = href;
  a.download = `${active}.png`; // Save as PNG
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

export function uploadImage(skeletonId) {
  console.log('[ACTION] Upload Image. id:', skeletonId);
  const active = skeletonId || ViewState.activeSkeleton;
  if (!active) {
    alert('Please select a skeleton first');
    return;
  }

  const skeleton = findSkeletonById(skeletonId);
  if (!skeleton || !skeleton.imageEl) return console.warn('[UPLOAD] Skeleton/imageEl not found');

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Select a valid image file');
      document.body.removeChild(fileInput);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 64, 64);

        let offsetX = 0, offsetY = 0, width = img.width, height = img.height;
        if (width > height) {
          const ratio = height / width;
          width = 64;
          height = 64 * ratio;
          offsetY = (64 - height) / 2;
        } else {
          const ratio = width / height;
          height = 64;
          width = 64 * ratio;
          offsetX = (64 - width) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, width, height);
        const finalDataUrl = canvas.toDataURL();
        skeleton.imageEl.setAttribute('href', finalDataUrl);

        const parent = skeleton.imageEl.parentNode;
        if (parent) {
          parent.removeChild(skeleton.imageEl);
          parent.insertBefore(skeleton.imageEl, parent.firstChild);
        }

        console.log(`[UPLOAD IMAGE] Successfully uploaded image for ${active}`);
      };

      img.onerror = (err) => {
        console.error('[UPLOAD IMAGE] Image load error:', err);
        alert('Image load error');
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      console.error('[UPLOAD IMAGE] File read error');
      alert('File read error');
    };

    reader.readAsDataURL(file);
    document.body.removeChild(fileInput);
  });

  fileInput.click();
}

export function generateImage(skeletonId) {
  console.log('[ACTION] Generate Image (legacy). id:', skeletonId);
  import('./GenerationManager.js')
    .then(module => {
      module.generateImage(skeletonId);
    })
    .catch(error => {
      console.error('[GENERATE] Failed to import GenerationManager:', error);
      alert('Image generation error: failed to load manager.');
    });
}
