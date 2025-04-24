import { ViewState } from './ViewState.js';
import { addSkeleton as coreAddSkeleton } from './main.js'; // adjust path as needed

function handleMouseDown(e) {
  const target = /** @type {HTMLElement} */ (e.target);

  if (isPivot(target)) {
    clickPivot(e, target);
    return;
  }

  if (isMenuButton(target)) {
    openMenu(e, target);
    return;
  }

  if (isPlusBox(target)) {
    addSkeleton(e);
    return;
  }

  const skeletonGroup = target.closest('g[id^="skeleton"]');
  if (skeletonGroup) {
    clickSkeletonBg(e, skeletonGroup.id);
    return;
  }

  clickBackground(e);
}

// === Utility matchers ===
function isPivot(el) {
  return el?.tagName === 'circle';
}

function isMenuButton(el) {
  return el?.textContent?.trim() === '☰';
}

function isPlusBox(el) {
  return el?.closest('#plus-box');
}

// === Core handlers ===
function clickPivot(e, pivotElement) {
  console.log('🟡 clickPivot', pivotElement);
  
  const svg = pivotElement.ownerSVGElement;
  const skeletonGroup = pivotElement.closest('g[id^="skeleton"]');
  if (!skeletonGroup) return;

  const skeletonId = skeletonGroup.id;
  const skeletonObj = ViewState.skeletons.find(s => s.id === skeletonId);
  if (!skeletonObj) return;

  const renderer = skeletonObj.renderer;

  const cx = parseFloat(pivotElement.getAttribute('cx'));
  const cy = parseFloat(pivotElement.getAttribute('cy'));

  // Find the closest keypoint to the clicked pivot
  const kp = renderer.keypoints.find(kp =>
    Math.abs(kp.x * 64 - cx) < 1e-3 && Math.abs(kp.y * 64 - cy) < 1e-3
  );

  if (!kp) return;

  const key = `${skeletonId}::${kp.label}`;
  const isSelected = renderer.selectedPoints.has(key);

  renderer.mouseDownOnPivot(e, kp, key, isSelected);
}

function openMenu(e, menuButton) {
  console.log('🟢 openMenu', menuButton);
  // TODO: open associated menu
}

function clickSkeletonBg(e, skeletonId) {
  console.log('🔵 clickSkeletonBg', skeletonId);
  ViewState.activeSkeleton = skeletonId;
  ViewState.skeletons.forEach(s => s.renderer.draw());
}

function clickBackground(e) {
  console.log('⚪ clickBackground');
  ViewState.activeSkeleton = '';
  ViewState.skeletons.forEach(s => s.renderer.draw());
}

function addSkeleton(e) {
  console.log('🟣 addSkeleton');
  const keypointsCopy = JSON.parse(JSON.stringify(ViewState.skeletons[0].renderer.keypoints));
  const newId = `skeleton${ViewState.skeletons.length + 1}`;
  coreAddSkeleton(newId, keypointsCopy);
}

// === Install entry point ===
function installInteractionManager(svg) {
  svg.addEventListener('mousedown', handleMouseDown);
}

export {
  installInteractionManager,
};