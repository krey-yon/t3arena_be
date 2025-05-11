/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import WebSocket from "ws";
import http from "http";
import generateRoomCode from "./utils/generateRoomCode";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 3001;

const waitingPlayers: WebSocket[] = [];
const games = new Map();
const gameClients = new Map(); 

wss.on("connection", (ws) => {
  console.log("A player connected");
  
  ws.on("message", (message: any) => {
    const data = JSON.parse(message);
    console.log("Received message:", data);
    
    if (data.type === "joinWaitingRoom") {
      waitingPlayers.push(ws);
      if (waitingPlayers.length >= 2) {
        const player1: any = waitingPlayers.shift();
        const player2: any = waitingPlayers.shift();
        
        const gameId = generateRoomCode();
        
        games.set(gameId, {
          board: Array(9).fill(null),
          currentTurn: "X",
        });
        
        gameClients.set(gameId, {
          "X": player1,
          "O": player2
        });
        
        player1.send(JSON.stringify({ 
          type: "matchFound", 
          gameId, 
          symbol: "X" 
        }));
        
        player2.send(JSON.stringify({ 
          type: "matchFound", 
          gameId, 
          symbol: "O" 
        }));
      } else {
        ws.send(JSON.stringify({
          type: "waiting",
          message: "Waiting for an opponent..."
        }));
      }
    }
    else if (data.type === "joinGame") {
      const { gameId, symbol } = data;
      
      (ws as any).gameId = gameId;
      (ws as any).symbol = symbol;
      
      const game = games.get(gameId);
      if (!game) {
        ws.send(JSON.stringify({ type: "error", message: "Game not found" }));
        return;
      }
      
      if (!gameClients.has(gameId)) {
        gameClients.set(gameId, {});
      }
      
      const clients = gameClients.get(gameId);
      clients[symbol] = ws;
      
      console.log(`Player ${symbol} joined game ${gameId}`);
      
      ws.send(JSON.stringify({
        type: "gameUpdate",
        board: game.board,
        currentTurn: game.currentTurn
      }));
    }
    else if (data.type === "makeMove") {
      const { gameId, position, symbol } = data;
      const game = games.get(gameId);
      console.log(`Player ${symbol} made a move in game ${gameId}:`, position);
      if (!game) {
        ws.send(JSON.stringify({ type: "error", message: "Game not found" }));
        return;
      }
      
      if (game.currentTurn !== symbol) {
        ws.send(JSON.stringify({ type: "error", message: "Not your turn" }));
        return;
      }
      
      if (game.board[position] !== null) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid move" }));
        return;
      }
      
      game.board[position] = symbol;
      game.currentTurn = symbol === "X" ? "O" : "X";
      
      const winner = checkWinner(game.board);
      const isDraw = !game.board.includes(null) && !winner;
      
      const updateMessage = JSON.stringify({
        type: "gameUpdate",
        board: game.board,
        currentTurn: game.currentTurn,
        winner,
        isDraw
      });
      
      console.log(`Updated game state for ${gameId}:`, game.board);
      
      const clients = gameClients.get(gameId);
      if (clients) {
        if (clients["X"]) {
          clients["X"].send(updateMessage);
        }
        if (clients["O"]) {
          clients["O"].send(updateMessage);
        }
      }
    }
  });
  
  ws.on("close", () => {
    console.log("A player disconnected");
    
    const index = waitingPlayers.indexOf(ws);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
    
    const gameId = (ws as any).gameId;
    const symbol = (ws as any).symbol;
    
    if (gameId && symbol) {
      console.log(`Player ${symbol} disconnected from game ${gameId}`);
      
      const clients = gameClients.get(gameId);
      if (clients) {
        const otherSymbol = symbol === "X" ? "O" : "X";
        const otherPlayer = clients[otherSymbol];
        
        if (otherPlayer) {
          otherPlayer.send(JSON.stringify({
            type: "opponentDisconnected",
            message: "Your opponent disconnected"
          }));
        }
        
        clients[symbol] = null;
      }
    }
  });
});

function checkWinner(board: (null | "X" | "O")[]) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], 
    [0, 3, 6], [1, 4, 7], [2, 5, 8], 
    [0, 4, 8], [2, 4, 6]             
  ];
  
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  
  return null;
}

app.get("/", (req, res) => {
  res.send("Api server is running");
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});