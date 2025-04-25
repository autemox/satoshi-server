import { ViewState } from './ViewState.js';
  
/**
 * Handles copying the image from the active skeleton to the system clipboard.
 */
export function handleCopy() {
    console.log('[COPY] Attempting copy...');
    const active = ViewState.activeSkeleton;
    console.log('[COPY] Active skeleton:', active);
    if (!active) return;
  
    const skeleton = ViewState.skeletons.find(s => s.id === active);
    if (!skeleton) return console.warn('[COPY] Skeleton not found');
    if (!skeleton.imageEl) return console.warn('[COPY] No imageEl on skeleton');


    const imgSrc = skeleton.imageEl.getAttribute('href');
    if (!imgSrc || imgSrc === 'data:,') {
        console.warn('[COPY] No image data to copy');
        return;
    }
  
    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.write) {
      console.error('[COPY] Clipboard API not available in this browser/context');
      alert('Clipboard write access not available. This feature requires HTTPS or localhost.');
      return;
    }
  
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(skeleton.imageEl, 0, 0, 64, 64);
    
    // Write to system clipboard
    canvas.toBlob(blob => {
      try {
        // Create a ClipboardItem with the image blob
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item])
          .then(() => {
            console.log(`[COPY] Image copied to system clipboard from ${active}`);
            // Optional visual feedback
            const message = document.createElement('div');
            message.textContent = 'Copied to clipboard!';
            message.style.fontFamily = 'Arial, sans-serif';
            message.style.fontSize = '10px';
            message.style.position = 'fixed';
            message.style.bottom = '10px';
            message.style.right = '10px';
            message.style.padding = '5px';
            message.style.backgroundColor = '#4caf50';
            message.style.color = 'white';
            message.style.borderRadius = '3px';
            document.body.appendChild(message);
            setTimeout(() => document.body.removeChild(message), 2000);
          })
          .catch(err => {
            console.error('[COPY] Failed to write to clipboard:', err);
            alert('Failed to copy image to clipboard: ' + err.message);
          });
      } catch (err) {
        console.error('[COPY] Error creating ClipboardItem:', err);
        alert('Error creating clipboard item: ' + err.message);
      }
    }, 'image/png');
  }

  // CTRL V past events
  export async function handlePaste() {
    console.log('[PASTE] Attempting paste...');
    const active = ViewState.activeSkeleton;
    if (!active) return;
  
    const skeleton = ViewState.skeletons.find(s => s.id === active);
    if (!skeleton || !skeleton.imageEl) {
      console.warn('[PASTE] Skeleton or imageEl not found');
      return;
    }
  
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) {
          console.log('[PASTE] Found image type in clipboard:', type);
          const blob = await item.getType(type);
  
          const reader = new FileReader();
  
          reader.onload = () => {
            console.log('[PASTE] FileReader loaded image data');
            const img = new Image();
            img.onload = () => {
              console.log('[PASTE] Image loaded:', img.width, img.height);
  
              if (img.width === 0 || img.height === 0) {
                console.error('[PASTE] Image dimensions are zero. Cannot draw.');
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
  
              const finalDataUrl = canvas.toDataURL();
              
              // Update the image href attribute
              skeleton.imageEl.setAttribute('href', finalDataUrl);
              
              // Move the image to the beginning of its parent container
              // so it appears below all other elements
              const parent = skeleton.imageEl.parentNode;
              if (parent) {
                parent.removeChild(skeleton.imageEl);
                parent.insertBefore(skeleton.imageEl, parent.firstChild);
              }
            };
  
            img.onerror = (err) => {
              console.error('[PASTE] Image failed to load from data URL', err);
            };
  
            img.src = reader.result;
          };
  
          reader.onerror = (err) => {
            console.error('[PASTE] FileReader failed:', err);
          };
  
          reader.readAsDataURL(blob);
          return;
        }
      }
  
      console.warn('[PASTE] No image found in clipboard');
    } catch (err) {
      console.error('[PASTE] Clipboard read failed:', err);
    }
  }

  export function uploadJson(skeletonId) {

    console.log('[ACTION] Upload JSON.  id: ', skeletonId);
    const active = skeletonId || ViewState.activeSkeleton; // fall back to active skeleton
    if (!active) {
        alert('Please select a skeleton first');
        return;
    }
    console.log(`[UPLOAD] Using skeleton: ${active}`); // Debug log
    
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          // Validate the JSON structure
          if (!jsonData.pose_keypoints || !Array.isArray(jsonData.pose_keypoints) || 
              !jsonData.pose_keypoints[0] || !Array.isArray(jsonData.pose_keypoints[0])) {
            throw new Error('Invalid JSON format. Expected "pose_keypoints" array.');
          }
          
          // Find the ACTIVE skeleton (not just the first one)
          const skeleton = ViewState.skeletons.find(s => s.id === active);
          if (!skeleton) return console.warn('[UPLOAD] Skeleton not found');
          
          // Update the keypoints
          skeleton.renderer.keypoints = JSON.parse(JSON.stringify(jsonData.pose_keypoints[0]));
          
          // Redraw the skeleton
          skeleton.renderer.draw();
          
          console.log(`[UPLOAD] Successfully loaded keypoints for ${active}`);
        } catch (err) {
          console.error('[UPLOAD] Failed to parse JSON:', err);
          alert('Failed to parse JSON file: ' + err.message);
        }
      };
      
      reader.onerror = function() {
        console.error('[UPLOAD] Failed to read file');
        alert('Failed to read file');
      };
      
      reader.readAsText(file);
      
      // Clean up
      document.body.removeChild(fileInput);
    });
    
    // Trigger the file dialog
    fileInput.click();
  }

  export function downloadJson() {
    console.log('[ACTION] Download JSON');
    
    const active = ViewState.activeSkeleton;
    if (!active) {
      alert('Please select a skeleton first');
      return;
    }
  
    const skeleton = ViewState.skeletons.find(s => s.id === active);
    if (!skeleton) return console.warn('[DOWNLOAD] Skeleton not found');
    
    // Create a JSON object with the same structure as required
    const exportData = {
      pose_keypoints: [skeleton.renderer.keypoints]
    };
    
    // Convert to a formatted JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create a blob and download link
    const blob = new Blob([jsonString], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active}.json`; // Use skeleton ID as filename
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  export function uploadImage(skeletonId) {
    console.log('[ACTION] Upload Image. id:', skeletonId);
    
    const active = skeletonId || ViewState.activeSkeleton; // fall back to active skeleton
    if (!active) {
      alert('Please select a skeleton first');
      return;
    }
    
    console.log(`[UPLOAD] Using skeleton: ${active}`); // Debug log
    
    const skeleton = ViewState.skeletons.find(s => s.id === active);
    if (!skeleton) return console.warn('[UPLOAD] Skeleton not found');
    if (!skeleton.imageEl) return console.warn('[UPLOAD] No imageEl on skeleton');
    
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*'; // Accept any image format
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Check if it's a valid image file
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        document.body.removeChild(fileInput);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        
        img.onload = function() {
          console.log('[UPLOAD IMAGE] Image loaded:', img.width, img.height);
          
          // Create canvas to resize/process the image
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          
          // Clear canvas and draw the image centered
          ctx.clearRect(0, 0, 64, 64);
          
          // Calculate position to center the image
          let offsetX = 0;
          let offsetY = 0;
          let width = img.width;
          let height = img.height;
          
          // Determine scaling to fit within 64x64 while maintaining aspect ratio
          if (width > height) {
            const ratio = height / width;
            width = 64;
            height = 64 * ratio;
            offsetY = (64 - height) / 2;
          } else {
            const ratio = width / height;
            height = 64;
            width = 64 * ratio;
            offsetX = (64 - width) / 2;
          }
          
          ctx.drawImage(img, offsetX, offsetY, width, height);
          
          // Get data URL and update the image element
          const finalDataUrl = canvas.toDataURL();
          skeleton.imageEl.setAttribute('href', finalDataUrl);
          
          // Move the image to the beginning of the parent to ensure it appears below other elements
          const parent = skeleton.imageEl.parentNode;
          if (parent) {
            parent.removeChild(skeleton.imageEl);
            parent.insertBefore(skeleton.imageEl, parent.firstChild);
          }
          
          console.log(`[UPLOAD IMAGE] Successfully loaded image for ${active}`);
        };
        
        img.onerror = function(err) {
          console.error('[UPLOAD IMAGE] Failed to load image:', err);
          alert('Failed to load the selected image');
        };
        
        img.src = event.target.result;
      };
      
      reader.onerror = function() {
        console.error('[UPLOAD IMAGE] Failed to read file');
        alert('Failed to read file');
      };
      
      reader.readAsDataURL(file);
      
      // Clean up
      document.body.removeChild(fileInput);
    });
    
    // Trigger the file dialog
    fileInput.click();
  }

  export function generateImage(skeletonId) {
    console.log('[ACTION] Generate Image. id:', skeletonId);
    
    const active = skeletonId || ViewState.activeSkeleton;
    if (!active) {
      alert('Please select a skeleton first');
      return;
    }
    
    console.log(`[GENERATE] Using skeleton: ${active}`);
    
    const skeleton = ViewState.skeletons.find(s => s.id === active);
    if (!skeleton) return console.warn('[GENERATE] Skeleton not found');
    
    // Find a reference skeleton (specifically skeleton1)
    const refSkeleton = ViewState.skeletons.find(s => s.id === 'skeleton1');
    if (!refSkeleton) {
      alert('Reference skeleton (skeleton1) is required');
      return;
    }
    
    // Check if reference skeleton has an image
    const refImageSrc = refSkeleton.imageEl?.getAttribute('href');
    if (!refImageSrc || refImageSrc === 'data:,') {
      alert('Please upload an image to the reference skeleton first');
      return;
    }
    
    // Show loading overlay inside the skeleton box
    const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlayGroup.setAttribute('id', `loading-${skeleton.id}`);

    // Dark semi-transparent background
    const darkBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    darkBox.setAttribute('x', '0');
    darkBox.setAttribute('y', '0');
    darkBox.setAttribute('width', '64');
    darkBox.setAttribute('height', '64');
    darkBox.setAttribute('fill', 'rgba(0, 0, 0, 0.5)');
    overlayGroup.appendChild(darkBox);

    // Loading text
    const loadingText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    loadingText.textContent = 'Generating...';
    loadingText.setAttribute('x', '32');
    loadingText.setAttribute('y', '36');
    loadingText.setAttribute('text-anchor', 'middle');
    loadingText.setAttribute('fill', 'white');
    loadingText.setAttribute('font-size', '6');
    loadingText.setAttribute('font-family', 'sans-serif');
    overlayGroup.appendChild(loadingText);

    // Add to the skeleton's group
    skeleton.group.appendChild(overlayGroup);
    
    // Create the request payload
    const payload = {
      refImage: refImageSrc,
      refSkeleton1: refSkeleton.renderer.keypoints,
      skeletonToGenerateFrom: skeleton.renderer.keypoints,
      direction: "west"
    };
    
    console.log('[GENERATE] Payload prepared, sending request...');
    
    fetch('/api/generate-from-skeleton', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      console.log('[GENERATE] Response status:', response.status);
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`Server returned ${response.status}: ${text || response.statusText}`);
        });
      }
      return response.json();
    })
    .then(data => {
      // Remove loading message
      const overlay = skeleton.group.querySelector(`#loading-${skeleton.id}`);
      if (overlay) skeleton.group.removeChild(overlay);
      console.log('[GENERATE] Response data:', data);
      
      if (!data.success) {
        alert(`Failed to generate image: ${data.error || 'Unknown error'}`);
        return;
      }
      
      // Convert the base64 back to an image
      const imageDataUrl = `data:image/png;base64,${data.image}`;
      
      // Update the skeleton's image
      skeleton.imageEl.setAttribute('href', imageDataUrl);
      
      // Move image to beginning of parent
      const parent = skeleton.imageEl.parentNode;
      if (parent) {
        parent.removeChild(skeleton.imageEl);
        parent.insertBefore(skeleton.imageEl, parent.firstChild);
      }
      
      console.log(`[GENERATE] Successfully generated image for ${active}`);
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.textContent = 'Image generated!';
      successMessage.style.fontFamily = 'Arial, sans-serif';
      successMessage.style.fontSize = '10px';
      successMessage.style.position = 'fixed';
      successMessage.style.bottom = '10px';
      successMessage.style.right = '10px';
      successMessage.style.padding = '5px';
      successMessage.style.backgroundColor = '#4caf50';
      successMessage.style.color = 'white';
      successMessage.style.borderRadius = '3px';
      document.body.appendChild(successMessage);
      setTimeout(() => document.body.removeChild(successMessage), 2000);
    })
    .catch(error => {
      document.body.removeChild(loadingMessage);
      console.error('[GENERATE] Error calling API:', error);
      alert(`Error generating image: ${error.message}`);
    });
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
  