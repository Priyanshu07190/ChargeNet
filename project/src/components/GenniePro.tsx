import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, X, Sparkles, Volume2, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { chatWithGemini, extractAction, resetConversation } from '../lib/geminiService';
import { executeAction, VoiceActionContext } from '../lib/voiceActionEngine';
import { textToSpeech, playAudio } from '../lib/elevenlabsService';
import { initVAD, stopVAD } from '../lib/voiceActivityDetection';
import {
  hasTrainedModel,
  loadAndListen,
  pauseListening,
  resumeListening,
  cleanup as cleanupWakeWord,
  resetWakeWord,
} from '../lib/wakeWordEngine';
import WakeWordSetup from './WakeWordSetup';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'gennie';
  timestamp: Date;
}

/**
 * Professional Voice Assistant
 * Uses Voice Activity Detection (VAD) like real AI assistants
 */
export default function GenniePro() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [wakeWordReady, setWakeWordReady] = useState(false);
  const [showWakeWordSetup, setShowWakeWordSetup] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActive = useRef(false);
  const pendingTranscript = useRef('');
  const isOpenRef = useRef(false); // tracks isOpen for callbacks
  const { user } = useAuth();
  const navigate = useNavigate();

  // Keep ref in sync with state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addUserMessage = (text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      console.log('🔊 Gennie speaking:', text);

      const audioBuffer = await textToSpeech(text);
      await playAudio(audioBuffer);

      setIsSpeaking(false);
      console.log('✅ Finished speaking');
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  }, []);

  const addGenieMessage = useCallback((text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'gennie',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
    speak(text);
  }, [speak]);

  const processCommand = useCallback(async (userInput: string) => {
    console.log('🤖 Processing:', userInput);

    try {
      const aiResponse = await chatWithGemini(userInput, user?.user_type as 'driver' | 'host');
      const actionData = extractAction(aiResponse);
      // Strip ACTION:... from display text (handles values with any characters)
      const cleanResponse = aiResponse.replace(/\s*ACTION:[A-Z_]+(?::[^\s]*)?/g, '').trim();
      
      if (actionData) {
        console.log('📍 Executing action:', actionData);
        
        const context: VoiceActionContext = {
          userId: user?._id || '',
          userName: user?.name || '',
          userType: (user?.user_type as 'driver' | 'host') || 'driver',
          currentRoute: window.location.pathname + window.location.search,
          navigate,
        };

        const result = await executeAction(actionData.action, actionData.value, context);

        // Speak the action result or the Gemini response
        const spokenText = result.spoken || cleanResponse;
        if (spokenText) {
          addGenieMessage(spokenText);
        }

        // Navigate using React Router (sub-routes like /dashboard/trip-planner
        // are always different paths, so navigate() detects the change reliably)
        if (result.navigateTo) {
          setTimeout(() => {
            navigate(result.navigateTo!);
          }, 800);
        }
      } else if (cleanResponse) {
        // No action — just a conversational response
        addGenieMessage(cleanResponse);
      }

      const lower = userInput.toLowerCase();
      const closeWords = ['bye', 'goodbye', 'good bye', 'close', 'exit', 'stop', 'shut up', 'go away', 'that\'s all', 'thanks bye', 'thank you bye', 'see you', 'later'];
      if (closeWords.some(w => lower.includes(w))) {
        setTimeout(() => {
          setIsOpen(false);
          setMessages([]);
          resetConversation();
          stopVAD();
        }, 4000);
      }

    } catch (error) {
      console.error('Error processing command:', error);
      addGenieMessage("I'm having trouble understanding. Could you try again?");
    }
  }, [user, navigate, addGenieMessage]);

  // Initialize Speech Recognition (only for transcription)
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false; // NOT continuous - we control when it runs
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        console.log('✅ Final transcript:', finalTranscript);
        pendingTranscript.current = finalTranscript;
        setCurrentTranscript('');
      } else if (interimTranscript) {
        setCurrentTranscript(interimTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.log('Recognition error:', event.error);
      isRecognitionActive.current = false;
    };

    recognitionRef.current.onend = () => {
      console.log('Recognition ended');
      isRecognitionActive.current = false;
    };

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, []);

  // Custom neural network wake word detection (like Alexa/Google)
  // Runs a TensorFlow.js model trained on YOUR voice, entirely in-browser
  useEffect(() => {
    let cleanedUp = false;

    const setup = async () => {
      const trained = await hasTrainedModel();
      if (!trained) {
        console.log('ℹ️ No wake word model trained yet. Use button or Ctrl+Shift+G.');
        return;
      }

      try {
        const success = await loadAndListen(() => {
          console.log('🌟 Wake word detected! Opening Gennie...');
          if (!isOpenRef.current) {
            handleOpen();
          }
        });

        if (success && !cleanedUp) {
          setWakeWordReady(true);
          console.log('✅ Custom wake word detection active - say "Hi Gennie"');
        }
      } catch (error) {
        console.warn('Wake word setup failed:', error);
      }
    };

    setup();

    return () => {
      cleanedUp = true;
      cleanupWakeWord();
      setWakeWordReady(false);
    };
  }, []);

  // Pause/resume wake word when Gennie opens/closes
  useEffect(() => {
    if (!wakeWordReady) return;
    if (isOpen) {
      pauseListening();
    } else {
      resumeListening();
    }
  }, [isOpen, wakeWordReady]);

  // Keyboard shortcut: Ctrl+Shift+G to toggle Gennie
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Initialize VAD when window opens
  useEffect(() => {
    if (!isOpen) return;

    console.log('🎯 Initializing VAD...');

    initVAD({
      onSpeechStart: () => {
        console.log('👤 User started speaking');
        setIsUserSpeaking(true);
        
        // Start speech recognition when user starts speaking
        if (!isRecognitionActive.current && !isSpeaking && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            isRecognitionActive.current = true;
            console.log('🎤 Started recognition');
          } catch (e) {
            console.log('Recognition already running');
          }
        }
      },
      
      onSpeechEnd: () => {
        console.log('👤 User stopped speaking');
        setIsUserSpeaking(false);
        setCurrentTranscript('');
        
        // Stop recognition and process what was said
        if (isRecognitionActive.current && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Already stopped
          }
        }

        // Process the transcript after a short delay
        setTimeout(async () => {
          if (pendingTranscript.current.trim() && !isSpeaking) {
            const text = pendingTranscript.current.trim();
            pendingTranscript.current = '';
            
            addUserMessage(text);
            setIsProcessing(true);
            await processCommand(text);
            setIsProcessing(false);
          }
        }, 500);
      },
      
      onVolumeChange: (volume) => {
        setAudioLevel(volume);
      }
    }).catch(error => {
      console.error('Failed to initialize VAD:', error);
    });

    return () => {
      stopVAD();
    };
  }, [isOpen, isSpeaking, processCommand]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    resetConversation();
    stopVAD();
  };

  const handleOpen = () => {
    setIsOpen(true);
    addGenieMessage("Hi! I'm Gennie, your ChargeNet assistant. How can I help you?");
  };

  return (
    <>
      {/* Wake Word Training Modal */}
      {showWakeWordSetup && (
        <WakeWordSetup
          onComplete={async () => {
            setShowWakeWordSetup(false);
            // Load and start listening with the freshly trained model
            const success = await loadAndListen(() => {
              if (!isOpenRef.current) handleOpen();
            });
            if (success) setWakeWordReady(true);
          }}
          onSkip={() => setShowWakeWordSetup(false)}
        />
      )}

      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
          {/* Train wake word button (small) */}
          <button
            onClick={() => setShowWakeWordSetup(true)}
            className="bg-white text-purple-600 p-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300 border border-purple-200"
            title={wakeWordReady ? "Retrain wake word" : "Train wake word"}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleOpen}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            title="Open Gennie (Ctrl+Shift+G)"
          >
            <Sparkles className="h-6 w-6" />
          </button>
          <p className="text-xs text-gray-600 text-center">
            {wakeWordReady ? '🎤 Say "Hi Gennie"' : 'Ctrl+Shift+G'}
          </p>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {isSpeaking ? (
                  <Volume2 className="h-6 w-6 animate-pulse" />
                ) : isUserSpeaking ? (
                  <Mic className="h-6 w-6 animate-pulse" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">Gennie</h3>
                <p className="text-xs opacity-90">
                  {isSpeaking ? '🔊 Speaking...' : isUserSpeaking ? '🎤 Listening...' : '✨ Ready'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  await resetWakeWord();
                  setWakeWordReady(false);
                  setShowWakeWordSetup(true);
                }}
                className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                title="Retrain wake word"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                className="hover:bg-white/20 p-1 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white text-gray-800 shadow-md border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-purple-100' : 'text-gray-400'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Show current transcript while user is speaking */}
            {currentTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] p-3 rounded-2xl bg-purple-100 text-purple-800 border-2 border-purple-300">
                  <p className="text-sm italic">{currentTranscript}</p>
                </div>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-200">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Visualizer */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <div className="text-center space-y-3">
              {/* Audio Level Visualizer */}
              <div className="flex items-center justify-center gap-1 h-12">
                {[...Array(5)].map((_, i) => {
                  const height = isUserSpeaking 
                    ? Math.min(48, (audioLevel / 100) * 48 * (1 - Math.abs(i - 2) * 0.2))
                    : 8;
                  return (
                    <div
                      key={i}
                      className="w-2 bg-purple-600 rounded-full transition-all duration-100"
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
              
              <p className="text-sm text-gray-600">
                {isSpeaking ? '🔊 Speaking...' : isUserSpeaking ? '🎤 Listening to you...' : '👂 Ready to listen'}
              </p>
              <p className="text-xs text-gray-400">
                Just speak naturally • Say "goodbye" to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
