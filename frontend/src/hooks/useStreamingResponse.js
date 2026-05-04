import { useState, useCallback } from 'react';

export function useStreamingResponse() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const sendAudioAndStream = useCallback(async (audioBlob, sessionId, token) => {
    setIsStreaming(true);
    setStreamedText(""); 
    setStatusMessage("Uploading audio...");

    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("sessionId", sessionId);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/interview/respond-stream`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to connect to server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Split buffer by double newlines to process complete SSE messages
        const messages = buffer.split('\n\n');
        buffer = messages.pop(); // keep the last incomplete message in the buffer
        
        for (const message of messages) {
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.slice(6));
              
              if (data.type === 'chunk') {
                setStatusMessage(""); // Clear status once text flows
                setStreamedText(prev => prev + data.content); 
              } else if (data.type === 'status') {
                setStatusMessage(data.message);
              } else if (data.type === 'end') {
                setIsStreaming(false);
                return; // Stream complete
              } else if (data.type === 'error') {
                setIsStreaming(false);
                setStatusMessage(`Error: ${data.message}`);
                throw new Error(data.message);
              }
            } catch (err) {
              console.warn("Failed to parse SSE event:", err);
            }
          }
        }
      }
    } catch (err) {
      setIsStreaming(false);
      setStatusMessage("Connection lost.");
      console.error("Streaming failed:", err);
    }
  }, []);

  return { isStreaming, streamedText, statusMessage, sendAudioAndStream };
}
