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
  const selectedKickRef = useRef(selectedKick); // Keep selectedKickRef updated

  useEffect(() => {
    selectedKickRef.current = selectedKick;
  }, [selectedKick]);

  // Timer logic
  useEffect(() => {
    if (!data?.round) return;

    const timerSeconds =
      data.round_status === "voting"
        ? data.round.vote_timer
        : data.round.round_timer;
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
        clearInterval(interval);
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voter_session_id: sessionId,
            votee_id: parseInt(selectedKickRef.current, 10),
          }),
        }
      );
      if (!res.ok)
        throw new Error(`Request failed with status ${res.status}`);
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
        headers: {
          "Content-Type": "application/json",
        },
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
      // Reset selected kick after a successful restart
      setSelectedKick("");
    } catch (error) {
      console.error(error);
      alert("Error restarting game");
    }
  };

  return (
    // Custom text shadow and blink animation. You might add this to your global CSS.
    <style>{`
      .text-stroke {
        text-shadow: 2px 2px 0px rgba(0,0,0,0.7);
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .animate-blink {
        animation: blink 1s step-end infinite;
      }
    `}</style>
    ,
    <div className="flex min-h-screen w-full overflow-x-hidden bg-gray-100 font-['Press_Start_2P'] justify-center items-center py-6 px-3 sm:px-4 lg:px-6">
      <main className="flex-1 max-w-6xl w-full p-5 sm:p-6 lg:p-8 bg-gray-200 rounded-2xl shadow-2xl overflow-auto text-center border-4 border-blue-900">
        {/* Header */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Word / Spy Message */}
          <div className="min-h-[90px] bg-blue-950 border-4 border-blue-800 rounded-xl shadow-xl p-3 flex items-center justify-center text-center transition-transform duration-300 hover:scale-105">
            {data?.room && status !== "waiting" ? (
              me?.id !== data.room.spy.id ? (
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white text-stroke truncate px-1">
                  WORD:{" "}
                  <span className="text-yellow-400 font-bold">{word}</span>
                </h2>
              ) : (
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-red-500 text-stroke px-1">
                  YOU ARE THE SPY
                </h2>
              )
            ) : (
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-300 text-stroke">
                WAITING FOR GAME TO START...
              </h2>
            )}
          </div>

          {/* Room ID & Status */}
          <div className="min-h-[90px] bg-blue-950 border-4 border-blue-800 rounded-xl shadow-xl p-3 flex flex-col items-center justify-center text-center transition-transform duration-300 hover:scale-105">
            <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white text-stroke">
              ROOM ID:{" "}
              <span className="text-yellow-400 font-bold">{roomId}</span>
            </h2>
            <div className="text-sm sm:text-base md:text-lg font-medium text-white text-stroke mt-1">
              STATUS:{" "}
              <span
                className={
                  (data?.round?.status || status) === "started"
                    ? "text-lime-400 font-bold"
                    : "text-orange-400 font-bold"
                }
              >
                {data?.round_status || status}
              </span>
            </div>
          </div>

          {/* Time Left */}
          <div className="min-h-[90px] bg-blue-950 border-4 border-blue-800 rounded-xl shadow-xl p-3 flex flex-col items-center justify-center text-center transition-transform duration-300 hover:scale-105">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-white text-stroke">
              TIME LEFT
            </h3>
            <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-red-400 animate-blink mt-1">
              {timeLeft}
            </span>
            <span className="text-xs sm:text-sm text-white text-stroke">SECONDS</span>
          </div>
        </div>

        {/* Players Section */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-blue-900 text-stroke">
          PLAYERS
        </h1>
        {roundStatus === "voting" ? (
          <RadioGroup
            value={selectedKick}
            onValueChange={setSelectedKick}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center mt-6 max-w-5xl mx-auto"
          >
            {players.map((player) => (
              <div
                key={player.id}
                className="flex flex-col items-center max-w-[120px] w-full text-center bg-white p-3 sm:p-4 rounded-xl shadow-lg border-2 border-blue-400 transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-blue-600 object-cover transform transition-transform duration-200 hover:scale-110"
                />
                {me?.id !== player.id && (
                  <div className="mt-3 flex flex-col items-center space-y-2">
                    <RadioGroupItem
                      value={player.id.toString()}
                      id={`kick-${player.id}`}
                      className="w-5 h-5 rounded-full border-4 border-red-500 checked:bg-red-700 checked:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-300"
                    />
                    <Label
                      htmlFor={`kick-${player.id}`}
                      className="text-gray-900 text-sm sm:text-base font-bold text-stroke cursor-pointer"
                    >
                      KICK {player.name.toUpperCase()}
                    </Label>
                  </div>
                )}
                {me?.id === player.id && (
                  <span className="text-gray-900 text-xs sm:text-sm mt-2 font-bold text-stroke break-words">
                    {player.name.toUpperCase()} (YOU)
                  </span>
                )}
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center mt-6 max-w-5xl mx-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex flex-col items-center max-w-[120px] w-full text-center bg-white p-3 sm:p-4 rounded-xl shadow-lg border-2 border-blue-400 transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-blue-600 object-cover transform transition-transform duration-200 hover:scale-110"
                />
                <span className="text-gray-900 text-xs sm:text-sm mt-2 font-bold text-stroke break-words">
                  {player.name.toUpperCase()} {player.isHost && "(HOST)"}{" "}
                  {me?.id === player.id && "(YOU)"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Game State Actions */}
        {me?.is_host && status === "waiting" ? (
          <Button
            className="w-full md:w-fit py-3 px-10 mt-10 h-auto bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold text-lg sm:text-xl rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            onClick={handleStartGame}
          >
            START GAME
          </Button>
        ) : status === "waiting" ? (
          <p className="text-gray-700 mt-10 text-lg sm:text-xl font-bold text-stroke">
            WAITING FOR THE HOST TO START THE GAME...
          </p>
        ) : null}

        {/* Winner/Eliminated Message */}
        <div className="flex justify-center items-center mt-10 min-h-[60px]">
          {data?.room?.winner ? (
            <h1 className="font-extrabold text-red-600 text-center text-2xl sm:text-3xl text-stroke animate-pulse">
              {data.room.winner === "spy" ? "SPY WINS!" : "PLAYERS WIN!"}
            </h1>
          ) : (
            data?.round?.eliminated && (
              <h1 className="font-extrabold text-red-600 text-center text-2xl sm:text-3xl text-stroke animate-pulse">
                ELIMINATED: {data.round.eliminated.toUpperCase()}
              </h1>
            )
          )}
        </div>

        {/* Restart Game Button */}
        {data?.round_status === "ended" && me?.is_host && (
          <div className="flex justify-center items-center mt-8">
            <Button
              className="h-auto py-3 px-10 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-lg sm:text-xl rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              onClick={restartGame}
            >
              RESTART GAME
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}