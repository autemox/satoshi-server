// Bindings.js
import { ViewState } from './ViewState.js';

export function handleDelete() {
  console.log('[DELETE] Attempting to remove images...');
  if (ViewState.activeSkeletons.size === 0) return;

  ViewState.activeSkeletons.forEach(skeletonId => {
    const skeleton = ViewState.skeletons.find(s => s.id === skeletonId);
    if (!skeleton || !skeleton.imageEl) {
      console.warn(`[DELETE] Skeleton or imageEl not found for ${skeletonId}`);
      return;
    }
    skeleton.imageEl.setAttribute('href', 'data:,');
    skeleton.imageEl.style.display = 'none';
    console.log(`[DELETE] Removed image from skeleton ${skeletonId}`);
  });
}

export function handleCopy() {
  console.log('[COPY] Attempting copy...');
  const firstActive = ViewState.activeSkeletons.size > 0 ? Array.from(ViewState.activeSkeletons)[0] : null;
  if (!firstActive) return;

  const skeleton = ViewState.skeletons.find(s => s.id === firstActive);
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
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item])
        .then(() => {
          console.log(`[COPY] Copied image from ${firstActive}`);
          const message = document.createElement('div');
          message.textContent = 'Copied!';
          message.style.cssText = 'font-family: Arial, sans-serif; font-size: 10px; position: fixed; bottom: 10px; right: 10px; padding: 5px; background: #4caf50; color: white; border-radius: 3px;';
          document.body.appendChild(message);
          setTimeout(() => document.body.removeChild(message), 2000);
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

export async function handlePaste() {
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
          const skeleton = ViewState.skeletons.find(s => s.id === skeletonId);
          if (!skeleton || !skeleton.imageEl) {
            console.warn(`[PASTE] Skeleton or imageEl not found for ${skeletonId}`);
            return;
          }
          skeleton.imageEl.setAttribute('href', dataUrl);
          const parent = skeleton.imageEl.parentNode;
          if (parent) {
            parent.removeChild(skeleton.imageEl);
            parent.insertBefore(skeleton.imageEl, parent.firstChild);
          }
          console.log(`[PASTE] Pasted image into skeleton ${skeletonId}`);
        });

        return;
      }
    }
    console.warn('[PASTE] No image found in clipboard');
  } catch (err) {
    console.error('[PASTE] Clipboard read failed:', err);
  }
}

export function bindShortcuts() {
  console.log('[Shortcuts] Binding CMD/CTRL+C and CMD/CTRL+V');

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      console.log('[Shortcut] DELETE triggered');
      handleDelete();
    }

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (!isCmdOrCtrl) return;

    console.log(`[Shortcut] Pressed ${e.key.toUpperCase()}`);

    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      console.log('[Shortcut] CMD/CTRL+C triggered');
      handleCopy();
    }

    if (e.key.toLowerCase() === 'v') {
      e.preventDefault();
      console.log('[Shortcut] CMD/CTRL+V triggered');
      handlePaste();
    }
  });
}