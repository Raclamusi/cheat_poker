const express = require("express");
const path = require("path");
const { Server } = require("ws");

const { PokerRoom } = require("./Poker.js");

const port = process.env.PORT || 3000;
const app = express();
app.use(express.static(path.join(__dirname, "public")));
const server = app.listen(port);
const wsServer = new Server({ server });

/** @type {number[]} */
const idQueue = new Array(1000000).fill(0).map((e, i) => i + 1);
/** @type {Map<number, PokerRoom>} */
const rooms = new Map();

/** @type {Map<WebSocket, number>} */
const wsRoomMap = new Map();

/** @type {Map<WebSocket, NodeJS.Timer>} */
const wsIntervalMap = new Map();


/**
 * @param {WebSocket} ws 
 * @param {string} message 
 * @param {any} data 
 */
function sendMessage(ws, message, data) {
    ws.send(JSON.stringify({ message, data }));
}

/**
 * @param {string} message 
 * @param {any} data 
 */
function broadcastMessage(message, data) {
    wsServer.clients.forEach(ws => sendMessage(ws, message, data));
}

function updateRooms() {
    broadcastMessage("ROOMS", Array.from(rooms.values()).map(e => {
        return {
            name: e.name,
            locked: e.password !== null,
            started: e.started,
            participants: e.players.length,
            discription: e.discription,
            startChips: e.startChips,
            waitingTime: e.waitingTime,
            blindInterval: e.blindInterval,
            cheat: e.cheat,
            id: e.id,
        };
    }));
}

wsServer.on("connection", ws => {
    ws.on("close", code => {
        console.log(`[close] ${code}`);
        clearInterval(wsIntervalMap.get(ws));
        wsIntervalMap.delete(ws);
        if (!wsRoomMap.has(ws)) return;
        const id = wsRoomMap.get(ws);
        if (!rooms.has(id)) return;
        const room = rooms.get(id);
        if (room.exist(ws)) room.disconnect(ws);
        if (room.empty()) {
            room.finish();
            rooms.delete(id);
            wsRoomMap.forEach((v, k, m) => {
                if (v === id) m.delete(k);
            });
            updateRooms();
        }
    });

    ws.on("error", err => {
        console.log("[error]");
        console.log(err);
        sendMessage(ws, "ERROR", err);
    });

    ws.on("message", data => {
        console.log(`[message] ${data}`);
        const parsedData = JSON.parse(data);
        try {
            if (wsRoomMap.has(ws)) {
                rooms.get(wsRoomMap.get(ws)).procedure(ws, parsedData.message, parsedData.data);
            }
            switch (parsedData.message) {
                case "CREATE": {
                    if (idQueue.length === 0) {
                        sendMessage(ws, "ERROR", "????????????????????????????????????????????????????????????");
                        break;
                    }
                    const roomInfo = parsedData.data;
                    roomInfo.name = roomInfo.name.replace(/\s+/g, " ").replace(/^ | $/g, "");
                    roomInfo.player = roomInfo.player.replace(/\s+/g, " ").replace(/^ | $/g, "");
                    if (roomInfo.name.length === 0) {
                        sendMessage(ws, "ERROR", "????????????????????????????????????????????????");
                        break;
                    }
                    if (roomInfo.player.length === 0) {
                        sendMessage(ws, "ERROR", "??????????????????????????????????????????????????????");
                        break;
                    }
                    if (Array.from(rooms.values()).find(e => e.name === roomInfo.name) !== undefined) {
                        sendMessage(ws, "ERROR", `???????????????${roomInfo.name}????????????????????????????????????`);
                        break;
                    }
                    if (roomInfo.startChips === null || roomInfo.startChips <= 0) {
                        sendMessage(ws, "ERROR", "???????????????????????????????????????????????????????????????");
                        break;
                    }
                    if (roomInfo.waitingTime === null || roomInfo.waitingTime <= 0) {
                        sendMessage(ws, "ERROR", "??????????????????????????????????????????????????????????????????");
                        break;
                    }
                    if (roomInfo.blindInterval === null || roomInfo.blindInterval <= 0) {
                        sendMessage(ws, "ERROR", "????????????????????????????????????????????????????????????????????????");
                        break;
                    }
                    const id = idQueue[0];
                    idQueue.shift();
                    const room = new PokerRoom(
                        id,
                        roomInfo.name,
                        roomInfo.discription,
                        roomInfo.locked ? roomInfo.password : null,
                        roomInfo.startChips,
                        roomInfo.waitingTime,
                        roomInfo.blindInterval,
                        roomInfo.cheat,
                        roomInfo.player,
                        ws
                    );
                    rooms.set(id, room);
                    wsRoomMap.set(ws, id);
                    sendMessage(ws, "ENTERED", { room: room.getInfo(room.players[0]), name: room.name, id: id, player: roomInfo.player, reentry: room.players[0].reentry });
                    updateRooms();
                    break;
                }
                case "JOIN": {
                    const entry = parsedData.data;
                    entry.player = entry.player.replace(/\s+/g, " ").replace(/^ | $/g, "");
                    if (!rooms.has(entry.id)) {
                        if (entry.reentry === undefined) {
                            sendMessage(ws, "ERROR", "?????????????????????????????????");
                        }
                        break;
                    }
                    if (entry.player.length === 0) {
                        if (entry.reentry === undefined) {
                            sendMessage(ws, "ERROR", "??????????????????????????????????????????????????????");
                        }
                        break;
                    }
                    const room = rooms.get(entry.id);
                    if (entry.reentry !== undefined) {
                        const player = room.players.find(e => e.name === entry.player);
                        if (player === undefined || player.online || player.reentry !== entry.reentry) {
                            break;
                        }
                        wsRoomMap.delete(player.ws);
                        player.ws = ws;
                        player.resetReentry();
                        room.connect(ws);
                    }
                    else {
                        if (room.players.length === 10) {
                            sendMessage(ws, "ERROR", "????????????????????????");
                            break;
                        }
                        if (room.password !== null && entry.password !== room.password) {
                            sendMessage(ws, "ERROR", "??????????????????????????????");
                            break;
                        }
                        if (room.players.some(e => e.name === entry.player)) {
                            sendMessage(ws, "ERROR", `?????????????????????${entry.player}???????????????????????????????????????????????????`);
                            break;
                        }
                        room.join(entry.player, ws);
                    }
                    wsRoomMap.set(ws, entry.id);
                    const player = room.players.find(e => e.ws === ws);
                    sendMessage(ws, "ENTERED", { room: room.getInfo(player), name: room.name, id: entry.id, player: entry.player, reentry: player.reentry });
                    updateRooms();
                    break;
                }
                case "LEAVE": {
                    if (!wsRoomMap.has(ws)) break;
                    const id = wsRoomMap.get(ws);
                    if (!rooms.has(id)) break;
                    const room = rooms.get(id);
                    if (room.empty()) {
                        rooms.delete(id);
                        wsRoomMap.forEach((v, k, m) => {
                            if (v === id) m.delete(k);
                        });
                        updateRooms();
                    }
                    wsRoomMap.delete(ws);
                    sendMessage(ws, "EXITED", {});
                    updateRooms();
                    break;
                }
            }
        }
        catch (e) {
            console.error(e);
            sendMessage(ws, "ERROR", "????????????????????????????????????");
        }
    });

    console.log("[open]");
    // heroku ?????????????????????
    wsIntervalMap.set(ws, setInterval(() => sendMessage(ws, "ROUTINE", {}), 30000));
    updateRooms();
});
