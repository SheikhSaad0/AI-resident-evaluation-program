// pages/live.tsx
import { useState, useEffect, useRef } from 'react';
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

const WEBSOCKET_URL = "ws://localhost:3001";

const LiveEvaluationPage = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');

    const micRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

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
    }, [transcript]);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (micRecorderRef.current && micRecorderRef.current.state === 'recording') {
                micRecorderRef.current.stop();
            }
        };
    }, []);

    const startSession = async () => {
        if (isSessionActive || !selectedResident || !selectedSurgery) {
            if (!selectedResident || !selectedSurgery) {
                alert('Please select a surgery and a resident first.');
            }
            return;
        }

        setStatus('connecting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            micRecorderRef.current = mediaRecorder;

            const wsUrl = `${WEBSOCKET_URL}?residentName=${encodeURIComponent(selectedResident.name)}`;
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("WebSocket connection established.");
                setStatus('connected');
                setIsSessionActive(true);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                        socket.send(event.data);
                    }
                };

                mediaRecorder.start(1000); 
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript') {
                    setTranscript(prev => {
                        const newTranscript = [...prev];
                        const lastEntry = newTranscript[newTranscript.length - 1];

                        if (lastEntry && !lastEntry.isFinal && lastEntry.speaker === data.entry.speaker) {
                            lastEntry.text = data.entry.text;
                            lastEntry.isFinal = data.entry.isFinal;
                        } else {
                            newTranscript.push(data.entry);
                        }
                        return newTranscript;
                    });
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

    const stopSession = () => {
        if (socketRef.current) {
            socketRef.current.close();
        }
    };

    const handleButtonClick = () => {
        if (isSessionActive) {
            stopSession();
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
                            disabled={!selectedSurgery || !selectedResident || status === 'connecting'} 
                            className="w-full"
                        >
                            {isSessionActive ? 'End Live Session' : 'Start Live Session'}
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
                    <h3 className="heading-md mb-4">Live Transcript</h3>
                    <div className="glassmorphism-subtle rounded-2xl p-4 flex-grow overflow-y-auto scrollbar-glass min-h-[300px]">
                        {transcript.length === 0 ? (
                             <div className="text-center text-text-tertiary h-full flex flex-col items-center justify-center">
                                <Image src="/images/live-icon.svg" alt="Waiting" width={64} height={64} className="opacity-50 mb-4" />
                                <p>Waiting for session to start...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transcript.map((entry, index) => (
                                    <div key={index} className="flex flex-col items-start">
                                        <div className={`p-3 rounded-2xl max-w-lg ${entry.speaker.includes('0') ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
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