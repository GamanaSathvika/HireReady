import { useState, useCallback } from 'react';

export function useLiveCaptions() {
  const [captions, setCaptions] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Fallback to empty implementation if SpeechRecognition is not supported
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }
    
    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setCaptions(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        // Automatically restart if it was unexpectedly stopped while we want it listening
        try {
          recognition.start();
        } catch(e) {
          setIsListening(false);
        }
      }
    };

    recognition.start();

    // Store reference to allow stopping
    window.__currentRecognition = recognition;
  }, [SpeechRecognition, isListening]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (window.__currentRecognition) {
      window.__currentRecognition.stop();
      window.__currentRecognition = null;
    }
  }, []);

  const clearCaptions = useCallback(() => {
    setCaptions("");
  }, []);

  return {
    captions,
    isListening,
    startListening,
    stopListening,
    clearCaptions
  };
}
