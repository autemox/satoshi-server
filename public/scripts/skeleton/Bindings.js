/*
implements clipboard functionality with handleImageToClipboard(), handleImageFromClipboard(), handleSkeletonToClipboard(), and handleSkeletonFromClipboard() functions
*/

// @ts-check

import { ViewState } from './ViewState.js';
import { showToast, findSkeletonById } from './utils.js';

export function handleDelete() {
  console.log('[DELETE] Attempting to remove images...');
  if (ViewState.activeSkeletons.size === 0) return;

  ViewState.activeSkeletons.forEach(skeletonId => {
    const skeleton = findSkeletonById(skeletonId);
    if (!skeleton || !skeleton.imageEl) {
      console.warn(`[DELETE] Skeleton or imageEl not found for ${skeletonId}`);
      return;
    }
    skeleton.imageEl.setAttribute('href', 'data:,');
    skeleton.imageEl.style.display = 'none';
    console.log(`[DELETE] Removed image from skeleton ${skeletonId}`);
  });
}

export function handleImageToClipboard() {
  console.log('[COPY] Attempting copy...');
  const activeId = ViewState.activeSkeletons.size > 0 ? Array.from(ViewState.activeSkeletons)[0] : null;
  if (!activeId) return;

  const skeleton = findSkeletonById(activeId);
  if (!skeleton || !skeleton.imageEl) return console.warn('[COPY] Skeleton or imageEl not found');

  const imgSrc = skeleton.imageEl.getAttribute('href');
  if (!imgSrc || imgSrc === 'data:,') {
    console.warn('[COPY] No image data to copy');
    return;
  }

  if (!navigator.clipboard || !navigator.clipboard.write) {
    console.error('[COPY] Clipboard API not available');
    alert('Clipboard access requires HTTPS or localhost.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(skeleton.imageEl, 0, 0, 64, 64);

  canvas.toBlob(blob => {
    try {
      if (!blob) console.error('[COPY] Blob is not set');
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item])
        .then(() => {
          console.log(`[COPY] Copied image from ${activeId}`);
          showToast('Image copied to clipboard');
        })
        .catch(err => {
          console.error('[COPY] Clipboard write failed:', err);
          alert('Clipboard write failed: ' + err.message);
        });
    } catch (err) {
      console.error('[COPY] Error:', err);
      alert('Clipboard error: ' + err.message);
    }
  }, 'image/png');
}

export async function handleImageFromClipboard() {
  console.log('[PASTE] Attempting paste...');
  if (ViewState.activeSkeletons.size === 0) return;

  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const type = item.types.find(t => t.startsWith('image/'));
      if (type) {
        const blob = await item.getType(type);
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              if (img.width === 0 || img.height === 0) {
                reject(new Error('Image has zero dimensions.'));
                return;
              }
              const canvas = document.createElement('canvas');
              canvas.width = 64;
              canvas.height = 64;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, 64, 64);
              const offsetX = Math.floor((64 - img.width) / 2);
              const offsetY = Math.floor((64 - img.height) / 2);
              ctx.drawImage(img, offsetX, offsetY);
              resolve(canvas.toDataURL());
            };
            img.onerror = (err) => reject(err);
            img.src = reader.result;
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(blob);
        });

        ViewState.activeSkeletons.forEach(skeletonId => {
          // Debug: Log what we're trying to paste to
          console.log(`[DEBUG] Pasting to skeleton: ${skeletonId}`);
          
          const skeleton = findSkeletonById(skeletonId);
          if (!skeleton) {
            console.warn(`[PASTE] Skeleton not found for ${skeletonId}`);
            return;
          }
          
          // Debug: Log what we found
          console.log(`[DEBUG] Found skeleton:`, skeleton);
          console.log(`[DEBUG] Image element:`, skeleton.imageEl);
          console.log(`[DEBUG] Group structure:`, skeleton.group);
          
          if (!skeleton.imageEl) {
            console.warn(`[PASTE] ImageEl not found for ${skeletonId}`);
            return;
          }
          
          // Let's use a very simple approach: just set the href attribute
          skeleton.imageEl.setAttribute('href', dataUrl);
          skeleton.imageEl.style.display = ''; // Make sure it's visible
          
          // Debug: Confirm what we did
          console.log(`[DEBUG] Set image href to dataUrl length: ${dataUrl.length}`);
          console.log(`[DEBUG] Current image href length: ${skeleton.imageEl.getAttribute('href').length}`);
          
          // Force a redraw
          skeleton.renderer.draw();
          
          showToast('Image pasted to frame');
        });

        return;
      }
    }
    console.warn('[PASTE] No image found in clipboard');
  } catch (err) {
    console.error('[PASTE] Clipboard read failed:', err);
    alert(`Clipboard error: ${err.message}`);
  }
}

export async function handleSkeletonToClipboard() {
  console.log('[ACTION] Skeleton To Clipboard');

  const activeSkeletons = Array.from(ViewState.activeSkeletons);
  if (activeSkeletons.length === 0) {
    alert('Please select at least one skeleton');
    return;
  }

  const exportData = [];
  activeSkeletons.forEach(activeId => {
    const skeleton = findSkeletonById(activeId);
    if (!skeleton) {
      console.warn('[COPY] Skeleton not found for id:', activeId);
      return;
    }
    exportData.push({ id: activeId, pose_keypoints: skeleton.renderer.keypoints });
  });

  try {
    const text = JSON.stringify(exportData, null, 2);
    await navigator.clipboard.writeText(text);
    console.log('[COPY] Copied skeleton(s) to clipboard');
    showToast('Skeleton copied to clipboard');
  } catch (err) {
    console.error('[COPY] Failed to copy to clipboard:', err);
    alert('Failed to copy to clipboard: ' + err.message);
  }
}

export async function handleSkeletonFromClipboard() {
  console.log('[ACTION] Skeleton From Clipboard');

  const activeSkeletons = Array.from(ViewState.activeSkeletons);
  if (activeSkeletons.length === 0) {
    alert('Please select at least one skeleton');
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    const jsonData = JSON.parse(text);

    if (!Array.isArray(jsonData)) {
      throw new Error('Clipboard does not contain a valid skeleton array');
    }

    activeSkeletons.forEach(activeId => {
      const skeleton = findSkeletonById(activeId);
      if (!skeleton) {
        console.warn('[PASTE] Skeleton not found for id:', activeId);
        return;
      }

      const clipboardEntry = jsonData.find(entry => entry.id === activeId) || jsonData[0];
      if (!clipboardEntry || !clipboardEntry.pose_keypoints) {
        console.warn('[PASTE] Clipboard entry missing for skeleton', activeId);
        return;
      }

      skeleton.renderer.keypoints = JSON.parse(JSON.stringify(clipboardEntry.pose_keypoints));
      skeleton.renderer.draw();
      console.log(`[PASTE] Successfully loaded keypoints for ${activeId}`);
      showToast('Skeleton pasted from clipboard');
    });

  } catch (err) {
    console.error('[PASTE] Failed to parse clipboard data:', err);
    alert('Failed to paste from clipboard: ' + err.message);
  }
}

export function bindShortcuts() {
  console.log('[Shortcuts] Binding CMD/CTRL+C and CMD/CTRL+V');

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      console.log('[Shortcut] DELETE triggered');
      handleDelete();
    }

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (!isCmdOrCtrl) return;

    const key = e.key.toLowerCase();
    console.log(`[Shortcut] Pressed ${key.toUpperCase()}`);

    if (key === 'c') {
      e.preventDefault();
      console.log('[Shortcut] CMD/CTRL+C triggered');
      if (ViewState.clipboardMode === 'skeleton') {
        handleSkeletonToClipboard();
      } else {
        handleImageToClipboard();
      }
    }

    if (key === 'v') {
      e.preventDefault();
      console.log('[Shortcut] CMD/CTRL+V triggered');
      if (ViewState.clipboardMode === 'skeleton') {
        handleSkeletonFromClipboard();
      } else {
        handleImageFromClipboard();
      }
    }
  });
}