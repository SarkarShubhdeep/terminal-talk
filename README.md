# Terminal Talk

A blazing fast, terminal-based chat application built with TypeScript and WebSockets. Chat with your friends directly from your command line!

## 🚀 Installation

### Using NPM
You can run the tool directly without installation using `npx`:

```bash
npx terminal-talk start
```

Or install it globally to use the `terminal-talk` command:

```bash
npm install -g terminal-talk
```

### Using Bun
```bash
bunx terminal-talk start
```

---

## 💬 Usage

**Note:** By default, the client creates rooms on `http://localhost:3000`. You must have a server running locally or specify a remote server URL (see Configuration).

### Create a Room
To start a new chat session and generate a unique room:

```bash
# If installed globally
terminal-talk start

# Or via npx
npx terminal-talk start
```

You will receive a **Join URL** (e.g., `ws://localhost:3000/chat?room=xyz...`) to share with others.

### Join a Room
To join an existing room, use the `join` command followed by the URL:

```bash
# If installed globally
terminal-talk join <room-url>

# Or via npx
npx terminal-talk join <room-url>
```

**Example:**
```bash
npx terminal-talk join ws://localhost:3000/chat?room=10d66572
```

---

## 🛠️ Development & Self-Hosting

### Run the Server
If you are developing locally or self-hosting, you need to run the WebSocket server:

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Start the server:
    ```bash
    bun run src/server.ts
    ```

### Configuration
You can point the client to a different server using an environment variable:

```bash
    export TERMINAL_TALK_SERVER="https://your-terminal-talk-server.railway.app"
    terminal-talk start
    ```

For a detailed guide on **Publishing to NPM** and **Deploying to Railway**, see [PUBLISHING_AND_DEPLOYMENT.md](PUBLISHING_AND_DEPLOYMENT.md).
