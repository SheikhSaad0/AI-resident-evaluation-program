// pages/live.tsx
import { useState, useEffect, useRef } from 'react';
// ... (keep all other imports)
import { GlassCard, GlassButton, PillToggle } from '../components/ui';
import ResidentSelector from '../components/ResidentSelector';
import SurgerySelector from '../components/SurgerySelector';
import Image from 'next/image';

// ... (keep Resident and TranscriptEntry interfaces)
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

const WEBSOCKET_URL = "ws://localhost:3001";

// Function to speak text using the browser's TTS engine
const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1; // Slightly faster speech
        window.speechSynthesis.speak(utterance);
    }
};

const LiveEvaluationPage = () => {
    // ... (keep all existing state hooks)
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [mic, setMic] = useState<MediaRecorder | null>(null);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'closing'>('idle');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [selectedSurgery, setSelectedSurgery] = useState('');
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // ... (keep useEffect for fetching residents and scrolling)
    useEffect(() => {
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
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);


    const startSession = async () => {
        // ... (keep the start of this function)
        if (!selectedResident || !selectedSurgery) {
            alert('Please select a resident and a surgery to begin.');
            return;
        }

        setStatus('connecting');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        const ws = new WebSocket(WEBSOCKET_URL);

        ws.onopen = () => {
            // ... (keep onopen logic)
            setStatus('connected');
            setIsSessionActive(true);
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                }
            });
            mediaRecorder.start(250);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'transcript') {
                // ... (keep transcript handling logic)
                 setTranscript(prev => {
                    const newTranscript = [...prev];
                    const last = newTranscript[newTranscript.length - 1];
                    if (last && !last.isFinal) {
                        newTranscript[newTranscript.length - 1] = data.entry;
                    } else {
                        newTranscript.push(data.entry);
                    }
                    return newTranscript;
                });
            } else if (data.type === 'ai_action') { // <-- THE FIX IS HERE
                const { action, payload } = data.payload;
                if (action === 'speak') {
                    speak(payload);
                    setTranscript(prev => [...prev, { speaker: 'Veritas AI', text: payload, timestamp: Date.now(), isFinal: true }]);
                } else if (action === 'log_score') {
                    const logText = `Logged score for ${payload.step}: ${payload.score}`;
                    setTranscript(prev => [...prev, { speaker: 'Veritas AI', text: logText, timestamp: Date.now(), isFinal: true }]);
                } else if (action === 'log_comment') {
                     const logText = `Logged comment for ${payload.step}: "${payload.comment}"`;
                    setTranscript(prev => [...prev, { speaker: 'Veritas AI', text: logText, timestamp: Date.now(), isFinal: true }]);
                }
            }
        };

        // ... (keep onclose and onerror logic)
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
        // ... (keep stopSession logic)
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