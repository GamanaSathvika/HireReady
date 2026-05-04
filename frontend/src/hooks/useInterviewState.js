import { useState } from 'react';

export function useInterviewState() {
  const [history, setHistory] = useState([]);
  const [interviewerMessage, setInterviewerMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState(null);

  const appendToHistory = (role, content) => {
    setHistory((prev) => [...prev, { role, content }]);
  };

  const updateStateFromServer = (data) => {
    if (data.history) setHistory(data.history);
    if (data.message) setInterviewerMessage(data.message);
    if (data.interviewDone) setIsComplete(true);
    if (data.feedbackReport) setFeedbackReport(data.feedbackReport);
  };

  return {
    history,
    setHistory,
    interviewerMessage,
    setInterviewerMessage,
    isProcessing,
    setIsProcessing,
    isComplete,
    setIsComplete,
    feedbackReport,
    setFeedbackReport,
    appendToHistory,
    updateStateFromServer
  };
}
