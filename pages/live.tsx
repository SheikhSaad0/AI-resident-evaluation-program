// pages/live.tsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { GlassCard, GlassButton, PillToggle } from '../components/ui';
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
    timestamp: number;
    isFinal: boolean;
}

const WEBSOCKET_URL = "ws://localhost:3001"; // <-- The correct WebSocket server address

const LiveEvaluationPage = () => {
    // ... (keep all the existing state hooks: isSessionActive, transcript, etc.)
    const router = useRouter();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [mic, setMic] = useState<MediaRecorder | null>(null);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'closing'>('idle');

    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');
    
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch residents on mount
        const fetchResidents = async () => {
            try {
                const res = await fetch('/api/residents');
                if (res.ok) {
                    setResidents(await res.json());
                }
            } catch (error) {
                console.error("Failed to fetch residents:", error);
            }
        };
        fetchResidents();
    }, []);

    useEffect(() => {
        // Scroll to the bottom of the transcript
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const startSession = async () => {
        if (!selectedResident || !selectedSurgery) {
            alert('Please select a resident and a surgery to begin.');
            return;
        }

        setStatus('connecting');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        // vvv THE FIX IS HERE vvv
        const ws = new WebSocket(WEBSOCKET_URL);
        // ^^^ THE FIX IS HERE ^^^

        ws.onopen = () => {
            setStatus('connected');
            setIsSessionActive(true);
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                }
            });
            mediaRecorder.start(250); // Send data every 250ms
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'transcript') {
                setTranscript(prev => {
                    const newTranscript = [...prev];
                    const last = newTranscript[newTranscript.length - 1];
                    // Update the last entry if it's not final, otherwise add a new one
                    if (last && !last.isFinal && last.speaker === data.entry.speaker) {
                        newTranscript[newTranscript.length - 1] = { ...data.entry, text: last.text + ' ' + data.entry.text };
                    } else if (last && !last.isFinal) {
                        last.isFinal = true;
                        newTranscript.push(data.entry);
                    }
                    else {
                        newTranscript.push(data.entry);
                    }
                    return newTranscript;
                });
            } else if (data.type === 'ai') {
                // Play AI audio response
                const audio = new Audio(data.audioUrl);
                audio.play();
                 setTranscript(prev => [...prev, { speaker: 'Veritas AI', text: data.text, timestamp: Date.now(), isFinal: true }]);
            }
        };

        ws.onclose = () => {
            setStatus('idle');
            setIsSessionActive(false);
            if(mediaRecorder.state === "recording") mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
        };

        ws.onerror = (err) => {
            setStatus('error');
            console.error('WebSocket error:', err);
        };

        setMic(mediaRecorder);
        setSocket(ws);
    };

    const stopSession = () => {
        setStatus('closing');
        socket?.close();
    };

    // ... (keep the rest of the component JSX as it was)
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
                        {!isSessionActive ? (
                            <GlassButton variant="primary" size="lg" onClick={startSession} disabled={!selectedSurgery || !selectedResident || status === 'connecting'} className="w-full">
                                Start Live Session
                            </GlassButton>
                        ) : (
                            <GlassButton variant="secondary" size="lg" onClick={stopSession} className="w-full !text-red-400 hover:!bg-red-500/20">
                                End Live Session
                            </GlassButton>
                        )}
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
                                    <div key={index} className={`flex ${entry.speaker === 'Veritas AI' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`p-3 rounded-2xl max-w-lg ${entry.speaker === 'Veritas AI' ? 'bg-brand-primary/20' : 'bg-glass-300'}`}>
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