import { ViewState } from './ViewState.js';
  
let clipboardImageDataURL = null;

/**
 * Handles copying the image from the active skeleton to the clipboard (in-memory).
 */
export function handleCopy() {
    console.log('[COPY] Attempting copy...');
    const active = ViewState.activeSkeleton;
    console.log('[COPY] Active skeleton:', active);
    if (!active) return;
  
    const skeleton = ViewState.skeletons.find(s => s.id === active);
    if (!skeleton) return console.warn('[COPY] Skeleton not found');
    if (!skeleton.imageEl) return console.warn('[COPY] No imageEl on skeleton');
  
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(skeleton.imageEl, 0, 0, 64, 64);
    clipboardImageDataURL = canvas.toDataURL();
    console.log(`[COPY] Image copied from ${active}`);
  }

/**
 * Handles pasting the clipboard image into the active skeleton slot.
 */
export function handlePaste() {
    console.log('[PASTE] Attempting paste...');
    const active = ViewState.activeSkeleton;
    console.log('[PASTE] Active skeleton:', active);
    if (!active) return;
  
    if (!clipboardImageDataURL) return console.warn('[PASTE] No image in clipboard');
  
    const skeleton = ViewState.skeletons.find(s => s.id === active);
    if (!skeleton) return console.warn('[PASTE] Skeleton not found');
    if (!skeleton.imageEl) return console.warn('[PASTE] No imageEl on skeleton');
  
    skeleton.imageEl.setAttribute('href', clipboardImageDataURL);
    console.log(`[PASTE] Image pasted into ${active}`);
  }

  export function uploadJson() {
    console.log('[ACTION] Upload JSON');
  }
  
  export function uploadImage() {
    console.log('[ACTION] Upload Image');
  }
  
  export function downloadJson() {
    console.log('[ACTION] Download JSON');
  }
  
  export function generateImage() {
    console.log('[ACTION] Generate Image');
  }

  export function bindShortcuts() {
    console.log('[Shortcuts] Binding CMD/CTRL+C and CMD/CTRL+V');
  
    window.addEventListener('keydown', (e) => {
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
  