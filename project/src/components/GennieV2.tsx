import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, X, Sparkles, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { chatWithGemini, extractAction, resetConversation } from '../lib/geminiService';
import { textToSpeech, playAudio } from '../lib/elevenlabsService';
import {
  initializeWakeWordDetection,
  startWakeWordDetection,
  pauseWakeWordDetection,
  resumeWakeWordDetection,
  cleanupWakeWordDetection
} from '../lib/picovoiceService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'gennie';
  timestamp: Date;
}

export default function GennieV2() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunning = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Setup audio level detection for visual feedback
  const setupAudioDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const checkAudioLevel = () => {
        if (!analyserRef.current || !isListening) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setIsUserSpeaking(average > 10);
        
        if (isListening) {
          requestAnimationFrame(checkAudioLevel);
        }
      };

      checkAudioLevel();
    } catch (error) {
      console.error('Failed to setup audio detection:', error);
    }
  }, [isListening]);

  useEffect(() => {
    if (isListening && !audioContextRef.current) {
      setupAudioDetection();
    }
  }, [isListening, setupAudioDetection]);

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
      // Pause wake word detection while speaking
      await pauseWakeWordDetection();
      
      // Stop speech recognition while speaking
      if (recognitionRef.current && isRecognitionRunning.current) {
        try {
          recognitionRef.current.stop();
          isRecognitionRunning.current = false;
          setIsListening(false);
        } catch (e) {
          console.log('Already stopped');
        }
      }

      setIsSpeaking(true);
      console.log('🔊 Speaking:', text);

      const audioBuffer = await textToSpeech(text);
      await playAudio(audioBuffer);

      setIsSpeaking(false);
      console.log('✅ Finished speaking');
      
      // Resume wake word detection and listening
      await resumeWakeWordDetection();
      
      setTimeout(() => {
        if (recognitionRef.current && isOpen && !isRecognitionRunning.current) {
          try {
            recognitionRef.current.start();
            isRecognitionRunning.current = true;
            setIsListening(true);
          } catch (e) {
            console.log('Failed to resume:', e);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      await resumeWakeWordDetection();
    }
  }, [isOpen]);

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
    console.log('Processing with Gemini AI:', userInput);

    try {
      const aiResponse = await chatWithGemini(userInput, user?.user_type as 'driver' | 'host');
      console.log('Gemini response:', aiResponse);

      const actionData = extractAction(aiResponse);
      const cleanResponse = aiResponse.replace(/ACTION:[A-Z_]+(?::\d+)?/g, '').trim();
      
      if (cleanResponse) {
        addGenieMessage(cleanResponse);
      }

      if (actionData) {
        console.log('Executing action:', actionData);
        
        switch (actionData.action) {
          case 'FIND_CHARGERS':
          case 'BOOK_CHARGER':
            setTimeout(() => navigate('/chargers'), 1000);
            break;
          case 'EMERGENCY':
          case 'CARBON_CREDITS':
            setTimeout(() => navigate('/dashboard'), 1000);
            break;
          case 'VIEW_BOOKINGS':
            setTimeout(() => navigate('/bookings'), 1000);
            break;
          case 'PROFILE':
            setTimeout(() => navigate('/profile'), 1000);
            break;
          case 'DASHBOARD':
            setTimeout(() => navigate('/dashboard'), 1000);
            break;
          case 'ADD_CHARGER':
          case 'MANAGE_CHARGERS':
          case 'RESCUE_REQUESTS':
            if (user?.user_type === 'host') {
              setTimeout(() => navigate('/host-dashboard'), 1000);
            }
            break;
        }
      }

      if (userInput.toLowerCase().includes('bye') || userInput.toLowerCase().includes('goodbye') || userInput.toLowerCase().includes('close')) {
        setTimeout(() => {
          setIsOpen(false);
          setMessages([]);
          resetConversation();
        }, 3000);
      }

    } catch (error) {
      console.error('Error processing command:', error);
      addGenieMessage("I'm having trouble understanding. Could you try rephrasing that?");
    }
  }, [user, navigate, addGenieMessage]);

  const handleUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    console.log('User said:', text);
    addUserMessage(text);
    setIsProcessing(true);
    await processCommand(text.toLowerCase());
    setIsProcessing(false);
  }, [processCommand, isSpeaking]);

  // Initialize Picovoice wake word detection
  useEffect(() => {
    let mounted = true;

    const initPicovoice = async () => {
      try {
        console.log('🎯 Initializing Picovoice...');
        
        await initializeWakeWordDetection({
          onWakeWord: () => {
            if (mounted && !isOpen) {
              console.log('✅ Wake word detected! Opening Gennie...');
              setIsOpen(true);
              setIsWakeWordActive(true);
              addGenieMessage("Hi! I'm Gennie, your ChargeNet assistant. How can I help you?");
            }
          },
          onError: (error) => {
            console.error('Wake word error:', error);
          }
        });

        await startWakeWordDetection();
        setIsWakeWordActive(true);
        console.log('✅ Picovoice wake word detection active');
      } catch (error) {
        console.error('Failed to initialize Picovoice:', error);
        console.log('⚠️ Falling back to browser speech recognition');
        // Fallback to old method if Picovoice fails
        setIsWakeWordActive(false);
      }
    };

    initPicovoice();

    return () => {
      mounted = false;
      cleanupWakeWordDetection();
    };
  }, []);

  // Initialize speech recognition for conversation
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      isRecognitionRunning.current = true;
      setIsListening(true);
      console.log('🎤 Recognition started');
    };

    recognitionRef.current.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      
      console.log('🎤 Heard:', transcript);

      if (isOpen) {
        handleUserInput(transcript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.log('❌ Recognition error:', event.error);
      isRecognitionRunning.current = false;
      
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      console.log('🔄 Recognition ended');
      isRecognitionRunning.current = false;
      setIsListening(false);
      
      if (!isSpeaking && isOpen) {
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionRunning.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('Restart failed:', e);
            }
          }
        }, 1000);
      }
    };

    return () => {
      if (recognitionRef.current && isRecognitionRunning.current) {
        try {
          recognitionRef.current.stop();
          isRecognitionRunning.current = false;
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, [isOpen, handleUserInput, isSpeaking]);

  // Start speech recognition when window opens
  useEffect(() => {
    if (isOpen && recognitionRef.current && !isRecognitionRunning.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Failed to start recognition:', e);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    resetConversation();
  };

  return (
    <>
      {/* Floating Indicator */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative">
            <button
              onClick={() => {
                setIsOpen(true);
                addGenieMessage("Hi! I'm Gennie, your ChargeNet assistant. How can I help you?");
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
              title={isWakeWordActive ? "Say 'Hey Google', 'Computer', or 'Jarvis'" : "Click to activate"}
            >
              <Sparkles className="h-6 w-6 animate-pulse" />
              <span className="absolute -top-12 right-0 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {isWakeWordActive ? "Wake word active" : "Click to start"}
              </span>
            </button>
            {isWakeWordActive && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-pulse" title="Wake word detection active"></div>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            {isWakeWordActive ? '🎯 Always listening' : 'Click to start'}
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
                {isListening ? (
                  <Mic className="h-6 w-6 animate-pulse" />
                ) : isSpeaking ? (
                  <Volume2 className="h-6 w-6 animate-pulse" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
                {isListening && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
              </div>
              <div>
                <h3 className="font-semibold">Gennie</h3>
                <p className="text-xs opacity-90">
                  {isListening ? '🎤 Listening...' : isSpeaking ? '🔊 Speaking...' : '✨ AI Assistant'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="hover:bg-white/20 p-1 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
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

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  <div className={`w-2 h-2 bg-purple-600 rounded-full ${isUserSpeaking ? 'animate-bounce' : ''}`}></div>
                  <div className={`w-2 h-2 bg-purple-600 rounded-full ${isUserSpeaking ? 'animate-bounce' : ''}`} style={{ animationDelay: '0.1s' }}></div>
                  <div className={`w-2 h-2 bg-purple-600 rounded-full ${isUserSpeaking ? 'animate-bounce' : ''}`} style={{ animationDelay: '0.2s' }}></div>
                  <div className={`w-2 h-2 bg-purple-600 rounded-full ${isUserSpeaking ? 'animate-bounce' : ''}`} style={{ animationDelay: '0.3s' }}></div>
                  <div className={`w-2 h-2 bg-purple-600 rounded-full ${isUserSpeaking ? 'animate-bounce' : ''}`} style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {isUserSpeaking ? '🎤 Listening to you...' : isListening ? '👂 Ready to listen' : isSpeaking ? '🔊 Speaking...' : '✨ Ready'}
              </p>
              <p className="text-xs text-gray-400">
                Say "goodbye" to close • Hands-free
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
