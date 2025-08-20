import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import {Label} from "@/components/ui/label.jsx";

export default function RoomPage() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const wsUrl = import.meta.env.VITE_WS_URL;
  const navigate = useNavigate();
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [roundLength, setRoundLength] = useState(180);
  const [voteTime, setVoteTime] = useState(30);

  // Join room
  const handleJoin = async () => {
    if (!joinRoomCode || !joinUsername) {
      alert("Please enter both username and room code!");
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/api/rooms/${joinRoomCode}/join/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: joinUsername }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to join room");
      }

      const data = await res.json();
      console.log("Joined room:", data);

      localStorage.setItem("roomCode", data.room.code);
      sessionStorage.setItem("sessionId", data.session_id);

      navigate(`/game/${data.room.code}`);
    } catch (error) {
      console.error(error);
      alert(`Error joining room: ${error.message}`);
    }
  };

  // Create room
  const handleCreate = async () => {
    if (!createUsername) {
      alert("Please enter a username to create a room!");
      return;
    }

    try {
      // Create room
      const res = await fetch(`${apiUrl}/api/rooms/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createUsername, round_timer: roundLength, vote_timer: voteTime }), // Pass timer values
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create room");
      }

      const data = await res.json();
      console.log("Room created:", data);

      alert(`Room created! Code: ${data.code}`);
      setJoinRoomCode(data.code); // Pre-fill join code for convenience
      localStorage.setItem("roomCode", data.code);

      // Join the newly created room
      const joinRes = await fetch(
        `${apiUrl}/api/rooms/${data.code}/join/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: createUsername }),
        }
      );

      if (!joinRes.ok) {
        const errorData = await joinRes.json();
        throw new Error(errorData.detail || "Failed to join created room");
      }

      const joinData = await joinRes.json();
      console.log("Joined created room:", joinData);
      sessionStorage.setItem("sessionId", joinData.session_id);

      navigate(`/game/${data.code}`);
    } catch (error) {
      console.error(error);
      alert(`Error creating or joining room: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 pt-24 pb-8 font-['Orbitron'] text-gray-800">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-10 text-blue-900 drop-shadow-lg text-center px-4">
        sus.
      </h1>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl px-4">
        {/* Join Room Card */}
        {/* Added min-w-0 here */}
        <Card className="flex-1 min-w-0 p-6 sm:p-8 bg-gray-50 rounded-2xl shadow-xl border-4 border-gray-300 transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="text-center mb-6">
            <CardTitle className="text-2xl sm:text-3xl font-extrabold mb-2 text-gray-900">
              JOIN GAME ROOM
            </CardTitle>
            <p className="text-sm sm:text-base text-gray-600">
              ENTER YOUR USERNAME AND ROOM CODE.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="join-username" className="block mb-2 text-sm sm:text-base font-medium text-gray-700 uppercase">
                Username
              </Label>
              <Input
                id="join-username"
                className="h-12 sm:h-14 text-lg sm:text-xl font-bold bg-gray-200 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder:text-gray-500 transition-colors duration-200"
                placeholder="YOUR PLAYER NAME"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="join-room-code" className="block mb-2 text-sm sm:text-base font-medium text-gray-700 uppercase">
                Room Code
              </Label>
              <Input
                id="join-room-code"
                className="h-12 sm:h-14 text-lg sm:text-xl font-bold bg-gray-200 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder:text-gray-500 transition-colors duration-200"
                placeholder="ENTER ROOM CODE"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())} // Auto-uppercase code
              />
            </div>
            <Button
              className="w-full py-3 sm:py-4 mt-4 h-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg sm:text-xl rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 uppercase tracking-wide"
              onClick={handleJoin}
            >
              Join Room
            </Button>
          </CardContent>
        </Card>

        {/* Create Room Card */}
        {/* Added min-w-0 here */}
        <Card className="flex-1 min-w-0 p-6 sm:p-8 bg-blue-950 rounded-2xl shadow-xl border-4 border-blue-800 transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="text-center mb-6">
            <CardTitle className="text-2xl sm:text-3xl font-extrabold mb-2 text-teal-400">
              CREATE NEW GAME
            </CardTitle>
            <p className="text-sm sm:text-base text-blue-200">
              SET UP GAME SETTINGS AND GET YOUR ROOM CODE.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="create-username" className="block mb-2 text-sm sm:text-base font-medium text-blue-200 uppercase">
                Username
              </Label>
              <Input
                id="create-username"
                className="h-12 sm:h-14 text-lg sm:text-xl font-bold bg-blue-900 border-2 border-blue-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 text-white placeholder:text-blue-400 transition-colors duration-200"
                placeholder="YOUR HOST NAME"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
              />
            </div>

            {/* Round Length Slider */}
            <div>
              <Label className="block mb-3 text-sm sm:text-base font-medium text-blue-200 uppercase">
                Round Length:{" "}
                <span className="text-teal-400 text-lg sm:text-xl">{roundLength}</span> seconds
              </Label>
              <Slider
                value={[roundLength]}
                min={60}
                max={400}
                step={10}
                onValueChange={(value) => setRoundLength(value[0])}
                className="w-full [&_span[data-state=checked]]:bg-teal-500 [&_span]:bg-blue-700 [&_span]:h-3 [&_span]:rounded-full [&_span]:transition-all [&_span]:duration-200 [&_span]:shadow-inner [&_span[role=slider]]:bg-teal-400 [&_span[role=slider]]:w-6 [&_span[role=slider]]:h-6 [&_span[role=slider]]:border-4 [&_span[role=slider]]:border-teal-200 [&_span[role=slider]]:shadow-xl [&_span[role=slider]]:focus-visible:ring-teal-300 [&_span[role=slider]]:hover:scale-110 [&_span[role=slider]]:hover:bg-teal-300"
              />
            </div>

            {/* Vote Time Slider */}
            <div>
              <Label className="block mb-3 text-sm sm:text-base font-medium text-blue-200 uppercase">
                Vote Time:{" "}
                <span className="text-teal-400 text-lg sm:text-xl">{voteTime}</span> seconds
              </Label>
              <Slider
                value={[voteTime]}
                min={10}
                max={60}
                step={5}
                onValueChange={(value) => setVoteTime(value[0])}
                className="w-full [&_span[data-state=checked]]:bg-teal-500 [&_span]:bg-blue-700 [&_span]:h-3 [&_span]:rounded-full [&_span]:transition-all [&_span]:duration-200 [&_span]:shadow-inner [&_span[role=slider]]:bg-teal-400 [&_span[role=slider]]:w-6 [&_span[role=slider]]:h-6 [&_span[role=slider]]:border-4 [&_span[role=slider]]:border-teal-200 [&_span[role=slider]]:shadow-xl [&_span[role=slider]]:focus-visible:ring-teal-300 [&_span[role=slider]]:hover:scale-110 [&_span[role=slider]]:hover:bg-teal-300"
              />
            </div>

            <Button
              className="w-full py-3 sm:py-4 mt-4 h-auto bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg sm:text-xl rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 uppercase tracking-wide"
              onClick={handleCreate}
            >
              Create Room
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}