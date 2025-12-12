
import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { DR_SARA_SYSTEM_PROMPT, GEMINI_LIVE_MODEL, SAMPLE_RATE } from '../utils/constants';
import { useSessionStore } from '../store/sessionStore';
import { base64ToUint8Array, arrayBufferToBase64, float32ToInt16 } from '../services/audioUtils';

export const useGeminiLive = (isActive: boolean) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  const { addMessage, setPhase, addClinicalItem } = useSessionStore();

  const cleanup = useCallback(async () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
      audioContextRef.current = null;
    }
    
    if (sessionRef.current) {
       try {
         const session = await sessionRef.current;
         if (session && typeof session.close === 'function') {
            session.close();
         }
       } catch (e) {
         console.warn("Session close error", e);
       }
       sessionRef.current = null;
    }
    
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  const connect = async () => {
    if (!process.env.API_KEY) {
      setError("API Key missing");
      return;
    }

    try {
      setError(null);
      
      // 1. Setup Audio Output Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 24000 }); // Try to match model output
      audioContextRef.current = audioContext;

      // 2. Microphone Input (16kHz preferred for Gemini)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
            channelCount: 1,
            sampleRate: 16000 
        } 
      });
      streamRef.current = stream;

      // 3. Input Processing (Downsampling/Buffering)
      const inputContext = new AudioContextClass({ sampleRate: 16000 });
      const source = inputContext.createMediaStreamSource(stream);
      // Buffer size 4096 gives approx 250ms chunks at 16k
      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputContext.destination);

      // 4. Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: GEMINI_LIVE_MODEL,
        config: {
          systemInstruction: DR_SARA_SYSTEM_PROMPT,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: async () => {
            console.log("Gemini Live Connection Opened");
            setIsConnected(true);
            addMessage({ sender: 'system', text: "Dr. Sara connected." });
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmInt16 = float32ToInt16(inputData);
              const base64Data = arrayBufferToBase64(pcmInt16.buffer);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: { mimeType: 'audio/pcm;rate=16000', data: base64Data },
                });
              });
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Check for Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              
              // RESUME CONTEXT: Critical for Chrome autoplay policy
              if (audioContextRef.current.state === 'suspended') {
                  await audioContextRef.current.resume();
              }

              setIsSpeaking(true);
              const audioBytes = base64ToUint8Array(audioData);
              const int16Array = new Int16Array(audioBytes.buffer);
              
              // Gemini returns raw PCM at 24000Hz
              const audioBuffer = audioContextRef.current.createBuffer(1, int16Array.length, 24000);
              const channelData = audioBuffer.getChannelData(0);
              
              for (let i = 0; i < int16Array.length; i++) {
                channelData[i] = int16Array[i] / 32768.0;
              }

              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current.destination);
              
              const currentTime = audioContextRef.current.currentTime;
              // If nextStartTime is way behind (lag), reset it to now
              if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime;
              }
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              source.onended = () => {
                 // Slight buffer for state update
                 if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTimeRef.current - 0.2) {
                     setIsSpeaking(false);
                 }
              };
            }

            if (msg.serverContent?.turnComplete) {
                 setIsSpeaking(false);
                 nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
            }
            
            // Process Transcripts
            if (msg.serverContent?.outputTranscription?.text) {
                const text = msg.serverContent.outputTranscription.text;
                addMessage({ sender: 'agent', agentName: 'Sara', text: text });
                
                const lowerText = text.toLowerCase();
                if (lowerText.includes("dr. beat") || lowerText.includes("connect you") || lowerText.includes("specialist")) {
                   setTimeout(() => setPhase('transition_to_beat'), 4000);
                }
            }
            if (msg.serverContent?.inputTranscription?.text) {
                const userText = msg.serverContent.inputTranscription.text;
                addMessage({ sender: 'user', text: userText });
                
                if (userText.length > 5) {
                    addClinicalItem({
                        category: 'Symptom',
                        name: 'Patient Report',
                        description: userText,
                        status: 'Recorded'
                    });
                }
            }
          },
          onclose: () => {
            console.log("Gemini Live Disconnected");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setError("Connection error.");
            setIsConnected(false);
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error("Failed to connect to Gemini Live", e);
      setError("Connection failed");
    }
  };

  useEffect(() => {
    if (isActive) {
      connect();
    } else {
      cleanup();
    }
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return { isConnected, isSpeaking, error, connect };
};
