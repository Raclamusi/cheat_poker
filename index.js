const express = require("express");
const { maxHeaderSize } = require("http");
const path = require("path");
const { Server } = require("ws");

const port = process.env.PORT || 3000;
const app = express();
app.use(express.static(path.join(__dirname, "public")));
const server = app.listen(port);
const wsServer = new Server({ server });

/**
 * @typedef {Object} RoomInfo
 * @property {string} name
 * @property {boolean} locked
 * @property {boolean} started
 * @property {number} participants
 * @property {string} discription
 * @property {number} id
 * @property {string} password
 */

/** @type {Room[]} */
const roomsInfo = [];
/** @type {number[]} */
const idQueue = new Array(1000000).fill(0).map((e, i) => i);

/**
 * 
 * @param {WebSocket} ws 
 * @param {string} message 
 * @param {any} data 
 */
function sendMessage(ws, message, data) {
    ws.send(JSON.stringify({ message, data }));
}

/**
 * 
 * @param {string} message 
 * @param {any} data 
 */
function broadcastMessage(message, data) {
    wsServer.clients.forEach(ws => sendMessage(ws, message, data));
}

wsServer.on("connection", ws => {
    ws.on("close", code => {
        console.log(`[close] ${code}`);
    });
    ws.on("error", err => {
        console.log("[error]");
        console.log(err);
        sendMessage(ws, "ERROR", err);
    });
    ws.on("message", data => {
        console.log(`[message] ${data}`);
        const parsedData = JSON.parse(data);
        switch (parsedData.message) {
            case "CREATE":
                if (idQueue.length === 0) {
                    sendMessage(ws, "ERROR", "これ以上ルームを作成することはできません");
                    break;
                }
                const room = parsedData.data;
                if (room.name.length === 0) {
                    sendMessage(ws, "ERROR", "ルーム名を入力する必要があります");
                    break;
                }
                if (room.player.length === 0) {
                    sendMessage(ws, "ERROR", "プレイヤー名を入力する必要があります");
                    break;
                }
                roomsInfo.push({
                    name: room.name,
                    locked: room.locked,
                    started: false,
                    participants: 0,
                    discription: room.discription,
                    id: idQueue[0],
                    password: room.password,
                });
                broadcastMessage("ROOMS", roomsInfo);
                break;
        }
    });

    console.log("[open]");
    sendMessage(ws, "ROOMS", roomsInfo);
});
