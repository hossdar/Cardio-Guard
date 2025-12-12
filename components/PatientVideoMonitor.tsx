
import React, { useRef, useEffect, useState } from 'react';
import { Camera, Activity, AlertCircle } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { useRPPG } from '../hooks/useRPPG';

const PatientVideoMonitor: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(20);

    const { analyzeVideo, status: uploadStatus } = useRPPG();
    const { phase, setPhase, setVideoBlob } = useSessionStore();

    const isScanning = phase === 'scan';

    // 1. Robust Camera Initialization
    useEffect(() => {
        let active = true;

        const initCamera = async () => {
            try {
                console.log('Initializing camera...');
                const s = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    },
                    audio: false,
                });

                if (active) {
                    setStream(s);
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                        // Crucial: Explicitly call play() to avoid black screen on some browsers
                        videoRef.current.onloadedmetadata = async () => {
                            try {
                                await videoRef.current?.play();
                            } catch (e) {
                                console.error("Video play error:", e);
                            }
                        };
                    }
                } else {
                    s.getTracks().forEach(track => track.stop());
                }
            } catch (err: any) {
                console.error('Camera Error:', err);
                if (active) setError('Camera access denied or unavailable.');
            }
        };

        initCamera();

        return () => {
            active = false;
            // We do not stop tracks here to allow smoother transitions, 
            // relying on the browser to handle lifecycle or app unmount.
        };
    }, []);

    // 2. Scan Logic
    useEffect(() => {
        if (phase === 'scan' && stream) {
            startRecording();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    useEffect(() => {
        if (isScanning && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && isScanning) {
            stopRecording();
        }
    }, [isScanning, timeLeft]);

    useEffect(() => {
        if (uploadStatus === 'success') {
            setPhase('processing');
        }
    }, [uploadStatus, setPhase]);

    const startRecording = () => {
        if (!stream) return;
        chunksRef.current = [];

        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')) mimeType = 'video/mp4; codecs=avc1';
        else if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) mimeType = 'video/webm; codecs=h264';

        const mr = new MediaRecorder(stream, { mimeType });
        mr.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.start();
        mediaRecorderRef.current = mr;
        setTimeLeft(20);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setTimeout(() => {
                const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
                setVideoBlob(blob);
                analyzeVideo(blob);
            }, 500);
        }
    };

    const handleStartSession = () => {
        // Audio Context Unlock Hack for Chrome Autoplay Policy
        // We create a brief context to "warm up" the audio engine on user gesture
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        ctx.resume().then(() => {
            ctx.close(); // Clean up immediateley, the actual context is in useGeminiLive
            setPhase('sara');
        });
    };

    return (
        <div className="flex flex-col h-full w-full items-center justify-start">
            {/* 
            Video Container 
            - Strictly 1:1 Aspect Ratio using inline style
            - Max width constrained to keep it contained
            - Centered
        */}
            <div
                className="relative w-[250px] h-[250px] bg-black rounded-3xl overflow-hidden shadow-lg ring-1 ring-black/10 z-10 flex-shrink-0"
            >
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400 p-2 text-center">
                        <AlertCircle className="w-6 h-6 mb-1 text-red-500" />
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                    />
                )}

                {/* Live Badge */}
                {!error && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm z-20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">Camera Active</span>
                    </div>
                )}

                {/* Active Agent Badge */}
                {phase !== 'standby' && phase !== 'results' && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md pl-1 pr-3 py-1 rounded-full border border-white/10 z-20">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <Activity className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-medium text-white">
                            {phase === 'sara' ? 'Dr. Sara' : phase.includes('beat') ? 'Dr. Beat' : 'System'}
                        </span>
                    </div>
                )}

                {/* Scan Overlay */}
                {isScanning && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-48 h-48 border-2 border-white/20 rounded-full flex items-center justify-center relative">
                                <div className="absolute inset-0 border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                <span className="text-4xl font-mono font-bold text-white drop-shadow-2xl">{timeLeft}</span>
                            </div>
                        </div>
                        <p className="mt-8 text-white font-medium bg-black/60 px-6 py-2 rounded-full text-sm backdrop-blur-md">Hold still. Analyzing...</p>
                    </div>
                )}
            </div>

            {/* Controls Area */}
            <div className="w-full max-w-md mt-6 space-y-6">
                {phase === 'standby' ? (
                    <button
                        onClick={handleStartSession}
                        className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 border border-gray-800"
                    >
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        Start Live Session
                    </button>
                ) : (
                    <button
                        onClick={() => setPhase('standby')}
                        className="w-full py-3 bg-white hover:bg-red-50 text-red-600 border border-red-100 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                        End Session
                    </button>
                )}

                {/* Dynamic Status Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[160px] flex flex-col items-center justify-center text-center">
                    {phase === 'standby' ? (
                        <div className="space-y-4 max-w-xs mx-auto text-left w-full">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                <Activity className="w-4 h-4 text-blue-600" />
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Protocol</h4>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                    <span className="font-bold text-gray-300">01</span>
                                    <p>Ensure good lighting on your face.</p>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                    <span className="font-bold text-gray-300">02</span>
                                    <p>Press "Start" to speak with Dr. Sara.</p>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                    <span className="font-bold text-gray-300">03</span>
                                    <p>Hold still during the 20s scan.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in flex flex-col items-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-white rounded-full flex items-center justify-center relative z-10 border border-blue-100 shadow-sm">
                                    <Activity className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <h4 className="text-base font-bold text-gray-900 mb-1">AI Analysis Active</h4>
                            <p className="text-sm text-gray-500">Monitoring conversation patterns & physical signs</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientVideoMonitor;
