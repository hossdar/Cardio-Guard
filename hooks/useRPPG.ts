import { useState } from 'react';
import { RPPG_API_URL } from '../utils/constants';
import { useSessionStore } from '../store/sessionStore';
import { RPPGResults } from '../types';

export const useRPPG = () => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const setRPPGResults = useSessionStore(state => state.setRPPGResults);

  const analyzeVideo = async (videoBlob: Blob) => {
    setStatus('uploading');
    setProgress(10);
    setError(null);

    const formData = new FormData();
    formData.append('video', videoBlob, 'scan.mp4');

    try {
      const response = await fetch(RPPG_API_URL, {
        method: 'POST',
        headers: {
          // 'X-API-Key': (import.meta as any).env.VITE_RPPG_API_KEY || '',
          'X-API-Key': 'v-G5LrfkACfEr1AsGTmmF0WLkzzzDr11hRwpJzL5skM',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      setStatus('processing');
      setProgress(60);

      const data = await response.json();
      
      if (data.success) {
        const results: RPPGResults = {
            heart_rate: data.heart_rate,
            heart_rate_variability: data.heart_rate_variability || { rmssd: 0, sdnn: 0, mean_nn: 0 },
            signal_quality: data.signal_quality,
            confidence: data.confidence,
            frames_processed: data.frames_processed
        };
        
        setRPPGResults(results);
        setProgress(100);
        setStatus('success');
        return results;
      } else {
        throw new Error(data.error_message || 'Analysis failed');
      }
    } catch (err: any) {
      console.error("rPPG Error:", err);
      setError(err.message || "Failed to analyze video. Please ensure good lighting and try again.");
      setStatus('error');
    }
  };

  return { status, progress, error, analyzeVideo };
};