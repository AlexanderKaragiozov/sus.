import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function GameFlow() {
  return (
    // Style block for text-stroke (can be moved to global CSS)
    <style>{`
      .text-stroke {
        text-shadow: 2px 2px 0px rgba(0,0,0,0.7);
      }
    `}</style>
    ,
    <section className="w-full py-12 bg-gray-100 font-['Orbitron'] text-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Adjusted padding for responsiveness */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-center mb-10 text-blue-900 drop-shadow-lg text-stroke uppercase">
          How to Play
        </h2>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8"> {/* Adjusted gap for better spacing */}
          {/* Step 1 */}
          <Card className="rounded-2xl shadow-xl border-4 border-blue-800 bg-blue-950 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="p-6">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-teal-400 uppercase">1. Join a Room</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-base sm:text-lg text-blue-200">
                Enter your username and room code (or create a new room) to start playing with friends.
              </p>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="rounded-2xl shadow-xl border-4 border-blue-800 bg-blue-950 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="p-6">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-teal-400 uppercase">2. Get Your Role</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-base sm:text-lg text-blue-200">
                The game selects one player to be the Spy, and the other players try to guess who the Spy is.
              </p>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="rounded-2xl shadow-xl border-4 border-blue-800 bg-blue-950 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="p-6">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-teal-400 uppercase">3. Ask & Guess</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-base sm:text-lg text-blue-200">
                Players ask each other clever questions to figure out who the Spy is without <span className="font-bold text-yellow-400">REVEALING TOO MUCH</span>.
              </p>
            </CardContent>
          </Card>

          {/* Step 4 - Emphasized card */}
          <Card className="shadow-xl md:col-span-3 rounded-2xl border-4 border-orange-500 bg-blue-950 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="p-6">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-orange-400 uppercase">4. Vote & Reveal</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-base sm:text-lg text-blue-200 leading-relaxed">
               After the round timer ends, players try to vote the Spy out of the game. <br/>
               <span className="font-bold text-red-400">IF THE SPY GETS VOTED OUT, THEY HAVE A CHANCE TO GUESS THE WORD. IF THEY SUCCEED, THE SPY WINS.</span>
               <br/>
               <span className="font-bold text-lime-400">IF NOT, THE PLAYERS WIN.</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}