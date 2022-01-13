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
        this.folded = false;
        this.cards = [];
        this.rank = 0;
        this.hand = null;
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
            cards: show && !this.folded ? this.cards : null,
            rank: this.rank,
            folded: this.folded,
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
            folded: this.folded,
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
        this.limitTimer = 0;
        this.limitTimerId = null;
        this.step = -1;
        this.remainingSteps = 0;
        this.button = -1;
        this.playingButton = 0;
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
            limitTimer: this.limitTimer,

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

        this.broadcast("RESULT", {});

        this.started = false;
        this.cards = [];
        this.pot = 0;
        this.ante = 0;
        this.bet = 0;
        this.showdowning = false;
        this.step = -1;
        this.remainingSteps = 0;
        this.button = -1;
        this.playingButton = 0;

        if (this.blindTimerId !== null) {
            clearInterval(this.blindTimerId);
            this.blindTimerId = null;
        }
        this.blindTimer = 0;

        this.playingPlayers = null;
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
            player.rank = 0;
            player.folded = false;
            player.hand = null;
        });

        this.broadcast("FINISHED", {});
    }
    preflop() {
        this.dealStack();
        this.cards = [];
        if (this.playingPlayers !== null) {
            this.playingPlayers.filter(e => e.chips === 0).forEach((player, _, lostPlayers) => {
                player.rank = this.playingPlayers.length - lostPlayers.length + 1;
            });
        }
        this.playingPlayers = this.players.filter(e => e.chips > 0);
        if (this.playingPlayers.length <= 1) {
            this.finish();
            return;
        }
        this.playingPlayers.forEach(player => {
            player.bet = 0;
            player.state = "";
            player.folded = false;
            player.hand = null;
        });
        if (this.button !== -1) {
            this.players[this.button].button = false;
        }
        do {
            this.button++;
            this.button %= this.players.length;
        }
        while (this.players[this.button].chips === 0);
        this.players[this.button].button = true;
        this.playingButton = this.playingPlayers.findIndex(e => e.button);
        this.remainingSteps = this.playingPlayers.length;
        this.showdowning = false;
        if (this.blindTimer === 0) {
            this.raiseBlind();
        }
        setTimeout(() => {
            this.pot = 0;
            this.playingPlayers.forEach(player => {
                player.cards = this.stack.splice(0, 2);
                if (player.chips < this.ante) {
                    this.pot += player.chips;
                    player.chips = 0;
                    return;
                }
                this.pot += this.ante;
                player.chips -= this.ante;
                player.cheated = false;
            });
            const sbPlayer = this.playingPlayers[(this.playingButton + (this.playingPlayers.length === 2 ? 0 : 1)) % this.playingPlayers.length];
            const bbPlayer = this.playingPlayers[(this.playingButton + (this.playingPlayers.length === 2 ? 1 : 2)) % this.playingPlayers.length];
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
            this.bet = this.ante * 4;
            this.broadcast("PREFLOP", {});
            setTimeout(() => {
                this.step = (this.playingButton + (this.playingPlayers.length === 2 ? 1 : 2)) % this.playingPlayers.length;
                this.nextStep();
            }, 1000);
        }, 2000);
    }
    flop() {
        this.cards.push(...this.stack.splice(0, 3));
        this.broadcast("FLOP", {});
        setTimeout(() => this.nextStep(), 1000);
    }
    turn() {
        this.cards.push(this.stack.shift());
        this.broadcast("TURN", {});
        setTimeout(() => this.nextStep(), 1000);
    }
    river() {
        this.cards.push(this.stack.shift());
        this.broadcast("RIVER", {});
        setTimeout(() => this.nextStep(), 1000);
    }
    showdown() {
        this.showdowning = true;
        this.broadcast("SHOWDOWN", {});

        // 役の処理

        setTimeout(() => this.win([]), 1000);
    }
    win(players) {
        const chips = Math.floor(this.pot / players.length);

        this.broadcast("WIN", { players: players.map(e => { return { name: e.name, hand: e.hand }; }) });
        setTimeout(() => {
            this.preflop();
        }, 5000);
    }
    nextStep() {
        this.playingPlayers[this.step].step = false;
        if (this.playingPlayers.filter(e => !e.folded && e.chips > 0) <= 1) {
            this.showdowning = true;
        }
        if (!this.showdowning) do {
            this.step++;
            this.step %= this.playingPlayers.length;
            if (this.remainingSteps >= 0) this.remainingSteps--;
        }
        while (this.playingPlayers[this.step].chips === 0 || this.playingPlayers[this.step].folded);
        const player = this.playingPlayers[this.step];
        const otherPlayers = this.playingPlayers.filter(e => e !== player);
        if (otherPlayers.every(e => e.folded)) {
            this.win([player]);
            return;
        }
        if (this.showdowning || this.remainingSteps < 0 && player.bet === this.bet) {
            this.playingPlayers.forEach(player => {
                player.bet = 0;
                player.state = "";
            });
            this.bet = 0;
            this.remainingSteps = this.playingPlayers.length;
            this.step = this.playingButton;
            switch (this.cards.length) {
                case 0:
                    this.flop();
                    break;
                case 3:
                    this.turn();
                    break;
                case 4:
                    this.river();
                    break;
                case 5:
                    this.showdown();
                    break;
            }
            return;
        }
        player.step = true;
        player.state = "";
        if (!player.online) {
            this.defaultAction(player);
            return;
        }
        this.limitTimer = this.waitingTime;
        this.limitTimerId = setInterval(() => {
            if (--this.limitTimer == 0) {
                clearInterval(this.limitTimerId);
                this.limitTimerId = null;
                this.defaultAction(player);
            }
        }, 1000);
        this.broadcast("STEP", { player: player.name });
    }
    action() {
        if (this.limitTimerId !== null) {
            clearInterval(this.limitTimerId);
            this.limitTimerId = null;
        }
        this.nextStep();
    }
    defaultAction(player) {
        if (!player.step) return;
        if (player.cheated && this.bet > 0) {
            this.call(player);
        }
        else {
            this.checkFold(player);
        }
    }
    checkFold(player) {
        if (!player.step) return;
        if (player.cheated && this.bet > player.bet) {
            send(player.ws, "ERROR", "チートを使用したため、フォールドすることは出来ません");
            return;
        }
        player.state = this.bet > player.bet ? "フォールド" : "チェック";
        if (this.bet > player.bet) {
            player.folded = true;
        }
        player.step = false;
        this.action();
    }
    allIn(player) {
        player.bet += player.chips;
        player.chips = 0;
        this.bet = Math.max(this.bet, player.bet);
        this.pot += player.chips;
        player.state = "ALL IN";
        this.broadcast("ALLIN", { player: player.name });
    }
    call(player) {
        if (!player.step) return;
        if (player.bet + player.chips < this.bet) {
            this.allIn(player);
        }
        else {
            this.pot += this.bet - player.bet;
            player.bet = this.bet;
            player.chips -= this.bet;
            player.state = "コール";
        }
        player.step = false;
        this.action();
    }
    raise(player, chips) {
        if (!player.step) return;
        if (player.bet + chips < this.bet || chips > player.chips) {
            send(player.ws, "ERROR", "レイズ額が不正です");
            return;
        }
        if (chips === player.chips) {
            this.allIn(player);
        }
        else {
            player.state = this.bet === 0 ? "ベット" : "レイズ";
            player.bet += chips;
            player.chips -= chips;
            this.bet = player.bet;
            this.pot += chips;
        }
        player.step = false;
        this.action();
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
            this.defaultAction(player);
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
                this.checkFold(player);
                break;
            case "CALL":
                this.call(player);
                break;
            case "RAISE":
                this.raise(player, data.chips);
                break;
            case "CHEAT":
                if (player.cheated || this.cards.length > 0 || player.cards.length == 0) break;
                if (data.index != 0 && data.index != 1) break;
                if (!["spade", "club", "diamond", "heart"].includes(data.suit)) break;
                if (data.number < 1 || data.number > 13) break;
                player.cards[data.index] = { suit: data.suit, number: data.number };
                player.cheated = true;
                send(ws, "CHEATED", { room: this.getInfo(player), index: data.index });
                break;
        }
    }
}

module.exports = { PokerRoom, PokerPlayer };
