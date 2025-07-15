// scripts/webSocketServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import 'dotenv/config';

const PORT = 3001;
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY is not defined in your .env file.");
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket) => {
    console.log('✅ Client connected to WebSocket server.');

    const deepgramLive = deepgram.listen.live({
        model: 'nova-2',
        punctuate: true,
        diarize: true,
        smart_format: true,
        interim_results: true,
        keepalive: 'true'
    });

    deepgramLive.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection opened and is actively listening.');
    });

    deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
        const alternative = data.channel.alternatives[0];
        const transcript = alternative.transcript;
        
        // Only process if there is a transcript to show
        if (transcript.trim().length === 0) {
            return;
        }

        // vvv THE FIX IS HERE vvv
        let speakerLabel = "Speaker";
        // Check if words exist and have content before accessing them
        if (alternative.words && alternative.words.length > 0) {
            const speakerIndex = alternative.words[0].speaker;
            speakerLabel = `Speaker ${speakerIndex}`;
        }
        // ^^^ THE FIX IS HERE ^^^

        ws.send(JSON.stringify({
            type: 'transcript',
            entry: {
                speaker: speakerLabel, // Use the new, safer label
                text: transcript,
                timestamp: Date.now(),
                isFinal: data.is_final,
            }
        }));
    });
    
    deepgramLive.on(LiveTranscriptionEvents.Error, (err) => console.error('Deepgram Error:', err));
    
    deepgramLive.on(LiveTranscriptionEvents.Close, (event) => {
        console.log('Deepgram connection closed.', event);
    });

    ws.on('message', (data: Buffer) => {
        deepgramLive.send(data as any);
    });

    ws.on('close', () => {
        console.log('Client disconnected from our server.');
        if (deepgramLive.getReadyState() === 1) {
           deepgramLive.finish();
        }
    });

    ws.on('error', console.error);
});

console.log(`🚀 WebSocket server started on ws://localhost:${PORT}`);