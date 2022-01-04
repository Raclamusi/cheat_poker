class PokerPlayer {
    constructor(name, ws, chips) {
        this.name = name;
        this.ws = ws;
        this.online = true;
        this.ready = false;
        this.resetReentry();

        this.state = "";
        this.bet = 0;
        this.chips = chips;
        this.turn = false;
        this.cheated = false;
        this.cards = [];
    }
    resetReentry() {
        this.reentry = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    getInfo(show) {
        return {
            state: this.state,
            bet: this.bet,
            chips: this.chips,
            turn: this.turn,
            cards: show ? this.cards : null,
        };
    }
    getDetail() {
        return {
            state: this.state,
            bet: this.bet,
            chips: this.chips,
            turn: this.turn,
            cheated: this.cheated,
            cards: this.cards,
        };
    }
}

function send(ws, message, data) {
    ws.send(JSON.stringify({ message, data }));
}

class PokerRoom {
    constructor(id, name, discription, password, startChips, waitingTime, blindInterval, debt, cheat, creatorName, creatorWs) {
        this.id = id;
        this.name = name;
        this.discription = discription;
        this.password = password;
        this.startChips = startChips;
        this.waitingTime = waitingTime;
        this.blindInterval = blindInterval;
        this.debt = debt;
        this.cheat = cheat;
        this.players = [new PokerPlayer(creatorName, creatorWs, startChips)];
        this.started = false;
        
        this.cards = [];
        this.pot = 0;
        this.ante = 50;
        this.showdown = false;
    }
    empty() {
        return this.players.every(e => !e.online);
    }
    exist(ws) {
        return this.players.find(e => e.ws === ws) !== undefined;
    }
    getInfo(player) {
        return {
            name: this.name,
            started: this.started,
            cards: this.cards,
            pot: this.pot,
            ante: this.ante,

            me: player.getDetail(),
            players: this.players.map(e => e.getInfo(this.showdown)),
        };
    }
    connect(ws) {
        this.players.find(e => e.ws === ws).online = true;
    }
    disconnect(ws) {
        this.players.find(e => e.ws === ws).online = false;
    }
    join(name, ws) {
        this.players.push(new PokerPlayer(name, ws, this.startChips));
        this.broadcast("JOINED", { player: name });
    }
    leave(ws) {
        const playerId = this.players.findIndex(e => e.ws === ws);
        if (playerId === -1) return;
        const [player] = this.players.splice(playerId, 1);
        this.broadcast("LEFT", { player: player.name });
    }
    broadcast(message, data) {
        this.players.forEach(player => {
            const data2 = Object.assign({}, data);
            data2.room = this.getInfo(player);
            send(player.ws, message, data);
        });
    }
    procedure(ws, message, data) {
        switch (message) {
            case "LEAVE":
                this.leave(ws);
                break;
            case "CHAT": {
                const player = this.players.find(e => e.ws === ws);
                if (player === undefined) break;
                this.broadcast("CHAT", { player: player.name, content: data.content });
                break;
            }
        }
    }
}

module.exports = { PokerRoom, PokerPlayer };
