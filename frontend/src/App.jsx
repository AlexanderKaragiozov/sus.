import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css'
import JoinRoom from "@/JoinRoom.jsx";
import Game from "@/Game.jsx";
import Lobby from "@/Lobby.jsx";
import Navbar from "@/Navbar.jsx";
import GameFlow from "@/GameFlow.jsx";
import Test from "@/Test.jsx";

export default function App() {
  return (
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />}></Route>
        <Route path="/game/:roomId" element={<Game />}></Route>


      </Routes>
    </BrowserRouter>


  );
}

