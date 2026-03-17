/**
 * Copyright (c) 2025 Jansen Tan
 * MIT License
 */
import { defaultSystemPrompt } from "./defaultPrompt.js";
import { AudioStreamer } from "./audioStreamer.js";
import { CustomError, APIKeyError, WebSocketError } from "./errors.js";

let apiKey = '';
let selectedVoice = 'aoede'; // Default voice
let systemPrompt = '';
let currentVolume = 1.0; // Default volume, will be updated from storage

// Helper function to ensure API key is loaded before use
async function waitForAPIKey(maxRetries = 5, delayMs = 100) {
  for (let i = 0; i < maxRetries; i++) {
    if (apiKey) {
      return apiKey;
    }
    // Wait before trying again
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new APIKeyError('API key not loaded. Please check extension settings.');
}

async function notifyError(error) {
  console.error(error);
  let message = '';
  if (error.name == 'APIKeyError') {
    message = `API Key Error: ${error.message}. Please check your API key in the extension settings.`;
  } else if (error.name == 'WebSocketError') {
    message = `Connection Error: ${error.message}.`;
  } else {
    message = `Error: ${error.message}`;
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon-32.png'),
    title: 'Gemini Live TTS Error',
    message: message
  });
}

// Validate API key format
function validateAPIKey(key) {
  if (!key) {
    throw new APIKeyError('API key is missing');
  }
  if (typeof key !== 'string' || !key.startsWith('AIza') || !(key.length > 30)) {
    throw new APIKeyError('Invalid API key format');
  }
}

// Load API key and other settings when extension starts
chrome.storage.sync.get(['apiKey', 'voice', 'systemPrompt', 'volume'], (items) => {
  try {
    if (items.apiKey) validateAPIKey(items.apiKey);
    apiKey = items.apiKey || '';
    selectedVoice = items.voice || 'aoede';
    systemPrompt = items.systemPrompt || defaultSystemPrompt;
    currentVolume = items.volume !== undefined ? items.volume : 1.0;
  } catch (error) {
    console.error('Settings loading error:', error);
    notifyError(error);
  }
});

// Listen for API key and other setting changes
chrome.storage.onChanged.addListener((changes) => {
  try {
    if (changes.apiKey) {
      validateAPIKey(changes.apiKey.newValue);
      apiKey = changes.apiKey.newValue;
    }
    if (changes.voice) selectedVoice = changes.voice.newValue;
    if (changes.systemPrompt) systemPrompt = changes.systemPrompt.newValue;
    if (changes.volume) currentVolume = changes.volume.newValue;
  } catch (error) {
    console.error('Settings change error:', error);
    notifyError(error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case "captureScreenshot":
          await handleScreenshotCapture(request.area);
          break;
        case "updatePlaybackState":
          updateActionButton(request.playbackState);
          break;
        case "notifyError":
          let error = new Error(request.message);
          error.name = request.name;
          error.stack = request.stack;
          notifyError(error);
          break;
        case "requestSaveVolume":
          if (request.volume !== undefined) {
            currentVolume = request.volume;
            chrome.storage.sync.set({ volume: currentVolume }, () => {
              if (chrome.runtime.lastError) {
                console.error(`Error saving volume: ${chrome.runtime.lastError.message}`);
              }
            });
          }
          break;
        case "getInitialVolume":
          sendResponse({ volume: currentVolume });
          return;
      }
    } catch (error) {
      console.error(`Error handling ${request.action}:`, error);
      notifyError(error);
      sendResponse({ error: error.message });
    }
  })();
  return true; // Keep message channel open for async response
});

async function checkOffscreenDocumentExists() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });
  return contexts.length > 0;
async function transcribeMessages(...messages) {
  try {
    const key = await waitForAPIKey();  // Wait for API key to load
    validateAPIKey(key);  // Validate it
	  
    if (!(await checkOffscreenDocumentExists())) {
      // Create the offscreen document
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Audio streaming'
      });
      
      // WAIT for initialization to complete
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Audio initialization timeout')), 5000);
        
        chrome.runtime.sendMessage({ action: 'initializeAudio' }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      // Small additional safety delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Now send the transcription message
    chrome.runtime.sendMessage({ 
      action: 'transcribeMessages', 
      apiKey: key,  // ← CHANGED: Use the loaded key instead of apiKey
      selectedVoice: selectedVoice, 
      systemPrompt: systemPrompt, 
      messages: messages 
    });
  } catch (error) {
    notifyError(error);
    throw error;
  }
}
async function handleScreenshotCapture(area) {
  try {
    const key = await waitForAPIKey();  // Wait for API key to load
    
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        notifyError(new Error(`Screenshot capture failed: ${chrome.runtime.lastError.message}`));
        return;
      }
      chrome.runtime.sendMessage({ 
        action: 'cropScreenshotAndTranscribe', 
        apiKey: key,  // ← Changed from apiKey to key
        selectedVoice: selectedVoice, 
        systemPrompt: systemPrompt, 
        dataUrl: dataUrl, 
        area: area 
      });
    });
  } catch (error) {
    notifyError(error);
    throw error;
  }
}

chrome.contextMenus.create({
  id: "transcribe-text",
  title: "Transcribe with Gemini",
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "transcribe-text") {
    const selectedText = info.selectionText;
    const textMessage = {
      client_content: {
        turns: [
          {
            parts: [{ text: selectedText }],
            role: "user"
          }
        ],
        turn_complete: true
      }
    };
    transcribeMessages(textMessage);
	  chrome.action.openPopup();
  }
});

function updateActionButton(playbackState) {
  if (playbackState === "stopped" || playbackState === null) {
    // Set up for screenshot capture mode
    chrome.action.setPopup({ popup: "" }); // Remove popup
    chrome.action.setTitle({ title: "Take screenshot to send to Gemini" });
    chrome.action.setIcon({ path: "page_action-32.png" });
  } else {
    // Set up for playback control mode
    chrome.action.setPopup({ popup: "popup.html" });
    chrome.action.setTitle({ title: "Gemini TTS Controls" });
    chrome.action.setIcon({ path: "icon-32.png" });
  }
}
// For when the user clicks the action icon
chrome.action.onClicked.addListener(async (tab) => {
  // Check if offscreen exists, create if needed
  if (!(await checkOffscreenDocumentExists())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Audio streaming'
    });
    
    // WAIT for initialization
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Initialization timeout')), 5000);
      chrome.runtime.sendMessage({ action: 'initializeAudio' }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const state = await chrome.runtime.sendMessage({ 'action': 'getPlaybackState' });
  if (state === "playing" || state === "paused") {
    // open popup
    chrome.action.openPopup();
    return;
  }
  
  // otherwise, take screenshot
  let currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let isFile = currentTab.url.startsWith("file://") || currentTab.title.endsWith(".pdf");
  if (!isFile) {
    // can do script injection
    console.log("INJECTING SCRIPT.");
    chrome.scripting.executeScript({files: ['screenshotSelection.js'], target: {tabId: tab.id}});
  } else {
    // cannot do script injection.
    // just take a screenshot of the whole tab and hope for the best.
    console.log("CAN'T INJECT SCRIPT.");
    let area = {
      left: 0,
      top: 0,
      width: currentTab.width,
      height: currentTab.height
    };
    handleScreenshotCapture(area);
  }
});

chrome.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  //if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
        const url = chrome.runtime.getURL("onboarding.html");
        await chrome.tabs.create({ url });
      }
      break;
    case "update":
      {
        // nothing for now
      }
      break;
  }
});

