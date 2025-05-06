/*
Screen that allows the user to generate images based on a rotation
uses degrees for more precise control
*/

import { ViewState } from './ViewState.js';
import { generationManager } from './GenerationManager.js';
import { showToast, findSkeletonById } from './utils.js';
import { Settings } from './Settings.js';

/**
 * Maps a degree value to the closest cardinal or intercardinal direction
 * @param {number} degrees - The angle in degrees
 * @returns {string} - The closest direction
 */
function degreesToDirection(degrees) {
  // Normalize degrees to 0-360 range
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  
  // Direction boundaries (each direction spans 45 degrees)
  const directions = [
    { name: 'north', center: 0, min: 337.5, max: 22.5 },
    { name: 'north-east', center: 45, min: 22.5, max: 67.5 },
    { name: 'east', center: 90, min: 67.5, max: 112.5 },
    { name: 'south-east', center: 135, min: 112.5, max: 157.5 },
    { name: 'south', center: 180, min: 157.5, max: 202.5 },
    { name: 'south-west', center: 225, min: 202.5, max: 247.5 },
    { name: 'west', center: 270, min: 247.5, max: 292.5 },
    { name: 'north-west', center: 315, min: 292.5, max: 337.5 }
  ];
  
  // Find the matching direction
  for (const dir of directions) {
    if (dir.min <= normalizedDegrees && normalizedDegrees < dir.max) {
      return dir.name;
    }
  }
  
  // Default to north (should never reach here)
  return 'north';
}

/**
 * Shows the rotation generation dialog
 */
export function showRotationGenerationDialog() {
  // Validate current selection
  if (ViewState.activeSkeletons.size !== 1) {
    showToast('Please select exactly one skeleton to use as the source for rotation generation', 'red', 3000);
    return;
  }

  // Verify API key is valid
  if (!Settings.pixelLabApiKey || Settings.pixelLabApiKey.length < 5) {
    showToast('Invalid PixelLab API key. Please check your settings.', 'red', 3000);
    return;
  }

  // Get the selected skeleton and direction
  const skeletonId = Array.from(ViewState.activeSkeletons)[0];
  const currentDirection = ViewState.activeDirection;
  const skeletonObj = findSkeletonById(skeletonId);

  if (!skeletonObj) {
    showToast('Selected skeleton not found', 'red', 3000);
    return;
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '10000';

  // Create modal content
  const modal = document.createElement('div');
  modal.style.backgroundColor = '#2a2a2a';
  modal.style.color = 'white';
  modal.style.padding = '25px';
  modal.style.borderRadius = '8px';
  modal.style.width = '600px';
  modal.style.maxWidth = '90%';
  modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
  modal.style.fontFamily = 'Arial, sans-serif';

  // Modal title
  const title = document.createElement('h2');
  title.textContent = 'Generate Using Rotation';
  title.style.margin = '0 0 20px 0';
  title.style.borderBottom = '1px solid #444';
  title.style.paddingBottom = '10px';
  modal.appendChild(title);

  // Description
  const description = document.createElement('p');
  description.textContent = 'Generate a rotated image based on the same pose but in a different direction. -90 is a left rotation, 90 is a right rotation.';
  description.style.marginBottom = '20px';
  description.style.lineHeight = '1.5';
  modal.appendChild(description);

  // Reference selection section
  const referenceSection = document.createElement('div');
  referenceSection.style.marginBottom = '20px';
  
  const referenceTitle = document.createElement('h3');
  referenceTitle.textContent = 'Choose a Reference:';
  referenceTitle.style.marginBottom = '10px';
  referenceSection.appendChild(referenceTitle);

  // Get the available directions
  const directions = ['north', 'east', 'south', 'west'];
  const availableDirections = directions.filter(dir => dir !== currentDirection);

  // Create radio buttons for directions
  const radioGroup = document.createElement('div');
  radioGroup.style.display = 'grid';
  radioGroup.style.gridTemplateColumns = 'repeat(3, 1fr)';
  radioGroup.style.gap = '10px';
  radioGroup.style.marginBottom = '15px';

  let selectedReference = null;

  availableDirections.forEach(dir => {
    // Check if this direction has valid skeletons
    const dirSkeletons = ViewState.skeletonsByDirection[dir];
    if (!dirSkeletons || dirSkeletons.length === 0) return;

    // Only show directions that have at least one skeleton with an image
    const hasValidImage = dirSkeletons.some(skel => {
      const imageSrc = skel.imageEl?.getAttribute('href');
      return imageSrc && imageSrc !== 'data:,' && imageSrc.trim() !== '';
    });

    if (!hasValidImage) return;

    const radioOption = document.createElement('div');
    radioOption.style.display = 'flex';
    radioOption.style.flexDirection = 'column';
    radioOption.style.alignItems = 'center';
    radioOption.style.padding = '10px';
    radioOption.style.border = '1px solid #444';
    radioOption.style.borderRadius = '5px';
    radioOption.style.cursor = 'pointer';
    radioOption.style.transition = 'background-color 0.2s';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'reference-direction';
    radio.value = dir;
    radio.id = `reference-${dir}`;
    radio.style.margin = '0 0 8px 0';

    const label = document.createElement('label');
    label.htmlFor = `reference-${dir}`;
    label.textContent = dir.charAt(0).toUpperCase() + dir.slice(1);
    label.style.cursor = 'pointer';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';

    radioOption.appendChild(radio);
    radioOption.appendChild(label);

    // Preview the first skeleton with a valid image
    const previewSkeleton = dirSkeletons.find(skel => {
      const imageSrc = skel.imageEl?.getAttribute('href');
      return imageSrc && imageSrc !== 'data:,' && imageSrc.trim() !== '';
    });

    if (previewSkeleton) {
      const preview = document.createElement('img');
      preview.src = previewSkeleton.imageEl.getAttribute('href');
      preview.style.width = '64px';
      preview.style.height = '64px';
      preview.style.marginTop = '5px';
      preview.style.border = '1px solid #666';
      radioOption.appendChild(preview);
    }

    // Add selection behavior
    radioOption.addEventListener('click', () => {
      // Deselect all options
      radioGroup.querySelectorAll('div').forEach(opt => {
        opt.style.backgroundColor = 'transparent';
        opt.style.borderColor = '#444';
        const radioInput = opt.querySelector('input[type="radio"]');
        if (radioInput) radioInput.checked = false;
      });

      // Select this option
      radio.checked = true;
      radioOption.style.backgroundColor = '#3399ff33';
      radioOption.style.borderColor = '#3399ff';
      selectedReference = dir;
    });

    radioGroup.appendChild(radioOption);

    // Select the first option by default
    if (!selectedReference) {
      setTimeout(() => radioOption.click(), 0);
    }
  });

  referenceSection.appendChild(radioGroup);
  modal.appendChild(referenceSection);

  // Amount of generations section
  const amountSection = document.createElement('div');
  amountSection.style.marginBottom = '20px';
  
  const amountTitle = document.createElement('h3');
  amountTitle.textContent = 'Amount of Generations:';
  amountTitle.style.marginBottom = '10px';
  amountSection.appendChild(amountTitle);
  
  const amountHelp = document.createElement('div');
  amountHelp.textContent = 'Choose between 1 and 10 generations';
  amountHelp.style.fontSize = '12px';
  amountHelp.style.color = '#aaa';
  amountHelp.style.marginTop = '5px';
  amountSection.appendChild(amountHelp);
  
  // Do the same for the amount input field:
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.min = '1';
  amountInput.max = '10';
  amountInput.value = '3';
  amountInput.style.width = '100%';
  amountInput.style.padding = '8px';
  amountInput.style.border = '1px solid #444';
  amountInput.style.borderRadius = '4px';
  amountInput.style.backgroundColor = '#333';
  amountInput.style.color = 'white';
  amountInput.style.fontSize = '14px';
  // Add these properties to improve the input experience
  amountInput.inputMode = 'numeric';
  amountInput.pattern = '[0-9]*';
  amountInput.style.MozAppearance = 'textfield'; // Firefox
  amountInput.style.WebkitAppearance = 'none'; // Chrome
  amountSection.appendChild(amountInput);
  
  modal.appendChild(amountSection);

  // Range of Rotation section
  const rangeSection = document.createElement('div');
  rangeSection.style.marginBottom = '20px';
  
  const rangeTitle = document.createElement('h3');
  rangeTitle.textContent = 'Range of Rotation:';
  rangeTitle.style.marginBottom = '10px';
  rangeSection.appendChild(rangeTitle);

  const rangeContainer = document.createElement('div');
  rangeContainer.style.display = 'flex';
  rangeContainer.style.gap = '10px';
  rangeContainer.style.alignItems = 'center';

  const rangeStartInput = document.createElement('input');
  rangeStartInput.type = 'number';
  rangeStartInput.min = '-180';
  rangeStartInput.max = '180';
  rangeStartInput.value = '15';
  rangeStartInput.style.flex = '1';
  rangeStartInput.style.padding = '8px';
  rangeStartInput.style.border = '1px solid #444';
  rangeStartInput.style.borderRadius = '4px';
  rangeStartInput.style.backgroundColor = '#333';
  rangeStartInput.style.color = 'white';
  rangeStartInput.style.fontSize = '14px';
  // Add these properties to improve the input experience
  rangeStartInput.inputMode = 'numeric';
  rangeStartInput.pattern = '-?[0-9]*';
  rangeStartInput.style.MozAppearance = 'textfield'; // Firefox
  rangeStartInput.style.WebkitAppearance = 'none'; // Chrome
  rangeContainer.appendChild(rangeStartInput);

  // Add the "to" label between range inputs
  const rangeToLabel = document.createElement('span');
  rangeToLabel.textContent = 'to';
  rangeToLabel.style.color = 'white';
  rangeToLabel.style.padding = '0 10px';
  rangeContainer.appendChild(rangeToLabel);

  // Similarly for rangeEndInput:
  const rangeEndInput = document.createElement('input');
  rangeEndInput.type = 'number';
  rangeEndInput.min = '-180';
  rangeEndInput.max = '180';
  rangeEndInput.value = '45';
  rangeEndInput.style.flex = '1';
  rangeEndInput.style.padding = '8px';
  rangeEndInput.style.border = '1px solid #444';
  rangeEndInput.style.borderRadius = '4px';
  rangeEndInput.style.backgroundColor = '#333';
  rangeEndInput.style.color = 'white';
  rangeEndInput.style.fontSize = '14px';
  // Add these properties to improve the input experience
  rangeEndInput.inputMode = 'numeric';
  rangeEndInput.pattern = '-?[0-9]*';
  rangeEndInput.style.MozAppearance = 'textfield'; // Firefox
  rangeEndInput.style.WebkitAppearance = 'none'; // Chrome
  rangeContainer.appendChild(rangeEndInput);

  rangeSection.appendChild(rangeContainer);
  
  const rangeHelp = document.createElement('div');
  rangeHelp.textContent = 'Range between -180 and 180 degrees';
  rangeHelp.style.fontSize = '12px';
  rangeHelp.style.color = '#aaa';
  rangeHelp.style.marginTop = '5px';
  rangeSection.appendChild(rangeHelp);
  
  modal.appendChild(rangeSection);

  // Add input event listeners to allow empty fields during editing
  amountInput.addEventListener('input', (e) => {
    // Allow empty values during editing
    if (e.target.value === '') return;
    
    // Only validate when there's a value
    const amount = parseInt(e.target.value);
    if (amount < 1) e.target.value = '1';
    if (amount > 10) e.target.value = '10';
  });

  rangeStartInput.addEventListener('input', (e) => {
    // Allow empty values during editing
    if (e.target.value === '') return;
    
    // Only validate when there's a value
    const value = parseInt(e.target.value);
    if (value < -180) e.target.value = '-180';
    if (value > 180) e.target.value = '180';
  });

  rangeEndInput.addEventListener('input', (e) => {
    // Allow empty values during editing
    if (e.target.value === '') return;
    
    // Only validate when there's a value
    const value = parseInt(e.target.value);
    if (value < -180) e.target.value = '-180';
    if (value > 180) e.target.value = '180';
  });

  // Update range input based on amount of generations
  amountInput.addEventListener('change', () => {
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount === 1) {
      rangeToLabel.style.display = 'none';
      rangeEndInput.style.display = 'none';
      rangeHelp.textContent = 'Single rotation angle between -180 and 180 degrees';
    } else {
      rangeToLabel.style.display = '';
      rangeEndInput.style.display = '';
      rangeHelp.textContent = 'Range between -180 and 180 degrees';
    }
  });

  // Generate button
  const generateButton = document.createElement('button');
  generateButton.textContent = 'Generate Using Rotation';
  generateButton.style.width = '100%';
  generateButton.style.padding = '12px';
  generateButton.style.backgroundColor = '#3399ff';
  generateButton.style.color = 'white';
  generateButton.style.border = 'none';
  generateButton.style.borderRadius = '4px';
  generateButton.style.cursor = 'pointer';
  generateButton.style.fontSize = '16px';
  generateButton.style.fontWeight = 'bold';
  generateButton.style.marginTop = '10px';
  
  // Hover effect
  generateButton.addEventListener('mouseenter', () => {
    generateButton.style.backgroundColor = '#66b3ff';
  });
  
  generateButton.addEventListener('mouseleave', () => {
    generateButton.style.backgroundColor = '#3399ff';
  });

  // Handle generate button click
  generateButton.addEventListener('click', () => {
    if (!selectedReference) {
      showToast('Please select a reference direction', 'red', 3000);
      return;
    }

    // Check if inputs are empty
    if (amountInput.value === '') {
      showToast('Please enter an amount of generations', 'red', 3000);
      return;
    }

    // Get the amount value
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount < 1 || amount > 10) {
      showToast('Amount must be between 1 and 10', 'red', 3000);
      return;
    }

    // Check start rotation
    if (rangeStartInput.value === '') {
      showToast('Please enter a start rotation value', 'red', 3000);
      return;
    }

    // Check end rotation if needed
    if (amount > 1 && rangeEndInput.value === '') {
      showToast('Please enter an end rotation value', 'red', 3000);
      return;
    }

    // Parse rotation values
    let startRotation = parseInt(rangeStartInput.value);
    let endRotation = amount === 1 ? startRotation : parseInt(rangeEndInput.value);

    // Validate rotation values
    if (isNaN(startRotation) || (amount > 1 && isNaN(endRotation))) {
      showToast('Please enter valid rotation values', 'red', 3000);
      return;
    }

    if (startRotation < -180 || startRotation > 180 || 
        (amount > 1 && (endRotation < -180 || endRotation > 180))) {
      showToast('Rotation values must be between -180 and 180', 'red', 3000);
      return;
    }

    if (amount > 1 && startRotation === endRotation) {
      showToast('Start and end rotation cannot be the same for multiple generations', 'red', 3000);
      return;
    }

    // Close the modal
    document.body.removeChild(overlay);

    // Call the generation function
    generateRotatedImages(skeletonId, selectedReference, currentDirection, amount, startRotation, endRotation);
  });

  modal.appendChild(generateButton);

  // Add cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.width = '100%';
  cancelButton.style.padding = '10px';
  cancelButton.style.backgroundColor = '#444';
  cancelButton.style.color = 'white';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.cursor = 'pointer';
  cancelButton.style.fontSize = '14px';
  cancelButton.style.marginTop = '10px';
  
  // Hover effect
  cancelButton.addEventListener('mouseenter', () => {
    cancelButton.style.backgroundColor = '#555';
  });
  
  cancelButton.addEventListener('mouseleave', () => {
    cancelButton.style.backgroundColor = '#444';
  });
  
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  modal.appendChild(cancelButton);

  // Add the modal to the overlay
  overlay.appendChild(modal);
  
  // Add to document body
  document.body.appendChild(overlay);

  // Close on ESC key
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);

  // Close on click outside
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

/**
 * Generates rotated images based on a reference direction and rotation angles
 * @param {string} skeletonId - The ID of the skeleton to use as a source
 * @param {string} referenceDirection - The direction to use as a reference
 * @param {string} currentDirection - The current direction of the active skeleton
 * @param {number} amount - Number of generations to create
 * @param {number} startRotation - Starting rotation angle in degrees
 * @param {number} endRotation - Ending rotation angle in degrees
 */
function generateRotatedImages(skeletonId, referenceDirection, currentDirection, amount, startRotation, endRotation) {
  console.log(`[ROTATION] Generating ${amount} rotated images from ${skeletonId} using ${referenceDirection} as reference`);
  console.log(`[ROTATION] Current direction: ${currentDirection}`);
  console.log(`[ROTATION] Rotation range: ${startRotation}° to ${endRotation}°`);
  
  // Get the source skeleton
  const sourceSkeletonObj = findSkeletonById(skeletonId);
  if (!sourceSkeletonObj) {
    showToast('Source skeleton not found', 'red', 3000);
    return;
  }
  
  // Get the reference skeletons from the selected reference direction
  const referenceSkeletons = ViewState.skeletonsByDirection[referenceDirection];
  if (!referenceSkeletons || referenceSkeletons.length < 1) {
    showToast(`No reference skeletons found for ${referenceDirection}`, 'red', 3000);
    return;
  }
  
  // Find the first reference with a valid image
  const refSkeleton = referenceSkeletons.find(skel => {
    const imageSrc = skel.imageEl?.getAttribute('href');
    return imageSrc && imageSrc !== 'data:,' && imageSrc.trim() !== '';
  });
  
  if (!refSkeleton) {
    showToast(`No valid reference image found for ${referenceDirection}`, 'red', 3000);
    return;
  }
  
  // Get the base image
  const base64Image = refSkeleton.imageEl.getAttribute('href');
  
  // Calculate rotation values for each generation
  const rotationValues = [];
  if (amount === 1) {
    rotationValues.push(startRotation);
  } else {
    // Calculate evenly distributed rotations
    const step = (endRotation - startRotation) / (amount - 1);
    for (let i = 0; i < amount; i++) {
      const rotation = startRotation + step * i;
      rotationValues.push(Math.round(rotation)); // Round to nearest integer
    }
  }
  
  console.log(`[ROTATION] Calculated rotation values:`, rotationValues);
  
  // Generate images
  rotationValues.forEach((rotation, index) => {
    // Convert the rotation angle to a target direction
    // First, get base rotation value for the reference direction
    let baseAngle;
    switch (referenceDirection) {
      case 'north': baseAngle = 0; break;
      case 'east': baseAngle = 90; break;
      case 'south': baseAngle = 180; break;
      case 'west': baseAngle = 270; break;
      default: baseAngle = 0;
    }
    
    // Apply the rotation to get the target angle
    const targetAngle = (baseAngle + rotation + 360) % 360;
    
    // Convert the target angle to a direction
    const targetDirection = degreesToDirection(targetAngle);
    
    console.log(`[ROTATION] Generation ${index + 1}/${amount}: ${rotation}° rotation from ${referenceDirection} -> ${targetDirection}`);
    
    // Create payload for the API
    const payload = {
      base64Image: base64Image,
      fromDirection: referenceDirection, // The reference direction
      toDirection: targetDirection,      // The calculated target direction
      fromView: 'low top-down',          // Always use low top-down for source
      toView: 'low top-down',            // Always use low top-down for target
      apiKey: Settings.pixelLabApiKey,
      lockPaletteColors: Settings.lockPaletteColors,
      imageGuidanceScale: 3.0            // Default guidance scale
    };
    
    // Add to generation queue
    generationManager.addRotationGenerationToQueue(skeletonId, payload)
      .then(data => {
        console.log(`[ROTATION] ✅ Generation ${index + 1}/${amount} completed: ${rotation}° rotation`);
      })
      .catch(error => {
        console.error(`[ROTATION] ❌ Generation ${index + 1}/${amount} failed: ${rotation}° rotation`, error);
        showToast(`Error generating image ${index + 1}/${amount}: ${error.message}`, 'red', 3000);
      });
  });
  
  // Show confirmation
  showToast(`Added ${amount} rotation-based generations to the queue`, 'green', 3000);
}

// Export the main function
export default showRotationGenerationDialog;