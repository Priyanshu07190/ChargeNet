import { PorcupineWorker } from '@picovoice/porcupine-web';
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

// You'll need to get this from: https://console.picovoice.ai/
// Sign up for free, create a new access key
const PICOVOICE_ACCESS_KEY = import.meta.env.VITE_PICOVOICE_ACCESS_KEY || '';

let porcupineWorker: PorcupineWorker | null = null;
let webVoiceProcessor: WebVoiceProcessor | null = null;

export interface WakeWordCallback {
  onWakeWord: () => void;
  onError?: (error: Error) => void;
}

/**
 * Initialize Picovoice Porcupine for wake word detection
 * Uses built-in "Hey Google" model as a substitute for "Hey Gennie"
 */
export async function initializeWakeWordDetection(
  callback: WakeWordCallback
): Promise<void> {
  try {
    if (!PICOVOICE_ACCESS_KEY) {
      throw new Error('Picovoice access key not found. Please add VITE_PICOVOICE_ACCESS_KEY to your .env file');
    }

    console.log('🎯 Initializing Picovoice wake word detection...');

    // Create Porcupine worker with built-in keywords
    // Available built-in keywords: "alexa", "americano", "blueberry", "bumblebee", 
    // "computer", "grapefruit", "grasshopper", "hey google", "hey siri", 
    // "jarvis", "ok google", "picovoice", "porcupine", "terminator"
    porcupineWorker = await PorcupineWorker.create(
      PICOVOICE_ACCESS_KEY,
      [
        { builtin: 'hey google' }, // Using "hey google" as closest to "hey gennie"
        { builtin: 'computer' },   // Alternative wake word
        { builtin: 'jarvis' }      // Another alternative
      ],
      (keywordIndex: number) => {
        // Wake word detected!
        const keywords = ['Hey Google', 'Computer', 'Jarvis'];
        console.log(`✅ Wake word detected: ${keywords[keywordIndex]}`);
        callback.onWakeWord();
      },
      {
        processErrorCallback: (error: Error) => {
          console.error('❌ Porcupine error:', error);
          callback.onError?.(error);
        }
      }
    );

    console.log('✅ Porcupine worker created successfully');

  } catch (error) {
    console.error('Failed to initialize Porcupine:', error);
    throw error;
  }
}

/**
 * Start listening for wake word
 */
export async function startWakeWordDetection(): Promise<void> {
  try {
    if (!porcupineWorker) {
      throw new Error('Porcupine not initialized. Call initializeWakeWordDetection first.');
    }

    console.log('🎤 Starting wake word detection...');

    // Start the Web Voice Processor to capture audio
    webVoiceProcessor = await WebVoiceProcessor.init({
      engines: [porcupineWorker],
      start: true,
    });

    console.log('✅ Wake word detection started - listening for "Hey Google", "Computer", or "Jarvis"');
  } catch (error) {
    console.error('Failed to start wake word detection:', error);
    throw error;
  }
}

/**
 * Stop listening for wake word
 */
export async function stopWakeWordDetection(): Promise<void> {
  try {
    if (webVoiceProcessor) {
      await webVoiceProcessor.release();
      webVoiceProcessor = null;
      console.log('🛑 Wake word detection stopped');
    }
  } catch (error) {
    console.error('Failed to stop wake word detection:', error);
  }
}

/**
 * Pause wake word detection temporarily
 */
export async function pauseWakeWordDetection(): Promise<void> {
  try {
    if (webVoiceProcessor) {
      await webVoiceProcessor.pause();
      console.log('⏸️ Wake word detection paused');
    }
  } catch (error) {
    console.error('Failed to pause wake word detection:', error);
  }
}

/**
 * Resume wake word detection
 */
export async function resumeWakeWordDetection(): Promise<void> {
  try {
    if (webVoiceProcessor) {
      await webVoiceProcessor.resume();
      console.log('▶️ Wake word detection resumed');
    }
  } catch (error) {
    console.error('Failed to resume wake word detection:', error);
  }
}

/**
 * Cleanup and release resources
 */
export async function cleanupWakeWordDetection(): Promise<void> {
  try {
    await stopWakeWordDetection();
    
    if (porcupineWorker) {
      await porcupineWorker.release();
      porcupineWorker = null;
      console.log('🧹 Porcupine resources cleaned up');
    }
  } catch (error) {
    console.error('Failed to cleanup wake word detection:', error);
  }
}
