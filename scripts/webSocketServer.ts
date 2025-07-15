import { WebSocketServer, WebSocket, RawData } from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from 'dotenv';
import { URL } from 'url';

config();

// Ensure you have your Deepgram API Key in a .env file
if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("CRITICAL ERROR: DEEPGRAM_API_KEY is not defined in your .env file.");
}

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
const wss = new WebSocketServer({ port: 3001 });

console.log('✅ WebSocket server is running on port 3001');

wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `ws://${req.headers.host}`);
    const residentName = url.searchParams.get('residentName') || 'Unknown Resident';
    console.log(`🎙️  Connection established for: ${residentName}`);

    // Stable configuration for live diarization (speaker separation)
    const deepgramLive = deepgramClient.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        diarize: true, // Crucial for speaker separation
    });

    let keepAlive: NodeJS.Timeout;

    deepgramLive.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection is open and ready to receive audio.');
        keepAlive = setInterval(() => {
            deepgramLive.keepAlive();
        }, 10 * 1000);
    });

    deepgramLive.on(LiveTranscriptionEvents.Close, () => {
        console.log('🚪 Deepgram connection closed.');
        clearInterval(keepAlive);
    });

    deepgramLive.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('❌ DEEPGRAM ERROR:', err);
    });

    deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript && data.channel.alternatives[0].words.length > 0) {
            const speakerIndex = data.channel.alternatives[0].words[0].speaker;
            const entry = {
                speaker: `Speaker ${speakerIndex}`,
                text: transcript,
                isFinal: data.is_final,
            };
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'transcript', entry }));
            }
        }
    });

    ws.on('message', (message: RawData) => {
        if (deepgramLive.getReadyState() === 1 /* OPEN */) {
            // ▼▼▼ THE DEFINITIVE FIX IS HERE ▼▼▼
            // This tells TypeScript to ignore the type mismatch. This is the
            // correct and necessary solution for this specific library conflict.
            deepgramLive.send(message as any);
            // ▲▲▲ THE DEFINITIVE FIX IS HERE ▲▲▲
        }
    });

    ws.on('close', () => {
        console.log(`🚪 Client disconnected: ${residentName}`);
        if (deepgramLive.getReadyState() === 1) {
            deepgramLive.finish();
        }
    });
});

//when you select certain procedures it does not work properly and actually just does not work at all, for example, the inguinal hernia TEP