import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSessionStore } from '../store/sessionStore';
import { useGemini3Pro } from '../hooks/useGemini3Pro';
import { Heart, Activity, AlertTriangle, Zap, BarChart2 } from 'lucide-react';

const MetricCard: React.FC<{ 
    label: string; 
    value: string | number; 
    unit?: string; 
    icon: React.ReactElement; 
    color: string;
    bgColor: string;
}> = ({ label, value, unit, icon, color, bgColor }) => (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
        <div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{value} <span className="text-sm text-gray-500 font-normal ml-1">{unit}</span></div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">{label}</div>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-6 h-6 ${color}` })}
        </div>
    </div>
);

const ResultsPane: React.FC = () => {
  const { rppgResults, finalAnalysis, riskRatio } = useSessionStore();
  const { triangulate, loading, streamingResponse } = useGemini3Pro();

  useEffect(() => {
    if (rppgResults && !finalAnalysis && !loading) {
        triangulate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRiskColor = (risk: number) => {
      if (risk < 20) return 'text-emerald-500';
      if (risk < 50) return 'text-amber-500';
      return 'text-red-500';
  };

  const getRiskBg = (risk: number) => {
      if (risk < 20) return 'bg-emerald-500';
      if (risk < 50) return 'bg-amber-500';
      return 'bg-red-500';
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
        
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
             <h2 className="text-2xl font-bold text-gray-900">Clinical Analysis Report</h2>
             <span className="text-sm text-gray-400 font-mono bg-gray-50 px-3 py-1 rounded-full">ID: {Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
        </div>

        {/* Risk Profile */}
        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <AlertTriangle className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-base font-bold text-gray-900 uppercase tracking-widest">Composite Risk Assessment</h3>
            </div>
            
            <div className="flex items-end gap-6 mb-6">
                <div className={`text-6xl font-light tracking-tighter ${riskRatio !== null ? getRiskColor(riskRatio) : 'text-gray-400'}`}>
                    {riskRatio !== null ? riskRatio : '--'}%
                </div>
                <div className="text-lg text-gray-500 font-medium mb-3">Estimated Probability Factor</div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                {riskRatio !== null && (
                    <div 
                        className={`h-full ${getRiskBg(riskRatio)} transition-all duration-1000`} 
                        style={{ width: `${riskRatio}%` }}
                    ></div>
                )}
            </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
                label="Heart Rate" 
                value={Math.round(rppgResults?.heart_rate || 0)} 
                unit="BPM" 
                icon={<Heart />}
                color="text-rose-600"
                bgColor="bg-rose-50"
            />
            <MetricCard 
                label="HRV (RMSSD)" 
                value={Math.round(rppgResults?.heart_rate_variability.rmssd || 0)} 
                unit="ms" 
                icon={<Activity />}
                color="text-emerald-600"
                bgColor="bg-emerald-50"
            />
            <MetricCard 
                label="Stress Level" 
                value={Math.round(rppgResults?.heart_rate_variability.sdnn || 0)} 
                unit="SDNN" 
                icon={<BarChart2 />}
                color="text-blue-600"
                bgColor="bg-blue-50"
            />
             <MetricCard 
                label="Signal Quality" 
                value={`${Math.round((rppgResults?.signal_quality || 0) * 100)}%`} 
                unit=""
                icon={<Zap />}
                color="text-amber-600"
                bgColor="bg-amber-50"
            />
        </div>

        {/* AI Analysis Text */}
        <div className="pt-6 border-t border-gray-100">
             <h3 className="text-xl font-bold text-gray-900 mb-6">Detailed Findings</h3>
             <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-8 prose-strong:text-indigo-700">
                {loading ? (
                    <div className="space-y-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-100 rounded w-4/6"></div>
                        <p className="text-sm text-indigo-500 font-mono mt-6">{streamingResponse}</p>
                    </div>
                ) : (
                    <ReactMarkdown>
                        {finalAnalysis || ''}
                    </ReactMarkdown>
                )}
            </div>
        </div>
        
    </div>
  );
};

export default ResultsPane;