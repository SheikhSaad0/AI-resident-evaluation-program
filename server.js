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
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);
    if (pathname === '/api/deepgram') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

wss.on('connection', (ws, req) => {
    console.log('[WebSocket] Client connected.');

    const deepgramConnection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        interim_results: true,
        // Diarize has been removed for stability
    });

    const keepAlive = setInterval(() => {
        if (deepgramConnection.getReadyState() === 1 /* OPEN */) {
            deepgramConnection.keepAlive();
        }
    }, 10000);

    deepgramConnection.on('open', () => {
        console.log('[Deepgram] Connection opened.');

        deepgramConnection.on('transcript', (data) => {
            // --- ADDED: Robust error handling ---
            try {
                const transcript = data.channel?.alternatives[0]?.transcript;
                if (transcript) {
                    const message = {
                        type: 'transcript',
                        entry: {
                             // Reverted to simpler speaker logic
                            speaker: `Speaker ${data.channel?.speaker ?? 0}`,
                            text: transcript,
                            isFinal: data.is_final,
                        },
                    };
                    ws.send(JSON.stringify(message));
                }
            } catch (error) {
                console.error('[Deepgram] Error processing transcript data:', error);
            }
        });

        deepgramConnection.on('error', (err) => console.error('[Deepgram] Error:', err));
        deepgramConnection.on('close', () => console.log('[Deepgram] Connection closed.'));
    });

    ws.on('message', (message) => {
        if (deepgramConnection.getReadyState() === 1) {
            deepgramConnection.send(message);
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected.');
        clearInterval(keepAlive);
        if (deepgramConnection.getReadyState() === 1) {
            deepgramConnection.finish();
        }
    });

    ws.on('error', (error) => console.error('[WebSocket] Error:', error));
});

server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
});