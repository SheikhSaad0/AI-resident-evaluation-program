// pages/api/live.ts
// NOTE: This requires a custom server setup to work with WebSockets in Next.js.

import { WebSocketServer, WebSocket } from 'ws';
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// --- This part would be in your custom server file (e.g., server.js) ---
if (!(global as any).wss) {
    console.log("Setting up WebSocket server...");
    const wss = new WebSocketServer({ port: 3001 }); // Example port for local dev

    (global as any).wss = wss; // Store in global to prevent re-creation on hot-reloads

    wss.on('connection', (ws: WebSocket) => {
        console.log('Client connected to WebSocket server.');

        const deepgramLive = deepgram.listen.live({
            model: 'nova-2',
            punctuate: true,
            diarize: true,
            smart_format: true,
            interim_results: true,
        });

        deepgramLive.on(LiveTranscriptionEvents.Open, () => {
            console.log('Deepgram connection opened.');

            deepgramLive.on(LiveTranscriptionEvents.Close, () => {
                console.log('Deepgram connection closed.');
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

            deepgramLive.on(LiveTranscriptionEvents.Error, (err) => {
                console.error('Deepgram error:', err);
            });

            ws.on('message', (data: Buffer) => {
                if (deepgramLive.getReadyState() === 1 /* OPEN */) {
                    // vvv THE DEFINITIVE FIX vvv
                    // Use 'as any' to bypass the conflicting type definitions.
                    deepgramLive.send(data as any);
                    // ^^^ THE DEFINITIVE FIX ^^^
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected.');
                if (deepgramLive.getReadyState() === 1) {
                   deepgramLive.finish();
                }
            });
        });

        ws.on('error', console.error);
    });

    console.log('WebSocket server started on port 3001.');
}
// --- End of custom server part ---

const handler = (req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).json({ status: 'WebSocket server is active' });
};


export default handler;