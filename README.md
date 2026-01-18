# Gemini Live Text-to-Speech Extension - WORKING FORK ✅

⭐ **This fork has been updated to work with the current Gemini API (January 2025)**

## What's Fixed in This Fork

- ✅ Updated to new Gemini API model (`gemini-2.5-flash-native-audio-preview-12-2025`)
- ✅ Fixed Manifest V3 compatibility issues
- ✅ Resolves "server error" problems from deprecated API endpoints

**Original repository:** [jansenmtan/gemini-live-tts-ext](https://github.com/jansenmtan/gemini-live-tts-ext)

---

## About

A browser extension that transcribes selected text to audio using Google Gemini Multimodal Live API.

## Features

- **Text transcription** - instantly convert selected text into natural-sounding speech
- **Image transcription** - listen to a description of any image!
- Customizable voices and settings
- Seamless integration with your browser

## Installation

⚠️ **Important:** The Chrome Web Store and Firefox Add-ons versions are currently outdated and may not work due to API changes. Please use the manual installation method below for the working version.

### Chrome/Edge/Brave - Manual Installation (Recommended)

1. Click the green **"Code"** button at the top of this page
2. Select **"Download ZIP"**
3. Unzip the downloaded file to a location on your computer
4. Open Chrome/Edge/Brave and go to `chrome://extensions/`
5. Enable **"Developer mode"** (toggle switch in the top right corner)
6. Click **"Load unpacked"**
7. Select the folder where you unzipped the extension
8. The extension icon should now appear in your toolbar!

### Firefox - Manual Installation

1. Click the green **"Code"** button at the top of this page
2. Select **"Download ZIP"**
3. Unzip the downloaded file to a location on your computer
4. Open Firefox and go to `about:debugging#/runtime/this-firefox`
5. Click **"Load Temporary Add-on..."**
6. Navigate to the unzipped folder and select the `manifest.json` file
7. The extension is now loaded!

Note: In Firefox, temporary add-ons are removed when you close the browser. You'll need to reload it each time.

## Setup

### Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API key"**
3. Copy the generated key

### Configure the Extension

1. Click the extension icon in your browser toolbar
2. Click the **settings/gear icon** (or right-click the extension icon and select "Options")
3. Paste your API key into the settings
4. Select your preferred voice
5. (Optional) Customize the system prompt
6. Click **"Save"**

**Important:** Keep your API key private and don't share it with others!

## Usage

### Text to Speech

1. Select any text on a webpage
2. Right-click on the selected text
3. Choose **"Transcribe with Gemini"** from the context menu
4. Listen as the text is read aloud!

### Image to Speech

1. Click the extension icon in your toolbar
2. Your cursor will change to a crosshair
3. Click and drag to select an area of the page containing an image
4. The extension will describe the image and read it aloud

### Playback Controls

- Click the extension icon in your toolbar to open the playback control popup
- Use the controls to play/pause, stop, or adjust volume
- Close the popup to stop playback

## Privacy

This extension sends selected text and screenshots to Google's Gemini API for processing. No data is stored by the extension itself beyond your settings (API key, voice preference, etc.). 

Please review [Google's Privacy Policy](https://policies.google.com/privacy) for information on how they handle your data.

## Contributing

Contributions are welcome! If you find bugs or have feature suggestions:

1. Open an [Issue](https://github.com/tomfalkenberg/gemini-live-tts-ext2.0/issues)
2. Submit a Pull Request with your improvements

## Troubleshooting

**Extension shows an error or doesn't work:**
- Make sure you've entered a valid API key in the settings
- Check that you have an active internet connection
- Try disabling and re-enabling the extension
- If issues persist, check the browser console for error messages

**No sound playing:**
- Check your system volume and browser sound settings
- Make sure the page you're on allows audio playback
- Try selecting a different voice in the extension settings

## License

[MIT License](LICENSE)

## Support the Original Developer

If you find this extension useful, consider supporting the original creator:
- [Ko-fi - Jansen Tan](https://ko-fi.com/jansentan)

## Credits

**Original Developer:** [Jansen Tan](https://github.com/jansenmtan)

**Fork & 2025 Update:** [Tom Falkenberg](https://github.com/tomfalkenberg)

---

**Last Updated:** January 2025

If this fixed version helped you, please ⭐ star this repository!
