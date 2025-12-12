
export type AppPhase = 
  | 'standby'
  | 'sara' 
  | 'transition_to_beat'
  | 'beat_qa' 
  | 'pre_scan' 
  | 'scan' 
  | 'processing' 
  | 'results'
  | 'error';

export interface BeatQA {
  question: string;
  answer: string;
  audioBase64?: string; 
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  agentName?: 'Sara' | 'Beat' | 'System';
  text: string;
  timestamp: number;
}

export interface ClinicalItem {
    id: string;
    category: 'Symptom' | 'Risk Factor' | 'History' | 'Vitals';
    name: string; // e.g., "Chest Pain"
    description: string; // e.g., "Started 2 days ago, pressure-like"
    status: 'Pending' | 'Recorded' | 'Concern';
}

export interface RPPGResults {
  heart_rate: number;
  heart_rate_variability: {
    rmssd: number;
    sdnn: number;
    mean_nn: number;
  };
  signal_quality: number;
  confidence: string;
  frames_processed: number;
}

export interface SessionState {
  id: string;
  phase: AppPhase;
  patientTranscript: string;
  messages: ChatMessage[];
  clinicalItems: ClinicalItem[]; // New: For the "Inventory List" replacement
  beatQA: BeatQA[];
  rppgResults: RPPGResults | null;
  videoBlob: Blob | null;
  finalAnalysis: string | null;
  riskRatio: number | null;
  
  // Actions
  setPhase: (phase: AppPhase) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addClinicalItem: (item: Omit<ClinicalItem, 'id'>) => void;
  addBeatQA: (qa: BeatQA) => void;
  setRPPGResults: (results: RPPGResults) => void;
  setVideoBlob: (blob: Blob) => void;
  setAnalysis: (text: string, risk: number) => void;
  resetSession: () => void;
}

export interface LiveConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}
