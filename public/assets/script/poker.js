import { showDialog, hideDialog } from "./dialog.js";
import { sendMessage } from "./ws.js"

const leaveButton = document.getElementById("poker_leave");
const remainingTimeDiv = document.getElementById("poker_remaining_time");
const openChatButton = document.getElementById("poker_open_chat");
const chatDiv = document.getElementById("poker_chat");
const chatContentsDiv = document.getElementById("poker_chat_contents");
const chatList = document.getElementById("poker_chat_list");
const chatTextInput = document.getElementById("poker_chat_text");
const chatSendButton = document.getElementById("poker_chat_send");

const playersDivs = [document.getElementById("poker_players0"), document.getElementById("poker_players1")];

const blindDiv = document.getElementById("poker_blind");
const blindTextDiv = document.getElementById("poker_blind_text");
const blindNumberDiv = document.getElementById("poker_blind_number");
const communityCardsDiv = document.getElementById("poker_community_cards");
const potDiv = document.getElementById("poker_pot");
//const potTextDiv = document.getElementById("poker_pot_text");
const potNumberDiv = document.getElementById("poker_pot_number");

const holeCardsDiv = document.getElementById("poker_hole_cards");
const myStateDiv = document.getElementById("poker_my_state");
const myBetDiv = document.getElementById("poker_my_bet");
const myChipsDiv = document.getElementById("poker_my_chips");
const myNameDiv = document.getElementById("poker_my_name");
const myTimelimitDiv = document.getElementById("poker_my_timelimit");
const checkButton = document.getElementById("poker_check");
const callButton = document.getElementById("poker_call");
const raiseButton = document.getElementById("poker_raise");
const raiseInputs = document.getElementById("poker_raise_inputs");
const raiseNumber = document.getElementById("poker_raise_number");
const raiseRange = document.getElementById("poker_raise_range");
const cheatButton = document.getElementById("poker_operations_cheat");

const cheatcardsDiv = document.getElementById("poker_cheatcards");
const cheatcardsGridDiv = document.getElementById("poker_cheatcards_grid");

const dialogLeaveRoomSpan = document.getElementById("poker_dialog_leave_room");
const dialogLeaveOkButton = document.getElementById("poker_dialog_leave_ok");

const dialogNocheatOkButton = document.getElementById("poker_dialog_nocheat_ok");
const dialogNofoldOkButton = document.getElementById("poker_dialog_nofold_ok");

const dialogBlindAnteSpan = document.getElementById("poker_dialog_blind_ante");
const dialogBlindSbSpan = document.getElementById("poker_dialog_blind_sb");
const dialogBlindBbSpan = document.getElementById("poker_dialog_blind_bb");

const dialogWinnerDiv = document.getElementById("poker_dialog_winner");
const dialogResultList = document.getElementById("poker_dialog_result_list");

let room = null;
let blindTimer = 0;
let blindTimerId = null;
let limitTimer = 0;
let limitTimerId = null;
const suits = ["spade", "club", "diamond", "heart"];
const cardNumbers = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function clearChildren(element) {
    while (element.firstChild !== null) {
        element.removeChild(element.firstChild);
    }
}

function ready() {
    sendMessage("READY", {});
}

function checkFold() {
    if (room.bet > room.me.bet && room.me.cheated) {
        showDialog("poker_dialog_nofold");
        return;
    }
    sendMessage("CHECK_FOLD", {});
}

function call() {
    sendMessage("CALL", {});
}

function betRaise() {
    sendMessage("RAISE", { chips: parseInt(raiseNumber.value) });
}

/** @type {HTMLDivElement} */
let activeCheatcard = null;

function openCheatcards() {
    if (room.me.cheated || room.cards.length > 0) {
        showDialog("poker_dialog_nocheat");
        return;
    }
    cheatcardsDiv.classList.toggle("hidden");
    if (cheatcardsDiv.classList.contains("hidden")) {
        if (activeCheatcard !== null) {
            activeCheatcard.classList.remove("glow");
            activeCheatcard = null;
            holeCardsDiv.classList.remove("glow");
        }
    }
}

/**
 * @param {number} i 
 * @returns {(e: MouseEvent) => void}
 */
function cheat(i) {
    return e => {
        if (activeCheatcard === null) return;
        sendMessage("CHEAT", {
            index: i,
            suit: suits[activeCheatcard.id.slice("poker_cheatcard_".length, "poker_cheatcard_0".length)],
            number: parseInt(activeCheatcard.id.slice("poker_cheatcard_0_".length, "poker_cheatcard_0_00".length)),
        });
        cheatcardsDiv.classList.add("hidden");
        if (activeCheatcard !== null) {
            activeCheatcard.classList.remove("glow");
            activeCheatcard = null;
            holeCardsDiv.classList.remove("glow");
        }
    }
}

/**
 * @param {HTMLElement} element 
 * @returns {(card: { suit: string; number: number; glow?: boolean; }) => void}
 */
function addCard(element) {
    clearChildren(element);
    return (card) => {
        const cardDiv = document.createElement("div");
        element.appendChild(cardDiv);
        cardDiv.classList.add("poker_card");
        if (card === null) {
            cardDiv.classList.add("back");
            return;
        }
        if ("glow" in card && card.glow) {
            cardDiv.classList.add("glow");
        }
        const numberSpan = document.createElement("span");
        cardDiv.appendChild(numberSpan);
        numberSpan.classList.add("poker_card_number", card.suit);
        numberSpan.textContent = cardNumbers[card.number - 1];
    };
}

function update(roomInfo) {
    room = roomInfo;

    clearChildren(communityCardsDiv);
    blindDiv.classList.toggle("hidden", !room.started);
    potDiv.classList.toggle("hidden", !room.started);

    const players = room.started ? room.players.filter(e => e.ready) : room.players;
    const meIndex = players.findIndex(e => e.name === room.me.name);
    players.unshift(...players.splice(meIndex === -1 ? 0 : meIndex));

    const addPlayer = i => player => {
        const playerDiv = document.createElement("div");
        playersDivs[i].appendChild(playerDiv);
        playerDiv.classList.add("poker_player");
        if (player.name === room.me.name) {
            playerDiv.classList.add("hidden");
            return;
        }
        if (!room.started && player.ready || player.step) {
            playerDiv.classList.add("glow");
        }
        
        const stateDiv = document.createElement("div");
        playerDiv.appendChild(stateDiv);
        stateDiv.classList.add("poker_player_state");
        if (!player.online) {
            stateDiv.textContent = "オフライン";
        }
        else if (player.state.length === 0) {
            stateDiv.textContent = "no state";
            stateDiv.classList.add("hidden");
        }
        else if (player.folded) {
            stateDiv.textContent = "フォールド";
        }
        else {
            stateDiv.textContent = player.state;
            if (player.state === "WIN") {
                stateDiv.classList.add("glow");
            }
        }

        const betDiv = document.createElement("div");
        playerDiv.appendChild(betDiv);
        betDiv.classList.add("poker_player_bet");
        betDiv.textContent = player.bet;
        if (player.bet === 0) {
            betDiv.classList.add("hidden");
        }

        const chipsDiv = document.createElement("div");
        playerDiv.appendChild(chipsDiv);
        chipsDiv.classList.add("poker_player_chips");
        if (player.rank === 0) {
            chipsDiv.textContent = player.chips;
        }
        else {
            chipsDiv.textContent = `${player.rank}位`;
        }

        const nameDiv = document.createElement("div");
        playerDiv.appendChild(nameDiv);
        nameDiv.classList.add("poker_player_name");
        nameDiv.textContent = player.name;
        if (player.button) {
            nameDiv.classList.add("glow");
        }

        const cardsDiv = document.createElement("div");
        playerDiv.appendChild(cardsDiv);
        cardsDiv.classList.add("poker_player_cards");
        if (room.started) {
            (player.cards === null ? [null, null] : player.cards).forEach(addCard(cardsDiv));
        }
    };

    const playerSliceIndex = Math.floor((players.length - 1) / 4) + 1;
    playersDivs.forEach(clearChildren);
    players.slice(0, playerSliceIndex).reverse().forEach(addPlayer(1));
    players.slice(playerSliceIndex, players.length - playerSliceIndex + 1).forEach(addPlayer(0));
    players.slice(players.length - playerSliceIndex + 1).reverse().forEach(addPlayer(1));

    room.cards.forEach(addCard(communityCardsDiv));

    blindNumberDiv.textContent = room.ante * [1, 2, 4][(["Ante", "SB", "BB"].indexOf(blindTextDiv.textContent) + 3) % 3];
    potNumberDiv.textContent = room.pot;

    room.me.cards.forEach(addCard(holeCardsDiv));
    Array.from(holeCardsDiv.children).forEach((e, i) => e.addEventListener("click", cheat(i)));

    myStateDiv.textContent = room.me.state.length === 0 ? "no state" : room.me.state;
    myStateDiv.classList.toggle("hidden", room.me.state.length === 0);
    myStateDiv.classList.toggle("glow", room.me.state === "WIN");
    myBetDiv.textContent = room.me.bet;
    myBetDiv.classList.toggle("hidden", room.me.bet === 0);
    myChipsDiv.textContent = room.me.chips;
    myNameDiv.textContent = room.me.name;
    myNameDiv.classList.toggle("glow", room.me.button);
    myTimelimitDiv.classList.toggle("hidden", !room.me.step);

    if (room.started) {
        if (room.me.step) {
            checkButton.textContent = room.bet === room.me.bet ? "チェック" : "フォールド";
            checkButton.classList.remove("hidden");
            checkButton.onclick = checkFold;
            callButton.textContent = "コール";
            callButton.classList.remove("glow");
            callButton.classList.toggle("hidden", room.bet === room.me.bet);
            callButton.onclick = room.bet === room.me.bet ? null : call;
            raiseButton.textContent = room.bet === 0 ? "ベット" : "レイズ";
            raiseButton.classList.remove("hidden");
            raiseButton.onclick = betRaise;
        }
        else {
            checkButton.textContent = "";
            checkButton.classList.add("hidden");
            checkButton.onclick = null;
            callButton.textContent = "";
            callButton.classList.remove("glow");
            callButton.classList.add("hidden");
            callButton.onclick = null;
            raiseButton.textContent = "";
            raiseButton.classList.add("hidden");
            raiseButton.onclick = null;
        }
    }
    else {
        checkButton.textContent = "";
        checkButton.classList.add("hidden");
        checkButton.onclick = null;
        callButton.textContent = room.me.ready ? "解除" : "準備OK";
        callButton.classList.remove("hidden");
        callButton.classList.toggle("glow", room.me.ready);
        callButton.onclick = ready;
        raiseButton.textContent = "";
        raiseButton.classList.add("hidden");
        raiseButton.onclick = null;
    }
    
    raiseInputs.classList.toggle("hidden", !room.me.step);
    raiseNumber.value = Math.min(room.me.chips, Math.max(room.ante * 4, room.bet * 2 - room.me.bet));
    raiseRange.min = Math.floor((room.bet - room.me.bet + 1) / 100) * 100;
    raiseRange.max = Math.ceil(room.me.chips / 100) * 100;
    raiseRange.value = raiseNumber.value;

    cheatButton.classList.toggle("hidden", !room.started || !room.cheat || room.me.chips === 0 || room.me.folded);
    cheatButton.onclick = !room.started || !room.cheat ? null : openCheatcards;
    cheatcardsDiv.classList.toggle("nodisplay", !room.started || !room.cheat || room.me.chips === 0 || room.me.folded || room.me.cheated || room.cards.length > 0);
}

leaveButton.addEventListener("click", () => {
    dialogLeaveRoomSpan.textContent = room.name;
    showDialog("poker_dialog_leave");
});

dialogLeaveOkButton.addEventListener("click", () => {
    hideDialog();
    sendMessage("LEAVE", {});
});

dialogNocheatOkButton.addEventListener("click", hideDialog);
dialogNofoldOkButton.addEventListener("click", hideDialog);

openChatButton.addEventListener("click", () => {
    chatDiv.classList.toggle("open");
    chatContentsDiv.scrollTo(
        0,
        chatDiv.classList.contains("open") ? chatContentsDiv.scrollHeight - chatContentsDiv.clientHeight : 0
    );
});

chatSendButton.addEventListener("click", () => {
    if (chatTextInput.value.length > 0) {
        sendMessage("CHAT", { content: chatTextInput.value });
        chatTextInput.value = "";
    }
});

blindDiv.addEventListener("click", () => {
    const blinds = ["Ante", "SB", "BB"];
    const i = (blinds.indexOf(blindTextDiv.textContent) + 1) % 3;
    blindTextDiv.textContent = blinds[i];
    blindNumberDiv.textContent = room.ante * [1, 2, 4][i];
});

potDiv.addEventListener("click", () => {
    if (room.pot === 0 || room.me.chips === 0) return;
    raiseNumber.value = raiseRange.value = Math.min(room.pot, room.me.chips);
});

raiseNumber.addEventListener("change", () => {
    const num = parseInt(raiseNumber.value);
    if (isNaN(num) || num < room.bet - room.me.bet + 1) {
        raiseNumber.value = room.bet - room.me.bet + 1;
    }
    else if (num > room.me.chips) {
        raiseNumber.value = room.me.chips;
    }
    else {
        raiseNumber.value = num;
    }
    raiseRange.value = raiseNumber.value;
});

raiseNumber.addEventListener("input", () => {
    const num = parseInt(raiseNumber.value);
    if (num > room.me.chips) {
        raiseNumber.value = room.me.chips;
    }
    raiseRange.value = raiseNumber.value;
});

raiseRange.addEventListener("input", () => {
    raiseNumber.value = Math.max(room.bet - room.me.bet + 1, Math.min(room.me.chips, raiseRange.value));
});


(function () {
    suits.forEach((suit, suitIndex) => {
        [[0, cardNumbers[0]], ...[...cardNumbers.entries()].slice(1).reverse()].forEach(([numIndex, num]) => {
            const card = document.createElement("div");
            cheatcardsGridDiv.appendChild(card);
            card.classList.add("poker_card");
            card.id = `poker_cheatcard_${suitIndex}_${(numIndex + 1).toString().padStart(2, "0")}`;
            card.addEventListener("click", () => {
                if (activeCheatcard === card) {
                    activeCheatcard = null;
                    card.classList.remove("glow");
                    holeCardsDiv.classList.remove("glow");
                    return;
                }
                if (activeCheatcard !== null) {
                    activeCheatcard.classList.remove("glow");
                }
                activeCheatcard = card;
                card.classList.add("glow");
                holeCardsDiv.classList.add("glow");
            });

            const cardNumber = document.createElement("span");
            card.appendChild(cardNumber);
            cardNumber.textContent = num;
            cardNumber.classList.add("poker_card_number");
            cardNumber.classList.add(suit);
        });
    });
})();

/**
 * @param {string} player 
 * @param {string} content 
 * @param {string} color 
 */
function pushChat(player, content, color=null) {
    const li = document.createElement("li");
    chatList.appendChild(li);

    if (player !== null) {
        const playerSpan = document.createElement("span");
        li.appendChild(playerSpan);
        playerSpan.classList.add("poker_chat_sender");
        playerSpan.textContent = player;
    }

    const contentSpan = document.createElement("span");
    li.appendChild(contentSpan);
    contentSpan.textContent = content;
    if (color !== null) {
        contentSpan.style.color = color;
    }
}

/**
 * @param {number} time 
 */
function setBlindTimer(time) {
    if (blindTimerId !== null) {
        clearInterval(blindTimerId);
        blindTimerId = null;
    }
    blindTimer = Math.max(0, time);
    if (blindTimer !== 0) {
        blindTimerId = setInterval(() => {
            if (--blindTimer == 0) {
                clearInterval(blindTimerId);
                blindTimerId = null;
            }
            remainingTimeDiv.textContent = `${Math.floor(blindTimer / 60).toString().padStart(2, "0")}:${(blindTimer % 60).toString().padStart(2, "0")}`;
        }, 1000);
    }
    remainingTimeDiv.textContent = `${Math.floor(blindTimer / 60).toString().padStart(2, "0")}:${(blindTimer % 60).toString().padStart(2, "0")}`;
}

/**
 * ポーカー用のプロシージャです。
 * @param {string} message メッセージの種類
 * @param {any} data メッセージの内容
 */
export function pokerProcedure(message, data) {
    if (data instanceof Object && "room" in data) {
        update(data.room);
    }
    switch (message) {
        case "ENTERED":
            clearChildren(chatList);
            setBlindTimer(room.blindTimer);
            if (room.me.turn) {
                limitTimer = room.limitTimer;
                limitTimerId = setInterval(() => {
                    if (--limitTimer == 0) {
                        clearInterval(limitTimerId);
                        limitTimerId = null;
                    }
                    myTimelimitDiv.textContent = limitTimer;
                }, 1000);
                myTimelimitDiv.textContent = limitTimer;
            }
            break;
        case "JOINED":
            pushChat(null, `${data.player} さんが入室しました`, "lightgreen");
            break;
        case "LEFT":
            pushChat(null, `${data.player} さんが退室しました`, "lightgreen");
            break;
        case "CHAT": {
            const scrolling = chatDiv.classList.contains("open") &&
                              chatContentsDiv.scrollHeight - chatContentsDiv.scrollTop <= chatContentsDiv.clientHeight;
            pushChat(data.player, data.content);
            if (scrolling) {
                chatContentsDiv.scrollTo(0, chatContentsDiv.scrollHeight - chatContentsDiv.clientHeight);
            }
            break;
        }
        case "STARTED":
            showDialog("poker_dialog_start");
            setTimeout(() => hideDialog(), 2000);
            break;
        case "FINISHED":
            setBlindTimer(0);
            break;
        case "BLIND":
            setBlindTimer(room.blindInterval);
            dialogBlindAnteSpan.textContent = room.ante;
            dialogBlindSbSpan.textContent = room.ante * 2;
            dialogBlindBbSpan.textContent = room.ante * 4;
            showDialog("poker_dialog_blind");
            setTimeout(() => hideDialog(), 2000);
            break;
        case "RESULT":
            clearChildren(dialogResultList);
            [...room.players].sort((p1, p2) => p1.rank - p2.rank).forEach(player => {
                const li = document.createElement("li");
                dialogResultList.appendChild(li);

                const rankSpan = document.createElement("span");
                li.appendChild(rankSpan);
                rankSpan.classList.add("poker_dialog_result_rank");
                rankSpan.textContent = `${player.rank}位`;

                const nameSpan = document.createElement("span");
                li.appendChild(nameSpan);
                nameSpan.classList.add("poker_dialog_result_name");
                nameSpan.textContent = player.name;
            });
            showDialog("poker_dialog_result");
            break;
        case "WINNER":
            clearChildren(dialogWinnerDiv);
            if (!room.showdowning) {
                dialogWinnerDiv.textContent = `${data.players[0]?.name} win`;
                break;
            }
            data.players.forEach(player => {
                const playerDiv = document.createElement("div");
                dialogWinnerDiv.appendChild(playerDiv);
                playerDiv.classList.add("poker_dialog_winner_player");
                playerDiv.textContent = player.name;

                const handDiv = document.createElement("div");
                dialogWinnerDiv.appendChild(handDiv);
                handDiv.classList.add("poker_dialog_winner_hand");
                handDiv.textContent = player.hand.name;

                const cardsDiv = document.createElement("div");
                dialogWinnerDiv.appendChild(cardsDiv);
                cardsDiv.classList.add("poker_dialog_winner_cards");
                player.hand.cards.forEach(addCard(cardsDiv));
            });
            if (data.players.length === 0) {
                const div = document.createElement("div");
                dialogWinnerDiv.appendChild(div);
                div.classList.add("poker_dialog_winner_nothing")
                div.textContent = "勝者なし！";
            }
            showDialog("poker_dialog_winner");
            setTimeout(() => hideDialog(), 8000);
            break;
        case "STEP":
            if (!room.me.step) break;
            if (limitTimerId !== null) {
                clearInterval(limitTimerId);
                limitTimerId = null;
            }
            limitTimer = room.waitingTime;
            limitTimerId = setInterval(() => {
                if (--limitTimer == 0) {
                    clearInterval(limitTimerId);
                    limitTimerId = null;
                }
                myTimelimitDiv.textContent = limitTimer;
            }, 1000);
            myTimelimitDiv.textContent = limitTimer;
            break;
        case "PREFLOP":
            Array.from(holeCardsDiv.children).forEach(e => {
                e.classList.add("hidden");
                setTimeout(() => e.classList.remove("hidden"), 10);
            });
            break;
        case "FLOP":
            Array.from(communityCardsDiv.children).forEach(e => {
                e.classList.add("hidden");
                setTimeout(() => e.classList.remove("hidden"), 10);
            });
            break;
        case "TURN":
            communityCardsDiv.lastElementChild.classList.add("hidden");
            setTimeout(() => communityCardsDiv.lastElementChild.classList.remove("hidden"), 10);
            break;
        case "RIVER":
            communityCardsDiv.lastElementChild.classList.add("hidden");
            setTimeout(() => communityCardsDiv.lastElementChild.classList.remove("hidden"), 10);
            break;
        case "SHOWDOWN":
            break;
        case "CHEATED":
            if (holeCardsDiv.children !== null) {
                holeCardsDiv.children[data.index].classList.add("hidden");
                setTimeout(() => holeCardsDiv.children[data.index].classList.remove("hidden"), 10);
            }
            break;
    }
}
