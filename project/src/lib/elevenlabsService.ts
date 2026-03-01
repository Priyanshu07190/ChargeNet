const ELEVENLABS_API_KEY = 'sk_e5eb934261ffb4eef7c9a6b0fe9056c8e007a70489245faa';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Natural female voice

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
        model_id: 'eleven_turbo_v2', // Fastest model
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
    console.error('ElevenLabs TTS Error:', error);
    throw error;
  }
}

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
