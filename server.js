import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

// --- Main Application Setup ---
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

// --- Deepgram Client Setup ---
if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY is not defined in your .env file.");
}
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

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
        // Do not interfere with Next.js's own HMR WebSocket
    }
});


wss.on('connection', (ws, req) => {
    console.log('[WebSocket] Client connected.');

    const deepgramConnection = deepgram.listen.live({
        model: 'nova-3',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        diarize: true,
    });

    let audioQueue = [];
    let isDeepgramOpen = false;
    let keepAlive;

    deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
        console.log('[Deepgram] Connection opened.');
        isDeepgramOpen = true;

        if (audioQueue.length > 0) {
            console.log(`[Deepgram] Sending ${audioQueue.length} queued audio packets.`);
            audioQueue.forEach(packet => deepgramConnection.send(packet));
            audioQueue = [];
        }

        keepAlive = setInterval(() => {
            deepgramConnection.keepAlive();
        }, 10 * 1000);
    });

    deepgramConnection.on(LiveTranscriptionEvents.Close, (event) => {
        console.error('[Deepgram] Connection closed. Code:', event.code, 'Reason:', event.reason);
        clearInterval(keepAlive);
    });

    deepgramConnection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('[Deepgram] Encountered an error:', err);
    });

    deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives[0]?.transcript;
        if (transcript) {
            const speakerIndex = data.channel?.alternatives[0]?.words[0]?.speaker ?? '0';
            const message = {
                type: 'transcript',
                entry: {
                    speaker: `Speaker ${speakerIndex}`,
                    text: transcript,
                    isFinal: data.is_final,
                },
            };
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
    });

    ws.on('message', (message) => {
        // --- MOBILE FIX: Handle keep-alive messages and audio data ---
        try {
            const messageString = message.toString();
            if (messageString.includes('keep-alive')) {
                // This is a keep-alive message, ignore it
                return;
            }
        } catch (error) {
            // This is likely binary audio data, so we proceed
        }

        if (isDeepgramOpen && deepgramConnection.getReadyState() === 1) {
            deepgramConnection.send(message);
        } else {
            audioQueue.push(message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[WebSocket] Client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
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