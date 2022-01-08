class PokerPlayer {
    constructor(name, ws) {
        this.name = name;
        this.ws = ws;
        this.online = true;
        this.ready = false;
        this.resetReentry();

        this.state = "";
        this.bet = 0;
        this.chips = 0;
        this.button = false;
        this.turn = false;
        this.cheated = false;
        this.cards = [];
    }
    resetReentry() {
        this.reentry = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    getInfo(show) {
        return {
            name: this.name,
            online: this.online,
            ready: this.ready,
            state: this.state,
            bet: this.bet,
            chips: this.chips,
            turn: this.turn,
            button: this.button,
            cards: show ? this.cards : null,
        };
    }
    getDetail() {
        return {
            name: this.name,
            online: this.online,
            ready: this.ready,
            state: this.state,
            bet: this.bet,
            chips: this.chips,
            turn: this.turn,
            button: this.button,
            cheated: this.cheated,
            cards: this.cards,
        };
    }
}

function send(ws, message, data) {
    ws.send(JSON.stringify({ message, data }));
}

class PokerRoom {
    constructor(id, name, discription, password, startChips, waitingTime, blindInterval, cheat, creatorName, creatorWs) {
        this.id = id;
        this.name = name;
        this.discription = discription;
        this.password = password;
        this.startChips = startChips;
        this.waitingTime = waitingTime;
        this.blindInterval = blindInterval;
        this.cheat = cheat;

        this.players = [new PokerPlayer(creatorName, creatorWs)];
        this.started = false;
        this.cards = [];
        this.pot = 0;
        this.ante = 0;
        this.bet = 0;
        this.showdown = false;
        this.blindTimer = 0;
        this.blindInterval = null;
        this.turn = -1;
        this.button = -1;
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
            waitingTime: this.waitingTime,
            blindInterval: this.blindInterval,
            cheat: this.cheat,
            started: this.started,
            cards: this.cards,
            pot: this.pot,
            ante: this.ante,
            bet: this.bet,
            button: this.button,

            me: player.getDetail(),
            players: this.players.map(e => e.getInfo(this.showdown)),
        };
    }
    start() {
        this.started = true;
        this.ante = 50;
        this.players.forEach(e => e.chips = this.startChips);
        this.broadcast("STARTED", {});
    }
    connect(ws) {
        const player = this.players.find(e => e.ws === ws);
        if (player !== undefined) {
            player.online = true;
            player.state = "";
        }
    }
    disconnect(ws) {
        const player = this.players.find(e => e.ws === ws);
        if (!this.started) this.leave(ws);
        else if (player !== undefined) {
            player.online = false;
            player.state = "オフライン";
        }
    }
    join(name, ws) {
        this.players.push(new PokerPlayer(name, ws));
        this.broadcast("JOINED", { player: name });
    }
    leave(ws) {
        const playerId = this.players.findIndex(e => e.ws === ws);
        if (playerId === -1) return;
        if (this.started) {
            this.players[playerId].online = false;
            this.reentry = -1;
            player.state = "退室済み";
        }
        else {
            const [player] = this.players.splice(playerId, 1);
            this.broadcast("LEFT", { player: player.name });
        }
    }
    broadcast(message, data) {
        this.players.forEach(player => {
            send(player.ws, message, { room: this.getInfo(player), ...data });
        });
    }
    procedure(ws, message, data) {
        const player = this.players.find(e => e.ws === ws);
        if (player === undefined) return;
        switch (message) {
            case "LEAVE":
                this.leave(ws);
                break;
            case "CHAT":
                this.broadcast("CHAT", { player: player.name, content: data.content });
                break;
            case "READY":
                player.ready = !player.ready;
                if (this.players.length >= 2 && this.players.every(e => e.ready)) {
                    this.start();
                    break;
                }
                this.broadcast("READIED", { player: player.name });
                break;
            case "CHECK_FOLD":
                break;
            case "BET_CALL":
                break;
            case "RAISE":
                break;
        }
    }
}

module.exports = { PokerRoom, PokerPlayer };
