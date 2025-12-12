import React from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { Mic } from 'lucide-react';

const DrSaraPanel: React.FC = () => {
  const { isConnected, isSpeaking, error, connect } = useGeminiLive(true);

  return (
    <div className="absolute inset-0 bg-teal-50 flex flex-col items-center justify-between overflow-hidden p-4">
      
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-teal-50 to-teal-100 opacity-60 pointer-events-none"></div>

      {/* Header / Status */}
      <div className="relative z-10 w-full flex justify-between items-start">
        <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-teal-100 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Dr. Sara</span>
        </div>
      </div>

      {/* Main Avatar Area */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full">
         {/* Ripple Effect */}
         {isSpeaking && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 border border-teal-300/30 rounded-full animate-ping"></div>
                <div className="absolute w-24 h-24 border border-teal-400/20 rounded-full animate-ping delay-75"></div>
            </div>
         )}
         
         {/* Compact Avatar */}
         <div className={`relative w-24 h-24 rounded-full border-4 border-white shadow-xl transition-transform duration-300 ${isSpeaking ? 'scale-110 shadow-teal-200' : 'scale-100'}`}>
            <img 
                src="https://picsum.photos/200/200?random=10" 
                alt="Dr. Sara" 
                className={`w-full h-full object-cover rounded-full ${!isConnected && 'grayscale opacity-70'}`}
            />
            {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                    <Mic className="w-6 h-6 text-white drop-shadow-md" />
                </div>
            )}
         </div>

         {/* Status Text */}
         <div className="mt-4 h-6 text-center">
             {isConnected ? (
                 isSpeaking ? (
                     <div className="flex gap-1 justify-center items-end h-full pb-1">
                         <div className="w-1 h-3 bg-teal-400 rounded-full animate-bounce"></div>
                         <div className="w-1 h-5 bg-teal-500 rounded-full animate-bounce delay-75"></div>
                         <div className="w-1 h-3 bg-teal-400 rounded-full animate-bounce delay-150"></div>
                     </div>
                 ) : (
                     <p className="text-xs font-semibold text-teal-600">Listening...</p>
                 )
             ) : (
                 <p className="text-xs font-semibold text-slate-400">Offline</p>
             )}
         </div>
      </div>

      {/* Connect Button (if needed) or Footer */}
      {!isConnected && (
          <div className="relative z-10 w-full">
            <button 
                onClick={connect}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
            >
                Connect Audio
            </button>
            {error && <p className="text-[10px] text-red-500 text-center mt-2">{error}</p>}
          </div>
      )}
    </div>
  );
};

export default DrSaraPanel;