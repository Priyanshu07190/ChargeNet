import { useState, useCallback, useEffect } from 'react';
import { Mic, Check, Volume2, Sparkles, Loader2 } from 'lucide-react';
import {
  initBaseModel,
  collectExample,
  trainModel,
  getExampleCounts,
  getLabels,
  stopListening,
  exportModelAsBase64
} from '../lib/wakeWordEngine';

interface WakeWordSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

const REQUIRED_WAKE_SAMPLES = 20;
const REQUIRED_BG_SAMPLES = 20;

/**
 * Training UI for the custom wake word neural network
 * User records "Hi Gennie" 10 times + 10 background noise samples
 * Then the model trains in-browser in seconds
 */
export default function WakeWordSetup({ onComplete, onSkip }: WakeWordSetupProps) {
  const [step, setStep] = useState<'loading' | 'intro' | 'wake-word' | 'background' | 'training' | 'done'>('loading');
  const [wakeCount, setWakeCount] = useState(0);
  const [bgCount, setBgCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { wakeWord, background } = getLabels();

  // Stop any active wake word listening and load base model on mount
  useEffect(() => {
    const load = async () => {
      try {
        await stopListening();
        await initBaseModel();
        setStep('intro');
      } catch (err: any) {
        setError(`Failed to load speech model: ${err.message}`);
      }
    };
    load();
  }, [onComplete]);

  const recordWakeWord = useCallback(async () => {
    if (isRecording) return;
    setIsRecording(true);
    setError('');

    try {
      await collectExample(wakeWord);
      const counts = await getExampleCounts();
      const count = counts[wakeWord] || 0;
      setWakeCount(count);

      if (count >= REQUIRED_WAKE_SAMPLES) {
        setStep('background');
      }
    } catch (err: any) {
      setError(`Recording failed: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  }, [isRecording, wakeWord]);

  const recordBackground = useCallback(async () => {
    if (isRecording) return;
    setIsRecording(true);
    setError('');

    try {
      await collectExample(background);
      const counts = await getExampleCounts();
      const count = counts[background] || 0;
      setBgCount(count);

      if (count >= REQUIRED_BG_SAMPLES) {
        // Start training
        setStep('training');
        await trainModel({
          onProgress: (msg) => setProgress(msg),
          onRecordingStart: () => {},
          onRecordingEnd: () => {},
          onComplete: () => {
            setStep('done');
          },
          onError: (err) => setError(err)
        });
      }
    } catch (err: any) {
      setError(`Recording failed: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  }, [isRecording, background, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Train Gennie's Wake Word</h2>
          <p className="text-sm text-purple-100 mt-1">
            Teach Gennie to recognize your voice
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Loading */}
          {step === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-3" />
              <p className="text-gray-600">Loading speech recognition model...</p>
              <p className="text-xs text-gray-400 mt-1">First time takes ~5 seconds</p>
            </div>
          )}

          {/* Intro */}
          {step === 'intro' && (
            <div className="text-center space-y-4">
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  We'll train a <strong>neural network in your browser</strong> to recognize when you say 
                  <span className="text-purple-600 font-bold"> "Hi Gennie"</span>.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  No data leaves your device. Takes ~30 seconds.
                </p>
              </div>
              <div className="text-left text-sm text-gray-600 space-y-2">
                <p>📢 Step 1: Say "Hi Gennie" 20 times</p>
                <p>🤫 Step 2: Stay quiet for 20 recordings</p>
                <p>🧠 Step 3: Model trains automatically</p>
              </div>
              <button
                onClick={() => setStep('wake-word')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Let's Start!
              </button>
              <button
                onClick={onSkip}
                className="w-full text-gray-500 text-sm hover:text-gray-700 transition"
              >
                Skip — I'll use the button
              </button>
            </div>
          )}

          {/* Record Wake Word */}
          {step === 'wake-word' && (
            <div className="text-center space-y-4">
              <p className="text-gray-700 font-medium">
                Say <span className="text-purple-600 font-bold text-lg">"Hi Gennie"</span>
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all"
                  style={{ width: `${(wakeCount / REQUIRED_WAKE_SAMPLES) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 font-medium">{wakeCount} / {REQUIRED_WAKE_SAMPLES} recorded</p>

              <button
                onClick={recordWakeWord}
                disabled={isRecording}
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 scale-110 animate-pulse'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105'
                } text-white shadow-lg`}
              >
                {isRecording ? (
                  <Volume2 className="h-8 w-8 animate-pulse" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
              <p className="text-xs text-gray-400">
                {isRecording ? 'Recording... speak now!' : 'Tap to record'}
              </p>
            </div>
          )}

          {/* Record Background Noise */}
          {step === 'background' && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 rounded-xl p-3">
                <Check className="h-6 w-6 text-green-500 mx-auto mb-1" />
                <p className="text-sm text-green-700">Wake word samples recorded!</p>
              </div>

              <p className="text-gray-700 font-medium">
                Now stay <span className="text-purple-600 font-bold text-lg">quiet</span> 🤫
              </p>
              <p className="text-sm text-gray-500">
                This teaches the model what background noise sounds like
              </p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-gray-600 to-gray-800 h-3 rounded-full transition-all"
                  style={{ width: `${(bgCount / REQUIRED_BG_SAMPLES) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 font-medium">{bgCount} / {REQUIRED_BG_SAMPLES} recorded</p>

              <button
                onClick={recordBackground}
                disabled={isRecording}
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-yellow-500 scale-110 animate-pulse'
                    : 'bg-gray-600 hover:scale-105'
                } text-white shadow-lg`}
              >
                {isRecording ? (
                  <Volume2 className="h-8 w-8 animate-pulse" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
              <p className="text-xs text-gray-400">
                {isRecording ? 'Recording silence...' : 'Tap to record (stay quiet)'}
              </p>
            </div>
          )}

          {/* Training */}
          {step === 'training' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
              </div>
              <p className="text-gray-700 font-medium">Training your wake word model...</p>
              <p className="text-sm text-purple-600">{progress}</p>
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">
                  🧠 A neural network is being trained right in your browser. 
                  No data leaves your device.
                </p>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-700 font-bold text-lg">Wake word trained!</p>
              <p className="text-sm text-gray-500">
                Say "Hi Gennie" anytime to wake me up
              </p>
              <button
                onClick={async () => {
                  const b64 = await exportModelAsBase64();
                  if (b64) {
                    await navigator.clipboard.writeText(b64);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }
                }}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl transition-colors"
              >
                {copied ? '✅ Copied model!' : '📋 Copy model to clipboard'}
              </button>
              <button
                onClick={onComplete}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-xl transition-colors"
              >
                Start using Gennie →
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
