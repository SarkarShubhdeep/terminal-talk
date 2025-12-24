#!/usr/bin/env node
import WebSocket from 'ws';
import { createInterface } from 'readline';
import { stdin as input, stdout as output } from 'process';

// Configuration
// Default to localhost for development, but customizable via ENV
const DEFAULT_SERVER = process.env.TERMINAL_TALK_SERVER || 'http://localhost:3000';

async function main() {
    console.log('\n✨ Welcome to Terminal Talk! ✨\n');

    const args = process.argv.slice(2);
    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    const command = args[0];

    if (!command || (command !== 'start' && command !== 'join')) {
        showHelp();
        process.exit(1);
    }

    let wsUrl: string;
    let username: string = '';

    const rl = createInterface({ input, output });
    const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

    try {
        if (command === 'start') {
            const serverHttp = DEFAULT_SERVER;
            
            // 1. Ask for custom room name
            const roomNameInput = await ask('Enter a custom room name (or press Enter for random): ');
            const customRoomId = roomNameInput.trim().toLowerCase();

            console.log(`\nCreating room on ${serverHttp}...`);
            
            const res = await fetch(`${serverHttp}/create`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: customRoomId || undefined })
            });

            if (!res.ok) {
                if (res.status === 409) {
                    console.error(`\nError: Room '${customRoomId}' already exists! Try joining it instead.`);
                } else {
                    console.error(`\nError: Server returned ${res.status}`);
                }
                process.exit(1);
            }

            const data = await res.json() as any;
            const roomId = data.roomId;
            const serverWs = serverHttp.replace(/^http/, 'ws');
            // Base URL without username for sharing
            const shareUrl = `${serverWs}/chat?room=${roomId}`;
            
            console.log('\n=======================================');
            console.log(`Room Created! ID: \x1b[36m${roomId}\x1b[0m`);
            console.log(`Share this command to invite others:`);
            console.log(`  npx terminal-talk join ${roomId}`);
            console.log(`  OR`);
            console.log(`  npx terminal-talk join ${shareUrl}`);
            console.log('=======================================\n');

            // 1.1 Ask for username
            while (!username) {
                username = (await ask('Enter your display name: ')).trim();
            }

            wsUrl = `${shareUrl}&username=${encodeURIComponent(username)}`;

        } else {
            // join
            let target = args[1];
            if (!target) {
                target = (await ask('Enter Room URL or Name: ')).trim();
                if (!target) {
                    console.error('Error: Room is required.');
                    process.exit(1);
                }
            }

            // check if target is a full URL or just a name
            let baseWsUrl = '';
            if (target.startsWith('ws://') || target.startsWith('wss://')) {
                // It's a URL
                baseWsUrl = target;
            } else {
                // It's a room ID/Name
                const serverWs = DEFAULT_SERVER.replace(/^http/, 'ws');
                baseWsUrl = `${serverWs}/chat?room=${encodeURIComponent(target.toLowerCase())}`;
            }

            while (!username) {
                username = (await ask('Enter your display name: ')).trim();
            }
            
            // Append username to query params
            const urlObj = new URL(baseWsUrl);
            urlObj.searchParams.set('username', username);
            wsUrl = urlObj.toString();
        }

        rl.close(); // Close this partial readline, we'll open a new one for chat loop
        connect(wsUrl, username);

    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
Usage:
  terminal-talk start            # Start a new chat room
  terminal-talk join <room-url>  # Join an existing room via URL
  terminal-talk join <room-id>   # Join an existing room by ID/Name
  terminal-talk --help           # Show this help message

Description:
  A terminal-based chat application using WebSockets.
  Create private rooms and chat with friends directly from your CLI.
  
Commands:
  start     Initiate a new chat session. You can optionally name your room.
  join      Join an existing session. You'll need the Room ID or URL.

Type 'bye()', 'Bye()', or 'BYE()' during a chat to exit.
`);
}

function connect(url: string, myUsername: string) {
    console.log(`\nConnecting...`);
    const ws = new WebSocket(url);

    ws.on('open', () => {
        console.log('Connected! Start typing to chat.');
        console.log('Type \x1b[33mbye()\x1b[0m to exit.\n');
        startChatLoop(ws, myUsername);
    });

    ws.on('close', (code, reason) => {
        console.log('\nDisconnected from server.');
        if (reason.toString()) {
            console.log(`Reason: ${reason.toString()}`);
        }
        process.exit(0);
    });

    ws.on('error', (err) => {
        console.error('Connection error:', err.message);
        process.exit(1);
    });
}

function startChatLoop(ws: WebSocket, myUsername: string) {
    const rl = createInterface({ input, output });
    
    rl.setPrompt(`\x1b[36m${myUsername}:\x1b[0m `);

    ws.on('message', (data) => {
        const msgStr = data.toString();
        
        // Clear current line
        output.write('\r\x1b[K'); 
        
        try {
            const msg = JSON.parse(msgStr);
            if (msg.type === 'system') {
                console.log(`\x1b[33m[System]\x1b[0m ${msg.content}`);
            } else if (msg.type === 'chat') {
                const sender = msg.username || 'Peer';
                console.log(`\x1b[32m${sender}:\x1b[0m ${msg.content}`);
            } else {
                console.log(msgStr);
            }
        } catch {
            console.log(msgStr);
        }
        
        // Restore prompt
        rl.prompt(true);
    });

    rl.on('line', (line) => {
        const text = line.trim();
        
        if (text.toLowerCase() === 'bye()') {
            console.log('Exiting chat...');
            ws.close();
            rl.close();
            process.exit(0);
            return;
        }

        if (text) {
            ws.send(JSON.stringify({ type: 'chat', content: text }));
        }
        // Force immediate prompt refresh
        rl.prompt(); 
    });

    rl.on('close', () => {
        ws.close();
        process.exit(0);
    });

    rl.prompt();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
