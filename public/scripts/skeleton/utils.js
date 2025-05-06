/* 
contains utility functions including getSvg(), showToast(), and findSkeletonById() for common operations across the application.
*/

// @ts-check
 
/**
 * Get an SVG element by ID. Throws if not found or wrong type.
 * @param {string} id
 * @returns {SVGSVGElement}
 */

import { ViewState } from './ViewState.js';

export function getSvg(id) {
    // @ts-ignore
    return /** @type {SVGSVGElement} */ (document.getElementById(id));
  }


  /**
   * Gets the opposite direction for mirroring
   * @param {string} direction - The current direction
   * @returns {string} - The opposite direction
   */
  export function getOppositeDirection(direction) {
    const opposites = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'north-east': 'south-west',
      'south-west': 'north-east',
      'north-west': 'south-east',
      'south-east': 'north-west'
    };
    return opposites[direction] || direction;
  }

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  
// toast with color and duration
export function showToast(message, color = 'green', duration = 2000) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.fontFamily = 'Arial, sans-serif';
  toast.style.background = color;
  toast.style.color = 'white';
  toast.style.padding = '10px 15px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  toast.style.zIndex = 9999;
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease';
  toast.style.maxWidth = '300px'; // Ensure it doesn't get too wide

  document.body.appendChild(toast);

  // Force reflow to apply transition
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration); // Use the provided duration
}


export function findSkeletonById(id) {
  for (const dir of ['north', 'east', 'south', 'west']) {
    const skeleton = ViewState.skeletonsByDirection[dir]?.find(s => s.id === id);
    if (skeleton) return skeleton;
  }
  return null;
}