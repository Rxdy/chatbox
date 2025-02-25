"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bcrypt = __importStar(require("bcrypt"));
const USERS_FILE = path.join(__dirname, "../data/users.json");
let users = {};
try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
    else {
        fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
}
catch (err) {
    console.error("Erreur lors de l’initialisation des utilisateurs :", err.message);
    users = {};
}
const wss = new ws_1.WebSocketServer({ port: 8080 });
const connectedClients = new Map();
wss.on("connection", (ws) => {
    console.log("Nouveau client connecté.");
    ws.send(JSON.stringify({
        type: "welcome",
        message: "Bienvenue ! Créez un compte avec /register <username> <password> ou connectez-vous avec /login <username> <password>",
    }));
    ws.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("Message reçu :", message.toString());
        const messageString = message.toString();
        const parts = messageString.split(" ");
        if (parts[0] === "/register") {
            const [, username, password] = parts;
            if (!username || !password) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Syntaxe : /register <username> <password>",
                }));
                return;
            }
            if (users[username]) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Ce nom d’utilisateur existe déjà.",
                }));
                return;
            }
            const passwordHash = yield bcrypt.hash(password, 10); // Hachage avec salt
            users[username] = {
                username,
                passwordHash,
                registeredAt: new Date().toISOString(),
            };
            try {
                fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
                console.log(`Nouvel utilisateur enregistré : ${username}`);
                ws.send(JSON.stringify({
                    type: "success",
                    message: `Compte créé pour ${username}. Connectez-vous avec /login.`,
                }));
            }
            catch (err) {
                console.error("Erreur sauvegarde users :", err.message);
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Erreur lors de la création du compte.",
                }));
            }
        }
        else if (parts[0] === "/login") {
            const [, username, password] = parts;
            if (!username || !password) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Syntaxe : /login <username> <password>",
                }));
                return;
            }
            const user = users[username];
            if (!user) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Utilisateur non trouvé.",
                }));
                return;
            }
            const isValid = yield bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Mot de passe incorrect.",
                }));
                return;
            }
            if (connectedClients.has(username)) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Cet utilisateur est déjà connecté.",
                }));
                return;
            }
            ws.username = username;
            connectedClients.set(username, ws);
            ws.send(JSON.stringify({
                type: "success",
                message: `Connecté en tant que ${username}`,
            }));
            wss.clients.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN && client.username) {
                    client.send(JSON.stringify({
                        type: "system",
                        message: `${username} a rejoint le chat.`,
                    }));
                }
            });
        }
        else if (!ws.username) {
            ws.send(JSON.stringify({
                type: "error",
                message: "Vous devez vous connecter avec /login <username> <password>",
            }));
        }
        else {
            console.log(`Diffusion de ${ws.username} : ${messageString}`);
            wss.clients.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN && client.username) {
                    client.send(JSON.stringify({
                        type: "message",
                        from: ws.username,
                        content: messageString,
                    }));
                }
            });
        }
    }));
    ws.on("close", (code, reason) => {
        console.log(`Client déconnecté. Username : ${ws.username || "non identifié"}, Code : ${code}, Raison : ${reason.toString()}`);
        if (ws.username) {
            connectedClients.delete(ws.username);
            wss.clients.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN && client.username) {
                    client.send(JSON.stringify({
                        type: "system",
                        message: `${ws.username} a quitté le chat.`,
                    }));
                }
            });
        }
    });
    ws.on("error", (err) => {
        console.error("Erreur WebSocket client :", err.message);
        if (ws.username)
            connectedClients.delete(ws.username);
    });
});
wss.on("error", (err) => {
    console.error("Erreur serveur WebSocket :", err.message);
});
console.log("Serveur WebSocket démarré sur ws://localhost:8080");
