import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button.jsx";
import { useParams } from "react-router-dom";

const Avatars = [
  "Blue.png",
  "Green.png",
  "Red.png",
  "Pink.png",
  "Yellow.png",
  "Cyan.png",
  "Host.png",
];

const initialPlayers = [
  { id: 1, name: "Alice", isHost: true, avatar: "/avatars/Host.png" },
  { id: 2, name: "Bob", isHost: false, avatar: "/avatars/Blue.png" },
  { id: 3, name: "Charlie", isHost: false, avatar: "/avatars/Green.png" },
];

const words = ["React", "JavaScript", "Coding", "Frontend", "Backend"];

export default function GamePage() {
  const { roomId } = useParams();
  const roomCode = localStorage.getItem("roomCode") || roomId;
  const [players, setPlayers] = useState(initialPlayers);
  const [timer, setTimer] = useState(60);
  const [word, setWord] = useState(words[0]);
  const [status, setStatus] = useState("waiting");
  const sessionId = localStorage.getItem("sessionId") || "";
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomCode) return;

    // Connect to Django Channels via ASGI (in-memory channel layer)
    const socket = new WebSocket(`ws://localhost:8000/ws/room/${roomCode}/`);

    socket.onopen = () => {
      console.log("WebSocket connected!");
      socketRef.current = socket;

      // Immediately send join
      const playerId = sessionStorage.getItem("sessionId");
      socket.send(JSON.stringify({ action: "join", player_id: playerId}));
    };

    socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Message received:", data);

  if (data.players) {
    setPlayers(data.players.map((p, i) => {
      let avatar = "/avatars/Blue.png"; // default
      if (p.is_host) avatar = "/avatars/Host.png";
      else if (i === 1) avatar = "/avatars/Green.png";
      else if (i === 2) avatar = "/avatars/Red.png";

      return {
        id: p.id,        // use server id
        name: p.name,
        isHost: p.is_host,
        avatar
      };
    }));
  }

  if (data.status) setStatus(data.status);
};

    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onclose = () => {
      console.log("WebSocket closed");
      socketRef.current?.send(JSON.stringify({ action: "leave" }));
    }

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [roomCode]);

  // Countdown Timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Start Game
  const handleStartGame = async () => {
    if (!roomCode) {
      alert("No room code found!");
      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/rooms/rooms/${roomCode}/start/`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );

      if (!res.ok) throw new Error("Failed to start the game");
      const data = await res.json();
      console.log("Game started:", data);

      // Notify server via WebSocket
      socketRef.current?.send(JSON.stringify({ action: "start_game" }));
    } catch (error) {
      console.error(error);
      alert("Error starting game");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main className="flex-1 p-8 bg-gray-100 overflow-auto">
        <div className="mb-8 flex w-full items-center px-8">
          <h2 className="flex-1 text-3xl font-extrabold text-gray-800 text-left">
            Word: <span className="text-indigo-600">{word}</span>
          </h2>
          <h2 className="flex-1 text-3xl font-extrabold text-gray-800 text-center">
            Room ID: <span className="text-indigo-600">{roomId}</span>
            <div className="text-lg font-medium text-gray-600 mt-1">
    Status: <span className={status === "started" ? "text-green-600" : "text-yellow-600"}>{status}</span>
  </div>
          </h2>
          <h3 className="flex-1 text-xl font-semibold text-gray-700 text-right">
            Time left: <span className="text-red-500">{timer}s</span>
          </h3>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">Players</h1>
        <div className="flex justify-around items-end w-full mt-10">
          {players.map((player) => (
            <div key={player.id} className="flex flex-col items-center w-24">
              <img
                src={player.avatar}
                alt={player.name}
                className="w-20 h-20 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
              />
              <span className="text-gray-700 text-sm mt-2 text-center font-medium">
                {player.name} {player.isHost && "(Host)"}
              </span>
            </div>
          ))}
        </div>

        {players[0].isHost && (
          <Button
            className="w-full mt-8 h-12 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-lg hover:cursor-pointer"
            onClick={handleStartGame}
          >
            Start
          </Button>
        )}
      </main>
    </div>
  );
}
