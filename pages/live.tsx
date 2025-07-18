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
interface AiResponsePayload { step?: string; score?: number; }
interface AiResponse { action: string; payload?: any; }
type ChatEntry = TranscriptEntry | { speaker: 'Veritas'; text: string; };

interface LiveSessionState {
    isStartOfCase: boolean;
    currentStepIndex: number;
    timeElapsedInSession: number;
    timeElapsedInStep: number;
    lastScoreLogTime: number; // Stored as a timestamp
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
const PROACTIVE_CHECKIN_SECONDS = 180; // 3 minutes

const LiveEvaluationPage = () => {
    const router = useRouter();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');

    const [currentState, setCurrentState] = useState<LiveSessionState>({
        isStartOfCase: true,
        currentStepIndex: 0,
        timeElapsedInSession: 0,
        timeElapsedInStep: 0,
        lastScoreLogTime: 0,
    });

    const stateRef = useRef(currentState);
    const fullTranscriptRef = useRef<string>("");
    const liveNotesRef = useRef<any[]>([]);
    const micRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    // --- FIX: Correctly declare recordedChunksRef here ---
    const recordedChunksRef = useRef<Blob[]>([]);

    // Keep stateRef in sync with currentState
    useEffect(() => {
        stateRef.current = currentState;
    }, [currentState]);

    // Fetch residents on mount
    useEffect(() => {
        const fetchResidents = async () => {
            try {
                const res = await fetch('/api/residents');
                if (res.ok) setResidents(await res.json());
            } catch (error) { console.error("Failed to fetch residents:", error); }
        };
        fetchResidents();
    }, []);

    // Scroll chat to the bottom on new message
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Cleanup websockets and timers on unmount
    useEffect(() => {
        return () => {
            socketRef.current?.close();
            if (micRecorderRef.current?.state === 'recording') {
                micRecorderRef.current.stop();
            }
        };
    }, []);

    // Helper to add a message from Veritas to the chat
    const addVeritasMessage = useCallback((text: string) => {
        setChatHistory(prev => [...prev, { speaker: 'Veritas', text }]);
        fullTranscriptRef.current += `[Veritas] ${text}\n`;
    }, []);

    const getAiResponse = useCallback(async () => {
        const currentLiveState = stateRef.current;
        if (!selectedSurgery) return;

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
        if (!procedureId) return;

        const config = EVALUATION_CONFIGS[procedureId];
        const currentStep = config.procedureSteps[currentLiveState.currentStepIndex];
        const nextStep = config.procedureSteps[currentLiveState.currentStepIndex + 1];

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: fullTranscriptRef.current,
                    procedureId,
                    currentState: {
                        ...currentLiveState,
                        currentStepName: currentStep?.name || "End of Procedure",
                        nextStepName: nextStep?.name || "N/A",
                    },
                }),
            });

            if (!response.ok) return;
            const aiData: AiResponse = await response.json();
            if (aiData.action === 'none') return;

            liveNotesRef.current.push(aiData);

            if (aiData.action === 'CONFIRM_TIMEOUT' && stateRef.current.isStartOfCase) {
                setCurrentState(prev => ({ ...prev, isStartOfCase: false, lastScoreLogTime: Date.now() }));
                addVeritasMessage(aiData.payload);
            } else if (aiData.action === 'SPEAK') {
                addVeritasMessage(aiData.payload);
            } else if (aiData.action === 'LOG_SCORE' && aiData.payload) {
                const { step: stepName, score } = aiData.payload;
                const loggedStepIndex = config.procedureSteps.findIndex(s => s.name === stepName);

                if (loggedStepIndex !== -1) {
                    addVeritasMessage(`Noted: Score of ${score} for ${stepName}.`);
                    setCurrentState(prev => ({
                        ...prev,
                        currentStepIndex: loggedStepIndex + 1,
                        timeElapsedInStep: 0,
                        lastScoreLogTime: Date.now(),
                    }));
                }
            }
        } catch (error) {
            console.error("Error fetching AI response:", error);
        }
    }, [selectedSurgery, addVeritasMessage]);

    // Main Timer and Proactive Check-in Logic
    useEffect(() => {
        if (!isSessionActive || currentState.isStartOfCase) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const timeSinceLastScore = (now - stateRef.current.lastScoreLogTime) / 1000;

            if (timeSinceLastScore > PROACTIVE_CHECKIN_SECONDS) {
                addVeritasMessage("Just checking in, it's been a few minutes. Is there any feedback or a score to log?");
                setCurrentState(prev => ({ ...prev, lastScoreLogTime: now }));
            }

            setCurrentState(prev => ({
                ...prev,
                timeElapsedInSession: prev.timeElapsedInSession + 1,
                timeElapsedInStep: prev.timeElapsedInStep + 1,
            }));
        }, 1000);

        return () => clearInterval(timer);
    }, [isSessionActive, currentState.isStartOfCase, addVeritasMessage]);

    const startSession = async () => {
        if (!selectedResident || !selectedSurgery) {
            alert("Please select a surgery and a resident.");
            return;
        }

        setStatus('connecting');
        setChatHistory([]);
        fullTranscriptRef.current = "";
        liveNotesRef.current = [];
        // --- FIX: Correctly reset the ref's current value ---
        recordedChunksRef.current = [];

        setCurrentState({
            isStartOfCase: true,
            currentStepIndex: 0,
            timeElapsedInSession: 0,
            timeElapsedInStep: 0,
            lastScoreLogTime: Date.now(),
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            // --- FIX: ondataavailable pushes to the component-level ref ---
            micRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(event.data);
                    }
                }
            };
            
            const wsUrl = `${WEBSOCKET_URL}?residentName=${encodeURIComponent(selectedResident.name)}`;
            socketRef.current = new WebSocket(wsUrl);

            socketRef.current.onopen = () => {
                setStatus('connected');
                setIsSessionActive(true);
                micRecorderRef.current?.start(1000);
                addVeritasMessage("Time-out initiated. Please state your names, roles, and the planned procedure for the record.");
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
                        getAiResponse();
                    }
                }
            };

            socketRef.current.onclose = () => {
                setStatus('idle');
                setIsSessionActive(false);
                stream.getTracks().forEach(track => track.stop());
            };

            socketRef.current.onerror = () => setStatus('error');
        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('error');
        }
    };

    const stopSessionAndAnalyze = async () => {
        setIsProcessing(true);
        if (micRecorderRef.current?.state === "recording") {
            micRecorderRef.current.stop();
        }
        socketRef.current?.close();

        setTimeout(async () => {
            // --- FIX: Uses the correctly populated component-level ref ---
            const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'live_recording.webm');
            formData.append('residentId', selectedResident!.id);
            formData.append('surgery', selectedSurgery);
            formData.append('fullTranscript', fullTranscriptRef.current);
            formData.append('liveNotes', JSON.stringify(liveNotesRef.current));

            try {
                const response = await fetch('/api/analyze-full-session', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Analysis failed');
                }
                const result = await response.json();
                router.push(`/results/${result.evaluationId}`);
            } catch (error) {
                alert(`Error during final analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsProcessing(false);
            }
        }, 500);
    };
    
    const handleButtonClick = isSessionActive ? stopSessionAndAnalyze : startSession;

    const getStatusIndicator = () => {
        switch (status) {
            case 'connected': return <div className="text-green-400">● Live</div>;
            case 'connecting': return <div className="text-yellow-400">● Connecting...</div>;
            case 'error': return <div className="text-red-500">● Error</div>;
            default: return <div className="text-gray-400">● Idle</div>;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-1 flex flex-col space-y-6">
                <div className="text-center lg:text-left">
                    <h1 className="text-4xl font-bold text-white mb-2">Live Evaluation</h1>
                    <p className="text-lg text-gray-300">Real-time analysis powered by R.I.S.E Veritas-Scale</p>
                </div>
                <GlassCard variant="strong" className="p-6 space-y-6 flex-grow">
                    <div className="relative z-30">
                        <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
                    </div>
                    <div className="relative z-20">
                        <ResidentSelector residents={residents} selected={selectedResident} setSelected={setSelectedResident} />
                    </div>
                    <div className="pt-4">
                        <GlassButton 
                            variant={isSessionActive ? "secondary" : "primary"}
                            size="lg" 
                            onClick={handleButtonClick}
                            disabled={!selectedSurgery || !selectedResident || status === 'connecting' || isProcessing} 
                            className="w-full"
                        >
                            {isProcessing ? 'Analyzing...' : (isSessionActive ? 'End Live Session' : 'Start Live Session')}
                        </GlassButton>
                    </div>
                    <div className="flex items-center justify-center pt-4 font-semibold">
                        {getStatusIndicator()}
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