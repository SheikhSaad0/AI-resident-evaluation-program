import { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import GlassInput from '../components/ui/GlassInput';
import ResidentSelector from '../components/ResidentSelector';
import SurgerySelector from '../components/SurgerySelector';
import { EVALUATION_CONFIGS } from '../lib/evaluation-configs';

// --- INTERFACES ---
interface Resident { id: string; name: string; pgy?: string; }
interface TranscriptEntry { speaker: string; text: string; isFinal: boolean; }
interface AiResponse { action: string; payload?: any; speak?: string; }
type ChatEntry = TranscriptEntry | { speaker: 'Veritas'; text:string; };
type TimeoutState = 'pending' | 'attending_done' | 'complete';

interface LiveSessionState {
    currentStepIndex: number;
    timeElapsedInSession: number;
    timeElapsedInStep: number;
    currentStepName: string;
    halfwayAlertTriggeredForStep: number | null;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
const WAKE_WORDS = ["hey veritas", "hey rise"];

const LiveEvaluationPage = () => {
    const router = useRouter();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [selectedSpeaker, setSelectedSpeaker] = useState('0'); // 0: Attending, 1: Resident
    const [attendingLastName, setAttendingLastName] = useState<string>('');
    const [timeoutState, setTimeoutState] = useState<TimeoutState>('pending');

    const [currentState, setCurrentState] = useState<LiveSessionState>({
        currentStepIndex: 0,
        timeElapsedInSession: 0,
        timeElapsedInStep: 0,
        currentStepName: '',
        halfwayAlertTriggeredForStep: null,
    });

    const stateRef = useRef(currentState);
    const fullTranscriptRef = useRef<string>("");
    const liveNotesRef = useRef<any[]>([]);
    const micRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const audioQueueRef = useRef<HTMLAudioElement[]>([]);
    const isPlayingAudioRef = useRef(false);

    useEffect(() => { stateRef.current = currentState; }, [currentState]);
    useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isAiProcessing]);

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
        };
    }, []);

    const playNextInQueue = useCallback(() => {
        if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;
        isPlayingAudioRef.current = true;
        const audio = audioQueueRef.current.shift();
        if (audio) {
            audio.play();
            audio.onended = () => {
                isPlayingAudioRef.current = false;
                playNextInQueue();
            };
        }
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
        if (shouldSpeak) {
            speakText(text);
        }
    }, [speakText]);

    const processTranscriptWithAI = useCallback(async (transcript: string) => {
        if (isAiProcessing) return;
        setIsAiProcessing(true);

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
        if (!procedureId) {
            setIsAiProcessing(false);
            return;
        }

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    procedureId,
                    currentState: stateRef.current,
                    liveNotes: liveNotesRef.current,
                    attendingLastName,
                }),
            });

            if (!response.ok) throw new Error(`AI API request failed`);

            const aiData: AiResponse = await response.json();
            if (aiData.action !== 'none' && aiData.speak) {
                addVeritasMessage(aiData.speak, true);
            }

            switch (aiData.action) {
                case 'CHANGE_STEP':
                    if (aiData.payload?.stepKey) {
                        const config = EVALUATION_CONFIGS[procedureId as keyof typeof EVALUATION_CONFIGS];
                        const newStepIndex = config.procedureSteps.findIndex(step => step.key === aiData.payload.stepKey);
                        if (newStepIndex !== -1) {
                            setCurrentState(prev => ({
                                ...prev,
                                currentStepIndex: newStepIndex,
                                timeElapsedInStep: 0,
                                currentStepName: config.procedureSteps[newStepIndex].name,
                                halfwayAlertTriggeredForStep: null,
                            }));
                        }
                    }
                    break;
                case 'LOG_NOTE':
                case 'LOG_SCORE':
                case 'ADD_COMMENT':
                    liveNotesRef.current.push({ action: aiData.action, payload: aiData.payload, timestamp: new Date().toISOString() });
                    break;
            }
        } catch (error) {
            console.error("[AI] Error processing transcript:", error);
        } finally {
            setIsAiProcessing(false);
        }
    }, [selectedSurgery, isAiProcessing, addVeritasMessage, attendingLastName]);

    // Main session timer and halfway alert logic
    useEffect(() => {
        if (!isSessionActive || timeoutState !== 'complete') return;

        const timer = setInterval(() => {
            const newState = {
                ...stateRef.current,
                timeElapsedInSession: stateRef.current.timeElapsedInSession + 1,
                timeElapsedInStep: stateRef.current.timeElapsedInStep + 1,
            };
            setCurrentState(newState);

            const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
            if (!procedureId) return;

            const currentStepConfig = EVALUATION_CONFIGS[procedureId].procedureSteps[newState.currentStepIndex];
            if (currentStepConfig?.time && newState.halfwayAlertTriggeredForStep !== newState.currentStepIndex) {
                const timeParts = currentStepConfig.time.split('-').map(t => parseInt(t, 10));
                const halfwayPointSeconds = ((timeParts[0] + timeParts[1]) / 2) * 60 * 0.5;

                if (newState.timeElapsedInStep >= halfwayPointSeconds) {
                    setCurrentState(prev => ({ ...prev, halfwayAlertTriggeredForStep: prev.currentStepIndex }));
                    const triggerTranscript = `${fullTranscriptRef.current}\n[SYSTEM] TRIGGER_HALFWAY_ALERT`;
                    processTranscriptWithAI(triggerTranscript);
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isSessionActive, selectedSurgery, timeoutState, processTranscriptWithAI]);

    const handleNewTranscript = useCallback((entry: TranscriptEntry) => {
        const text = entry.text.toLowerCase();
        fullTranscriptRef.current += `[${entry.speaker}] ${entry.text}\n`;

        // State machine for timeout
        if (timeoutState === 'pending' && entry.speaker === 'Attending') {
            const nameMatch = text.match(/dr\.? ([a-z]+)/i);
            if (nameMatch && nameMatch[1]) {
                setAttendingLastName(nameMatch[1]);
            }
            setTimeoutState('attending_done');
            return; // Don't process with AI yet
        }

        if (timeoutState === 'attending_done' && entry.speaker === 'Resident') {
            setTimeoutState('complete');
            // Trigger timeout completion with the AI
            processTranscriptWithAI("[SYSTEM] TRIGGER_TIMEOUT_COMPLETE");
            return;
        }

        // Only process with AI if a wake word is detected
        if (timeoutState === 'complete') {
             const containsWakeWord = WAKE_WORDS.some(word => text.includes(word));
             if(containsWakeWord){
                 processTranscriptWithAI(fullTranscriptRef.current);
             }
        }

    }, [timeoutState, processTranscriptWithAI]);

    const startSession = async () => {
        if (!selectedResident || !selectedSurgery) return;
        setStatus('connecting');
        setChatHistory([]);
        fullTranscriptRef.current = "";
        liveNotesRef.current = [];
        recordedChunksRef.current = [];
        setTimeoutState('pending');

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === selectedSurgery);
        const initialStepName = procedureId ? EVALUATION_CONFIGS[procedureId].procedureSteps[0].name : '';

        setCurrentState({
            currentStepIndex: 0,
            timeElapsedInSession: 0,
            timeElapsedInStep: 0,
            currentStepName: initialStepName,
            halfwayAlertTriggeredForStep: null,
        });

        // Initial message from Veritas
        addVeritasMessage("Time-out initiated. Please state your name and role, starting with the attending surgeon.");

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
                setStatus('connected');
                setIsSessionActive(true);
                micRecorderRef.current?.start(1000);
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
                        handleNewTranscript(newEntry);
                    }
                }
            };
            socketRef.current.onclose = () => {
                setStatus('idle');
                setIsSessionActive(false);
                stream.getTracks().forEach(track => track.stop());
            };
            socketRef.current.onerror = (err) => {
                console.error("WebSocket Error:", err);
                setStatus('error');
            };
        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('error');
        }
    };

    const stopSessionAndAnalyze = async () => {
        setIsProcessing(true);
        micRecorderRef.current?.stop();
        socketRef.current?.close();

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
            } finally {
                setIsProcessing(false);
            }
        }, 500);
    };

    const handleTextSubmit = () => {
        if (!textInput.trim() || !isSessionActive) return;

        const speakerName = selectedSpeaker === '0' ? 'Attending' : 'Resident';
        const newEntry: TranscriptEntry = {
            speaker: speakerName,
            text: textInput,
            isFinal: true,
        };

        setChatHistory(prev => [...prev, newEntry]);
        handleNewTranscript(newEntry);
        setTextInput('');
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
                    <div className="relative z-30"><SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} disabled={isSessionActive} /></div>
                    <div className="relative z-20"><ResidentSelector residents={residents} selected={selectedResident} setSelected={setSelectedResident} disabled={isSessionActive}/></div>
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