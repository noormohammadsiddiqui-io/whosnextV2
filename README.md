# WhosNext

WhosNext is a real-time video chat application that connects you instantly with people from around the world. Built with Next.js, Socket.IO, and WebRTC for seamless peer-to-peer communication.

## Features

- 🎥 **Instant Video Chat**: Connect with random people through high-quality video calls
- 🔄 **Automatic Reconnection**: Seamlessly connects you to a new person if your current chat partner disconnects
- 🌐 **Global Reach**: Meet people from different countries and cultures
- 🔒 **Privacy First**: No registration required, conversations are not recorded or stored
- ⚡ **Lightning Fast**: WebRTC technology ensures smooth, low-latency connections

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Socket.IO for real-time communication
- **Video**: WebRTC for peer-to-peer video streaming
- **Styling**: Modern gradient design with responsive layout

## How It Works

1. **Connect**: Click "Start Video Chat" to join the platform
2. **Match**: Our system automatically pairs you with another online user
3. **Chat**: Enjoy your video conversation with your matched partner
4. **Reconnect**: If someone disconnects, you're automatically connected to the next available person

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
