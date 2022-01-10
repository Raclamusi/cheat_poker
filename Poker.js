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
        this.step = false;
        this.cheated = false;
        this.cards = [];
        this.rank = 0;
    }
    resetReentry() {
        this.reentry = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    getInfo(show=false) {
        return {
            name: this.name,
            online: this.online,
            ready: this.ready,
            state: this.state,
            bet: this.bet,
            chips: this.chips,
            step: this.step,
            button: this.button,
            cards: show ? this.cards : null,
            rank: this.rank,
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
            step: this.step,
            button: this.button,
            cheated: this.cheated,
            cards: this.cards,
            rank: this.rank,
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
        this.playingPlayers = null;
        this.started = false;
        this.cards = [];
        this.pot = 0;
        this.ante = 0;
        this.bet = 0;
        this.showdowning = false;
        this.blindTimer = 0;
        this.blindTimerId = null;
        this.step = -1;
        this.button = -1;
        this.stack = null;
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
            step: this.step,
            button: this.button,
            blindTimer: this.blindTimer,

            me: player.getDetail(),
            players: this.players.map(e => e.getInfo(this.showdowning)),
        };
    }
    dealStack() {
        // フィッシャー–イェーツのシャッフルによってカードをシャッフルする
        const playingCards = ["spade", "club", "diamond", "heart"].map(
            suit => new Array(13).fill(0).map((_, i) => i + 1).map(
                number => { return { suit, number }; })).flat();
        this.stack = [];
        while (playingCards.length !== 0) {
            this.stack.push(...playingCards.splice(Math.floor(Math.random() * playingCards.length), 1));
        }
    }
    raiseBlind() {
        this.ante = this.ante === 0 ? 50 : Math.floor(this.ante / 10 * 1.2222) * 10;
        this.blindTimer = this.blindInterval;
        this.blindTimerId = setInterval(() => {
            if (--this.blindTimer == 0) {
                clearInterval(this.blindTimerId);
                this.blindTimerId = null;
            }
        }, 1000);
        this.broadcast("BLIND", {});
    }
    start() {
        this.broadcast("STARTED", {});
        setTimeout(() => {
            this.started = true;
            this.players.forEach(e => e.chips = this.startChips);
            this.raiseBlind();
            this.preflop();
        }, 2000);
    }
    finish() {
        this.started = false;
        this.cards = [];
        this.pot = 0;
        this.ante = 0;
        this.bet = 0;
        this.showdowning = false;
        this.step = -1;
        this.button = -1;
        this.players.forEach(player => {
            if (!player.online) {
                this.players.splice(this.players.indexOf(player), 1);
                return;
            }
            player.ready = false;
            player.state = "";
            player.bet = 0;
            player.chips = 0;
            player.button = false;
            player.step = false;
            player.cheated = false;
            player.cards = [];
        });
    }
    preflop() {
        this.dealStack();
        this.cards = [];
        this.playingPlayers = this.players.filter(e => e.chips > 0);
        if (this.button !== -1) {
            this.players[this.button].button = false;
        }
        do {
            this.button++;
            this.button %= this.players.length;
        }
        while (this.players[this.button].chips === 0);
        this.players[this.button].button = true;
        const playingButton = this.playingPlayers.findIndex(e => e.button);
        this.step = (playingButton + (this.playingPlayers.length === 2 ? 0 : 3)) % this.playingPlayers.length;
        this.playingPlayers[this.step].step = true;
        if (this.blindTimer === 0) {
            this.raiseBlind();
        }
        setTimeout(() => {
            this.playingPlayers.forEach(player => {
                player.cards = this.stack.splice(0, 2);
                if (player.chips < this.ante) {
                    this.pot += player.chips;
                    player.chips = 0;
                    return;
                }
                this.pot += this.ante;
                player.chips -= this.ante;
            });
            const sbPlayer = this.playingPlayers[(playingButton + (this.playingPlayers.length === 2 ? 0 : 1)) % this.playingPlayers.length];
            const bbPlayer = this.playingPlayers[(playingButton + (this.playingPlayers.length === 2 ? 1 : 2)) % this.playingPlayers.length];
            if (sbPlayer.chips < this.ante * 2) {
                sbPlayer.bet = sbPlayer.chips;
                sbPlayer.chips = 0;
            }
            else {
                sbPlayer.bet = this.ante * 2;
                sbPlayer.chips -= this.ante * 2;
            }
            this.pot += sbPlayer.bet;
            if (bbPlayer.chips < this.ante * 4) {
                bbPlayer.bet = bbPlayer.chips;
                bbPlayer.chips = 0;
            }
            else {
                bbPlayer.bet = this.ante * 4;
                bbPlayer.chips -= this.ante * 4;
            }
            this.pot += bbPlayer.bet;
            this.bet += this.ante * 4;
            this.broadcast("PREFLOP", {});
        }, 2000);
    }
    flop() {
        this.cards.push(...this.stack.splice(0, 3));
        this.broadcast("FLOP", {});
    }
    turn() {
        this.cards.push(this.stack.shift());
        this.broadcast("TURN", {});
    }
    river() {
        this.cards.push(this.stack.shift());
        this.broadcast("RIVER", {});
    }
    showdown() {
        this.showdowning = true;

        this.showdowning = false;
    }
    nextStep() {
        this.players[this.step].step = false;
        
    }
    connect(ws) {
        const player = this.players.find(e => e.ws === ws);
        if (player === undefined) return;
        player.online = true;
        this.broadcast("CONNECTED", { player: player.name });
    }
    disconnect(ws) {
        const player = this.players.find(e => e.ws === ws);
        if (player === undefined) return;
        if (!this.started) {
            this.leave(ws);
            return;
        }
        player.online = false;
        this.broadcast("DISCONNECTED", { player: player.name });
        if (player.turn) {
            this.procedure(player.ws, "CHECK_FOLD", {});
        }
    }
    join(name, ws) {
        this.players.push(new PokerPlayer(name, ws));
        this.broadcast("JOINED", { player: name });
    }
    leave(ws) {
        const playerId = this.players.findIndex(e => e.ws === ws);
        if (playerId === -1) return;
        const player = this.players[playerId];
        if (this.started) {
            player.online = false;
            this.reentry = -1;
        }
        else {
            this.players.splice(playerId, 1);
        }
        this.broadcast("LEFT", { player: player.name });
        if (player.turn) {
            this.procedure(player.ws, "CHECK_FOLD", {});
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
