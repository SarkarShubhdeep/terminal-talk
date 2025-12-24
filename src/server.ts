import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

interface ClientInfo {
    ws: WebSocket;
    username: string;
}

interface Room {
    id: string;
    // Map socket to client info so we can lookup usernames
    clients: Map<WebSocket, ClientInfo>;
}

const rooms = new Map<string, Room>();

const server = createServer((req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/create') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                // Try to parse body for custom room ID
                let proposedId = '';
                if (body) {
                    const data = JSON.parse(body);
                    proposedId = (data.roomId || '').toLowerCase();
                }

                if (proposedId && rooms.has(proposedId)) {
                    // Room exists. 
                     // Decision: For this app, simply fail if taken to avoid confusion.
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Room name already taken' }));
                    return;
                }

                const roomId = proposedId || randomUUID().substring(0, 8);
                rooms.set(roomId, { id: roomId, clients: new Map() });
                
                console.log(`[INFO] Created room: ${roomId}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true,
                    roomId
                }));
            } catch (e) {
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
        return;
    }

    if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Terminal Talk Server Running');
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const roomId = url.searchParams.get('room')?.toLowerCase();
        const username = url.searchParams.get('username');

        if (!roomId || !rooms.has(roomId)) {
            console.log(`[WARN] Connection attempt to invalid room: ${roomId}`);
            ws.close(1008, 'Room not found');
            return;
        }

        if (!username) {
             ws.close(1008, 'Username required');
             return;
        }

        const room = rooms.get(roomId)!;

        // Check for duplicate username
        for (const client of room.clients.values()) {
            if (client.username === username) {
                ws.close(1008, 'Username taken');
                return;
            }
        }

        const clientInfo: ClientInfo = { ws, username };
        room.clients.set(ws, clientInfo);
        
        console.log(`[INFO] ${username} joined room: ${roomId} (Total: ${room.clients.size})`);
        
        // Notify others
        broadcast(room, JSON.stringify({
            type: 'system',
            content: `${username} has joined the chat`,
            timestamp: new Date().toISOString()
        }), ws);

        // Send current user list to the new user
        const userList = Array.from(room.clients.values()).map(c => c.username);
        ws.send(JSON.stringify({
            type: 'system',
            content: `Users in room: ${userList.join(', ')}`,
            timestamp: new Date().toISOString()
        }));

        ws.on('message', (data) => {
            const messageStr = data.toString();
            try {
               const parsed = JSON.parse(messageStr);
               // Inject sender username if it's a chat message
               if (parsed.type === 'chat') {
                   parsed.username = username;
               }
               broadcast(room, JSON.stringify(parsed), ws);
            } catch {
                // Fallback for plain text
                broadcast(room, JSON.stringify({
                    type: 'chat',
                    username: username,
                    content: messageStr,
                    timestamp: new Date().toISOString()
                }), ws);
            }
        });

        ws.on('close', () => {
            room.clients.delete(ws);
            console.log(`[INFO] ${username} left room: ${roomId}`);
            
            broadcast(room, JSON.stringify({
                type: 'system',
                content: `${username} has left the chat`,
                timestamp: new Date().toISOString()
            }));
        });

        ws.on('error', (err) => {
            console.error(`[ERROR] WebSocket error in room ${roomId}:`, err);
        });

    } catch (err) {
        console.error('[ERROR] Connection handling error:', err);
        ws.close(1011, 'Internal Server Error');
    }
});

function broadcast(room: Room, message: string, sender?: WebSocket) {
    for (const [clientWs, info] of room.clients) {
        if (clientWs !== sender && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(message);
        }
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
