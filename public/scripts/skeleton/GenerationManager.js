  /*
  manages the AI image generation queue with methods like addToQueue() and processNext() to create and apply generated images
  */

  import { ViewState } from './ViewState.js';
  import { reflowRows } from './Main.js';
  import { findSkeletonById } from './utils.js';
  import { validateApiKey, Settings } from './Settings.js';
  import { showToast } from './utils.js';

  // State variables for reference selection
  window.isSelectingReferences = window.isSelectingReferences || false;
  let pendingGeneration = null;
  let selectedRefImageIds = [];


  // Singleton to manage all image generations
  class GenerationManager {
    constructor() {
      this.queue = []; // [{skeletonId, payload, resolve, reject}]
      this.isProcessing = false;
      this.currentGeneration = null;
    }
    
    addRotationGenerationToQueue(skeletonId, payload) {
      return new Promise((resolve, reject) => {
        console.log(`[GEN MANAGER] Added rotation generation for skeleton ${skeletonId} to queue`);
        
        // Find the skeleton and add a generation indicator immediately
        const skeleton = findSkeletonById(skeletonId);
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
          generationIndex,
          type: 'rotation' // Add a type field to distinguish from skeleton generations
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
    
    // Add a new generation request to the queue
    addSkeletonGenerationToQueue(skeletonId, payload) {
      return new Promise((resolve, reject) => {
        console.log(`[GEN MANAGER] Added generation for skeleton ${skeletonId} to queue`);
        
        // Find the skeleton and add a generation indicator immediately
        const skeleton = findSkeletonById(skeletonId);
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
          generationIndex,
          type: 'skeleton'  
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

    
  // process next generation (both rotation and skeleton)
  async processNext() {
    if (this.queue.length === 0) {
      console.log('[GEN MANAGER] Queue empty, stopping processor');
      this.isProcessing = false;
      this.currentGeneration = null;
      return;
    }
    
    this.isProcessing = true;
    const item = this.queue.shift();
    const { skeletonId, payload, resolve, reject, generationIndex, type = 'skeleton' } = item; // Default to 'skeleton' for backward compatibility
    this.currentGeneration = { skeletonId, generationIndex };
    
    console.log(`[GEN MANAGER] Processing ${type} generation for skeleton ${skeletonId}`);
    
    // Find the skeleton
    const skeleton = findSkeletonById(skeletonId);
    if (!skeleton) {
      console.warn(`[GEN MANAGER] Skeleton ${skeletonId} not found, skipping generation`);
      reject(new Error(`Skeleton ${skeletonId} not found`));
      this.processNext();
      return;
    }
    
    try {
      console.log('[GEN MANAGER] Sending request to server...');
      
      // Choose the endpoint based on the generation type
      const endpoint = type === 'rotation' ? urlPath+'/api/generate-from-rotation' : urlPath+'/api/generate-from-skeleton';
      
      const response = await fetch(endpoint, {
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

  /**
   * Shows a message to select a reference skeleton
   * @param {string} message - The message to display
   */
  function showReferenceSelectionToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20%';
    toast.style.left = '50%';
    toast.style.transform = 'translate(-50%, -50%)';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.background = '#3399ff';
    toast.style.color = 'white';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '18px';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    toast.style.zIndex = 10000;
    toast.id = 'reference-selection-toast';
    
    document.body.appendChild(toast);
    
    return toast;
  }

  /**
   * Removes the reference selection toast
   */
  function removeReferenceSelectionToast() {
    const toast = document.getElementById('reference-selection-toast');
    if (toast) {
      document.body.removeChild(toast);
    }
  }

  /**
   * Handles the skeleton selection for manual reference mode
   * @param {string} skeletonId - The ID of the selected skeleton
   */
  export function handleReferenceSkeletonSelection(skeletonId) {
    if (!window.isSelectingReferences) return;
    
    const skeleton = findSkeletonById(skeletonId);
    if (!skeleton) return;
    
    // Get the image source
    const imageHref = skeleton.imageEl?.getAttribute('href');
    
    // Validate image
    if (!imageHref || imageHref === 'data:,' || imageHref.trim() === '') {
      showToast('This skeleton has no image. Please select another one.', 'red', 3000);
      return;
    }
    
    // Add to selected references
    selectedRefImageIds.push({
      id: skeletonId,
      imageHref: imageHref,
      keypoints: skeleton.renderer.keypoints
    });
    
    removeReferenceSelectionToast();
    
    // If we have selected the first reference
    if (selectedRefImageIds.length === 1) {
      // Ask for the second reference
      showReferenceSelectionToast('Now select second reference image');
    } else if (selectedRefImageIds.length === 2) {
      // We have both references, continue with generation
      window.isSelectingReferences = false;
      continueWithGeneration();
    }
  }


  /**
   * Cancels the reference selection process
   */
  export function cancelReferenceSelection() {
    window.isSelectingReferences = false;
    pendingGeneration = null;
    selectedRefImageIds = [];
    removeReferenceSelectionToast();
    
    // Remove the cancel button
    const cancelBtn = document.getElementById('cancel-reference-selection');
    if (cancelBtn && cancelBtn.parentNode) {
      cancelBtn.parentNode.removeChild(cancelBtn);
    }
    
    showToast('Generation cancelled', 'red', 2000);
  }


  function continueWithGeneration() {
    if (!pendingGeneration) return;
    
    // Remove the cancel button when generation starts
    const cancelBtn = document.getElementById('cancel-reference-selection');
    if (cancelBtn && cancelBtn.parentNode) {
      cancelBtn.parentNode.removeChild(cancelBtn);
    }

    const { frames, direction } = pendingGeneration;
    
    // Get reference data
    const ref1 = selectedRefImageIds[0];
    const ref2 = selectedRefImageIds.length > 1 ? selectedRefImageIds[1] : ref1; // Fallback to first ref if only one selected
    
    console.log(`[GENERATE] Processing ${frames.length} total generations using manually selected references`);
    
    // Process all prepared frames (which already include batched duplicates)
    frames.forEach((frame, index) => {
      // Create payload using THIS frame's keypoints
      const payload = {
        refImage: ref1.imageHref,
        refSkeleton1: ref1.keypoints,
        refImage2: ref2.imageHref,
        refSkeleton2: ref2.keypoints,
        skeletonToGenerateFrom: frame.keypoints,
        direction: direction,
        apiKey: Settings.pixelLabApiKey,
        lockPaletteColors: Settings.lockPaletteColors
      };
      console.log(`[GENERATE] ApiKey: ${Settings.pixelLabApiKey}`);
      
      console.log(`[GENERATE] Adding generation ${index+1}/${frames.length} for skeleton ${frame.skeletonId}`);
      
      generationManager.addSkeletonGenerationToQueue(frame.skeletonId, payload)
        .then(data => {
          console.log(`[GENERATE] ✅ Generation completed for ${frame.skeletonId}`);
        })
        .catch(error => {
          console.error(`[GENERATE] ❌ Generation failed for ${frame.skeletonId}:`, error);
          alert(`Error generating image for ${frame.skeletonId}: ${error.message}`);
        });
    });
    
    // Reset for next time
    pendingGeneration = null;
    selectedRefImageIds = [];
  }


  // the main function to generate images
  // Modified generateImage function to generate multiple instances per skeleton
  export function generateImage() {
    console.log('[ACTION] Generate Image.');
    
    // Verify API key is valid
    if (!validateApiKey()) {
      showToast('Invalid PixelLab API key. Please check your settings.', 'red', 3000);
      return;
    }

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

    const selectedSkeletons = selectedIds
      .map(id => ViewState.skeletons.find(s => s.id === id))
      .filter(Boolean);

    if (selectedSkeletons.length === 0) {
      alert('Selected skeletons not found');
      return;
    }

    // Get batch size from settings and ensure it's within bounds
    let batchSize = Settings.batchGenerationSize || 3;
    if (batchSize < 1) batchSize = 1;
    if (batchSize > 10) batchSize = 10;
    console.log(`[GENERATE] Using batch size: ${batchSize} per skeleton`);

    // Helper function to validate image sources
    function isValidImageSrc(src) {
      return src && 
            src !== 'data:,' && 
            src.trim() !== '' && 
            !src.includes('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP');
    }

    // If manual reference selection is enabled, start the process
    if (Settings.manualReferenceSelection) {
      // Prepare the frames structure with multiple entries per skeleton
      const frames = [];
      selectedSkeletons.forEach(skeleton => {
        // Add this skeleton to the frames list batchSize times
        for (let i = 0; i < batchSize; i++) {
          frames.push({
            skeletonId: skeleton.id,
            keypoints: skeleton.renderer.keypoints,
          });
        }
      });
      
      window.isSelectingReferences = true;
      selectedRefImageIds = [];
      pendingGeneration = { frames, direction };
      
      // Show toast with instructions
      showReferenceSelectionToast(`Select first reference image for ${direction}`);
      
      // Add cancel button to document
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel Selection';
      cancelBtn.style.position = 'fixed';
      cancelBtn.style.top = '20px';
      cancelBtn.style.right = '20px';
      cancelBtn.style.padding = '8px 16px';
      cancelBtn.style.backgroundColor = '#ff3333';
      cancelBtn.style.color = 'white';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.zIndex = 10001;
      cancelBtn.id = 'cancel-reference-selection';
      
      cancelBtn.addEventListener('click', () => {
        cancelReferenceSelection();
        document.body.removeChild(cancelBtn);
      });
      
      document.body.appendChild(cancelBtn);
      
      // Add event listener to handle ESC key to cancel
      const escHandler = (e) => {
        if (e.key === 'Escape' && window.isSelectingReferences) {
          cancelReferenceSelection();
          document.body.removeChild(cancelBtn);
          document.removeEventListener('keydown', escHandler);
        }
      };
      
      document.addEventListener('keydown', escHandler);
      
      return;
    }

    // Normal flow (automatic reference selection)
    // Validate reference image 1
    const refImageSrc1 = refSkeleton1.imageEl?.getAttribute('href');
    if (!isValidImageSrc(refImageSrc1)) {
      alert(`Please upload a valid image to the required reference skeleton first (${refSkeleton1.id})`);
      return;
    }

    // Safely get and validate reference image 2
    const refImageSrc2 = refSkeleton2.imageEl?.getAttribute('href');
    const hasValidRefImage2 = isValidImageSrc(refImageSrc2);

    // Total number of generations that will be queued
    const totalGenerations = selectedSkeletons.length * batchSize;
    console.log(`[GENERATE] Queuing ${totalGenerations} total generations (${selectedSkeletons.length} skeletons × ${batchSize} generations each)`);
    
    // Process each skeleton
    selectedSkeletons.forEach(skeleton => {
      // For each skeleton, generate batchSize images
      for (let i = 0; i < batchSize; i++) {
        // Create payload with this skeleton's data
        const payload = {
          refImage: refImageSrc1,
          refSkeleton1: refSkeleton1.renderer.keypoints,
          refImage2: hasValidRefImage2 ? refImageSrc2 : null,
          refSkeleton2: hasValidRefImage2 ? refSkeleton2.renderer.keypoints : null,
          skeletonToGenerateFrom: skeleton.renderer.keypoints,
          direction: direction,
          apiKey: Settings.pixelLabApiKey,
          lockPaletteColors: Settings.lockPaletteColors
        };
        
        console.log(`[GENERATE] ApiKey: ${Settings.pixelLabApiKey}`);
        console.log(`[GENERATE] Adding generation ${i+1}/${batchSize} for skeleton ${skeleton.id}`);
        
        generationManager.addSkeletonGenerationToQueue(skeleton.id, payload)
          .then(data => {
            console.log(`[GENERATE] ✅ Generation ${i+1} completed for ${skeleton.id}`);
          })
          .catch(error => {
            console.error(`[GENERATE] ❌ Generation ${i+1} failed for ${skeleton.id}:`, error);
            alert(`Error generating image for ${skeleton.id}: ${error.message}`);
          });
      }
    });
  }