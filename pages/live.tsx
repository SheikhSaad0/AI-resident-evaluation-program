// In pages/live.tsx

import { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent, useContext } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
// Corrected Imports: Removed curly braces for default exports
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import GlassInput from '../components/ui/GlassInput';
import ResidentSelector from '../components/ResidentSelector';
import SurgerySelector from '../components/SurgerySelector';
import { EVALUATION_CONFIGS } from '../lib/evaluation-configs';
import { useApi } from '../lib/useApi';
import { AuthContext } from '../lib/auth';

// --- INTERFACES ---
interface Resident { id: string; name: string; photoUrl?: string | null; year?: string; }
interface TranscriptEntry { speaker: string; text: string; isFinal: boolean; }
interface AiResponse {
    action: string;
    payload?: any;
    speak?: string;
}
type ChatEntry = TranscriptEntry | { speaker: 'Veritas'; text:string; };

interface LiveSessionState {
    currentStepIndex: number;
    timeElapsedInSession: number;
    timeElapsedInStep: number;
    currentStepName: string;
}

const DEBOUNCE_TIME_MS = 2000;

const LiveEvaluationPage = () => {
    const router = useRouter();
    const { apiFetch } = useApi();
    const auth = useContext(AuthContext);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [selectedSpeaker, setSelectedSpeaker] = useState('0');

    // State for dynamically setting the WebSocket URL
    const [websocketUrl, setWebsocketUrl] = useState('');

    const [currentState, setCurrentState] = useState<LiveSessionState>({
        currentStepIndex: 0,
        timeElapsedInSession: 0,
        timeElapsedInStep: 0,
        currentStepName: '',
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
    const checkInTriggeredRef = useRef<boolean>(false);
    const stepExceededTriggeredRef = useRef<boolean>(false);

    useEffect(() => { stateRef.current = currentState; }, [currentState]);
    useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isAiProcessing]);

    // Effect to set the WebSocket URL based on the window's location
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            setWebsocketUrl(`${protocol}//${host}`);
        }
    }, []);

    useEffect(() => {
        const fetchResidents = async () => {
            try {
                const residentsData = await apiFetch('/api/residents');
                setResidents(residentsData);
            } catch (error) { console.error("Failed to fetch residents:", error); }
        };
        fetchResidents();
    }, [apiFetch]);

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
        if (!text) return;
        try {
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
                 console.error("[TTS] Request failed");
            }
        } catch (error) {
            console.error("[TTS] Error fetching audio:", error);
        }
    }, [playNextInQueue]);

    const addVeritasMessage = useCallback((text: string, shouldSpeak: boolean = true) => {
        setChatHistory(prev => [...prev, { speaker: 'Veritas', text }]);
        fullTranscriptRef.current += `[Veritas] ${text}\n`;
        if (shouldSpeak) {
            speakText(text);
        }
    }, [speakText]);

    const processTranscriptWithAI = useCallback(async (isInitial = false) => {
        if (isAiProcessing) return;
        setIsAiProcessing(true);

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
        if (!procedureId) {
            setIsAiProcessing(false);
            return;
        }

        const requestBody = {
            transcript: isInitial ? "SESSION_START" : fullTranscriptRef.current,
            procedureId,
            currentState: stateRef.current,
            liveNotes: liveNotesRef.current,
        };

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) throw new Error(`AI API request failed with status ${response.status}`);

            const aiData: AiResponse = await response.json();
            const spokenResponse = aiData.speak || (typeof aiData.payload === 'string' ? aiData.payload : null);
            const actionsThatSpeak = ['SPEAK', 'START_TIMEOUT', 'COMPLETE_TIMEOUT', 'CHANGE_STEP', 'LOG_SCORE', 'ADD_COMMENT'];

            if (spokenResponse && actionsThatSpeak.includes(aiData.action)) {
                addVeritasMessage(spokenResponse, true);
            }

            switch (aiData.action) {
                case 'CHANGE_STEP':
                    if (aiData.payload?.stepKey) {
                        const config = EVALUATION_CONFIGS[procedureId as keyof typeof EVALUATION_CONFIGS];
                        const newStepIndex = config.procedureSteps.findIndex(step => step.key === aiData.payload.stepKey);
                        if (newStepIndex !== -1 && newStepIndex !== stateRef.current.currentStepIndex) {
                            // Log the duration of the previous step
                            const previousStep = config.procedureSteps[stateRef.current.currentStepIndex];
                            const durationInSeconds = stateRef.current.timeElapsedInStep;
                            const durationFormatted = `${Math.floor(durationInSeconds / 60)} minutes and ${durationInSeconds % 60} seconds`;
                            liveNotesRef.current.push({
                                action: 'LOG_STEP_DURATION',
                                payload: {
                                    step: previousStep.name,
                                    duration: durationFormatted,
                                },
                                timestamp: new Date().toISOString(),
                            });

                            setCurrentState(prev => ({
                                ...prev,
                                currentStepIndex: newStepIndex,
                                timeElapsedInStep: 0,
                                currentStepName: config.procedureSteps[newStepIndex].name,
                            }));
                            checkInTriggeredRef.current = false;
                            stepExceededTriggeredRef.current = false;
                        }
                    }
                    break;
                case 'LOG_SCORE':
                case 'ADD_COMMENT':
                case 'LOG_STEP_DURATION':
                    liveNotesRef.current.push({ action: aiData.action, payload: aiData.payload, timestamp: new Date().toISOString() });
                    break;
            }

        } catch (error) {
            console.error("[AI] Error processing transcript:", error);
            addVeritasMessage("I've encountered an error. Please check the console.", true);
        } finally {
            setIsAiProcessing(false);
        }
    }, [selectedSurgery, isAiProcessing, addVeritasMessage]);

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

    useEffect(() => {
        if (!isSessionActive || isAiProcessing) return;

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
        if (!procedureId) return;

        const currentStepConfig = EVALUATION_CONFIGS[procedureId].procedureSteps[currentState.currentStepIndex];
        if (!currentStepConfig?.time) return;

        const timeParts = currentStepConfig.time.replace(' min', '').split('-');
        const maxTimeMinutes = parseInt(timeParts[1], 10);
        if (isNaN(maxTimeMinutes)) return;

        const checkInTimeSeconds = maxTimeMinutes * 60 * 0.75;
        const stepExceededTimeSeconds = maxTimeMinutes * 60 * 1.15;

        if (currentState.timeElapsedInStep >= checkInTimeSeconds && !checkInTriggeredRef.current) {
            checkInTriggeredRef.current = true;
            const timeElapsed = stateRef.current.timeElapsedInStep;
            const stepName = stateRef.current.currentStepName;
            const message = `We've been on ${stepName} for ${Math.floor(timeElapsed / 60)} minutes and ${timeElapsed % 60} seconds. Attending, how is the resident progressing? Should they continue, or would you like to take over?`;
            addVeritasMessage(message, true);
        }

        if (currentState.timeElapsedInStep >= stepExceededTimeSeconds && !stepExceededTriggeredRef.current) {
            stepExceededTriggeredRef.current = true;
            addVeritasMessage("Have we moved on to the next step?", true);
        }

    }, [currentState.timeElapsedInStep, isSessionActive, isAiProcessing, selectedSurgery, currentState.currentStepIndex, processTranscriptWithAI, addVeritasMessage]);


    const startSession = async () => {
        if (!selectedResident || !selectedSurgery) {
            alert("Please select a surgery and a resident.");
            return;
        }
        if (!websocketUrl) {
            alert("WebSocket URL not ready. Please wait a moment and try again.");
            return;
        }
        setStatus('connecting');
        setChatHistory([]);
        fullTranscriptRef.current = "";
        liveNotesRef.current = [];
        recordedChunksRef.current = [];
        checkInTriggeredRef.current = false;
        stepExceededTriggeredRef.current = false;

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
        const initialStepName = procedureId ? EVALUATION_CONFIGS[procedureId].procedureSteps[0].name : '';

        setCurrentState({
            currentStepIndex: 0,
            timeElapsedInSession: 0,
            timeElapsedInStep: 0,
            currentStepName: initialStepName,
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            micRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    console.log(`[Mic] Sending audio chunk: ${event.data.size} bytes`); // <-- Add this line for debugging
                    recordedChunksRef.current.push(event.data);
                    socketRef.current?.send(event.data);
                }
            };

            // Use the dynamic websocketUrl from state
            const wsUrl = `${websocketUrl}/api/deepgram?residentName=${encodeURIComponent(selectedResident.name)}`;
            socketRef.current = new WebSocket(wsUrl);

            socketRef.current.onopen = () => {
                setStatus('connected');
                setIsSessionActive(true);
                micRecorderRef.current?.start(250); // <-- Change this to 250ms
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
                            if (socketRef.current?.readyState === WebSocket.OPEN) {
                                processTranscriptWithAI();
                            }
                        }, DEBOUNCE_TIME_MS);
                    }
                }
            };

            socketRef.current.onclose = () => {
                setStatus('idle');
                setIsSessionActive(false);
                stream.getTracks().forEach(track => track.stop());
            };
            socketRef.current.onerror = (err) => {
                setStatus('error');
            }
        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('error');
        }
    };

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
                const database = auth?.database || 'testing';
                const response = await fetch(`/api/analyze-full-session?db=${database}`, { method: 'POST', body: formData });
                if (!response.ok) throw new Error((await response.json()).error || 'Analysis failed');
                const result = await response.json();
                router.push(`/results/${result.evaluationId}`);
            } catch (error) {
                alert(`Error during final analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsProcessing(false);
            }
        }, 500);
    };

    const handleTextSubmit = () => {
        if (!textInput.trim() || !isSessionActive) return;

        const newEntry: TranscriptEntry = {
            speaker: selectedSpeaker === '0' ? 'Attending' : 'Resident',
            text: textInput,
            isFinal: true,
        };

        setChatHistory(prev => [...prev, newEntry]);
        fullTranscriptRef.current += `[${newEntry.speaker}] ${newEntry.text}\n`;
        setTextInput('');

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            processTranscriptWithAI();
        }, 500);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleTextSubmit();
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
                                    <div key={index} className={`flex flex-col ${entry.speaker === 'Veritas' ? 'items-center text-center' : (entry.speaker === 'Attending' ? 'items-start' : 'items-end') }`}>
                                        <div className={`p-3 rounded-2xl max-w-lg ${
                                            entry.speaker === 'Veritas'
                                                ? 'bg-purple-900 bg-opacity-50'
                                                : entry.speaker === 'Attending' ? 'bg-blue-900 bg-opacity-60' : 'bg-gray-700'
                                        }`}>
                                            <p className={`font-semibold text-sm mb-1 ${
                                                entry.speaker === 'Veritas' ? 'text-purple-300' : entry.speaker === 'Attending' ? 'text-blue-300' : 'text-gray-300'
                                            }`}>{entry.speaker}</p>
                                            <p className="text-white">{'text' in entry ? entry.text : ''}</p>
                                        </div>
                                    </div>
                                ))}
                                {isAiProcessing && (
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
                    <div className="mt-4 flex items-center gap-4">
                        <select
                            value={selectedSpeaker}
                            onChange={(e) => setSelectedSpeaker(e.target.value)}
                            className="bg-black bg-opacity-30 border border-gray-600 text-white p-2 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            disabled={!isSessionActive}
                        >
                            <option value="0">Attending</option>
                            <option value="1">Resident</option>
                        </select>
                        <GlassInput
                            type="text"
                            value={textInput}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setTextInput(e.target.value)}
                            placeholder={isSessionActive ? "Type transcript here..." : "Start a session to begin"}
                            className="flex-grow"
                            onKeyDown={handleKeyDown}
                            disabled={!isSessionActive}
                        />
                        <GlassButton onClick={handleTextSubmit} disabled={!isSessionActive || !textInput.trim()}>Send</GlassButton>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default LiveEvaluationPage;