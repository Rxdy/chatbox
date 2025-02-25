"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
// Créer un serveur WebSocket sur le port 8080
const wss = new ws_1.default.Server({ port: 8080 });
// Quand un client se connecte
wss.on("connection", (ws) => {
    console.log("Un client est connecté !");
    ws.on("message", (message) => {
        console.log(`Message reçu : ${message}`);
        wss.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(`Echo : ${message}`);
            }
        });
    });
    ws.on("close", () => {
        console.log("Un client s’est déconnecté.");
    });
});
console.log("Serveur WebSocket démarré sur ws://localhost:8080");
