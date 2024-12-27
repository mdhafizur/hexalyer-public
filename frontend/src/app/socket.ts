import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_API_URL as string;

export const socket: Socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'], // Ensure WebSocket-only communication
    autoConnect: true, // Automatically reconnect
    reconnection: true, // Enable reconnections
    reconnectionAttempts: Infinity, // Retry forever
    reconnectionDelay: 5000, // Match server ping_interval (5 seconds)
    reconnectionDelayMax: 10000, // Allow some variability in delay
    timeout: 20000, // Match server ping_timeout
    closeOnBeforeunload: true,
    forceNew: true
});

// Event listeners for debugging and monitoring
socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    if (reason === "io server disconnect") {
        // Server intentionally disconnected, try reconnecting manually
        socket.connect();
    }
});

socket.on("reconnect_attempt", (attempt) => {
    console.log(`Reconnection attempt #${attempt}`);
});

socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
});


