import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button.jsx";
import { useParams } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.jsx";
import { Label } from "@/components/ui/label";

// const initialPlayers = [
//   { id: 1, name: "Alice", isHost: true, avatar: "/avatars/Host.png" },
//   { id: 2, name: "Bob", isHost: false, avatar: "/avatars/Blue.png" },
//   { id: 3, name: "Charlie", isHost: false, avatar: "/avatars/Green.png" },
// ];

export default function GamePage() {
  const { roomId } = useParams();
  const roomCode = localStorage.getItem("roomCode") || roomId;
  const [players, setPlayers] = useState([]);

  const [word, setWord] = useState(null);
  const [status, setStatus] = useState();
  const sessionId = sessionStorage.getItem("sessionId") || "";
  const [data, setData] = useState(null);
  const socketRef = useRef(null);
  const [roundStatus, setRoundStatus] = useState(null);
  const [selectedKick, setSelectedKick] = useState("");
  const [me, setMe]= useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

useEffect(() => {
  if (!data?.round) return;

  // Choose the correct timer based on stage
  const timerSeconds =
    data.round_status === "voting"
      ? data.round.vote_timer
      : data.round.round_timer;

  // Calculate start time: now for voting, round_start for normal
  const startTime =
    data.round_status === "voting"
      ? Date.now()
      : new Date(data.round.round_start).getTime();

  const endTime = startTime + timerSeconds * 1000;

  const tick = () => {
    const now = Date.now();
    const diff = Math.max(0, Math.floor((endTime - now) / 1000));
    setTimeLeft(diff);
  };

  tick(); // run immediately
  const interval = setInterval(tick, 1000);

  return () => clearInterval(interval);
}, [
  data?.round?.round_start,
  data?.round?.round_timer,
  data?.round_status,
  data?.round?.vote_timer,
]);

  useEffect(() => {
    if (!roomCode) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/room/${roomCode}/`);

    socket.onopen = () => {
      console.log("WebSocket connected!");
      socketRef.current = socket;
      socket.send(JSON.stringify({ action: "join", player_id: sessionId }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Message received:", data);

      if (data.players) {
        setPlayers(
          data.players.map((p, i) => {
            let avatar = "/avatars/Blue.png";
            if (p.is_host) avatar = "/avatars/Host.png";
            else if (i === 1) avatar = "/avatars/Green.png";
            else if (i === 2) avatar = "/avatars/Red.png";

            return {
              id: p.id,
              name: p.name,
              isHost: p.is_host,
              avatar,
            };
          })
        );
      }

      if (data.room_status) setStatus(data.room_status);
      if (data.room?.secret_word) setWord(data.room.secret_word);
      setData(data);
      if (data.round_status) setRoundStatus(data.round_status);
      if (data.me) setMe(data.me);
    };

    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onclose = () => {
      console.log("WebSocket closed");
      socketRef.current?.send(JSON.stringify({ action: "leave" }));
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [roomCode]);

  const handleStartGame = async () => {
    if (!roomCode) {
      alert("No room code found!");
      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/rooms/${roomCode}/start/`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );

      if (!res.ok) throw new Error("Failed to start the game");
      const data = await res.json();
      console.log("Game started:", data);

      socketRef.current?.send(JSON.stringify({ action: "start_game" }));
    } catch (error) {
      console.error(error);
      alert("Error starting game");
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-gray-100">
      <main className="flex-1 p-6 sm:p-8 bg-gray-100 overflow-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Word / Spy Display */}
          <div className="h-16 flex items-center justify-center">
            {data?.room && status === "started" &&
              (me.id !== data.room.spy.id ? (
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 truncate">
                  Word: <span className="text-indigo-600">{word}</span>
                </h2>
              ) : (
                <h2 className="text-md font-extrabold text-red-600 truncate">
                  You are the spy
                </h2>
              ))}
          </div>

          {/* Room ID & Status */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
              Room ID: <span className="text-indigo-600">{roomId}</span>
            </h2>
            <div className="text-lg font-medium text-gray-600 mt-1">
              Status:{" "}
              <span
                className={
                  (data?.round?.status || status) === "started"
                    ? "text-green-600"
                    : "text-yellow-600"
                }
              >
                {data?.round_status || status}
              </span>
            </div>
          </div>

          {/* Timer */}
          <h3 className="text-xl font-semibold text-gray-700">
            Time left: <span className="text-red-500">{timeLeft} seconds</span>
          </h3>
        </div>

        {/* Players */}
        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Players
        </h1>

        {roundStatus === "voting" ? (
          <RadioGroup
            value={selectedKick}
            onValueChange={setSelectedKick}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center mt-6"
          >
            {players.map((player) => (
              <div
                key={player.id}
                className="flex flex-col items-center max-w-[120px] text-center"
              >
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-gray-300 object-cover hover:scale-110 transition-transform"
                />
                {/*<span className="text-gray-700 text-sm mt-2 font-medium break-words">*/}
                {/*  {player.name} {player.isHost && "(Host)"}*/}
                {/*</span>*/}

                <div className="mt-6 flex items-center space-x-2">
                  <RadioGroupItem
                    value={player.id.toString()}
                    id={`kick-${player.id}`}
                    className="w-5 h-5 rounded-full border-2 border-gray-400
             checked:bg-amber-500 checked:border-amber-500
             focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <Label htmlFor={`kick-${player.id}`}>
                    <span className="text-gray-700 text-lg font-bold text-red-600">Kick</span> {player.name}
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center mt-6">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex flex-col items-center max-w-[120px] text-center"
              >
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-gray-300 object-cover hover:scale-110 transition-transform"
                />
                <span className="text-gray-700 text-sm mt-2 font-medium break-words">
                  {player.name} {player.isHost && "(Host)"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Start button (only for host) */}
        {me?.is_host === true && status !== "started" ? (
          <Button
            className="w-full mt-8 h-12 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-lg"
            onClick={handleStartGame}
          >
            Start
          </Button>
        ) : status === "waiting" ? (
          <p className="text-gray-500 mt-8 text-lg font-bold">Waiting for the host to start the game...</p>
        ) : null}
      </main>
    </div>
  );
}
