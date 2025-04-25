import { ViewState } from './ViewState.js';
import { reflowRows } from './Main.js';

// Singleton to manage all image generations
class GenerationManager {
  constructor() {
    this.queue = []; // [{skeletonId, payload, resolve, reject}]
    this.isProcessing = false;
    this.currentGeneration = null;
  }
  
  // Add a new generation request to the queue
  // In GenerationManager.js - modify the addToQueue method

  addToQueue(skeletonId, payload) {
    return new Promise((resolve, reject) => {
      console.log(`[GEN MANAGER] Added generation for skeleton ${skeletonId} to queue`);
      
      // Find the skeleton and add a generation indicator immediately
      const skeleton = ViewState.skeletons.find(s => s.id === skeletonId);
      if (!skeleton) {
        reject(new Error(`Skeleton ${skeletonId} not found`));
        return;
      }
      
      // Add generation indicator to show it's queued
      skeleton.renderer.addGeneration();
      reflowRows(); // redraw the rows below the generation
      const generationIndex = skeleton.renderer.generations.length - 1;
      
      // Store the generation index with the queue item
      this.queue.push({ 
        skeletonId, 
        payload, 
        resolve, 
        reject, 
        generationIndex 
      });
      
      // Start processing if not already doing so
      if (!this.isProcessing) {
        console.log(`[GEN MANAGER] Starting generation processing`);
        this.processNext();
      } else {
        console.log(`[GEN MANAGER] Generation queued, waiting for current generation to complete`);
      }
    });
  }
  
  // Process the next item in the queue
  // Update the processNext method to use the saved generation index
async processNext() {
    if (this.queue.length === 0) {
      console.log('[GEN MANAGER] Queue empty, stopping processor');
      this.isProcessing = false;
      this.currentGeneration = null;
      return;
    }
    
    this.isProcessing = true;
    const { skeletonId, payload, resolve, reject, generationIndex } = this.queue.shift();
    this.currentGeneration = { skeletonId, generationIndex };
    
    console.log(`[GEN MANAGER] Processing generation for skeleton ${skeletonId}`);
    
    // Find the skeleton
    const skeleton = ViewState.skeletons.find(s => s.id === skeletonId);
    if (!skeleton) {
      console.warn(`[GEN MANAGER] Skeleton ${skeletonId} not found, skipping generation`);
      reject(new Error(`Skeleton ${skeletonId} not found`));
      this.processNext();
      return;
    }
    
    try {
      console.log('[GEN MANAGER] Sending request to server...');
      const response = await fetch('/api/generate-from-skeleton', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[GEN MANAGER] Server responded:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      const imageDataUrl = `data:image/png;base64,${data.image}`;
      skeleton.renderer.completeGeneration(this.currentGeneration.generationIndex, imageDataUrl);
      reflowRows();
      
      resolve(data);
    } catch (error) {
      console.error('[GEN MANAGER] Error:', error);
      
      // Clean up the generation indicator
      if (skeleton && this.currentGeneration.generationIndex !== null) {
        skeleton.renderer.rejectGeneration(this.currentGeneration.generationIndex);
        reflowRows();
      }
      
      reject(error);
    } finally {
      // Process the next request regardless of success/failure
      console.log(`[GEN MANAGER] Finished processing generation for skeleton ${skeletonId}`);
      this.processNext();
    }
  }
}

// Create and export a singleton instance
export const generationManager = new GenerationManager();

export function generateImage() {
  console.log('[ACTION] Generate Image.');

  const selectedIds = Array.from(ViewState.activeSkeletons);
  if (selectedIds.length === 0) {
    alert('Please select at least one skeleton frame');
    return;
  }

  console.log('[GENERATE] Selected skeletons:', selectedIds);

  const direction = ViewState.activeDirection;
  const directionSkeletons = ViewState.skeletonsByDirection[direction] || [];

  if (directionSkeletons.length < 2) {
    alert(`Not enough reference skeletons found for direction "${direction}"`);
    return;
  }

  const refSkeleton1 = directionSkeletons[0]; // [0] = Required Reference
  const refSkeleton2 = directionSkeletons[1]; // [1] = Optional Reference (optional)

  console.log('[GENERATE] Reference 1:', refSkeleton1.id);
  console.log('[GENERATE] Reference 2:', refSkeleton2.id);

  const refImageSrc1 = refSkeleton1.imageEl?.getAttribute('href');
  const refImageSrc2 = refSkeleton2.imageEl?.getAttribute('href');

  if (!refImageSrc1 || refImageSrc1 === 'data:,' || refImageSrc1.trim() === '') {
    alert(`Please upload an image to the required reference skeleton first (${refSkeleton1.id})`);
    return;
  }

  const selectedSkeletons = selectedIds
    .map(id => ViewState.skeletons.find(s => s.id === id))
    .filter(Boolean);

  if (selectedSkeletons.length === 0) {
    alert('Selected skeletons not found');
    return;
  }

  const frames = selectedSkeletons.map(skel => ({
    skeletonId: skel.id,
    keypoints: skel.renderer.keypoints,
  }));

  console.log('[GENERATE] Frames to generate:', frames.map(f => f.skeletonId));

  const payload = {
    refImage: refImageSrc1,
    refSkeleton1: refSkeleton1.renderer.keypoints,
    refImage2: (refImageSrc2 && refImageSrc2 !== 'data:,' ? refImageSrc2 : null),
    refSkeleton2: (refImageSrc2 && refImageSrc2 !== 'data:,' ? refSkeleton2.renderer.keypoints : null),
    skeletonToGenerateFrom: frames[0].keypoints, // <<-- NOT frames[], just frames[0]
    direction: ViewState.activeDirection,
  };

  console.log('[GENERATE] Final payload:', payload);

  frames.forEach(frame => {
    generationManager.addToQueue(frame.skeletonId, payload)
      .then(data => {
        console.log(`[GENERATE] ✅ Generation completed for ${frame.skeletonId}`);
      })
      .catch(error => {
        console.error(`[GENERATE] ❌ Generation failed for ${frame.skeletonId}:`, error);
        alert(`Error generating image for ${frame.skeletonId}: ${error.message}`);
      });
  });
}