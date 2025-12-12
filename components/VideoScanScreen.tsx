
import React, { useRef, useEffect, useState } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { useRPPG } from '../hooks/useRPPG';

const VideoScanScreen: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'review'>('idle');
  const [timeLeft, setTimeLeft] = useState(20);
  
  const { analyzeVideo, status: uploadStatus, progress, error } = useRPPG();
  const setPhase = useSessionStore(state => state.setPhase);
  const setVideoBlob = useSessionStore(state => state.setVideoBlob);

  // Initialize Camera
  useEffect(() => {
    const constraints = {
        video: { 
            width: { ideal: 720 },
            height: { ideal: 720 },
            aspectRatio: 1, 
            facingMode: 'user' 
        }, 
        audio: false 
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(s => {
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
            console.error("Camera error", err);
        });

    return () => {
        stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer logic
  useEffect(() => {
    if (recordingState === 'recording' && timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    } else if (timeLeft === 0 && recordingState === 'recording') {
        stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingState, timeLeft]);

  // Upload Logic monitoring
  useEffect(() => {
      if (uploadStatus === 'success') {
          setPhase('processing');
      }
  }, [uploadStatus, setPhase]);


  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')) {
        mimeType = 'video/mp4; codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
        mimeType = 'video/webm; codecs=h264';
    }
    
    const mr = new MediaRecorder(stream, { mimeType });
    mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecordingState('recording');
    setTimeLeft(20);
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setRecordingState('review');
      }
  };

  const confirmUpload = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      setVideoBlob(blob); // Save to store for Triangulation
      await analyzeVideo(blob);
  };

  const retake = () => {
      setRecordingState('idle');
      setTimeLeft(20);
      chunksRef.current = [];
  };

  return (
    <div className="h-full bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* Camera Feed */}
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${recordingState === 'review' ? 'opacity-40' : 'opacity-100'}`} 
        />

        {/* HUD Elements */}
        {recordingState === 'idle' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                <button 
                    onClick={startRecording}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                >
                    <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                </button>
                <p className="text-white font-medium mt-4 text-sm bg-black/50 px-3 py-1 rounded-full">Tap to Record</p>
             </div>
        )}

        {recordingState === 'recording' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-full h-full border-[16px] border-red-500/20 absolute inset-0 animate-pulse"></div>
                <div className="text-6xl font-bold text-white drop-shadow-lg">{timeLeft}</div>
            </div>
        )}

        {/* Review UI */}
        {recordingState === 'review' && uploadStatus !== 'uploading' && uploadStatus !== 'processing' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                 <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-xs text-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-4">Scan Captured</h3>
                    <div className="flex gap-3">
                         <button onClick={retake} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
                             <RefreshCcw className="w-3 h-3" /> Retake
                         </button>
                         <button onClick={confirmUpload} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md">
                             Analyze
                         </button>
                    </div>
                 </div>
             </div>
        )}

        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-white font-medium text-sm">Processing Data...</p>
                 <p className="text-blue-400 text-xs mt-1">{progress}%</p>
             </div>
        )}

        {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={retake} className="font-bold underline">Retry</button>
            </div>
        )}
    </div>
  );
};

export default VideoScanScreen;
