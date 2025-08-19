import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function GameFlow() {
  return (
    <section className="w-full py-1">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-8">How to Play</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">1. Join a Room</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Enter your username and room code (or create a new room) to start playing with friends.
              </p>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">2. Get Your Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Game selects one player to be the Spy, and the other players try to guess who the Spy is.
              </p>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">3. Ask & Guess</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Players ask each other clever questions to figure out who the Spy is without <span className="font-bold"> revealing too much</span>.
              </p>
            </CardContent>
          </Card>

          {/* Step 4 */}
          <Card className="shadow-lg md:col-span-3">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">4. Vote & Reveal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
               After the round timer ends, players try to vote the Spy out of the game. <br/><span className="font-bold text-red-700">If the spy gets voted out, he has the chance to guess the word. If he succeeds, the spy wins. </span><br/><span className="font-bold text-green-700">If not, the players win.</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
