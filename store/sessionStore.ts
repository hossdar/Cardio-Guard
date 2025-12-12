
import { create } from 'zustand';
import { SessionState, AppPhase, BeatQA, RPPGResults, ChatMessage, ClinicalItem } from '../types';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const useSessionStore = create<SessionState>((set) => ({
  id: generateId(),
  phase: 'standby', // Start immediately in dashboard
  patientTranscript: '',
  messages: [],
  clinicalItems: [],
  beatQA: [],
  rppgResults: null,
  videoBlob: null,
  finalAnalysis: null,
  riskRatio: null,

  setPhase: (phase: AppPhase) => set({ phase }),
  
  addMessage: (msg) => set((state) => {
    const newMessage: ChatMessage = {
        ...msg,
        id: generateId(),
        timestamp: Date.now()
    };
    
    // Update transcript
    let newTranscript = state.patientTranscript;
    if (msg.sender === 'user' || msg.sender === 'agent') {
        const prefix = msg.agentName ? `Dr. ${msg.agentName}` : 'Patient';
        newTranscript += (newTranscript ? '\n' : '') + `${prefix}: ${msg.text}`;
    }

    return { 
        messages: [...state.messages, newMessage],
        patientTranscript: newTranscript
    };
  }),

  addClinicalItem: (item) => set((state) => ({
      clinicalItems: [...state.clinicalItems, { ...item, id: generateId() }]
  })),
  
  addBeatQA: (qa: BeatQA) => set((state) => ({ 
    beatQA: [...state.beatQA, qa] 
  })),
  
  setRPPGResults: (results: RPPGResults) => set({ rppgResults: results }),
  
  setVideoBlob: (blob: Blob) => set({ videoBlob: blob }),
  
  setAnalysis: (text: string, risk: number) => set({ finalAnalysis: text, riskRatio: risk }),
  
  resetSession: () => set({
    id: generateId(),
    phase: 'standby',
    patientTranscript: '',
    messages: [],
    clinicalItems: [],
    beatQA: [],
    rppgResults: null,
    videoBlob: null,
    finalAnalysis: null,
    riskRatio: null
  })
}));
