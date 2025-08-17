
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import JoinRoom from "@/JoinRoom..jsx";
import Navbar from "@/Navbar..jsx";
import GameFlow from "@/GameFlow..jsx";

function Lobby() {


  return (
    <>
       <Navbar/>
       <JoinRoom/>
        <GameFlow />
    </>
  )
}

export default Lobby
