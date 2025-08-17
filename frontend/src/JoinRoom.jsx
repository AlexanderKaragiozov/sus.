import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

export default function RoomPage() {
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
      const res = await fetch(`http://127.0.0.1:8000/api/rooms/${joinRoomCode}/join/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: joinUsername }),
      });

      if (!res.ok) throw new Error("Failed to join room");

      const data = await res.json();
      console.log("Joined room:", data);
    } catch (error) {
      console.error(error);
      alert("Error joining room");
    }
  };

  // Create room
  const handleCreate = async () => {
    if (!createUsername) {
      alert("Please enter a username to create a room!");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/rooms/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createUsername,

        }),
      });

      if (!res.ok) throw new Error("Failed to create room");

      const data = await res.json();
      console.log("Room created:", data);
      alert(`Room created! Code: ${data.code}`);
    } catch (error) {
      console.error(error);
      alert("Error creating room");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-0 px-4">
      <div className="flex flex-col md:flex-row gap-7 w-full max-w-4xl">

        {/* Join Room Card */}
        <Card className="flex-1 p-6 shadow-lg animate-fadeIn">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold mb-2">Join a Game Room</CardTitle>
            <p className="text-sm text-gray-500">
              Enter your username and room code to join.
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Username</label>
              <Input
                className="h-14 text-lg font-bold"
                placeholder="Your username"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Room Code</label>
              <Input
                className="h-14 text-lg font-bold"
                placeholder="Enter room code"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
              />
            </div>
            <Button className="w-full mt-2 hover:cursor-pointer" onClick={handleJoin}>
              Join Room
            </Button>
          </CardContent>
        </Card>

        {/* Create Room Card */}
        <Card className="flex-1 p-6 shadow-lg animate-fadeIn bg-black">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold mb-2 text-white">Create a Game Room</CardTitle>
            <p className="text-sm text-gray-200">
              Enter your username to create a new game room.
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-white">Username</label>
              <Input
                className="h-14 text-lg font-bold text-white"
                placeholder="Your username"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
              />
            </div>

            {/* Round Length */}
            <label className="block mb-1 text-sm font-medium text-white">
              Round Length: {roundLength} seconds
            </label>
            <Slider
              value={[roundLength]}
              min={60}
              max={400}
              step={10}
              onValueChange={(value) => setRoundLength(value[0])}
              className="w-full [&_.relative]:bg-gray-400 [&_.bg-primary]:bg-white"
            />

            {/* Vote Time */}
            <label className="block mb-1 text-sm font-medium text-white">
              Vote Time: {voteTime} seconds
            </label>
            <Slider
              value={[voteTime]}
              min={10}
              max={60}
              step={5}
              onValueChange={(value) => setVoteTime(value[0])}
              className="w-full [&_.relative]:bg-gray-400 [&_.bg-primary]:bg-white"
            />

            <Button
              className="w-full mt-2 hover:cursor-pointer bg-white text-black hover:bg-black hover:text-white hover:border-3 hover:border-cyan-400"
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
