// SkeletonEstimator.js
import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';
import { Settings } from './Settings.js';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/estimate-skeleton';

const queue = [];
let processing = false;
const inProgress = new Set();

export function estimateSelectedSkeletons() {
  const selectedIds = Array.from(ViewState.activeSkeletons);
  if (selectedIds.length === 0) {
    showToast('Select at least one frame to estimate skeleton.', 'red');
    return;
  }

  for (const id of selectedIds) {
    const skeleton = findSkeletonById(id);
    if (!skeleton || inProgress.has(id)) continue;

    const imageHref = skeleton.imageEl?.getAttribute('href');
    if (!imageHref || imageHref === 'data:,' || imageHref.startsWith('data:image/gif')) {
      console.warn(`[ESTIMATE] Skipping ${id}, invalid or empty image.`);
      continue;
    }

    queue.push({ skeletonId: id, imageData: imageHref });
    inProgress.add(id);
  }

  if (!processing) processNext();
}

async function processNext() {
  if (queue.length === 0) {
    processing = false;
    return;
  }

  processing = true;
  const { skeletonId, imageData } = queue.shift();
  const skeleton = findSkeletonById(skeletonId);
  if (!skeleton) {
    inProgress.delete(skeletonId);
    processNext();
    return;
  }

  showToast(`Estimating skeleton for ${skeletonId}...`, 'gray');

  try {
    const base64 = imageData.split(',')[1];
    const response = await fetch(PIXELLAB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Settings.pixelLabApiKey}`
      },
      body: JSON.stringify({ image: { type: 'base64', base64 } })
    });

    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();
    if (!data.keypoints) throw new Error('No keypoints returned');

    skeleton.renderer.keypoints = data.keypoints;
    skeleton.renderer.draw();
    showToast(`✅ Updated skeleton for ${skeletonId}`, 'green');
  } catch (err) {
    console.error(`[ESTIMATE ERROR] Failed for ${skeletonId}`, err);
    showToast(`❌ Failed for ${skeletonId}: ${err.message}`, 'red');
  }

  inProgress.delete(skeletonId);
  processNext();
}

function findSkeletonById(id) {
  for (const dir of ['north', 'east', 'south', 'west']) {
    const s = ViewState.skeletonsByDirection[dir]?.find(s => s.id === id);
    if (s) return s;
  }
  return null;
}