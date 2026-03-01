const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Natural female voice

/**
 * Speak text using ElevenLabs TTS, with automatic browser fallback
 */
export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('ElevenLabs TTS Error, falling back to browser speech:', error);
    // Return empty buffer — caller should use playAudio which handles fallback
    throw error;
  }
}

/**
 * Play audio buffer, or fall back to browser speech synthesis
 */
export function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    
    audio.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    
    audio.play().catch(reject);
  });
}

/**
 * Browser-based TTS fallback — works everywhere, no API key needed
 */
export function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Browser speech synthesis not available');
      resolve();
      return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en-') && v.localService)
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Smart speak: tries ElevenLabs first, falls back to browser TTS
 */
export async function smartSpeak(text: string): Promise<void> {
  try {
    const audioBuffer = await textToSpeech(text);
    await playAudio(audioBuffer);
  } catch {
    console.log('⚡ Using browser TTS fallback');
    await speakWithBrowser(text);
  }
}

// Available voices
export const VOICES = {
  SARAH: 'EXAVITQu4vr4xnSDxMaL', // Natural female (default)
  RACHEL: '21m00Tcm4TlvDq8ikWAM', // Calm female
  DOMI: 'AZnzlk1XvdvUeBnXmlld', // Strong female
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // Young female
  ANTONI: 'ErXwobaYiN019PkySvjV', // Well-rounded male
  JOSH: 'TxGEqnHWrfWFTfGW9XjX', // Deep male
  ARNOLD: 'VR6AewLTigWG4xSOukaG', // Crisp male
  ADAM: 'pNInz6obpgDQGcFmaJgB', // Deep male
  SAM: 'yoZ06aMxZJJ28mfd3POQ', // Raspy male
};
