/**
 * Copyright (c) 2025 Jansen Tan
 * MIT License
 *
 * Contains code derived from Google's Multimodal Live API Web Console
 * Copyright 2025 Google LLC
 * Licensed under the Apache License, Version 2.0
 */

class ObservableSet extends Set {
  constructor(...args) {
    super(...args);
    this.listeners = [];
  }

  addEventListener(event, callback) {
    if (event === 'clear' || event === 'populate') {
      this.listeners.push(callback);
    }
  }

  triggerEvent(event) {
    if (event === 'clear' || event === 'populate') {
      this.listeners.forEach(listener => listener());
    }
  }

  add(value) {
    const wasEmpty = this.size === 0;
    super.add(value);
    if (wasEmpty && this.size > 0) {
      this.triggerEvent('populate');
    }
    return this;
  }

  delete(value) {
    const wasNotEmpty = this.size > 0;
    const result = super.delete(value);
    if (wasNotEmpty && this.size === 0) {
      this.triggerEvent('clear');
    }
    return result;
  }

  clear() {
    const wasNotEmpty = this.size > 0;
    super.clear();
    if (wasNotEmpty) {
      this.triggerEvent('clear');
    }
  }
}

export class AudioStreamer {
  constructor(context) {
    this.context = context;
    this.audioQueue = [];
    this.isPlaying = false;
    this.sampleRate = 24000;
    this.bufferSize = 3840; // Reduced buffer size (approx 160ms chunk down to 80ms) for faster initial playback
    this.processingBuffer = new Float32Array(0);
    this.scheduledTime = 0;
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
    this.isStreamComplete = false;
    this.checkInterval = null;
    this.initialBufferTime = 0.08; // Reduced initial buffer latency from 300ms to 80ms
    this.activeSourceNodes = new ObservableSet();
    this.isPaused = false;
    this.volume = 1.0;

    this.activeSourceNodes.addEventListener('populate', () => {
      queueMicrotask(() => this.updatePlaybackState());
    });
    this.activeSourceNodes.addEventListener('clear', () => {
      setTimeout(() => this.updatePlaybackState(), 100);
    });
  }

  addPCM16(chunk) {
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer);

    for (let i = 0; i < chunk.length / 2; i++) {
      try {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 / 32768;
      } catch (e) {
        console.error(e);
      }
    }

    const newBuffer = new Float32Array(this.processingBuffer.length + float32Array.length);
    newBuffer.set(this.processingBuffer);
    newBuffer.set(float32Array, this.processingBuffer.length);
    this.processingBuffer = newBuffer;

    while (this.processingBuffer.length >= this.bufferSize) {
      const buffer = this.processingBuffer.slice(0, this.bufferSize);
      this.audioQueue.push(buffer);
      this.processingBuffer = this.processingBuffer.slice(this.bufferSize);
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.scheduledTime = this.context.currentTime + this.initialBufferTime;
      this.scheduleNextBuffer();
    }
  }

  createAudioBuffer(audioData) {
    const audioBuffer = this.context.createBuffer(1, audioData.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(audioData);
    return audioBuffer;
  }

  scheduleNextBuffer() {
    const SCHEDULE_AHEAD_TIME = 0.2;

    while (
      this.audioQueue.length > 0 &&
      this.scheduledTime < this.context.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const audioData = this.audioQueue.shift();
      const audioBuffer = this.createAudioBuffer(audioData);
      const source = this.context.createBufferSource();

      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const startTime = Math.max(this.scheduledTime, this.context.currentTime);
      source.start(startTime);

      this.activeSourceNodes.add(source);

      source.addEventListener('ended', () => {
        this.activeSourceNodes.delete(source);
      });

      this.scheduledTime = startTime + audioBuffer.duration;
    }

    if (this.audioQueue.length === 0 && this.processingBuffer.length === 0) {
      if (this.isStreamComplete) {
        this.isPlaying = false;
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
      } else {
        if (!this.checkInterval) {
          this.checkInterval = window.setInterval(() => {
            if (
              this.audioQueue.length > 0 ||
              this.processingBuffer.length >= this.bufferSize
            ) {
              this.scheduleNextBuffer();
            }
          }, 30);
        }
      }
    } else {
      const nextCheckTime = (this.scheduledTime - this.context.currentTime) * 1000;
      setTimeout(
        () => this.scheduleNextBuffer(),
        Math.max(0, nextCheckTime - 50)
      );
    }
  }

  stop() {
    this.isPlaying = false;
    this.isStreamComplete = true;
    this.audioQueue.length = 0;
    this.processingBuffer = new Float32Array(0);
    this.scheduledTime = this.context.currentTime;

    // Stop all active source nodes
    this.activeSourceNodes.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if source has already stopped
      }
    });
    this.activeSourceNodes.clear();

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.gainNode.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + 0.1,
    );

    setTimeout(() => {
      this.gainNode.disconnect();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
    }, 200);
  }

  async resume() {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.isStreamComplete = false;
    this.scheduledTime = this.context.currentTime + this.initialBufferTime;
    this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
    this.updatePlaybackState();
  }

  resumePlayback() {
    if (this.isPaused) {
      this.context.resume();
      this.isPaused = false;
      this.scheduleNextBuffer();
      this.updatePlaybackState();
    }
  }

  pausePlayback() {
    if (this.isPlaying && !this.isPaused) {
      this.context.suspend();
      this.isPaused = true;
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      this.updatePlaybackState();
    }
  }

  complete() {
    this.isStreamComplete = true;
    if (this.processingBuffer.length > 0) {
      this.audioQueue.push(this.processingBuffer);
      this.processingBuffer = new Float32Array(0);
      if (this.isPlaying) {
        this.scheduleNextBuffer();
      }
    }
  }

  // `setVolume`/`getVolume` uses ideas from
  // https://www.dr-lex.be/info-stuff/volumecontrols.html
  // and https://www.robotplanet.dk/audio/audio_gui_design/
  setVolume(nominalVolume) {
    // nominalVolume should be in range [0, 1]
    let clampedValue = Math.max(0, Math.min(1, nominalVolume));
    this.volume = clampedValue**3;
    this.gainNode.gain.setValueAtTime(this.volume, this.context.currentTime);
  }

  getVolume() {
    let nominalVolume = this.volume**(1/3);
    return nominalVolume;
  }

  // sometimes the volume gets reset to 100% on new transcriptions
  // not sure why this happens, but `refreshVolume` is for when that happens
  refreshVolume() {
    this.gainNode.gain.setValueAtTime(this.volume, this.context.currentTime);
  }

  getPlaybackState() {
    if (!this.activeSourceNodes.size) {
      return { playbackState: "stopped" };
    }

    if (this.isPaused) {
      return { playbackState: "paused" };
    }

    if (this.activeSourceNodes.size > 0) {
      return { playbackState: "playing" };
    }

    return { playbackState: null };
  }

  updatePlaybackState() {
    const state = this.getPlaybackState();
    chrome.runtime.sendMessage({ action: "updatePlaybackState", ...state });
  }
}
