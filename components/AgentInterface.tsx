
import React, { useEffect, useState, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useGemini3Pro } from '../hooks/useGemini3Pro';
import { Mic, BrainCircuit, User, Activity, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Component: Renders a single chat message
const MessageBubble: React.FC<{ msg: any }> = ({ msg }) => {
    const isUser = msg.sender === 'user';
    return (
        <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    isUser ? 'bg-indigo-100 text-indigo-600' : 
                    msg.agentName === 'Sara' ? 'bg-teal-100 text-teal-600' : 
                    msg.agentName === 'Beat' ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-500'
                }`}>
                    {isUser ? <User className="w-4 h-4" /> : 
                     msg.agentName === 'Sara' ? <Activity className="w-4 h-4" /> :
                     msg.agentName === 'Beat' ? <BrainCircuit className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                    <p>{msg.text}</p>
                    <span className={`text-[10px] block mt-2 opacity-70 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Component: The Agent Card logic for Sara
const SaraAgent: React.FC = () => {
    const { isConnected, isSpeaking } = useGeminiLive(true);
    
    return (
        <div className="bg-white rounded-xl p-4 border border-teal-100 shadow-sm flex items-center gap-4 mb-6">
            <div className="relative">
                <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isSpeaking ? 'border-teal-500' : 'border-gray-100'}`}>
                     <img src="https://picsum.photos/200/200?random=1" alt="Sara" className="w-full h-full object-cover" />
                </div>
                {isConnected && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm">Dr. Sara <span className="text-teal-600 font-normal text-xs ml-1">(Intake Nurse)</span></h4>
                <div className="flex items-center gap-2 mt-1">
                     {isSpeaking ? (
                         <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                             <Volume2 className="w-3 h-3 animate-pulse" /> Speaking...
                         </span>
                     ) : (
                         <span className="text-xs text-gray-400">Listening...</span>
                     )}
                </div>
            </div>
            <div className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full uppercase tracking-wider">
                Live
            </div>
        </div>
    );
};

// Component: The Agent Card logic for Beat
const BeatAgent: React.FC = () => {
    const { loading, streamingResponse, startDrBeatSession, askFollowUp } = useGemini3Pro();
    const { beatQA, addBeatQA, addMessage, setPhase } = useSessionStore();
    const [questionCount, setQuestionCount] = useState(1);
    const [isInit, setIsInit] = useState(true);
    const recognitionRef = useRef<any>(null);
    const [isListening, setIsListening] = useState(false);

    // Initialize Beat
    useEffect(() => {
        const init = async () => {
            const intro = await startDrBeatSession();
            if (intro) {
                addMessage({ sender: 'agent', agentName: 'Beat', text: intro });
                speak(intro);
            }
            setIsInit(false);
        };
        init();
        
        // Setup Speech Rec
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.lang = 'en-US';
            rec.continuous = false;
            recognitionRef.current = rec;
            
            rec.onresult = async (e: any) => {
                setIsListening(false);
                const transcript = e.results[0][0].transcript;
                addMessage({ sender: 'user', text: transcript });
                
                // Save logic
                addBeatQA({ question: "Previous Context", answer: transcript }); // Simplified for demo
                
                // Next Question Logic
                if (questionCount < 3) {
                    setQuestionCount(c => c + 1);
                    const nextQ = await askFollowUp(transcript, questionCount);
                    if (nextQ) {
                        const cleanQ = nextQ.replace('[FINAL]', '');
                        addMessage({ sender: 'agent', agentName: 'Beat', text: cleanQ });
                        speak(cleanQ);
                    }
                } else {
                    const closing = "Thank you. I have what I need. Let's proceed to the scan.";
                    addMessage({ sender: 'agent', agentName: 'Beat', text: closing });
                    speak(closing);
                    setTimeout(() => setPhase('pre_scan'), 4000);
                }
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = window.speechSynthesis.getVoices().find(v => v.name.includes('Male'));
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
    };

    const toggleMic = () => {
        if (isListening) recognitionRef.current?.stop();
        else recognitionRef.current?.start();
        setIsListening(!isListening);
    };

    return (
        <div className="bg-white rounded-xl p-4 border border-violet-100 shadow-sm flex items-center gap-4 mb-6 transition-all duration-300 ring-2 ring-violet-50">
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center border-2 border-violet-200">
                     <BrainCircuit className="w-6 h-6 text-violet-600" />
                </div>
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm">Dr. Beat <span className="text-violet-600 font-normal text-xs ml-1">(Specialist)</span></h4>
                <div className="flex items-center gap-2 mt-1">
                     {loading ? (
                         <span className="text-xs text-violet-500 animate-pulse font-medium">Analyzing Data...</span>
                     ) : (
                         <span className="text-xs text-gray-400">Consultation Active</span>
                     )}
                </div>
            </div>
            <button 
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-600'}`}
            >
                <Mic className="w-4 h-4" />
            </button>
        </div>
    );
};


const AgentInterface: React.FC = () => {
  const { messages, phase } = useSessionStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden">
        {/* Active Agent Header Area */}
        <div className="p-6 pb-0">
            {phase === 'sara' && <SaraAgent />}
            {(phase === 'beat_qa' || phase === 'transition_to_beat') && <BeatAgent />}
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                    <Activity className="w-12 h-12 mb-2" />
                    <p className="text-sm">Session initialized. Waiting for input...</p>
                </div>
            ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
        </div>
    </div>
  );
};

export default AgentInterface;
