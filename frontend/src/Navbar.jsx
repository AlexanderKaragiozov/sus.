import React from "react";
import { Button } from "@/components/ui/button"; // Button not used, but keeping import for consistency

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-gradient-to-r from-blue-950 to-blue-800 text-white shadow-2xl z-50 py-4 font-['Orbitron'] border-b-4 border-teal-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center"> {/* Removed fixed h-16 here */}
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-teal-400 uppercase tracking-wider drop-shadow-lg">
              sus.
            </h1>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-6">
            <a
              href="/"
              className="text-lg sm:text-xl font-bold uppercase text-white hover:text-teal-300 transition-colors duration-200"
            >
              Play
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}