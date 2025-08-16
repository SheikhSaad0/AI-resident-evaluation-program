import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { createClient } from '@deepgram/sdk';

// --- Main Application Setup ---
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

// --- Deepgram Client Setup ---
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

await app.prepare();

const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
});

// --- WebSocket Server Logic ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    console.log('[WebSocket] Client connected.');

    // Create a new Deepgram live transcription connection
    const deepgramConnection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        puncutate: 'true',
        diarize: true,
        speaker_labels: true,
        interim_results: true,
    });

    deepgramConnection.on('open', () => {
        console.log('[Deepgram] Connection opened.');

        // Handle transcripts from Deepgram
        deepgramConnection.on('transcript', (data) => {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript) {
                const speaker = data.channel.speaker_labels[0]?.speaker_name || (data.channel.speaker === 0 ? 'Attending' : 'Resident');

                const message = {
                    type: 'transcript',
                    entry: {
                        speaker: speaker,
                        text: transcript,
                        isFinal: data.is_final,
                    },
                };
                ws.send(JSON.stringify(message));
            }
        });

        deepgramConnection.on('error', (err) => {
            console.error('[Deepgram] Error:', err);
        });

        deepgramConnection.on('close', () => {
            console.log('[Deepgram] Connection closed.');
        });
    });

    // Handle audio messages from the client
    ws.on('message', (message) => {
        if (deepgramConnection.getReadyState() === 1 /* OPEN */) {
            deepgramConnection.send(message);
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected.');
        if (deepgramConnection.getReadyState() === 1 /* OPEN */) {
            deepgramConnection.finish();
        }
    });

    ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
    });
});

server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
});