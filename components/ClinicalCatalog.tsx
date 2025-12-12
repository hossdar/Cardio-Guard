
import React from 'react';
import { useSessionStore } from '../store/sessionStore';
import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const ClinicalCatalog: React.FC = () => {
  const { clinicalItems, phase } = useSessionStore();

  const isEmpty = clinicalItems.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-bold text-gray-900">Clinical Catalog</h3>
            {phase === 'sara' && (
                <span className="flex items-center gap-2 text-xs font-medium text-blue-600 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Live Transcription Active
                </span>
            )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex-1 shadow-sm flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-3">Category</div>
                <div className="col-span-6">Description</div>
                <div className="col-span-3">Status</div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1">
                {isEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                        <FileText className="w-8 h-8 mb-3 opacity-20" />
                        <p className="text-sm">No clinical data recorded yet.</p>
                        <p className="text-xs mt-1">Start a conversation to begin cataloging.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {clinicalItems.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 px-6 py-4 hover:bg-gray-50/50 transition-colors items-start">
                                <div className="col-span-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        item.category === 'Symptom' ? 'bg-amber-50 text-amber-700' :
                                        item.category === 'Risk Factor' ? 'bg-red-50 text-red-700' :
                                        'bg-blue-50 text-blue-700'
                                    }`}>
                                        {item.category}
                                    </span>
                                </div>
                                <div className="col-span-6 pr-4">
                                    <p className="text-sm text-gray-900 font-medium">{item.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
                                </div>
                                <div className="col-span-3 flex items-center">
                                    {item.status === 'Recorded' && (
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Recorded
                                        </div>
                                    )}
                                    {item.status === 'Pending' && (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">
                                            <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div> Evaluating
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ClinicalCatalog;
