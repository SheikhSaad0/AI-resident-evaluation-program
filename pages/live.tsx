// In pages/live.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { GlassCard, GlassButton } from '../components/ui';
import ResidentSelector from '../components/ResidentSelector';
import SurgerySelector from '../components/SurgerySelector';
import { EVALUATION_CONFIGS } from '../lib/evaluation-configs';

// --- INTERFACES ---
interface Resident { id: string; name: string; photoUrl?: string | null; year?: string; }
interface TranscriptEntry { speaker: string; text: string; isFinal: boolean; }
interface AiResponse { action: string; payload?: any; }
type ChatEntry = TranscriptEntry | { speaker: 'Veritas'; text:string; };

interface LiveSessionState {
    currentStepIndex: number;
    timeElapsedInSession: number;
    timeElapsedInStep: number;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
const DEBOUNCE_TIME_MS = 2000;

const LiveEvaluationPage = () => {
    const router = useRouter();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);

    const [currentState, setCurrentState] = useState<LiveSessionState>({
        currentStepIndex: 0,
        timeElapsedInSession: 0,
        timeElapsedInStep: 0,
    });

    const stateRef = useRef(currentState);
    const fullTranscriptRef = useRef<string>("");
    const liveNotesRef = useRef<any[]>([]);
    const micRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioQueueRef = useRef<HTMLAudioElement[]>([]);
    const isPlayingAudioRef = useRef(false);

    useEffect(() => { stateRef.current = currentState; }, [currentState]);
    useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isAiThinking]);
    
    useEffect(() => {
        const fetchResidents = async () => {
            try {
                const res = await fetch('/api/residents');
                if (res.ok) setResidents(await res.json());
            } catch (error) { console.error("Failed to fetch residents:", error); }
        };
        fetchResidents();
    }, []);

    useEffect(() => {
        return () => {
            socketRef.current?.close();
            micRecorderRef.current?.stop();
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const playNextInQueue = useCallback(() => {
        if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;
        isPlayingAudioRef.current = true;
        const audio = audioQueueRef.current.shift();
        audio?.play();
        audio?.addEventListener('ended', () => {
            isPlayingAudioRef.current = false;
            playNextInQueue();
        });
    }, []);

    const speakText = useCallback(async (text: string) => {
        try {
            console.log(`[DEBUG] Requesting TTS for: "${text}"`);
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioQueueRef.current.push(audio);
                playNextInQueue();
            } else {
                 console.error("[DEBUG] TTS request failed");
            }
        } catch (error) {
            console.error("[DEBUG] Error fetching TTS audio:", error);
        }
    }, [playNextInQueue]);
    
    const addVeritasMessage = useCallback((text: string, shouldSpeak: boolean = true) => {
        console.log(`[DEBUG] Adding Veritas message to chat: "${text}"`);
        setChatHistory(prev => [...prev, { speaker: 'Veritas', text }]);
        fullTranscriptRef.current += `[Veritas] ${text}\n`;
        if (shouldSpeak) {
            speakText(text);
        }
    }, [speakText]);

    const processTranscriptWithAI = useCallback(async (isInitial = false) => {
        setIsAiThinking(true);
        console.log(`[DEBUG] processTranscriptWithAI called. isInitial: ${isInitial}`);
        
        const currentLiveState = stateRef.current;
        if (!selectedSurgery) {
            console.error("[DEBUG] AI call aborted: No surgery selected.");
            setIsAiThinking(false);
            return;
        }

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
        if (!procedureId) {
            console.error("[DEBUG] AI call aborted: Could not find procedure ID.");
            setIsAiThinking(false);
            return;
        }

        const config = EVALUATION_CONFIGS[procedureId];
        const currentStep = config.procedureSteps[currentLiveState.currentStepIndex];
        
        const requestBody = {
            transcript: isInitial ? "SESSION_START" : fullTranscriptRef.current,
            procedureId,
            currentState: {
                ...currentLiveState,
                currentStepName: currentStep?.name || "End of Procedure",
            },
            liveNotes: liveNotesRef.current,
        };

        console.log("[DEBUG] Sending data to /api/ai:", JSON.stringify(requestBody, null, 2));

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            console.log(`[DEBUG] /api/ai response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok. Body: ${errorText}`);
            }

            const aiData: AiResponse = await response.json();
            console.log("[DEBUG] Received AI response:", aiData);

            if (aiData.action === 'NONE') {
                 console.log("[DEBUG] AI action is NONE. Doing nothing.");
                 setIsAiThinking(false); // Ensure thinking state is turned off
                 return;
            }

            liveNotesRef.current.push(aiData);

            // *** THIS IS THE CORRECTED LOGIC ***
            // It now correctly handles all actions that have a spoken payload.
            const actionsThatSpeak = ['SPEAK', 'ACKNOWLEDGE', 'ACKNOWLEDGE_AND_LISTEN', 'START_TIMEOUT', 'COMPLETE_TIMEOUT', 'SPEAK_AND_LISTEN'];
            if (aiData.payload && actionsThatSpeak.includes(aiData.action)) {
                addVeritasMessage(aiData.payload);
            } else {
                 console.log(`[DEBUG] AI action '${aiData.action}' does not have a spoken payload. Handling silently.`);
            }

        } catch (error) { 
            console.error("[DEBUG] Error in processTranscriptWithAI:", error);
            addVeritasMessage("I've encountered an error. Please check the developer console for details.", true);
        } finally {
            setIsAiThinking(false);
        }
    }, [selectedSurgery, addVeritasMessage]);

    useEffect(() => {
        if (!isSessionActive) return;
        const timer = setInterval(() => {
            setCurrentState(prev => ({
                ...prev,
                timeElapsedInSession: prev.timeElapsedInSession + 1,
                timeElapsedInStep: prev.timeElapsedInStep + 1,
            }));
        }, 1000);
        return () => clearInterval(timer);
    }, [isSessionActive]);

    const startSession = async () => {
        if (!selectedResident || !selectedSurgery) { alert("Please select a surgery and a resident."); return; }
        setStatus('connecting');
        setChatHistory([]);
        fullTranscriptRef.current = "";
        liveNotesRef.current = [];
        recordedChunksRef.current = [];
        setCurrentState({
            currentStepIndex: 0,
            timeElapsedInSession: 0,
            timeElapsedInStep: 0,
        });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            micRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                    socketRef.current?.send(event.data);
                }
            };
            const wsUrl = `${WEBSOCKET_URL}?residentName=${encodeURIComponent(selectedResident.name)}`;
            socketRef.current = new WebSocket(wsUrl);

            socketRef.current.onopen = () => {
                console.log("[DEBUG] WebSocket connection opened. Starting session.");
                setStatus('connected');
                setIsSessionActive(true);
                micRecorderRef.current?.start(1000);
                processTranscriptWithAI(true);
            };

            socketRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript') {
                    const newEntry: TranscriptEntry = data.entry;
                    setChatHistory(prev => {
                        const last = prev[prev.length - 1];
                        if (last && 'isFinal' in last && !last.isFinal && last.speaker === newEntry.speaker) {
                            return [...prev.slice(0, -1), newEntry];
                        }
                        return [...prev, newEntry];
                    });
                    if (newEntry.isFinal && newEntry.text.trim()) {
                        fullTranscriptRef.current += `[${newEntry.speaker}] ${newEntry.text}\n`;
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        debounceTimerRef.current = setTimeout(() => {
                            processTranscriptWithAI();
                        }, DEBOUNCE_TIME_MS);
                    }
                }
            };
            socketRef.current.onclose = () => {
                 console.log("[DEBUG] WebSocket connection closed.");
                setStatus('idle');
                setIsSessionActive(false);
                stream.getTracks().forEach(track => track.stop());
            };
            socketRef.current.onerror = (err) => {
                console.error("[DEBUG] WebSocket error:", err);
                setStatus('error');
            }
        } catch (error) {
            console.error("[DEBUG] Failed to start session:", error);
            setStatus('error');
        }
    };
    
    // ... stopSessionAndAnalyze and the JSX return statement remain the same
    const stopSessionAndAnalyze = async () => {
        setIsProcessing(true);
        micRecorderRef.current?.stop();
        socketRef.current?.close();
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setTimeout(async () => {
            const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'live_recording.webm');
            formData.append('residentId', selectedResident!.id);
            formData.append('surgery', selectedSurgery);
            formData.append('fullTranscript', fullTranscriptRef.current);
            formData.append('liveNotes', JSON.stringify(liveNotesRef.current));
            try {
                const response = await fetch('/api/analyze-full-session', { method: 'POST', body: formData });
                if (!response.ok) throw new Error((await response.json()).error || 'Analysis failed');
                const result = await response.json();
                router.push(`/results/${result.evaluationId}`);
            } catch (error) {
                alert(`Error during final analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsProcessing(false);
            }
        }, 500);
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-1 flex flex-col space-y-6">
                <div className="text-center lg:text-left">
                    <h1 className="text-4xl font-bold text-white mb-2">Live Evaluation</h1>
                    <p className="text-lg text-gray-300">Real-time analysis powered by R.I.S.E Veritas-Scale</p>
                </div>
                <GlassCard variant="strong" className="p-6 space-y-6 flex-grow">
                    <div className="relative z-30"><SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} /></div>
                    <div className="relative z-20"><ResidentSelector residents={residents} selected={selectedResident} setSelected={setSelectedResident} /></div>
                    <div className="pt-4">
                        <GlassButton 
                            variant={isSessionActive ? "secondary" : "primary"}
                            size="lg" 
                            onClick={isSessionActive ? stopSessionAndAnalyze : startSession}
                            disabled={!selectedSurgery || !selectedResident || status === 'connecting' || isProcessing} 
                            className="w-full"
                        >
                            {isProcessing ? 'Analyzing...' : (isSessionActive ? 'End Live Session' : 'Start Live Session')}
                        </GlassButton>
                    </div>
                    <div className="flex items-center justify-center pt-4 font-semibold">
                        {status === 'connected' && <div className="text-green-400">● Live</div>}
                        {status === 'connecting' && <div className="text-yellow-400">● Connecting...</div>}
                        {status === 'error' && <div className="text-red-500">● Error</div>}
                        {status === 'idle' && <div className="text-gray-400">● Idle</div>}
                    </div>
                </GlassCard>
            </div>
            <div className="lg:col-span-2 flex flex-col h-full">
                 <GlassCard variant="strong" className="p-6 flex-grow flex flex-col h-full">
                    <h3 className="text-2xl font-semibold text-white mb-4">Veritas Live Session</h3>
                    <div className="bg-black bg-opacity-20 rounded-2xl p-4 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-[400px]">
                        {chatHistory.length === 0 ? (
                             <div className="text-center text-gray-400 h-full flex flex-col items-center justify-center">
                                <Image src="/images/live-icon.svg" alt="Waiting" width={64} height={64} className="opacity-50 mb-4" />
                                <p>Waiting for session to start...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {chatHistory.map((entry, index) => (
                                    <div key={index} className={`flex flex-col ${entry.speaker === 'Veritas' ? 'items-center text-center' : 'items-start'}`}>
                                        <div className={`p-3 rounded-2xl max-w-lg ${
                                            entry.speaker === 'Veritas' 
                                                ? 'bg-purple-900 bg-opacity-50'
                                                : ('isFinal' in entry && entry.isFinal) ? 'bg-gray-700' : 'bg-gray-800 text-gray-400'
                                        }`}>
                                            <p className="font-semibold text-sm mb-1 text-purple-300">{entry.speaker}</p>
                                            <p className="text-white">{'text' in entry ? entry.text : ''}</p>
                                        </div>
                                    </div>
                                ))}
                                {isAiThinking && (
                                    <div className="flex items-center justify-center text-center">
                                        <div className="p-3 rounded-2xl max-w-lg bg-purple-900 bg-opacity-50 animate-pulse">
                                            <p className="font-semibold text-sm mb-1 text-purple-300">Veritas</p>
                                            <p className="text-white italic">... thinking</p>
                                        </div>
                                    </div>
                                )}
                                <div ref={transcriptEndRef} />
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default LiveEvaluationPage;