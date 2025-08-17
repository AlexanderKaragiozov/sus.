import React from "react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-600 text-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold">sus.</h1>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-6">
            <a href="/" className="hover:text-gray-300 font-medium">Play</a>
          </div>
        </div>
      </div>
    </nav>
  );
}
