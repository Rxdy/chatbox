import { WebSocket, WebSocketServer } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcrypt";

interface Client extends WebSocket {
    username?: string;
}

interface User {
    username: string;
    passwordHash: string;
    registeredAt: string;
}

const USERS_FILE = path.join(__dirname, "../data/users.json");
let users: { [username: string]: User } = {};
try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    } else {
        fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
} catch (err: unknown) {
    console.error(
        "Erreur lors de l’initialisation des utilisateurs :",
        (err as Error).message
    );
    users = {};
}

const wss = new WebSocketServer({ port: 8080 });
const connectedClients: Map<string, Client> = new Map();

wss.on("connection", (ws: Client) => {
    console.log("Nouveau client connecté.");
    ws.send(
        JSON.stringify({
            type: "welcome",
            message:
                "Bienvenue ! Utilisez le formulaire pour vous inscrire ou vous connecter.",
        })
    );

    ws.on("message", async (message: Buffer) => {
        console.log("Message brut reçu :", message.toString());
        try {
            const data = JSON.parse(message.toString());
            if (data.action === "register") {
                const { username, password } = data;
                if (!username || !password) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message:
                                "Nom d’utilisateur et mot de passe requis.",
                        })
                    );
                    return;
                }
                if (users[username]) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message: "Ce nom d’utilisateur existe déjà.",
                        })
                    );
                    return;
                }
                const passwordHash = await bcrypt.hash(password, 10);
                console.log(
                    `Hachage généré pour ${username} : ${passwordHash}`
                );
                users[username] = {
                    username,
                    passwordHash,
                    registeredAt: new Date().toISOString(),
                };
                fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
                console.log(`Nouvel utilisateur enregistré : ${username}`);
                ws.send(
                    JSON.stringify({
                        type: "success",
                        message: `Compte créé pour ${username}. Connectez-vous.`,
                    })
                );
            } else if (data.action === "login") {
                const { username, password } = data;
                if (!username || !password) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message:
                                "Nom d’utilisateur et mot de passe requis.",
                        })
                    );
                    return;
                }
                const user = users[username];
                if (!user) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message: "Utilisateur non trouvé.",
                        })
                    );
                    return;
                }
                if (!user.passwordHash) {
                    console.error(
                        `Mot de passe haché manquant pour ${username}`
                    );
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message:
                                "Erreur interne : données utilisateur corrompues.",
                        })
                    );
                    return;
                }
                console.log(
                    `Vérification login pour ${username}, hash stocké : ${user.passwordHash}`
                );
                const isValid = await bcrypt.compare(
                    password,
                    user.passwordHash
                );
                if (!isValid) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message: "Mot de passe incorrect.",
                        })
                    );
                    return;
                }
                if (connectedClients.has(username)) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message: "Cet utilisateur est déjà connecté.",
                        })
                    );
                    return;
                }
                ws.username = username;
                connectedClients.set(username, ws);
                ws.send(
                    JSON.stringify({
                        type: "success",
                        message: `Connecté en tant que ${username}`,
                    })
                );
                wss.clients.forEach((client: Client) => {
                    if (
                        client.readyState === WebSocket.OPEN &&
                        client.username
                    ) {
                        client.send(
                            JSON.stringify({
                                type: "system",
                                message: `${username} a rejoint le chat.`,
                            })
                        );
                    }
                });
            } else if (data.action === "message") {
                if (!ws.username) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message: "Vous devez vous connecter d’abord.",
                        })
                    );
                    return;
                }
                console.log(`Diffusion de ${ws.username} : ${data.content}`);
                wss.clients.forEach((client: Client) => {
                    if (
                        client.readyState === WebSocket.OPEN &&
                        client.username
                    ) {
                        client.send(
                            JSON.stringify({
                                type: "message",
                                from: ws.username,
                                content: data.content,
                            })
                        );
                    }
                });
            } else {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        message: "Action inconnue.",
                    })
                );
            }
        } catch (err: unknown) {
            console.error(
                "Erreur traitement message :",
                (err as Error).message
            );
            ws.send(
                JSON.stringify({
                    type: "error",
                    message: "Erreur serveur lors du traitement.",
                })
            );
        }
    });

    ws.on("close", (code: number, reason: Buffer) => {
        console.log(
            `Client déconnecté. Username : ${
                ws.username || "non identifié"
            }, Code : ${code}, Raison : ${reason.toString()}`
        );
        if (ws.username) {
            connectedClients.delete(ws.username);
            wss.clients.forEach((client: Client) => {
                if (client.readyState === WebSocket.OPEN && client.username) {
                    client.send(
                        JSON.stringify({
                            type: "system",
                            message: `${ws.username} a quitté le chat.`,
                        })
                    );
                }
            });
        }
    });

    ws.on("error", (err) => {
        console.error("Erreur WebSocket client :", err.message);
        if (ws.username) connectedClients.delete(ws.username);
    });
});

wss.on("error", (err) => {
    console.error("Erreur serveur WebSocket :", err.message);
});

console.log("Serveur WebSocket démarré sur ws://localhost:8080");
