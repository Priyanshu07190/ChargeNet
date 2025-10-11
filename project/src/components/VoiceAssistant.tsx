import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Zap, MapPin, Calendar } from 'lucide-react';

interface VoiceAssistantProps {
  onCommand?: (command: string) => void;
  context?: 'booking' | 'navigation' | 'general';
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onCommand, context = 'general' }) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [moodState, setMoodState] = useState<'happy' | 'focused' | 'relaxed'>('happy');

  const responses = {
    booking: [
      "I found some great charging options nearby! Would you like me to book the solar station in Powai?",
      "Based on your mood, I recommend the quiet charger near the lake. It's perfect for a peaceful charging session.",
      "The fast charger at Phoenix Mall is available now and matches your urgent vibe!"
    ],
    navigation: [
      "Turn left in 200 meters to reach your charging destination.",
      "I've found a shorter route with better traffic conditions.",
      "Your charger is 5 minutes away. The host has confirmed availability!"
    ],
    general: [
      "Hi! I'm ChargeGenie, your AI charging companion. How can I help you today?",
      "I can help you find chargers, book sessions, or navigate to your destination.",
      "Ready to make your EV journey smoother? Just tell me what you need!"
    ]
  };

  const moodResponses = {
    happy: "You seem energetic today! I found some fun charging spots with cafes nearby.",
    focused: "I sense you're in work mode. Here are some quiet, efficient charging options.",
    relaxed: "Perfect day for a peaceful charge! I found some scenic locations for you."
  };

  useEffect(() => {
    // Simulate mood detection
    const moods: ('happy' | 'focused' | 'relaxed')[] = ['happy', 'focused', 'relaxed'];
    setMoodState(moods[Math.floor(Math.random() * moods.length)]);
  }, []);

  const startListening = () => {
    setIsListening(true);
    setCurrentSpeech('Listening...');
    
    // Simulate speech recognition
    setTimeout(() => {
      const commands = [
        "Find me a charger nearby",
        "Book a charging session for 2 hours",
        "Navigate to my booked charger",
        "What's my charging history?",
        "Find solar-powered chargers"
      ];
      
      const command = commands[Math.floor(Math.random() * commands.length)];
      setCurrentSpeech(command);
      
      setTimeout(() => {
        setIsListening(false);
        handleCommand(command);
      }, 1000);
    }, 2000);
  };

  const handleCommand = (command: string) => {
    const contextResponses = responses[context];
    const response = contextResponses[Math.floor(Math.random() * contextResponses.length)];
    
    // Text-to-speech simulation
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(response);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
    
    setCurrentSpeech(response);
    onCommand?.(command);
    
    setTimeout(() => {
      setCurrentSpeech('');
    }, 4000);
  };

  if (!isActive) {
    return (
      <button
        onClick={() => setIsActive(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 flex items-center justify-center text-white z-50"
      >
        <Volume2 className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Voice Interface */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 mb-4 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isListening ? 'bg-red-500 animate-pulse' : 'bg-purple-500'
              }`}>
                <Zap className="h-5 w-5 text-white" />
              </div>
              {isListening && (
                <div className="absolute -inset-1 bg-red-300 rounded-full animate-ping opacity-30"></div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">ChargeGenie</h3>
              <p className="text-xs text-gray-500">AI Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsActive(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <VolumeX className="h-5 w-5" />
          </button>
        </div>

        {/* Mood Indicator */}
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-purple-700">Mood Detected: {moodState}</span>
          </div>
          <p className="text-xs text-purple-600">{moodResponses[moodState]}</p>
        </div>

        {/* Voice Visualizer */}
        {isListening && (
          <div className="flex items-center justify-center space-x-1 mb-4">
            <div className="voice-wave"></div>
            <div className="voice-wave"></div>
            <div className="voice-wave"></div>
            <div className="voice-wave"></div>
            <div className="voice-wave"></div>
          </div>
        )}

        {/* Speech Text */}
        {currentSpeech && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{currentSpeech}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => handleCommand("Find nearby chargers")}
            className="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors"
          >
            <MapPin className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <span className="text-xs text-blue-700">Find</span>
          </button>
          
          <button
            onClick={() => handleCommand("Book charging session")}
            className="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors"
          >
            <Calendar className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <span className="text-xs text-green-700">Book</span>
          </button>
          
          <button
            onClick={() => handleCommand("Navigate to charger")}
            className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors"
          >
            <Zap className="h-4 w-4 text-purple-500 mx-auto mb-1" />
            <span className="text-xs text-purple-700">Navigate</span>
          </button>
        </div>

        {/* Voice Button */}
        <button
          onClick={startListening}
          disabled={isListening}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold transition-all ${
            isListening
              ? 'bg-red-500 text-white cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
          }`}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          <span>{isListening ? 'Listening...' : 'Tap to Speak'}</span>
        </button>
      </div>
    </div>
  );
};

export default VoiceAssistant;