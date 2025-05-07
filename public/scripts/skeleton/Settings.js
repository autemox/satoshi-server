// Settings.js
import { ViewState } from './ViewState.js';
import { showToast } from './utils.js';
import { saveLysleSheet, saveProjectToStorage } from './LysleSheetManager.js';
import { resetCanvasZoomAndOffset } from './Main.js';
import { openHelp } from './Help.js';

// Default settings
export const Settings = {
  pixelLabApiKey: '',
  manualReferenceSelection: false,
  batchGenerationSize: 1,
  lockPaletteColors: false, 
  clearImagesOnRefresh: false,
  autoSaveEnabled: true,
  autoSaveInterval: 60, // seconds
  projectName: 'Project'
};

let settingsOpen = false;
let settingsPanel = null;
let autoSaveTimer = null;
let apiKeyWarningShown = false;

  
  /**
   * Validates the PixelLab API key and shows warning if needed
   */
  export function validateApiKey() {
    if (!Settings.pixelLabApiKey || Settings.pixelLabApiKey.length < 5) {
      // Only show the warning once per session, not repeatedly
      if (!apiKeyWarningShown) {
        showToast('PixelLab API key is missing or invalid. Please enter a valid key in Settings.', 'red', 5000);
        apiKeyWarningShown = true;
        
        // Reset the flag after some time so the warning can appear again if needed
        setTimeout(() => {
          apiKeyWarningShown = false;
        }, 60000); // Reset after 1 minute
      }
      return false;
    }
    return true;
  }
  
/**
 * Saves settings from form inputs
 * @param {HTMLFormElement} form - The settings form
 */
async function saveSettings(form) {
  const previousApiKey = Settings.pixelLabApiKey;
  const newApiKey = form.pixelLabApiKey.value.trim();
  const apiKeyChanged = previousApiKey !== newApiKey;
  
  const previousProjectName = Settings.projectName;
  
  // Get form values
  Settings.projectName = form.projectName.value.trim() || 'Project'; // Default if empty
  Settings.pixelLabApiKey = newApiKey;
  Settings.manualReferenceSelection = form.manualReferenceSelection.checked;
  Settings.batchGenerationSize = parseInt(form.batchGenerationSize.value) || 1;
  Settings.lockPaletteColors = form.lockPaletteColors.checked;
  Settings.clearImagesOnRefresh = form.clearImagesOnRefresh.checked;
  Settings.autoSaveEnabled = form.autoSaveEnabled.checked;
  Settings.autoSaveInterval = parseInt(form.autoSaveInterval.value) || 60;
  
  
  // Save to cookies
  saveSettingsToCookies();
  
  // Update auto-save timer if needed
  updateAutoSaveTimer();
  
  // Also save the current project state to ensure settings are saved with project
  if (Settings.autoSaveEnabled) {
    saveProjectToStorage(true);
  }
  
  // Close settings panel first
  closeSettings();
  
  // Check API key
  if (!validateApiKey()) {
    showToast('Settings saved, but PixelLab API key is missing or invalid.', 'orange', 3000);
  } else {
    showToast('Settings saved successfully', 'green');
    
    // If API key is valid and changed, check balance
    if (apiKeyChanged) {
      // Use setTimeout to allow the UI to update before showing another toast
      setTimeout(() => {
        checkPixelLabBalance();
      }, 1000);
    }
  }
  
  console.log('[SETTINGS] Saved settings:', Settings);
}

/**
 * Opens the settings panel
 */
export function openSettings() {
  console.log('[SETTINGS] Opening settings panel');
  
  if (settingsOpen) {
    console.log('[SETTINGS] Settings panel already open');
    return;
  }
  
  // Create the settings panel
  settingsPanel = document.createElement('div');
  settingsPanel.id = 'settings-panel';
  settingsPanel.style.position = 'fixed';
  settingsPanel.style.top = '0';
  settingsPanel.style.left = '0';
  settingsPanel.style.width = '100%';
  settingsPanel.style.height = '100%';
  settingsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  settingsPanel.style.display = 'flex';
  settingsPanel.style.justifyContent = 'center';
  settingsPanel.style.alignItems = 'center';
  settingsPanel.style.zIndex = '10000';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = '#2a2a2a';
  modalContent.style.border = '1px solid #888';
  modalContent.style.borderRadius = '5px';
  modalContent.style.padding = '20px';
  modalContent.style.width = '500px'; // Slightly wider
  modalContent.style.maxHeight = '80vh';
  modalContent.style.overflowY = 'auto';
  modalContent.style.color = 'white';
  modalContent.style.fontFamily = 'sans-serif';
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Settings';
  title.style.margin = '0 0 20px 0';
  title.style.borderBottom = '1px solid #888';
  title.style.paddingBottom = '10px';
  modalContent.appendChild(title);
  
  // Create form
  const form = document.createElement('form');
  form.onsubmit = (e) => e.preventDefault();
  
  // Create tabbed interface
  const tabContainer = document.createElement('div');
  tabContainer.style.display = 'flex';
  tabContainer.style.marginBottom = '20px';
  tabContainer.style.borderBottom = '1px solid #444';
  
  const tabs = [
    { id: 'project', label: 'Project', icon: '📁' },
    { id: 'generation', label: 'Generation', icon: '⚡' },
    { id: 'autosave', label: 'Auto-Save', icon: '💾' }
  ];
  
  const tabContents = {};
  tabs.forEach(tab => {
    // Create tab button
    const tabButton = document.createElement('button');
    tabButton.id = `tab-${tab.id}`;
    tabButton.textContent = `${tab.icon} ${tab.label}`;
    tabButton.style.backgroundColor = 'transparent';
    tabButton.style.border = 'none';
    tabButton.style.borderBottom = '3px solid transparent';
    tabButton.style.color = 'white';
    tabButton.style.padding = '10px 15px';
    tabButton.style.cursor = 'pointer';
    tabButton.style.fontSize = '14px';
    tabButton.style.fontWeight = 'bold';
    tabButton.dataset.tab = tab.id;
    
    // Add to container
    tabContainer.appendChild(tabButton);
    
    // Create tab content div
    const tabContent = document.createElement('div');
    tabContent.id = `content-${tab.id}`;
    tabContent.style.display = 'none';
    tabContent.style.flexDirection = 'column';
    tabContent.style.gap = '15px';
    tabContent.style.padding = '15px 0';
    
    // Store for later
    tabContents[tab.id] = tabContent;
    form.appendChild(tabContent);
  });
  
  // Add tab switching logic
  const switchTab = (tabId) => {
    // Hide all tabs, show selected
    tabs.forEach(tab => {
      const tabButton = document.getElementById(`tab-${tab.id}`);
      const tabContent = document.getElementById(`content-${tab.id}`);
      
      if (tab.id === tabId) {
        tabButton.style.borderBottom = '3px solid #3399ff';
        tabButton.style.backgroundColor = '#333';
        tabContent.style.display = 'flex';
      } else {
        tabButton.style.borderBottom = '3px solid transparent';
        tabButton.style.backgroundColor = 'transparent';
        tabContent.style.display = 'none';
      }
    });
  };
  
  // Add click handlers to tab buttons
  tabContainer.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });
  
  // Add tabs to modal
  modalContent.appendChild(tabContainer);
  
  // Add form after tabs
  modalContent.appendChild(form);
  
  // === PROJECT TAB ===
  const projectTab = tabContents['project'];
  
  // Project Name
  const projectNameGroup = createFormGroup(
    'Project Name',
    'Name used for saving files and spritesheet exports',
    'text',
    'projectName',
    Settings.projectName,
    true // Full width
  );
  projectTab.appendChild(projectNameGroup);
  
  // Clear Images on Refresh
  const clearImagesGroup = createCheckboxGroup(
    'Clear Images on Refresh',
    'Clear all images when the page is refreshed',
    'clearImagesOnRefresh',
    Settings.clearImagesOnRefresh
  );
  projectTab.appendChild(clearImagesGroup);
  
  // === GENERATION TAB ===
  const generationTab = tabContents['generation'];
  
  // PixelLab API Key
  const apiKeyGroup = createFormGroup(
    'PixelLab API Key',
    'Enter your PixelLab API key for image generation',
    'text',
    'pixelLabApiKey',
    Settings.pixelLabApiKey,
    true // Full width
  );
  generationTab.appendChild(apiKeyGroup);
  
  // Two-column layout for generation settings
  const genSettingsRow = document.createElement('div');
  genSettingsRow.style.display = 'grid';
  genSettingsRow.style.gridTemplateColumns = '1fr 1fr';
  genSettingsRow.style.gap = '15px';
  generationTab.appendChild(genSettingsRow);
  
  // Manual Reference Selection
  const manualRefGroup = createCheckboxGroup(
    'Manual Reference Selection',
    'Manually select reference images for each generation',
    'manualReferenceSelection',
    Settings.manualReferenceSelection
  );
  generationTab.appendChild(manualRefGroup);

  // Lock Palette Colors
  const lockPaletteGroup = createCheckboxGroup(
    'Lock Palette Colors',
    'Force generations to use the same color palette as the reference images',
    'lockPaletteColors',
    Settings.lockPaletteColors
  );
  generationTab.appendChild(lockPaletteGroup);

  // Batch Generation Size
  const batchSizeGroup = createFormGroup(
    'Batch Size',
    'Number of generations to start at a time',
    'number',
    'batchGenerationSize',
    Settings.batchGenerationSize.toString(),
    true // Now full width
  );
  // Add min/max attributes to number input
  const batchSizeInput = batchSizeGroup.querySelector('input');
  batchSizeInput.min = '1';
  batchSizeInput.max = '10';
  generationTab.appendChild(batchSizeGroup);
  
  // === AUTO-SAVE TAB ===
  const autosaveTab = tabContents['autosave'];
  
  // Auto-save settings
  const autoSaveGroup = createCheckboxGroup(
    'Enable Auto-save',
    'Automatically save your project periodically',
    'autoSaveEnabled',
    Settings.autoSaveEnabled
  );
  autosaveTab.appendChild(autoSaveGroup);
  
  // Auto-save interval
  const autoSaveIntervalGroup = createFormGroup(
    'Auto-save Interval',
    'How often to automatically save your project (in seconds)',
    'number',
    'autoSaveInterval',
    Settings.autoSaveInterval.toString(),
    true // Full width
  );
  // Add min/max attributes to number input
  const autoSaveIntervalInput = autoSaveIntervalGroup.querySelector('input');
  autoSaveIntervalInput.min = '10';
  autoSaveIntervalInput.max = '600';
  autosaveTab.appendChild(autoSaveIntervalGroup);
  
  // Storage info
  const storageInfo = document.createElement('div');
  storageInfo.style.backgroundColor = '#333';
  storageInfo.style.padding = '10px';
  storageInfo.style.borderRadius = '4px';
  storageInfo.style.marginTop = '10px';
  storageInfo.style.fontSize = '13px';
  
  // Check if browser storage is available
  try {
    const testKey = 'test_storage';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    storageInfo.innerHTML = `
      <div style="margin-bottom: 5px; font-weight: bold;">Storage Information</div>
      <div>Browser storage is available for auto-saving your project.</div>
      <div style="margin-top: 5px; color: #aaa;">Your project will be automatically restored when you reload the page.</div>
    `;
  } catch (e) {
    storageInfo.innerHTML = `
      <div style="margin-bottom: 5px; font-weight: bold; color: orange;">Storage Warning</div>
      <div>Browser storage is not available. Auto-save will not work.</div>
      <div style="margin-top: 5px; color: #aaa;">Please use the Save button to download your project regularly.</div>
    `;
  }
  
  autosaveTab.appendChild(storageInfo);
  
  // Add button container at the bottom
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';
  buttonContainer.style.marginTop = '20px';
  buttonContainer.style.borderTop = '1px solid #444';
  buttonContainer.style.paddingTop = '15px';
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Settings';
  saveButton.style.padding = '8px 16px';
  saveButton.style.backgroundColor = '#4CAF50';
  saveButton.style.color = 'white';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '4px';
  saveButton.style.cursor = 'pointer';
  saveButton.addEventListener('click', () => {
    saveSettings(form);
  });
  buttonContainer.appendChild(saveButton);
  
  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.backgroundColor = '#444';
  cancelButton.style.color = 'white';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.cursor = 'pointer';
  cancelButton.addEventListener('click', closeSettings);
  buttonContainer.appendChild(cancelButton);
  
  modalContent.appendChild(buttonContainer);
  
  // Add panel to document
  settingsPanel.appendChild(modalContent);
  
  // Add click outside to close
  settingsPanel.addEventListener('click', (e) => {
    if (e.target === settingsPanel) {
      closeSettings();
    }
  });
  
  // Add to document
  document.body.appendChild(settingsPanel);
  settingsOpen = true;
  
  // Add ESC key to close
  document.addEventListener('keydown', handleEscKey);
  
  // Show first tab by default
  switchTab('project');
}

/**
 * Creates a form group with label, input and help text
 * @param {string} label - The label text
 * @param {string} helpText - The help text
 * @param {string} type - The input type
 * @param {string} name - The input name
 * @param {string} value - The input value
 * @param {boolean} fullWidth - Whether the element should take full width
 * @returns {HTMLDivElement} - The form group
 */
function createFormGroup(label, helpText, type, name, value, fullWidth = false) {
  const group = document.createElement('div');
  group.style.marginBottom = fullWidth ? '15px' : '10px';
  
  const labelEl = document.createElement('label');
  labelEl.htmlFor = name;
  labelEl.textContent = label;
  labelEl.style.display = 'block';
  labelEl.style.marginBottom = '5px';
  labelEl.style.fontWeight = 'bold';
  group.appendChild(labelEl);
  
  const help = document.createElement('div');
  help.textContent = helpText;
  help.style.fontSize = '12px';
  help.style.color = '#aaa';
  help.style.marginBottom = '5px';
  group.appendChild(help);
  
  const input = document.createElement('input');
  input.type = type;
  input.id = name;
  input.name = name;
  input.value = value;
  input.style.width = '100%';
  input.style.padding = '8px';
  input.style.boxSizing = 'border-box';
  input.style.backgroundColor = '#333';
  input.style.color = 'white';
  input.style.border = '1px solid #555';
  input.style.borderRadius = '4px';
  
  // Add event listeners to prevent backspace navigation
  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to document
  });
  
  group.appendChild(input);
  
  return group;
}

/**
 * Creates a checkbox group with label and help text
 * @param {string} label - The label text
 * @param {string} helpText - The help text
 * @param {string} name - The checkbox name
 * @param {boolean} checked - The checked state
 * @returns {HTMLDivElement} - The checkbox group
 */
function createCheckboxGroup(label, helpText, name, checked) {
  const group = document.createElement('div');
  group.style.marginBottom = '10px';
  
  const checkboxWrapper = document.createElement('div');
  checkboxWrapper.style.display = 'flex';
  checkboxWrapper.style.alignItems = 'center';
  checkboxWrapper.style.marginBottom = '5px';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = name;
  checkbox.name = name;
  checkbox.checked = checked;
  checkbox.style.marginRight = '10px';
  checkbox.addEventListener('keydown', (e) => {
    e.stopPropagation();
  });
  checkboxWrapper.appendChild(checkbox);
  
  const labelEl = document.createElement('label');
  labelEl.htmlFor = name;
  labelEl.textContent = label;
  labelEl.style.fontWeight = 'bold';
  checkboxWrapper.appendChild(labelEl);
  
  group.appendChild(checkboxWrapper);
  
  const help = document.createElement('div');
  help.textContent = helpText;
  help.style.fontSize = '12px';
  help.style.color = '#aaa';
  help.style.marginLeft = '25px';
  group.appendChild(help);
  
  return group;
}

/**
 * Closes the settings panel
 */
export function closeSettings() {
  console.log('[SETTINGS] Closing settings panel');
  
  if (!settingsOpen || !settingsPanel) return;
  
  document.body.removeChild(settingsPanel);
  settingsOpen = false;
  settingsPanel = null;
  
  // Remove ESC key listener
  document.removeEventListener('keydown', handleEscKey);

  resetCanvasZoomAndOffset();
}

/**
 * Handle ESC key to close settings
 * @param {KeyboardEvent} e 
 */
function handleEscKey(e) {
  if (e.key === 'Escape') {
    closeSettings();
  }
}

/**
 * Saves settings to cookies
 */
function saveSettingsToCookies() {
  const settingsJson = JSON.stringify(Settings);
  document.cookie = `skeletonToolSettings=${encodeURIComponent(settingsJson)};max-age=31536000;path=/`;
  console.log('[SETTINGS] Saved settings to cookies');
}

/**
 * Loads settings from cookies
 */
function loadSettingsFromCookies() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'skeletonToolSettings') {
      try {
        const loadedSettings = JSON.parse(decodeURIComponent(value));
        // Update settings with loaded values
        Object.assign(Settings, loadedSettings);
        console.log('[SETTINGS] Loaded settings from cookies:', Settings);
      } catch (err) {
        console.error('[SETTINGS] Failed to parse settings from cookies:', err);
      }
      break;
    }
  }
}

/**
 * Updates the auto-save timer based on current settings
 */
function updateAutoSaveTimer() {
  // Clear existing timer if any
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
  
  // If auto-save is enabled, set up a new timer
  if (Settings.autoSaveEnabled) {
    const intervalMs = Settings.autoSaveInterval * 1000;
    console.log(`[SETTINGS] Setting up auto-save every ${Settings.autoSaveInterval} seconds`);
    
    autoSaveTimer = setInterval(() => {
      console.log('[AUTO-SAVE] Performing auto-save...');
      saveLysleSheet(true); // true indicates this is an auto-save
    }, intervalMs);
  }
}

// Initialize settings and auto-save
export function initSettings() {
    console.log('[SETTINGS] Initializing settings');
    
    // Load settings from cookies
    loadSettingsFromCookies();
    
    // Validate API key and show warning if needed
    const isValid = validateApiKey();
    
    // Check balance if API key is valid
    if (isValid && Settings.pixelLabApiKey) {
      // Use setTimeout to ensure the app UI is loaded first
      setTimeout(() => {
        checkPixelLabBalance();
      }, 1000);
    }
    
    // Set up auto-save timer if enabled
    updateAutoSaveTimer();
    
    // Set up settings button listener
    const settingsButton = document.querySelector('[data-button="settings"]');
    if (settingsButton) {
      settingsButton.addEventListener('click', openSettings);
    } else {
      console.warn('[SETTINGS] Settings button not found');
    }

    // Set up settings button listener
    const helpButton = document.querySelector('[data-button="help"]');
    if (helpButton) {
      helpButton.addEventListener('click', openHelp);
    } else {
      console.warn('[SETTINGS] Settings button not found');
    }
  }

// Add this new function for checking the API balance
/**
 * Checks the current balance for the PixelLab API account
 * @returns {Promise<number|null>} Balance in USD or null if error
 */
export async function checkPixelLabBalance() {
  console.log('[SETTINGS] Checking PixelLab API balance');
  
  if (!Settings.pixelLabApiKey || Settings.pixelLabApiKey.length < 5) {
    showToast('API Key missing or invalid. Please enter a valid key in Settings.', 'red', 3000);
    return null;
  }
  
  try {
    const response = await fetch('https://api.pixellab.ai/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Settings.pixelLabApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        showToast('Invalid API token. Please check your PixelLab API key.', 'red', 3000);
        return null;
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[SETTINGS] Balance check response:', data);
    
    if (data && typeof data.usd === 'number') {
      showToast(`PixelLab balance: $${data.usd.toFixed(2)} USD`, 'green', 3000);
      return data.usd;
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    console.error('[SETTINGS] Error checking balance:', error);
    showToast(`Failed to check balance: ${error.message}`, 'red', 3000);
    return null;
  }
}

