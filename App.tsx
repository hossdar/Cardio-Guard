
import React from 'react';
import { useSessionStore } from './store/sessionStore';
import ErrorBoundary from './components/ErrorBoundary';
import PatientVideoMonitor from './components/PatientVideoMonitor';
import ClinicalCatalog from './components/ClinicalCatalog';
import DrSaraPanel from './components/DrSaraPanel'; // Logic only
import DrBeatPanel from './components/DrBeatPanel'; // Logic only

import { Activity, ShieldCheck, Heart, User } from 'lucide-react';

// Sub-component for Top Cards
const StatusCard: React.FC<{ label: string; value: string; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 flex-1">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
        </div>
    </div>
);

const App: React.FC = () => {
  const { phase, clinicalItems, rppgResults } = useSessionStore();
  
  // Logic Wrappers: These components handle the AI logic but render nothing visible in the main flow
  // They update the store which drives the UI.
  // We explicitly unmount them when not in phase to ensure hooks clean up (disconnecting mic/camera/sockets)
  const LogicLayer = () => (
      <>
        {phase === 'sara' && <div className="hidden"><DrSaraPanel /></div>}
        {(phase === 'beat_qa' || phase === 'transition_to_beat') && <div className="hidden"><DrBeatPanel /></div>}
      </>
  );

  return (
    <ErrorBoundary>
      <div className="h-screen bg-[#F9FAFB] text-gray-900 font-sans flex flex-col overflow-hidden selection:bg-blue-100">
        <LogicLayer />
        
        {/* Header */}
        <header className="flex-none bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-blue-600" />
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-none tracking-tight">Cardio Guard</h1>
                    <span className="text-xs text-gray-500 font-medium">Intelligent Clinical Cataloging</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                CONNECTED
            </div>
        </header>

        {/* Main Grid Layout - Fixed to match design ratios */}
        <main className="flex-1 p-8 grid grid-cols-12 gap-8 min-h-0 overflow-hidden">
            
            {/* Left Column: Video (Approx 40%) */}
            <div className="col-span-12 lg:col-span-5 flex flex-col h-full min-h-0 items-center">
                <PatientVideoMonitor />
            </div>

            {/* Right Column: Data (Approx 60%) */}
            <div className="col-span-12 lg:col-span-7 flex flex-col h-full min-h-0 gap-8">
                
                {/* Top Row: Status Cards */}
                <div className="flex gap-4 flex-none">
                    <StatusCard 
                        label="Cataloged Items" 
                        value={clinicalItems.length.toString()} 
                        icon={Activity} 
                        color="bg-gray-900 text-gray-900" 
                    />
                    <StatusCard 
                        label="Heart Rate" 
                        value={rppgResults ? `${Math.round(rppgResults.heart_rate)} BPM` : "--"} 
                        icon={Heart} 
                        color="bg-green-500 text-green-600" 
                    />
                    
                    {/* Condition Breakdown Card (Custom) */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-1">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Condition Breakdown</div>
                        <div className="flex gap-2">
                             <div className="flex-1 h-2 rounded-full bg-emerald-400"></div>
                             <div className="flex-1 h-2 rounded-full bg-amber-400 opacity-30"></div>
                             <div className="flex-1 h-2 rounded-full bg-red-400 opacity-30"></div>
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
                            <span>Low Risk</span>
                            <span>Critical</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Area: Inventory List (Clinical Catalog) */}
                <ClinicalCatalog />

            </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
