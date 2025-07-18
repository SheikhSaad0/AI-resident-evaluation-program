import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { GlassCard, GlassButton } from '../components/ui';
import ResidentSelector from '../components/ResidentSelector';
import SurgerySelector from '../components/SurgerySelector';
// Make sure this path is correct for your project structure
import { EVALUATION_CONFIGS } from '../lib/evaluation-configs';

// --- INTERFACES ---
interface Resident {
    id: string;
    name: string;
    photoUrl?: string | null;
    year?: string;
}

interface TranscriptEntry {
    speaker: string;
    text: string;
    isFinal: boolean;
}

interface AiResponse {
    speaker: 'Veritas';
    text: string;
    action: string;
    payload?: any;
}

type ChatEntry = TranscriptEntry | AiResponse;

// A type for the live session state required by the AI
interface LiveSessionState {
    isStartOfCase: boolean;
    currentStepName: string;
    nextStepName: string;
    timeElapsedInStep: number;
    attendingName: string; // This could be made dynamic in the future
    residentName: string;
}

const WEBSOCKET_URL = "ws://localhost:3001";

const LiveEvaluationPage = () => {
    const router = useRouter();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    // This state will continue to hold the full surgery NAME, e.g., "Laparoscopic Cholecystectomy"
    const [selectedSurgery, setSelectedSurgery] = useState('');

    const [currentState, setCurrentState] = useState<LiveSessionState>({
        isStartOfCase: true,
        currentStepName: 'Procedure Start',
        nextStepName: 'Initial Incision', // Example, this would be dynamic
        timeElapsedInStep: 0,
        attendingName: 'Attending',
        residentName: '',
    });

    const micRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const fullTranscriptRef = useRef<string>("");
    const recordedChunksRef = useRef<Blob[]>([]);
    const liveNotesRef = useRef<any[]>([]);

    // Fetch residents on component mount
    useEffect(() => {
        const fetchResidents = async () => {
            try {
                const res = await fetch('/api/residents');
                if (res.ok) setResidents(await res.json());
            } catch (error) {
                console.error("Failed to fetch residents:", error);
            }
        };
        fetchResidents();
    }, []);

    // Auto-scroll chat history
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);
    
    // Sync resident name to current state when selected
    useEffect(() => {
        if (selectedResident) {
            setCurrentState(prev => ({ ...prev, residentName: selectedResident.name }));
        }
    }, [selectedResident]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) socketRef.current.close();
            if (micRecorderRef.current && micRecorderRef.current.state === 'recording') {
                micRecorderRef.current.stop();
            }
        };
    }, []);

    // --- FINAL CORRECTED FUNCTION ---
    const getAiResponse = async (transcript: string) => {
        if (!selectedSurgery || !currentState) {
            console.error("AI call skipped: Missing surgery or state information.");
            return;
        }

        // Find the procedure ID by searching through the imported configs object
        let procedureId: string | null = null;
        for (const key in EVALUATION_CONFIGS) {
            if (EVALUATION_CONFIGS[key].name === selectedSurgery) {
                procedureId = key; // Found the matching ID (e.g., 'lap_chole')
                break;
            }
        }

        // If no ID was found, the selection is invalid.
        if (!procedureId) {
            const errorMessage = `Invalid procedure selected: "${selectedSurgery}". No matching configuration found.`;
            console.error(errorMessage);
            setChatHistory(prev => [...prev, { speaker: 'Veritas', text: `Error: ${errorMessage}`, action: 'error' }]);
            return;
        }

        // Proceed with the API call using the correct ID
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    procedureId, // Pass the correct ID we just found
                    currentState,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "AI API request failed");
            }
            
            const aiData = await response.json();

            // ✅ THIS IS THE CORRECTED LOGIC BLOCK
            if (aiData.action && aiData.action !== 'none') {
                 if (aiData.action === 'speak') {
                    const aiSpeechText = aiData.payload;
                    // 1. Add AI response to the visual chat history
                    setChatHistory(prev => [...prev, { speaker: 'Veritas', text: aiSpeechText, action: 'speak' }]);
                    // 2. ALSO add AI response to the permanent transcript record
                    fullTranscriptRef.current += `[Veritas] ${aiSpeechText}\n`;
                 }
                 // Add the AI's action (speak, note, etc.) to the live notes for final analysis
                 liveNotesRef.current.push(aiData);
            }

            if (currentState.isStartOfCase) {
                setCurrentState(prev => ({ ...prev, isStartOfCase: false }));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching AI response:", errorMessage);
            setChatHistory(prev => [...prev, { speaker: 'Veritas', text: "I'm having trouble connecting.", action: 'error' }]);
        }
    };
    
    const startSession = async () => {
        if (isSessionActive || !selectedResident || !selectedSurgery) {
            alert('Please select a surgery and a resident first.');
            return;
        }
        
        setStatus('connecting');
        setChatHistory([]);
        fullTranscriptRef.current = ""; 
        recordedChunksRef.current = [];
        liveNotesRef.current = [];
        
        setCurrentState({
            isStartOfCase: true,
            currentStepName: 'Procedure Start',
            nextStepName: 'Initial Incision',
            timeElapsedInStep: 0,
            attendingName: 'Attending',
            residentName: selectedResident.name,
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            micRecorderRef.current = mediaRecorder;

            mediaRecorder.addEventListener("dataavailable", event => {
                if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(event.data);
                    recordedChunksRef.current.push(event.data);
                }
            });

            const wsUrl = `${WEBSOCKET_URL}?residentName=${encodeURIComponent(selectedResident.name)}`;
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("WebSocket connection established.");
                setStatus('connected');
                setIsSessionActive(true);
                mediaRecorder.start(1000);
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript') {
                    const newEntry: TranscriptEntry = data.entry;
                    
                    setChatHistory(prevChat => {
                        const lastEntry = prevChat[prevChat.length - 1];
                        if (lastEntry && 'isFinal' in lastEntry && !lastEntry.isFinal && lastEntry.speaker === newEntry.speaker) {
                            return [...prevChat.slice(0, -1), newEntry];
                        } else {
                            return [...prevChat, newEntry];
                        }
                    });

                    if (newEntry.isFinal && newEntry.text.trim().length > 0) {
                        const newText = `[${newEntry.speaker}] ${newEntry.text}\n`;
                        fullTranscriptRef.current += newText;
                        getAiResponse(fullTranscriptRef.current);
                    }
                }
            };
            
            socket.onclose = () => {
                console.log("WebSocket connection closed.");
                setStatus('idle');
                setIsSessionActive(false);
                if (micRecorderRef.current?.state === 'recording') {
                    micRecorderRef.current.stop();
                }
                stream.getTracks().forEach(track => track.stop());
            };

            socket.onerror = (error) => {
                console.error("WebSocket Error:", error);
                setStatus('error');
            };

        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('error');
        }
    };

    const stopSessionAndAnalyze = async () => {
        if (micRecorderRef.current?.state === "recording") {
            micRecorderRef.current.stop();
        }
        if (socketRef.current) {
            socketRef.current.close();
        }

        setIsProcessing(true);

        setTimeout(async () => {
            const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'live_recording.webm');
            formData.append('residentId', selectedResident!.id);
            formData.append('surgery', selectedSurgery);
            // This now contains both resident and AI speech
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
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('Error during final analysis:', error);
                alert(`An error occurred during the final analysis: ${errorMessage}`);
                setIsProcessing(false);
            }
        }, 500);
    };

    const handleButtonClick = () => {
        if (isSessionActive) {
            stopSessionAndAnalyze();
        } else {
            startSession();
        }
    };

    const getStatusIndicator = () => {
        switch (status) {
            case 'connected': return <div className="status-success">● Live</div>;
            case 'connecting': return <div className="status-warning">● Connecting...</div>;
            case 'error': return <div className="status-error">● Error</div>;
            default: return <div className="status-info">● Idle</div>;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Left Column: Setup and Controls */}
            <div className="lg:col-span-1 flex flex-col space-y-6">
                <div className="text-center lg:text-left">
                    <h1 className="heading-xl text-gradient mb-2">Live Evaluation</h1>
                    <p className="text-text-tertiary text-lg">Real-time analysis powered by R.I.S.E Veritas-Scale</p>
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
                    <div className="flex items-center justify-center pt-4">
                        {getStatusIndicator()}
                    </div>
                </GlassCard>
            </div>

            {/* Right Column: Transcript and Chat */}
            <div className="lg:col-span-2 flex flex-col h-full">
                 <GlassCard variant="strong" className="p-6 flex-grow flex flex-col h-full">
                    <h3 className="heading-md mb-4">Veritas Live Session</h3>
                    <div className="glassmorphism-subtle rounded-2xl p-4 flex-grow overflow-y-auto scrollbar-glass min-h-[300px]">
                        {chatHistory.length === 0 ? (
                             <div className="text-center text-text-tertiary h-full flex flex-col items-center justify-center">
                                <Image src="/images/live-icon.svg" alt="Waiting" width={64} height={64} className="opacity-50 mb-4" />
                                <p>Waiting for session to start...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {chatHistory.map((entry, index) => (
                                    <div key={index} className={`flex flex-col ${entry.speaker === 'Veritas' ? 'items-center' : 'items-start'}`}>
                                        <div className={`p-3 rounded-2xl max-w-lg ${
                                            entry.speaker === 'Veritas' 
                                                ? 'bg-purple-500/30 text-center'
                                                : 'isFinal' in entry && entry.isFinal ? 'bg-zinc-700/50' : 'bg-zinc-800/40 text-gray-400'
                                        }`}>
                                            <p className="font-semibold text-sm mb-1">{entry.speaker}</p>
                                            <p className="text-text-primary">{entry.text}</p>
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