/**
 * Voice Activity Detection (VAD)
 * Detects when user starts and stops speaking
 * This is how professional assistants know when to listen vs when you're done talking
 */

export interface VADConfig {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onVolumeChange: (volume: number) => void;
}

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let rafId: number | null = null;
let isSpeaking = false;
let silenceStart = 0;
let speechStart = 0;

const VOLUME_THRESHOLD = 15; // Minimum volume to consider as speech
const SILENCE_DURATION = 1500; // 1.5 seconds of silence = user finished talking
const SPEECH_DURATION = 300; // 300ms of speech to confirm user is talking

/**
 * Initialize Voice Activity Detection
 */
export async function initVAD(config: VADConfig): Promise<void> {
  try {
    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });

    // Setup audio analysis
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    microphone.connect(analyser);

    console.log('✅ VAD initialized');

    // Start monitoring
    monitorAudio(config);

  } catch (error) {
    console.error('Failed to initialize VAD:', error);
    throw error;
  }
}

/**
 * Monitor audio levels and detect speech
 */
function monitorAudio(config: VADConfig): void {
  if (!analyser) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const checkAudio = () => {
    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    // Notify volume change for visualization
    config.onVolumeChange(average);

    const now = Date.now();

    // Check if volume is above threshold (user is speaking)
    if (average > VOLUME_THRESHOLD) {
      if (!isSpeaking) {
        // User might be starting to speak
        if (speechStart === 0) {
          speechStart = now;
        } else if (now - speechStart > SPEECH_DURATION) {
          // Confirmed: user is speaking
          isSpeaking = true;
          speechStart = 0;
          silenceStart = 0;
          console.log('🎤 Speech detected');
          config.onSpeechStart();
        }
      } else {
        // User is still speaking, reset silence timer
        silenceStart = 0;
      }
    } else {
      // Volume below threshold (silence)
      speechStart = 0;

      if (isSpeaking) {
        // User was speaking, now silent
        if (silenceStart === 0) {
          silenceStart = now;
        } else if (now - silenceStart > SILENCE_DURATION) {
          // Confirmed: user finished speaking
          isSpeaking = false;
          silenceStart = 0;
          console.log('🔇 Speech ended');
          config.onSpeechEnd();
        }
      }
    }

    rafId = requestAnimationFrame(checkAudio);
  };

  checkAudio();
}

/**
 * Stop VAD
 */
export function stopVAD(): void {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (microphone) {
    microphone.disconnect();
    microphone.mediaStream.getTracks().forEach(track => track.stop());
    microphone = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  analyser = null;
  isSpeaking = false;
  silenceStart = 0;
  speechStart = 0;

  console.log('🛑 VAD stopped');
}

/**
 * Check if currently detecting speech
 */
export function isCurrentlySpeaking(): boolean {
  return isSpeaking;
}
