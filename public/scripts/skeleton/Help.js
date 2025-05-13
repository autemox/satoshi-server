// Help.js
let helpPanel = null;
let helpOpen = false;

/**
 * Opens the help panel
 */
export function openHelp() {
  console.log('[HELP] Opening help panel');

  if (helpOpen) {
    console.log('[HELP] Help panel already open');
    return;
  }

  helpPanel = document.createElement('div');
  helpPanel.id = 'help-panel';
  helpPanel.style.position = 'fixed';
  helpPanel.style.top = '0';
  helpPanel.style.left = '0';
  helpPanel.style.width = '100%';
  helpPanel.style.height = '100%';
  helpPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  helpPanel.style.display = 'flex';
  helpPanel.style.justifyContent = 'center';
  helpPanel.style.alignItems = 'center';
  helpPanel.style.zIndex = '10000';

  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = '#2a2a2a';
  modalContent.style.border = '1px solid #888';
  modalContent.style.borderRadius = '5px';
  modalContent.style.padding = '20px';
  modalContent.style.width = '700px';
  modalContent.style.maxHeight = '85vh';
  modalContent.style.overflowY = 'auto';
  modalContent.style.color = 'white';
  modalContent.style.fontFamily = 'sans-serif';
  modalContent.style.fontSize = '14px';
  modalContent.style.lineHeight = '1.5';

  const title = document.createElement('h2');
  title.textContent = '🌐 Help';
  title.style.marginTop = '0';
  title.style.borderBottom = '1px solid #888';
  title.style.paddingBottom = '10px';
  modalContent.appendChild(title);

  const helpText = `
<h3>Introduction</h3>
<p>
  Lysle.net Skeleton Tool is a spritesheet editor and generator that uses PixelLab AI Generations to create consistent character frames based on editable skeleton poses.
  It supports multi-directional animation and gives you full control over frame composition and pose structure.
</p>

<hr/>

<h3>Key Features</h3>
<ul>
  <li>AI-powered sprite generation based on skeletons</li>
  <li>Editable skeleton joints with drag-and-drop control</li>
  <li>Supports north, east, south, west directions</li>
  <li>Clipboard tools for copying skeletons or image layers</li>
  <li>Spritesheet export and project save/load</li>
</ul>

<hr/>

<h3>Getting Started</h3>
<ol>
  <li>
    <strong>Get your API key</strong> from PixelLab at
    <a href="https://www.pixellab.ai/pixellab-api" target="_blank">pixellab.ai/pixellab-api</a>
  </li>
  <li>
    <strong>Open Settings</strong> and paste your API key into the PixelLab API Key field
  </li>
  <li>
    <strong>Paste a reference image</strong> into one or more frames by clicking the ☰ menu and selecting "Upload Image"
  </li>
  <li>
    <strong>Generate sprites</strong> by selecting frames and using the ☰ menu or the lightning icon to start generation
  </li>
</ol>

<hr/>

<h3>Getting Around</h3>
<ul>
  <li><strong>Hold left click the grey background</strong> to pan the view</li>
  <li><strong>Scroll wheel</strong> to zoom in/out toward and away from your mouse cursor</li>
  <li><strong>Click a frame</strong> to select it, hold SHIFT to select multiple frames of the same direction</li>
  <li><strong>Click a joint</strong> to select it, hold SHIFT to select multiple joints</li>
  <li><strong>Note the frame's menu button</strong> appears only when you have a frame selected</li>
</ul>

<hr/>

<h3>Tools Overview</h3>
<p>The right toolbar switches between tools, modes, and opens the animation window:</p>
<ul>
  <li><strong>✎ Drawing Tool ("D")</strong>: Draw with Brush (hotkey B), Eraser (hotkey E), or Eyedropper (hotkey I)</li>
  <li><strong>⊹ Skeleton Point Selection Tool ("S")</strong>: Move and edit skeleton joints</li>
  <li><strong>🀥 Image Clipboard Mode</strong>: CTRL/CMD+C and CTRL/CMD+V copy/paste the frame's image layer</li>
  <li><strong>𐀪 Skeleton Clipboard Mode</strong>: CTRL/CMD+C and CTRL/CMD+V copy/paste the skeleton pose (joints only)</li>
  <li><strong>▷ Animation Window</strong>: Preview animations.  Select your frames with SHIFT + Left Click BEFORE pressing this.</li>
</ul>U

<hr/>

<h3>Image Generation from Skeleton</h3>
<ul>
  <li>Click the lightning icon or frame's ☰ menu and "Generate Image from Skeleton" to start generation</li>
  <li>Ensure the direction you want to generate in has at least one reference image</li>
  <li>Make sure your reference image has skeleton points in the correct positions: Ears, Eyes, Nose, Neck, Shoulders, Elbows, Hands, Hips, Knees, and Feet. </li>
  <li>Set up skeletons for the frames you wish to generate from<li>
  <li>Select one or more frames you wish to generate using SHIFT + Click</li>
  <li>Click the lightning icon or frame's ☰ menu to start generation</li>
</ul>

<h3>Image Generation from Rotation</h3>
<ul>
  <li>Use a frame’s ☰ menu and select “Generate Image from Rotation”</li>
  <li>This mirrors or rotates skeleton/image data across directions</li>
  <li>Useful for creating east/west from south references automatically</li>
</ul>

<h3>Skeleton Generation from Image</h3>
<ul>
  <li>Use a frame’s ☰ menu and select “Generate Skeleton from Image”</li>
  <li>This will quickly override your current skeleton without your approval</li>
  <li>Useful for deriving skeletons from images, loads quickly, and does not typically require multiple generations to get right</li>
</ul>

<hr/>

<h3>Working with Frames</h3>
<ul>
  <li>Each row represents a direction: North, East, South, West</li>
  <li>Click the ☰ icon to access options for any frame:</li>
  <ul>
    <li>Upload/download skeleton or image</li>
    <li>Mirror from the opposite direction</li>
    <li>Generate from rotation</li>
  </ul>
  <li>Hold SHIFT to select multiple joints or frames</li>
  <li>Drag selected joints to move them together</li>
</ul>

<hr/>

<h3>Project Management</h3>
<ul>
  <li><strong>New</strong>: Start a blank project</li>
  <li><strong>Save</strong>: Download a <code>.lyslesheet</code> project file</li>
  <li><strong>Load</strong>: Load a saved project file</li>
  <li><strong>Samples</strong>: Load example projects from the developer</li>
  <li><strong>Export</strong>: Generate a <code>.png</code> spritesheet (64x64 per frame)</li>
  <li><strong>Import</strong>: Load a <code>.png</code> spritesheet in.  To load correctly, make sure its 64x64 per frame.  Keep it the same in appearance as an export</li>
  <li><strong>Undo</strong>: This button and CTRL+Z will undo.  Undo function is limited to Brush Strokes</li>
</ul>

<hr/>

<h3>Settings Overview</h3>
<ul>
  <li><strong>Project Name</strong>: Used for file exports</li>
  <li><strong>Pixellab API Key</strong>: Required to generate images</li>
  <li><strong>Manual Reference Selection</strong>: Enables per-frame control over which images are used for generation</li>
  <li><strong>Batch Size</strong>: Number of frames to generate in parallel</li>
  <li><strong>Auto-Save</strong>: Save your project automatically at intervals</li>
  <li><strong>Lock Palette Colors</strong>: Ensures color consistency across generations</li>
</ul>

<hr/>

<h3>Keyboard Shortcuts</h3>
<ul>
  <li><strong>CTRL/CMD + C</strong>: Copy (image or skeleton based on clipboard mode)</li>
  <li><strong>CTRL/CMD + V</strong>: Paste (to selected frames)</li>
  <li><strong>ESC</strong>: Cancel current tool or close modals</li>
  <li><strong>SHIFT + Click</strong>: Multi-select frames or joints</li>
</ul>

<hr/>

<h3>File Types</h3>
<ul>
  <li><code>.lyslesheet</code>: Project file with skeletons, images, and metadata</li>
  <li><code>.png</code>: Exported spritesheet image</li>
</ul>

<hr/>

<h3>Support</h3>
<p>
  For help, updates, or to report a bug, visit <a href="https://lysle.net" target="_blank">www.lysle.net</a>
</p>
`;

  const content = document.createElement('div');
  content.innerHTML = helpText;
  modalContent.appendChild(content);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.marginTop = '20px';
  closeButton.style.padding = '8px 16px';
  closeButton.style.backgroundColor = '#444';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.addEventListener('click', closeHelp);
  modalContent.appendChild(closeButton);

  helpPanel.appendChild(modalContent);

  helpPanel.addEventListener('click', (e) => {
    if (e.target === helpPanel) {
      closeHelp();
    }
  });

  document.body.appendChild(helpPanel);
  document.addEventListener('keydown', handleHelpEscKey);
  helpOpen = true;
}

/**
 * Closes the help panel
 */
export function closeHelp() {
  if (!helpOpen || !helpPanel) return;
  document.body.removeChild(helpPanel);
  helpOpen = false;
  helpPanel = null;
  document.removeEventListener('keydown', handleHelpEscKey);
}

/**
 * ESC key handler for help panel
 */
function handleHelpEscKey(e) {
  if (e.key === 'Escape') {
    closeHelp();
  }
}