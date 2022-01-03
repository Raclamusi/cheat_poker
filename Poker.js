class PokerPlayer {
    constructor(name, ws) {
        this.name = name;
        this.ws = ws;
        this.online = true;
        this.ready = false;
        this.resetReentry();
    }
    resetReentry() {
        this.reentry = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
}

function send(ws, message, data) {
    ws.send(JSON.stringify({ message, data }));
}

class PokerRoom {
    constructor(id, name, discription, password, creatorName, creatorWs) {
        this.id = id;
        this.name = name;
        this.discription = discription;
        this.password = password;
        this.players = [new PokerPlayer(creatorName, creatorWs)];
        this.started = false;
    }
    empty() {
        return this.players.every(e => !e.online);
    }
    exist(ws) {
        return this.players.find(e => e.ws === ws) !== undefined;
    }
    getInfo() {
        return { name: this.name };
    }
    connect(ws) {
        this.players.find(e => e.ws === ws).online = true;
    }
    disconnect(ws) {
        this.players.find(e => e.ws === ws).online = false;
    }
    join(name, ws) {
        this.players.push(new PokerPlayer(name, ws));
        this.broadcast("JOINED", { room: this.getInfo(), player: name });
    }
    broadcast(message, data) {
        this.players.forEach(player => send(player.ws, message, data));
    }
    procedure(ws, message, data) {
        switch (message) {
            case "LEAVE": {
                const playerId = this.players.findIndex(e => e.ws === ws);
                if (playerId === -1) break;
                const [player] = this.players.splice(playerId, 1);
                this.broadcast("LEFT", { room: this.getInfo(), player: player.name });
                break;
            }
        }
    }
}

module.exports = { PokerRoom, PokerPlayer };
