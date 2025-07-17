// pages/live.tsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { GlassCard, GlassButton } from '../components/ui';
import ResidentSelector from '../components/ResidentSelector';
import SurgerySelector from '../components/SurgerySelector';

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

const WEBSOCKET_URL = "ws://localhost:3001";

const LiveEvaluationPage = () => {
    const router = useRouter();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');

    const micRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const fullTranscriptRef = useRef<string>("");
    const recordedChunksRef = useRef<Blob[]>([]);
    const liveNotesRef = useRef<any[]>([]);

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

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    useEffect(() => {
        return () => {
            if (socketRef.current) socketRef.current.close();
            if (micRecorderRef.current && micRecorderRef.current.state === 'recording') {
                micRecorderRef.current.stop();
            }
        };
    }, []);

    const getAiResponse = async (transcript: string) => {
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, surgery: selectedSurgery }),
            });
            if (!response.ok) throw new Error("AI API request failed");
            
            const aiData = await response.json();

            if (aiData.action !== 'none') {
                 if (aiData.action === 'speak') {
                    setChatHistory(prev => [...prev, { speaker: 'Veritas', text: aiData.payload, action: 'speak' }]);
                 }
                 liveNotesRef.current.push(aiData);
            }
        } catch (error) {
            console.error("Error fetching AI response:", error);
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

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            micRecorderRef.current = mediaRecorder;

            mediaRecorder.addEventListener("dataavailable", event => {
                if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(event.data);
                    // We still push to the array for the final, full-session analysis
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

            // FIX: Corrected the logic to properly update the live transcript
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript') {
                    const newEntry: TranscriptEntry = data.entry;
                    
                    setChatHistory(prevChat => {
                        const lastEntry = prevChat[prevChat.length - 1];

                        // If the last entry is an interim result from the same speaker, replace it.
                        if (lastEntry && 'isFinal' in lastEntry && !lastEntry.isFinal && lastEntry.speaker === newEntry.speaker) {
                            const updatedChat = prevChat.slice(0, -1); // Remove the last entry
                            return [...updatedChat, newEntry]; // Add the new, updated entry
                        }
                        // Otherwise, just add the new entry.
                        else {
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
                if (micRecorderRef.current && micRecorderRef.current.state === 'recording') {
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
        if (micRecorderRef.current && micRecorderRef.current.state === "recording") {
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
            formData.append('surgery', selectedSurgery!);
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
                console.error('Error during final analysis:', error);
                alert(`An error occurred during the final analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                                                : entry.speaker.includes('0') ? 'bg-blue-500/20' : 'bg-green-500/20'
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