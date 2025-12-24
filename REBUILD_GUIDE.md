# Terminal Talk: Rebuild Guide & Roadmap

This document serves as the master guide for rebuilding the `terminal-talk` application from scratch.

## 1. Technology Stack
We will use a modern, fast, and compatible stack ensuring the tool works for everyone.

- **Runtime**:
    - **Development**: [Bun](https://bun.sh) (for blazing fast install/testing).
    - **Production/Client**: **Node.js** compatible (compiled to standard JS) so users don't *need* Bun to run it.
- **Language**: **TypeScript** (Strict typing for robustness).
- **Communication**: **WebSockets** (via `ws` library) for real-time, bi-directional event streaming.
- **CLI Interface**: Native Node.js `readline` module (zero-dependency input handling).
- **Hosting**: **Railway** (simple Docker/Node deployment for the server).
- **Registry**: **NPM** (published as a Scoped Package).

## 2. Project Structure
```text
terminal-talk/
├── src/
│   ├── client.ts    # CLI Entry point (The "app" users run)
│   └── server.ts    # WebSocket Server (The "backend" you host)
├── dist/            # Compiled JS files (for npm)
├── package.json     # Manifest
├── tsconfig.json    # TS Configuration
└── .github/
    └── workflows/
        └── publish.yml # Auto-publish workflow
```

## 3. "No-Conflict" Publishing Strategy
To ensure **zero conflicts** on NPM and professional branding, we will use a **Scoped Package**.

- **Package Name**: `@<your-username>/terminal-talk` (e.g., `@sarkarshubh/terminal-talk`)
    - *Why?* The global namespace `terminal-talk` might besquatted or taken in the future. Scoped packages are **always** available to you and look more trustworthy.
- **Versioning**: Semantic Versioning (`1.0.0`, `1.0.1`, etc.).
- **Automation**: We will use a GitHub Action that publishes to NPM strictly when you create a GitHub Release.

## 4. Rebuild Roadmap (Todo)

### Phase 1: Foundation
1.  **Initialize Project**: `bun init` in a fresh directory.
2.  **Configure TypeScript**: Set up `tsconfig.json` for ESM (ECMAScript Modules) to work natively with recent Node versions.
3.  **Dependencies**: Install `ws`, `@types/ws`, `bun-types`.

### Phase 2: The Server (Backend)
1.  **Setup WebSocket Server**: Create a secure (`wss://` capable) server using `ws`.
2.  **Room Logic**:
    - `POST /create`: Returns a unique Room ID.
    - `WS /chat?room=ID`: Upgrades connection and adds user to the specific room.
3.  **Broadcasting**: Ensure messages sent by User A are received by Users B, C, D in the same room.

### Phase 3: The Client (CLI)
1.  **Connection**: Connect to the server using `ws`.
2.  **UI/Input**: Use `readline` to keep an active prompt (`You: `) while simultaneously printing incoming messages.
3.  **Polishing**:
    - Handle strict "Join" arguments (e.g., `npx ... join <url>`).
    - Add color coding (System messages in Yellow, Peers in Green).

### Phase 4: Publishing
1.  **Build Script**: `bun build src/client.ts --target node --outdir dist`.
2.  **Executable Bin**: Link the `bin` field in `package.json` to `dist/client.js`.
3.  **Shebang**: Ensure `#!/usr/bin/env node` is at the top of the output file.
4.  **Publish**: Run `npm publish --access public`.

## 5. Next Steps
We are ready to start **Phase 1: Foundation**.
