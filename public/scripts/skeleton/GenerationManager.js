import { ViewState } from './ViewState.js';

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
      
      resolve(data);
    } catch (error) {
      console.error('[GEN MANAGER] Error:', error);
      
      // Clean up the generation indicator
      if (skeleton && this.currentGeneration.generationIndex !== null) {
        skeleton.renderer.rejectGeneration(this.currentGeneration.generationIndex);
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

// Updated generation function that uses the manager
export function generateImage(skeletonId) {
  console.log('[ACTION] Generate Image. id:', skeletonId);
  
  // Use the first selected skeleton if none specified
  const active = skeletonId || 
    (ViewState.activeSkeletons.size > 0 ? Array.from(ViewState.activeSkeletons)[0] : null);
  
  if (!active) {
    alert('Please select a skeleton first');
    return;
  }
  
  const skeleton = ViewState.skeletons.find(s => s.id === active);
  if (!skeleton) {
    console.warn('[GENERATE] Skeleton not found');
    return;
  }
  
  const refSkeleton = ViewState.skeletons.find(s => s.id === 'skeleton1');
  if (!refSkeleton) {
    alert('Reference skeleton (skeleton1) is required');
    return;
  }
  
  const refImageSrc = refSkeleton.imageEl?.getAttribute('href');
  if (!refImageSrc || refImageSrc === 'data:,') {
    alert('Please upload an image to the reference skeleton first');
    return;
  }
  
  const payload = {
    refImage: refImageSrc,
    refSkeleton1: refSkeleton.renderer.keypoints,
    skeletonToGenerateFrom: skeleton.renderer.keypoints,
    direction: "west"
  };
  
  // Add to queue and handle result/error
  generationManager.addToQueue(active, payload)
    .then(data => {
      console.log(`[GENERATE] Generation completed for ${active}`);
    })
    .catch(error => {
      console.error(`[GENERATE] Generation failed for ${active}:`, error);
      alert(`Error generating image: ${error.message}`);
    });
}