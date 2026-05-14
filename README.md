# VIRTUAL-LAB

> A collaborative 2D physics sandbox for university-level engineering education.

VIRTUAL-LAB is a "Digital Twin" environment where multiple users share a synchronized workspace powered by a real-time physics engine. Build machines, test structural integrity, and observe forces — together.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js, Matter.js, Tailwind CSS v4 |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.io |
| Visualization | Recharts *(Phase 4)* |

## Features

- **Interactive Physics Canvas** — Drag, drop, and configure rigid bodies on an HTML5 Canvas powered by Matter.js
- **Multi-User Rooms** — Create or join rooms with a 6-character code, see participants in real-time
- **Physics Constraints** — Ropes, springs, pivots, and motors *(Phase 3 — in progress)*
- **Experiment Library** — Save, load, share, and fork physics scenarios *(Phase 5)*
- **Real-Time Analytics** — Live velocity, kinetic energy, and force vector visualizations *(Phase 4)*

## Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB running on `localhost:27017`

### Setup

```bash
# Clone the repo
git clone <repo-url> && cd virtual-lab

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Run

```bash
# Terminal 1 — Start the backend
cd server
npm run dev

# Terminal 2 — Start the frontend
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
├── shared/          # Shared constants and serialization schemas
├── server/          # Node.js + Express + Socket.io backend
│   └── src/
│       ├── config/      # Environment and database config
│       ├── models/      # Mongoose schemas (User, Experiment, Room)
│       ├── routes/      # REST API endpoints
│       ├── sockets/     # Socket.io event handlers
│       └── services/    # Business logic (conflict resolution)
└── client/          # React + Vite frontend
    └── src/
        ├── components/  # UI components (canvas, toolbar, panels)
        ├── context/     # React contexts (physics, room)
        ├── hooks/       # Custom hooks (physics engine, socket)
        ├── services/    # API and socket clients
        └── utils/       # Delta encoding, serialization helpers
```

## Architecture

- **Client-authoritative physics** — Matter.js runs on each client at 60Hz for instant local feedback
- **Server relay** — The backend relays state deltas at 20Hz between clients without running its own simulation
- **Delta encoding** — Dead-zone filtering + quantization keeps sync packets under 2KB for typical scenes
- **Ownership locking** — Body claim/release system prevents drag conflicts between users

## License

MIT
