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
        // vvv THE FIX IS HERE vvv
        // Request that Deepgram send keepalive messages to us
        keepalive: 'true'
        // ^^^ THE FIX IS HERE ^^^
    });

    deepgramLive.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection opened and is actively listening.');
    });

    deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript) {
             ws.send(JSON.stringify({
                type: 'transcript',
                entry: {
                    speaker: `Speaker ${data.channel.speaker_name || data.channel.speaker}`,
                    text: transcript,
                    timestamp: Date.now(),
                    isFinal: data.is_final,
                }
            }));
        }
    });
    
    // Log any errors from Deepgram
    deepgramLive.on(LiveTranscriptionEvents.Error, (err) => console.error('Deepgram Error:', err));
    
    // Log the close event with details
    deepgramLive.on(LiveTranscriptionEvents.Close, (event) => {
        console.log('Deepgram connection closed.', event);
    });

    ws.on('message', (data: Buffer) => {
        // We no longer need to check the ready state here,
        // as we will just forward the data. If the connection is closed, it will be handled.
        deepgramLive.send(data as any);
    });

    ws.on('close', () => {
        console.log('Client disconnected from our server.');
        // This will trigger the 'close' event on the deepgramLive object
        if (deepgramLive.getReadyState() === 1) {
           deepgramLive.finish();
        }
    });

    ws.on('error', console.error);
});

console.log(`🚀 WebSocket server started on ws://localhost:${PORT}`);