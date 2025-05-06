import { showToast, getOppositeDirection, findSkeletonById } from './utils.js';
import { ViewState } from './ViewState.js';

/**
 * Mirrors images from opposite directions for all selected skeletons
 */
export function reflectImageFromOpposite() {
  // Get all selected skeletons
  const selectedIds = Array.from(ViewState.activeSkeletons);
  if (selectedIds.length === 0) {
    showToast('No skeletons selected', 'red', 3000);
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each selected skeleton
  selectedIds.forEach(skeletonId => {
    const sourceSkeletonObj = findSkeletonById(skeletonId);
    if (!sourceSkeletonObj) {
      errorCount++;
      return;
    }
    
    // Get the current direction and find the opposite
    const currentDirection = sourceSkeletonObj.renderer.direction;
    const oppositeDirection = getOppositeDirection(currentDirection);
    
    // Find skeletons in the opposite direction
    const oppositeSkeletons = ViewState.skeletonsByDirection[oppositeDirection];
    
    if (!oppositeSkeletons || oppositeSkeletons.length === 0) {
      errorCount++;
      return;
    }
    
    // Find the opposite skeleton with the same number (if possible)
    const skeletonNumber = skeletonId.split('skeleton')[1];
    let oppositeSkeletonId = `${oppositeDirection}-skeleton${skeletonNumber}`;
    let oppositeSkeleton = findSkeletonById(oppositeSkeletonId);
    
    // If exact match not found, take the first skeleton with an image
    if (!oppositeSkeleton) {
      oppositeSkeleton = oppositeSkeletons.find(skeleton => {
        const imageSrc = skeleton.imageEl?.getAttribute('href');
        return imageSrc && imageSrc !== 'data:,' && imageSrc.trim() !== '';
      });
    }
    
    if (!oppositeSkeleton || !oppositeSkeleton.imageEl) {
      errorCount++;
      return;
    }
    
    // Get the source image
    const sourceImage = oppositeSkeleton.imageEl.getAttribute('href');
    if (!sourceImage || sourceImage === 'data:,' || sourceImage.trim() === '') {
      errorCount++;
      return;
    }
    
    // Create a temporary canvas to flip the image
    const canvas = document.createElement('canvas');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Flip horizontally
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      
      // Get the flipped image data
      const flippedImageData = canvas.toDataURL('image/png');
      
      // Set the image to the target skeleton
      if (sourceSkeletonObj.imageEl) {
        sourceSkeletonObj.imageEl.setAttribute('href', flippedImageData);
        sourceSkeletonObj.imageEl.style.display = '';
        
        // Make sure the image is in the correct layer
        const imageLayer = sourceSkeletonObj.group.querySelector('.image-layer');
        if (imageLayer) {
          // Remove the image from its current parent
          const parent = sourceSkeletonObj.imageEl.parentNode;
          if (parent) {
            parent.removeChild(sourceSkeletonObj.imageEl);
          }
          
          // Add it to the proper image layer at the beginning
          imageLayer.insertBefore(sourceSkeletonObj.imageEl, imageLayer.firstChild);
        }
        
        successCount++;
      } else {
        errorCount++;
      }
      
      // Show a final success/error message once all operations complete
      if (successCount + errorCount === selectedIds.length) {
        if (errorCount === 0) {
          showToast(`Mirrored ${successCount} images from ${oppositeDirection}`, 'green', 2000);
        } else if (successCount === 0) {
          showToast(`Failed to mirror any images. No valid source images in ${oppositeDirection}`, 'red', 3000);
        } else {
          showToast(`Mirrored ${successCount} images, ${errorCount} failed`, 'orange', 3000);
        }
      }
    };
    
    img.onerror = () => {
      errorCount++;
      
      // Show a final message if this is the last image
      if (successCount + errorCount === selectedIds.length) {
        if (successCount === 0) {
          showToast(`Failed to mirror any images`, 'red', 3000);
        } else {
          showToast(`Mirrored ${successCount} images, ${errorCount} failed`, 'orange', 3000);
        }
      }
    };
    
    img.src = sourceImage;
  });
}

/**
 * Mirrors skeletons from opposite directions for all selected skeletons, swapping left/right limbs
 */
export function reflectSkeletonFromOpposite() {
  // Get all selected skeletons
  const selectedIds = Array.from(ViewState.activeSkeletons);
  if (selectedIds.length === 0) {
    showToast('No skeletons selected', 'red', 3000);
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each selected skeleton
  selectedIds.forEach(skeletonId => {
    const sourceSkeletonObj = findSkeletonById(skeletonId);
    if (!sourceSkeletonObj) {
      errorCount++;
      return;
    }
    
    // Get the current direction and find the opposite
    const currentDirection = sourceSkeletonObj.renderer.direction;
    const oppositeDirection = getOppositeDirection(currentDirection);
    
    // Find skeletons in the opposite direction
    const oppositeSkeletons = ViewState.skeletonsByDirection[oppositeDirection];
    
    if (!oppositeSkeletons || oppositeSkeletons.length === 0) {
      errorCount++;
      return;
    }
    
    // Find the opposite skeleton with the same number (if possible)
    const skeletonNumber = skeletonId.split('skeleton')[1];
    let oppositeSkeletonId = `${oppositeDirection}-skeleton${skeletonNumber}`;
    let oppositeSkeleton = findSkeletonById(oppositeSkeletonId);
    
    // If exact match not found, take the first skeleton
    if (!oppositeSkeleton) {
      oppositeSkeleton = oppositeSkeletons[0];
    }
    
    if (!oppositeSkeleton) {
      errorCount++;
      return;
    }
    
    // Get the source keypoints
    const sourceKeypoints = [...oppositeSkeleton.renderer.keypoints];
    if (!sourceKeypoints || sourceKeypoints.length === 0) {
      errorCount++;
      return;
    }
    
    // Create new mirrored keypoints
    const mirroredKeypoints = sourceKeypoints.map(kp => {
      const newKeypoint = { ...kp };
      
      // Mirror x-coordinate
      newKeypoint.x = 1.0 - kp.x;
      
      return newKeypoint;
    });
    
    // Update the target skeleton's keypoints
    sourceSkeletonObj.renderer.keypoints = mirroredKeypoints;
    
    // Redraw the skeleton
    sourceSkeletonObj.renderer.draw();
    
    successCount++;
    
    // Show a final message when all operations are complete
    if (successCount + errorCount === selectedIds.length) {
      if (errorCount === 0) {
        showToast(`Mirrored ${successCount} skeletons from ${oppositeDirection}`, 'green', 2000);
      } else if (successCount === 0) {
        showToast(`Failed to mirror any skeletons. No valid source skeletons in ${oppositeDirection}`, 'red', 3000);
      } else {
        showToast(`Mirrored ${successCount} skeletons, ${errorCount} failed`, 'orange', 3000);
      }
    }
  });
}