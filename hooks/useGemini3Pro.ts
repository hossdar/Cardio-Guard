
import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_PRO_MODEL, DR_BEAT_INIT_PROMPT, DR_BEAT_PHASE_1_PROMPT, DR_BEAT_PHASE_3_PROMPT } from '../utils/constants';
import { useSessionStore } from '../store/sessionStore';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const useGemini3Pro = () => {
  const [loading, setLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  
  const { patientTranscript, beatQA, rppgResults, videoBlob, setAnalysis } = useSessionStore();

  const getAiClient = () => {
      return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  };

  // INIT: Get the first question dynamically based on Sara's transcript
  const startDrBeatSession = async () => {
      setLoading(true);
      setStreamingResponse('');
      try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GEMINI_PRO_MODEL,
            config: { systemInstruction: DR_BEAT_INIT_PROMPT },
            contents: [{ role: 'user', parts: [{ text: `Dr. Sara's Summary:\n${patientTranscript}` }] }]
        });
        const text = response.text;
        if (text) {
            setStreamingResponse(text);
            return text;
        }
        return "I've reviewed your history. Let's dig a bit deeper.";
      } catch (e) {
        console.error(e);
        return "I've reviewed your history. Let's dig a bit deeper.";
      } finally {
        setLoading(false);
      }
  };

  // LOOP: Ask follow-up questions (Text Only context is sufficient here, we analyze audio later)
  const askFollowUp = async (userAnswer: string, questionCount: number) => {
    setLoading(true);
    setStreamingResponse('');
    
    try {
      const ai = getAiClient();
      
      // Construct context of previous Q&A to avoid repetition
      const historyContext = beatQA.map((qa, i) => `Q${i+1}: ${qa.question}\nPatient Answer: ${qa.answer}`).join('\n\n');

      const context = `
      PATIENT SUMMARY (from Dr. Sara):
      ${patientTranscript}

      CONVERSATION HISTORY:
      ${historyContext}

      LATEST PATIENT ANSWER:
      "${userAnswer}"

      Instruction: This is question #${questionCount + 1} of 3. Generate the next question.
      `;

      const responseStream = await ai.models.generateContentStream({
        model: GEMINI_PRO_MODEL,
        config: {
            systemInstruction: DR_BEAT_PHASE_1_PROMPT,
        },
        contents: [{ role: 'user', parts: [{ text: context }] }],
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setStreamingResponse(prev => prev + text);
        }
      }
      return fullText;
    } catch (error) {
      console.error("Gemini 3 Pro Error:", error);
      return "Could you clarify that last point?";
    } finally {
      setLoading(false);
    }
  };

  // PHASE 3: Multi-modal Triangulation (Text + Audio + Video + Biometrics)
  const triangulate = async () => {
    setLoading(true);
    setStreamingResponse('');

    try {
      const ai = getAiClient();
      
      const parts: any[] = [];

      // 1. Add Dr. Sara's Context
      parts.push({ text: `SECTION 1: NURSE INTAKE SUMMARY\n${patientTranscript}\n\n` });

      // 2. Add Biometrics
      parts.push({ text: `SECTION 2: BIOMETRIC DATA (rPPG)\nHeart Rate: ${rppgResults?.heart_rate}\nSignal Quality: ${rppgResults?.signal_quality}\nHRV RMSSD: ${rppgResults?.heart_rate_variability.rmssd}\n\n` });

      // 3. Add Video Scan
      if (videoBlob) {
        parts.push({ text: `SECTION 3: PATIENT VIDEO SCAN\nAnalyze this video for physical signs of distress (sweating, pallor, labored breathing).\n` });
        const videoBase64 = await blobToBase64(videoBlob);
        parts.push({
            inlineData: {
                mimeType: videoBlob.type || 'video/mp4',
                data: videoBase64
            }
        });
        parts.push({ text: "\n\n" });
      } else {
        parts.push({ text: `SECTION 3: PATIENT VIDEO SCAN\n[Video Missing]\n\n` });
      }

      // 4. Add Consultation Audio & Text
      parts.push({ text: `SECTION 4: SPECIALIST CONSULTATION (Audio & Transcript)\nBelow are the Q&A pairs. Analyze the attached AUDIO for voice tone (anxiety, shortness of breath).\n` });

      beatQA.forEach((qa, index) => {
          parts.push({ text: `\nDr. Beat Q${index+1}: "${qa.question}"\nPatient Answer Transcript: "${qa.answer}"\nPatient Audio:` });
          
          if (qa.audioBase64) {
              // Strip data URL prefix if present (e.g. "data:audio/webm;base64,")
              const cleanBase64 = qa.audioBase64.split(',')[1] || qa.audioBase64;
              parts.push({
                  inlineData: {
                      mimeType: 'audio/webm', // MediaRecorder default
                      data: cleanBase64
                  }
              });
          } else {
              parts.push({ text: "[Audio Missing]" });
          }
      });

      const responseStream = await ai.models.generateContentStream({
        model: GEMINI_PRO_MODEL,
        config: {
            systemInstruction: DR_BEAT_PHASE_3_PROMPT,
        },
        contents: [{ role: 'user', parts: parts }],
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setStreamingResponse(prev => prev + text);
        }
      }
      
      const riskMatch = fullText.match(/Risk Ratio:?\s*\*?(\d+)%?\*?/i);
      const riskRatio = riskMatch ? parseInt(riskMatch[1]) : 0;
      
      setAnalysis(fullText, riskRatio);
      return fullText;
    } catch (error) {
      console.error("Triangulation Error:", error);
      return "Analysis failed. Please try again.";
    } finally {
      setLoading(false);
    }
  };

  return { loading, streamingResponse, startDrBeatSession, askFollowUp, triangulate };
};
