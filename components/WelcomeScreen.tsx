import React from 'react';
import { Heart, Activity, ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';

const WelcomeScreen: React.FC = () => {
  const setPhase = useSessionStore(state => state.setPhase);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
      {/* Sophisticated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-cyan-900/10 rounded-full blur-[80px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
      </div>

      <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-12 relative z-10">
        
        {/* Animated Logo Container */}
        <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full group-hover:bg-blue-500/30 transition-all duration-500"></div>
            <div className="relative w-24 h-24 bg-[#0A0A0A] border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl ring-1 ring-white/5 group-hover:scale-105 transition-transform duration-500">
                <Heart className="w-10 h-10 text-blue-500 fill-blue-500/10" />
            </div>
            {/* Orbiting element */}
            <div className="absolute inset-[-10px] rounded-full border border-blue-500/10 animate-[spin_10s_linear_infinite]">
                <div className="w-2 h-2 bg-blue-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#60a5fa]"></div>
            </div>
        </div>

        {/* Typography */}
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white">
            Cardio<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Guardian</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-light leading-relaxed max-w-lg mx-auto">
            Advanced AI-driven cardiac screening. <br/>
            <span className="text-slate-500">Seamless. Contactless. Precise.</span>
          </p>
        </div>

        {/* Primary Action */}
        <button 
          onClick={() => setPhase('sara')}
          className="group relative w-full max-w-xs"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
          <div className="relative bg-[#0A0A0A] hover:bg-[#111] border border-white/10 hover:border-blue-500/50 text-white py-5 px-8 rounded-full flex items-center justify-between transition-all duration-300 group-hover:translate-y-[-1px]">
            <span className="font-medium tracking-wide pl-2">Begin Assessment</span>
            <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Footer Features */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md pt-8 border-t border-white/5">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">HIPAA Compliant</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Clinical Grade AI</span>
            </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-[10px] text-slate-600 font-mono">
        v2.5.0 • Powered by Gemini 2.5 Flash & 3 Pro
      </div>
    </div>
  );
};

export default WelcomeScreen;