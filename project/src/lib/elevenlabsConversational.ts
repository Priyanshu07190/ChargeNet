/**
 * ElevenLabs Conversational AI
 * This is how professional AI assistants work - streaming conversation
 * Similar to ChatGPT Voice, Google Assistant, etc.
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const AGENT_ID = 'your_agent_id'; // You'll create this in ElevenLabs dashboard

interface ConversationConfig {
  onMessage: (text: string, isFinal: boolean) => void;
  onAudioData: (audioData: ArrayBuffer) => void;
  onError: (error: Error) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'listening' | 'speaking' | 'disconnected') => void;
}

let websocket: WebSocket | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioContext: AudioContext | null = null;

/**
 * Start a conversational AI session with ElevenLabs
 * This handles everything: STT, AI processing, and TTS in real-time
 */
export async function startConversation(config: ConversationConfig): Promise<void> {
  try {
    config.onStatusChange('connecting');

    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Setup audio context for processing
    audioContext = new AudioContext({ sampleRate: 16000 });
    
    // Connect to ElevenLabs WebSocket
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('✅ Connected to ElevenLabs Conversational AI');
      config.onStatusChange('connected');
      
      // Send authentication
      websocket?.send(JSON.stringify({
        type: 'auth',
        api_key: ELEVENLABS_API_KEY
      }));

      // Start sending audio
      startAudioStreaming(stream, config);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'transcript':
          // User's speech transcribed
          config.onMessage(data.text, data.is_final);
          break;
          
        case 'audio':
          // AI's voice response
          config.onStatusChange('speaking');
          const audioData = base64ToArrayBuffer(data.audio);
          config.onAudioData(audioData);
          break;
          
        case 'status':
          if (data.status === 'listening') {
            config.onStatusChange('listening');
          }
          break;
          
        case 'error':
          config.onError(new Error(data.message));
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      config.onError(new Error('Connection error'));
    };

    websocket.onclose = () => {
      console.log('🔌 Disconnected from ElevenLabs');
      config.onStatusChange('disconnected');
      cleanup();
    };

  } catch (error) {
    console.error('Failed to start conversation:', error);
    config.onError(error as Error);
  }
}

/**
 * Stream audio from microphone to ElevenLabs
 */
function startAudioStreaming(stream: MediaStream, config: ConversationConfig): void {
  try {
    // Use MediaRecorder to capture audio
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && websocket?.readyState === WebSocket.OPEN) {
        // Convert to base64 and send
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          websocket?.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio
          }));
        };
        reader.readAsDataURL(event.data);
      }
    };

    // Send audio chunks every 100ms
    mediaRecorder.start(100);
    console.log('🎤 Started streaming audio to ElevenLabs');

  } catch (error) {
    console.error('Failed to start audio streaming:', error);
    config.onError(error as Error);
  }
}

/**
 * Stop the conversation
 */
export function stopConversation(): void {
  if (websocket) {
    websocket.close();
  }
  cleanup();
}

/**
 * Send a text message (optional - for testing)
 */
export function sendMessage(text: string): void {
  if (websocket?.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({
      type: 'text',
      text: text
    }));
  }
}

/**
 * Cleanup resources
 */
function cleanup(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  
  if (audioContext) {
    audioContext.close();
  }
  
  mediaRecorder = null;
  audioContext = null;
  websocket = null;
}

/**
 * Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Play audio from ArrayBuffer
 */
export async function playConversationalAudio(audioData: ArrayBuffer): Promise<void> {
  try {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    return new Promise((resolve) => {
      source.onended = () => {
        audioContext.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to play audio:', error);
    throw error;
  }
}
