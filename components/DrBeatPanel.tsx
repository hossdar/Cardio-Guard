
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Activity, ArrowRight, BrainCircuit } from 'lucide-react';
import { useGemini3Pro } from '../hooks/useGemini3Pro';
import { useSessionStore } from '../store/sessionStore';
import { arrayBufferToBase64 } from '../services/audioUtils';

const DrBeatPanel: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [questionCount, setQuestionCount] = useState(1); 
  const [currentResponse, setCurrentResponse] = useState("Initializing clinical context...");
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Audio Refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { loading, streamingResponse, startDrBeatSession, askFollowUp } = useGemini3Pro();
  const { addBeatQA, setPhase } = useSessionStore();

  // 1. Initialize Session on Mount (Dynamic Intro)
  useEffect(() => {
      const init = async () => {
          const intro = await startDrBeatSession();
          if (intro) {
            setCurrentResponse(intro);
            speak(intro);
          }
          setIsInitializing(false);
      };
      init();
      
      // Setup Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        recognitionRef.current = rec;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update text while streaming
  useEffect(() => {
    if (streamingResponse && !isInitializing) {
      setCurrentResponse(streamingResponse);
    }
  }, [streamingResponse, isInitializing]);

  const startRecording = async () => {
    if (questionCount > 3) return;
    
    // Start Audio Capture (For Gemini Triangulation)
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream); // Default usually webm/opus
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
    } catch (e) {
        console.error("Microphone access failed", e);
    }

    // Start Speech Recognition (For UI Transcript)
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
      
      recognitionRef.current.onresult = async (event: any) => {
        // Recognition finished (user stopped speaking)
        const transcript = event.results[0][0].transcript;
        stopRecording(transcript);
      };
      
      recognitionRef.current.onerror = () => stopRecording('');
    } else {
      alert("Speech recognition not supported.");
    }
  };

  const stopRecording = async (transcript: string) => {
    setIsRecording(false);
    
    // Stop Media Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        
        // Wait briefly for ondataavailable to fire
        setTimeout(async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // Convert Blob to Base64 for storage
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                
                // Save complete QA pair
                if (transcript) {
                    addBeatQA({ 
                        question: currentResponse, 
                        answer: transcript,
                        audioBase64: base64Audio
                    });

                    // Proceed Logic
                    if (questionCount >= 3) {
                         setQuestionCount(4); // Move to "Done" state
                         speak("Thank you. I have what I need. Let's proceed to the scan.");
                    } else {
                        // Ask next question
                        setQuestionCount(prev => prev + 1);
                        const nextQ = await askFollowUp(transcript, questionCount);
                        speak(nextQ);
                    }
                }
            };
        }, 200);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    // Strip [FINAL] tag if present
    const cleanText = text.replace('[FINAL]', '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David'));
    if (maleVoice) utterance.voice = maleVoice;
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="absolute inset-0 bg-violet-50 flex flex-col p-4 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-none">
         <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-violet-100 shadow-sm">
            <BrainCircuit className="w-3 h-3 text-violet-600" />
            <span className="text-[10px] font-bold text-violet-800 uppercase">Dr. Beat</span>
         </div>
         {questionCount <= 3 && (
            <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 w-4 rounded-full transition-all ${i <= questionCount ? 'bg-violet-500' : 'bg-violet-200'}`} />
                ))}
            </div>
        )}
      </div>

      {/* Compact Question Display */}
      <div className="flex-1 flex items-center justify-center">
         <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-violet-100 relative max-h-full overflow-y-auto">
            <p className="text-sm font-medium text-violet-900 leading-snug">
                {isInitializing ? (
                    <span className="flex items-center gap-2 text-violet-400">
                         <Activity className="w-4 h-4 animate-spin" /> Reviewing Sara's notes...
                    </span>
                ) : loading ? (
                    <span className="animate-pulse text-violet-400">Thinking...</span>
                ) : (
                    currentResponse.replace('[FINAL]', '')
                )}
            </p>
         </div>
      </div>

      {/* Action Area */}
      <div className="flex-none pt-4 flex justify-center">
            {questionCount <= 3 ? (
                <button
                    onMouseDown={startRecording}
                    onMouseUp={() => { /* Wait for speech recognition to end automatically or handle manual stop if preferred */ }}
                    onTouchStart={startRecording}
                    disabled={loading || isInitializing}
                    className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-md border-4
                        ${isRecording 
                            ? 'bg-violet-600 border-violet-200 scale-110' 
                            : 'bg-white border-violet-100 hover:border-violet-200 text-violet-400 hover:text-violet-600'
                        }
                        ${(loading || isInitializing) ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <Mic className="w-6 h-6" />
                </button>
            ) : (
                 <button 
                    onClick={() => setPhase('pre_scan')}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 animate-fade-in"
                 >
                    Start Scan
                    <ArrowRight className="w-4 h-4" />
                 </button>
            )}
      </div>
      
      {isRecording && <p className="text-center text-[10px] text-violet-400 mt-2 font-bold animate-pulse">LISTENING TO VOICE TONE...</p>}
    </div>
  );
};

export default DrBeatPanel;
