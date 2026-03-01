/**
 * Custom Wake Word Detection Engine
 * Built on TensorFlow.js Speech Commands with Transfer Learning
 * 
 * How it works (same principle as Alexa/Google Home):
 * 1. Base model: Google's pre-trained speech recognition neural network
 * 2. Transfer learning: User records "Hi Gennie" a few times
 * 3. Small CNN layer is trained on top to recognize YOUR specific wake word
 * 4. Runs entirely in browser via WebAssembly - no cloud, no API keys
 * 5. Trained model persists in IndexedDB - train once, works forever
 */

import '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';
import { BUNDLED_MODEL_BASE64 } from './wakeWordConfig';

// --- helpers ---
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const TRANSFER_MODEL_NAME = 'gennie-wake-word';
const WAKE_WORD_LABEL = 'hi_gennie';
const BACKGROUND_LABEL = '_background_noise_';
const DB_NAME = 'gennie-wake-word-db';
const DB_STORE = 'model-data';
const DB_KEY = 'transfer-examples';

let baseRecognizer: speechCommands.SpeechCommandRecognizer | null = null;
let transferRecognizer: speechCommands.TransferSpeechCommandRecognizer | null = null;
let isListening = false;
let onWakeWordCallback: (() => void) | null = null;
let modelLoadPromise: Promise<void> | null = null;

// ============ IndexedDB Persistence ============

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveExamplesToDB(serialized: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(serialized, DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadExamplesFromDB(): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const request = tx.objectStore(DB_STORE).get(DB_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============ Engine Core ============

/**
 * Initialize the base speech recognition model
 * Downloads ~3MB model on first load, cached by browser after that
 */
export async function initBaseModel(): Promise<void> {
  if (modelLoadPromise) {
    await modelLoadPromise;
    return;
  }

  modelLoadPromise = (async () => {
    console.log('🧠 Loading TensorFlow.js + speech model...');
    
    // Import TF.js and wait for backend to be ready
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    console.log('✅ TensorFlow.js ready, backend:', tf.getBackend());
    
    baseRecognizer = speechCommands.create('BROWSER_FFT');
    await baseRecognizer.ensureModelLoaded();
    console.log('✅ Base speech model loaded');
  })();

  await modelLoadPromise;
}

/**
 * Check if a trained wake word model is available (IndexedDB or bundled)
 */
export async function hasTrainedModel(): Promise<boolean> {
  try {
    const data = await loadExamplesFromDB();
    if (data !== null) return true;
    return BUNDLED_MODEL_BASE64 !== null;
  } catch {
    return BUNDLED_MODEL_BASE64 !== null;
  }
}

/**
 * Create the transfer learning recognizer
 */
async function ensureTransferRecognizer(): Promise<speechCommands.TransferSpeechCommandRecognizer> {
  // Always await initBaseModel — it's idempotent via modelLoadPromise.
  // Do NOT check `if (!baseRecognizer)` because baseRecognizer is assigned
  // inside the promise BEFORE ensureModelLoaded() finishes, causing a race
  // where a second caller finds baseRecognizer non-null and calls createTransfer
  // on a model that hasn't finished loading yet.
  await initBaseModel();
  if (!transferRecognizer) {
    transferRecognizer = baseRecognizer!.createTransfer(TRANSFER_MODEL_NAME);
  }
  return transferRecognizer;
}

// ============ Training ============

export interface TrainingCallbacks {
  onProgress: (message: string) => void;
  onRecordingStart: (label: string, index: number, total: number) => void;
  onRecordingEnd: () => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

let isCollecting = false;

/**
 * Collect a single audio example for the given label
 * Records ~1 second of audio
 */
export async function collectExample(label: string): Promise<void> {
  if (isCollecting) {
    console.warn('⏳ Already collecting an example, please wait...');
    return;
  }

  // Must stop any active listening before collecting examples
  if (isListening) {
    await stopListening();
  }

  isCollecting = true;
  try {
    const tr = await ensureTransferRecognizer();
    await tr.collectExample(label);
  } finally {
    isCollecting = false;
  }
}

/**
 * Train the wake word model with collected examples
 */
export async function trainModel(callbacks: TrainingCallbacks): Promise<void> {
  const tr = await ensureTransferRecognizer();

  callbacks.onProgress('Training neural network...');

  await tr.train({
    epochs: 50,
    callback: {
      onEpochEnd: (epoch: number, logs: any) => {
        const acc = (logs?.acc * 100 || 0).toFixed(1);
        callbacks.onProgress(`Training... Epoch ${epoch + 1}/50 (${acc}% accuracy)`);
      }
    }
  });

  // Save trained examples to IndexedDB
  callbacks.onProgress('Saving model...');
  const serialized = tr.serializeExamples();
  await saveExamplesToDB(serialized);

  callbacks.onProgress('Done!');
  callbacks.onComplete();
  console.log('✅ Wake word model trained and saved');
}

/**
 * Get count of collected examples per label
 */
export async function getExampleCounts(): Promise<Record<string, number>> {
  const tr = await ensureTransferRecognizer();
  try {
    return tr.countExamples() as Record<string, number>;
  } catch {
    return {};
  }
}

// ============ Loading & Listening ============

let loadAndListenPromise: Promise<boolean> | null = null;

/**
 * Load a previously trained model from IndexedDB and start listening
 */
/**
 * Export current trained model as base64 string (copy into wakeWordConfig.ts to ship with app)
 */
export async function exportModelAsBase64(): Promise<string | null> {
  try {
    const data = await loadExamplesFromDB();
    if (!data) return null;
    return arrayBufferToBase64(data);
  } catch {
    return null;
  }
}

export async function loadAndListen(onWakeWord: () => void): Promise<boolean> {
  // Deduplicate concurrent calls (React Strict Mode double-fires effects)
  if (loadAndListenPromise) {
    return loadAndListenPromise;
  }
  loadAndListenPromise = _loadAndListenImpl(onWakeWord);
  try {
    return await loadAndListenPromise;
  } finally {
    loadAndListenPromise = null;
  }
}

async function _loadAndListenImpl(onWakeWord: () => void): Promise<boolean> {
  try {
    // Prefer user's own model from IndexedDB, fall back to bundled
    let savedData = await loadExamplesFromDB();
    if (!savedData && BUNDLED_MODEL_BASE64) {
      console.log('📦 Loading bundled wake word model...');
      savedData = base64ToArrayBuffer(BUNDLED_MODEL_BASE64);
      // Save it to IndexedDB so subsequent loads are instant
      await saveExamplesToDB(savedData);
    }
    if (!savedData) {
      console.log('ℹ️ No trained wake word model found');
      return false;
    }

    const tr = await ensureTransferRecognizer();

    // Load saved examples
    tr.loadExamples(savedData);

    // Re-train from saved examples (fast since examples are cached)
    console.log('🧠 Re-training from saved examples...');
    await tr.train({ epochs: 50 });

    // Start listening
    onWakeWordCallback = onWakeWord;
    await startListening();

    console.log('✅ Wake word detection active (custom neural network)');
    return true;
  } catch (error) {
    console.error('Failed to load wake word model:', error);
    return false;
  }
}

/**
 * Start listening for the wake word
 */
export async function startListening(): Promise<void> {
  if (!transferRecognizer) return;

  // Check both our flag AND the actual TF.js streaming state
  if (isListening || transferRecognizer.isListening()) {
    console.log('⚡ Already listening, skipping');
    return;
  }

  await transferRecognizer.listen(
    async (result: any) => {
      const scores = result.scores as Float32Array;
      const labels = transferRecognizer!.wordLabels();

      // Find the label with highest score
      let maxScore = 0;
      let maxLabel = '';
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
          maxScore = scores[i];
          maxLabel = labels[i];
        }
      }

      // High confidence single detection — trained with 10 samples + 50 epochs
      if (maxLabel === WAKE_WORD_LABEL && maxScore > 0.96) {
        console.log(`🌟 Wake word detected! (confidence: ${(maxScore * 100).toFixed(1)}%)`);
        onWakeWordCallback?.();
      }
    },
    {
      probabilityThreshold: 0.92,
      overlapFactor: 0.6,
      invokeCallbackOnNoiseAndUnknown: false,
    }
  );

  isListening = true;
  console.log('🎤 Wake word listener active');
}

/**
 * Stop listening for wake word
 */
export async function stopListening(): Promise<void> {
  if (!transferRecognizer) return;

  try {
    if (transferRecognizer.isListening()) {
      await transferRecognizer.stopListening();
    }
  } catch {
    // Already stopped
  }

  try {
    if (baseRecognizer && baseRecognizer.isListening()) {
      await baseRecognizer.stopListening();
    }
  } catch {
    // Already stopped
  }

  isListening = false;
  // Small delay to let audio context fully release
  await new Promise(r => setTimeout(r, 200));
  console.log('🛑 Wake word listener stopped');
}

/**
 * Pause listening temporarily (when Gennie is open)
 */
export async function pauseListening(): Promise<void> {
  await stopListening();
}

/**
 * Resume listening (when Gennie closes)
 */
export async function resumeListening(): Promise<void> {
  if (transferRecognizer && onWakeWordCallback) {
    await startListening();
  }
}

/**
 * Full cleanup
 */
export async function cleanup(): Promise<void> {
  await stopListening();
  if (transferRecognizer) {
    transferRecognizer = null;
  }
  if (baseRecognizer) {
    baseRecognizer = null;
  }
  modelLoadPromise = null;
  onWakeWordCallback = null;
}

/**
 * Reset: delete saved model and clean up
 */
export async function resetWakeWord(): Promise<void> {
  await cleanup();
  await clearDB();
  console.log('🗑️ Wake word model deleted');
}

/**
 * Get the labels for training
 */
export function getLabels() {
  return { wakeWord: WAKE_WORD_LABEL, background: BACKGROUND_LABEL };
}

export function isCurrentlyListening(): boolean {
  return isListening;
}
