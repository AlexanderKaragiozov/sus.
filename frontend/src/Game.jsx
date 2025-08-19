import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button.jsx";
import { useParams } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.jsx";
import { Label } from "@/components/ui/label";

export default function GamePage() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const wsUrl = import.meta.env.VITE_WS_URL;
  const { roomId } = useParams();
  const roomCode = localStorage.getItem("roomCode") || roomId;
  const sessionId = sessionStorage.getItem("sessionId") || "";

  const [players, setPlayers] = useState([]);
  const [word, setWord] = useState(null);
  const [status, setStatus] = useState();
  const [data, setData] = useState(null);
  const [roundStatus, setRoundStatus] = useState(null);
  const [selectedKick, setSelectedKick] = useState("");
  const [me, setMe] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const socketRef = useRef(null);
  const selectedKickRef = useRef(selectedKick);

  // Keep selectedKickRef updated
  useEffect(() => {
    selectedKickRef.current = selectedKick;
  }, [selectedKick]);

  // Timer logic
  useEffect(() => {
    if (!data?.round) return;

    const timerSeconds =
      data.round_status === "voting" ? data.round.vote_timer : data.round.round_timer;

    const startTime =
      data.round_status === "voting"
        ? Date.now()
        : new Date(data.round.round_start).getTime();

    const endTime = startTime + timerSeconds * 1000;

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && data.round_status === "voting") {
        clearInterval(interval)
        sendVoteEnd();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data?.round, data?.round_status]);

  // Send vote at the end
  const sendVoteEnd = useCallback(async () => {
    if (!selectedKickRef.current) {
      console.warn("⚠️ No player selected for kick");
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/api/rooms/${roomId}/round/1/vote/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voter_session_id: sessionId,
            votee_id: parseInt(selectedKickRef.current, 10),
          }),
        }
      );

      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const result = await res.json();
      console.log("Vote ended successfully", result);
    } catch (err) {
      console.error("Error ending vote:", err);
    }
  }, [roomId, sessionId]);

  // WebSocket setup
  useEffect(() => {
    if (!roomCode) return;

    const socket = new WebSocket(`${wsUrl}/room/${roomCode}/`);

    socket.onopen = () => {
      console.log("WebSocket connected!");
      socketRef.current = socket;
      socket.send(JSON.stringify({ action: "join", player_id: sessionId }));
    };

    socket.onmessage = (event) => {
      const msgData = JSON.parse(event.data);
      console.log("Message received:", msgData);

      if (msgData.players) {
        setPlayers(
          msgData.players.map((p, i) => {
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

      if (msgData.room_status) setStatus(msgData.room_status);
      if (msgData.room?.secret_word) setWord(msgData.room.secret_word);
      setData(msgData);
      if (msgData.round_status) setRoundStatus(msgData.round_status);
      if (msgData.me) setMe(msgData.me);
    };

    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onclose = () => console.log("WebSocket closed");

    return () => socket.close();
  }, [roomCode, sessionId]);

  // Start game
  const handleStartGame = async () => {
    if (!roomCode) {
      alert("No room code found!");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/rooms/${roomCode}/start/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to start the game");
      const responseData = await res.json();
      console.log("Game started:", responseData);

      socketRef.current?.send(JSON.stringify({ action: "start_game" }));
    } catch (error) {
      console.error(error);
      alert("Error starting game");
    }
  };

  const restartGame = async () => {
        try {
          const res = await fetch(`${apiUrl}/api/rooms/${roomCode}/restart/`, {
            method: "POST",
          });

          if (!res.ok) throw new Error("Failed to restart the game");
          const responseData = await res.json();
          console.log("Game restarted:", responseData);
          socketRef.current?.send(JSON.stringify({ action: "restart_game" }));
        } catch (error) {
          console.error(error);
          alert("Error restarting game");
        }
  }
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-gray-100">
      <main className="flex-1 p-6 sm:p-8 bg-gray-300 overflow-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="h-16 flex items-center justify-center">
            {data?.room && status !== "waiting" && (
              me?.id !== data.room.spy.id ? (
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 truncate">
                  Word: <span className="text-indigo-600">{word}</span>
                </h2>
              ) : (
                <h2 className="m-30 text-md font-extrabold text-red-600">
                  You are the spy
                </h2>
              )
            )}
          </div>

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

          <h3 className="text-xl font-semibold text-gray-700">
            Time left: <span className="text-red-500">{timeLeft} seconds</span>
          </h3>
        </div>

        {/* Players */}
        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">Players</h1>

        {roundStatus === "voting" ? (
          <RadioGroup
            value={selectedKick}
            onValueChange={setSelectedKick}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center mt-6"
          >
            {players.map((player) => (
              <div key={player.id} className="flex flex-col items-center max-w-[120px] text-center">
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-gray-300 object-cover hover:scale-110 transition-transform"
                />
                {me?.id !== player.id && (
                  <div className="mt-6 flex items-center space-x-2">
                    <RadioGroupItem
                      value={player.id.toString()}
                      id={`kick-${player.id}`}
                      className="w-5 h-5 rounded-full border-2 border-gray-400 checked:bg-amber-500 checked:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <Label
                      htmlFor={`kick-${player.id}`}
                      className="text-gray-700 text-lg font-bold text-red-600 cursor-pointer"
                    >
                      Kick {player.name}
                    </Label>
                  </div>
                )}
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center mt-6">
            {players.map((player) => (
              <div key={player.id} className="flex flex-col items-center max-w-[120px] text-center">
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

        {me?.is_host && status === "waiting" ? (
          <Button
            className="w-full mt-8 h-12 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-lg"
            onClick={handleStartGame}
          >
            Start
          </Button>
        ) : status === "waiting" ? (
          <p className="text-gray-500 mt-8 text-lg font-bold">
            Waiting for the host to start the game...
          </p>
        ) : null}
        <div className="flex justify-center items-center mt-1">
            {/* Winner message takes priority */}
            {data?.room?.winner ? (
              <h1 className="font-bold mb-6 text-red-700 text-center text-2xl">
                {data.room.winner === "spy" ? "Spy Wins!" : "Players Win!"}
              </h1>
            ) : (
              // If no winner → show eliminated player
              data?.round?.eliminated && (
                <h1 className="font-bold mb-6 text-red-700 text-center text-2xl m-40">
                  Eliminated: {data.round.eliminated}
                </h1>
              )
            )}
          </div>
        {data?.round_status=== "ended" && me.is_host && (
                  <div className="flex justify-center items-center mt-8">
            <Button
              className="h-12 px-8 bg-red-400 hover:bg-red-500 text-white font-bold rounded-lg hover:cursor-pointer"
              onClick={restartGame}
            >
              Restart Game
            </Button>
          </div>)}
      </main>
    </div>

  );
}
