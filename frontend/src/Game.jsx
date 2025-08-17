import React, { useState, useEffect } from "react";

// Example player data
const initialPlayers = [
  { id: 1, name: "Alice", avatar: "https://i.pravatar.cc/40?img=1" },
  { id: 2, name: "Bob", avatar: "https://i.pravatar.cc/40?img=2" },
  { id: 3, name: "Charlie", avatar: "https://i.pravatar.cc/40?img=3" },
];

export default function GamePage() {
  const [players, setPlayers] = useState(initialPlayers);
  const [timer, setTimer] = useState(60); // 60 seconds countdown
  const [word, setWord] = useState("React");

  // Timer countdown
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Players</h2>
        <ul className="space-y-4">
          {players.map((player) => (
            <li key={player.id} className="flex items-center space-x-3">
              <img
                src={player.avatar}
                alt={player.name}
                className="w-10 h-10 rounded-full"
              />
              <span>{player.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-3xl font-bold mb-4">{word}</h1>
          <p className="text-xl">Time left: {timer}s</p>
        </div>
      </div>
    </div>
  );
}
