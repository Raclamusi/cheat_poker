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
const potTextDiv = document.getElementById("poker_pot_text");
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

let room = null;
let blindTimer = 0;
let blindTimerInterval = null;
let limitTimer = 0;
let limitTimerInterval = null;
const suits = ["spade", "club", "diamond", "heart"];
const cardNumbers = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

function clearChildren(element) {
    while (element.firstChild !== null) {
        element.removeChild(element.firstChild);
    }
}

function ready() {
    sendMessage("READY", {});
}

function checkFold() {
    sendMessage("CHECK_FOLD", {});
}

function betCall() {
    sendMessage("BET_CALL", {});
}

function raise() {
    sendMessage("RAISE", { chips: parseInt(raiseNumber.textContent) });
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

function update(roomInfo) {
    room = roomInfo;

    clearChildren(communityCardsDiv);
    blindDiv.classList.toggle("hidden", !room.started);
    potDiv.classList.toggle("hidden", !room.started);

    const players = room.started ? room.players.filter(e => e.ready) : room.players;
    const meIndex = players.findIndex(e => e.name === room.me.name);
    players.unshift(...players.splice(meIndex === -1 ? 0 : meIndex));

    const addCard = element => {
        clearChildren(element);
        return (card, back=false) => {
            const cardDiv = document.createElement("div");
            element.appendChild(cardDiv);
            cardDiv.classList.add("poker_card");
            if (back) {
                cardDiv.classList.add("back");
                return;
            }
            const numberSpan = document.createElement("span");
            cardDiv.appendChild(numberSpan);
            numberSpan.classList.add("poker_card_number", card.suit);
            numberSpan.textContent = card.number;
        };
    };

    const addPlayer = i => player => {
        const playerDiv = document.createElement("div");
        playersDivs[i].appendChild(playerDiv);
        playerDiv.classList.add("poker_player");
        if (player.name === room.me.name) {
            playerDiv.classList.add("hidden");
            return;
        }
        if (!room.started && player.ready || player.turn) {
            playerDiv.classList.add("glow");
        }
        
        const stateDiv = document.createElement("div");
        playerDiv.appendChild(stateDiv);
        stateDiv.classList.add("poker_player_state");
        if (player.state.length === 0) {
            stateDiv.textContent = "no state";
            stateDiv.classList.add("hidden");
        }
        else {
            stateDiv.textContent = player.state;
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
        chipsDiv.textContent = player.chips;

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

        if (player.cards === null) {
            addCard(cardsDiv, true);
            addCard(cardsDiv, true);
        }
        else {
            player.cards.forEach(addCard(cardsDiv));
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

    if (room.me.state.length === 0) {
        myStateDiv.textContent = "no state";
        myStateDiv.classList.add("hidden");
    }
    else {
        myStateDiv.textContent = room.me.state;
    }
    myBetDiv.textContent = room.me.bet;
    if (room.me.bet === 0) {
        myBetDiv.classList.add("hidden");
    }
    myChipsDiv.textContent = room.me.chips;
    myNameDiv.textContent = room.me.name;
    if (room.me.button) {
        myNameDiv.classList.add("glow");
    }
    myTimelimitDiv.classList.toggle("hidden", !room.me.turn);

    if (room.started) {
        if (room.me.turn) {
            checkButton.textContent = room.bet === 0 ? "チェック" : "フォールド";
            checkButton.classList.remove("hidden");
            checkButton.onclick = checkFold;
            callButton.textContent = "";
            callButton.classList.remove("hidden", "glow");
            callButton.onclick = null;
            raiseButton.textContent = "";
            raiseButton.classList.remove("hidden");
            raiseButton.onclick = null;
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
    
    raiseInputs.classList.toggle("hidden", !room.started || room.me.chips === 0);
    raiseRange.max = Math.ceil(room.me.chips / 100) * 100;

    cheatButton.classList.toggle("hidden", !room.started || !room.cheat || room.me.chips === 0);
    cheatButton.onclick = !room.started || !room.cheat ? null : openCheatcards;
    cheatcardsDiv.classList.toggle("nodisplay", !room.started || !room.cheat || room.me.chips === 0);
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
    raiseNumber.value = raiseRange.value = Math.max(room.pot, room.me.chips);
});

raiseNumber.addEventListener("input", () => {
    const num = parseInt(raiseNumber.value);
    if (isNaN(num) || num < 1) {
        raiseNumber.value = 1;
    }
    else if (num > room.me.chips) {
        raiseNumber.value = room.me.chips;
    }
    else {
        raiseNumber.value = num;
    }
    raiseRange.value = raiseNumber.value;
});

raiseRange.addEventListener("input", () => {
    raiseNumber.value = Math.min(raiseRange.value, room.me.chips);
});


(function () {
    suits.forEach(suit => {
        cardNumbers.forEach(num => {
            const card = document.createElement("div");
            cheatcardsGridDiv.appendChild(card);
            card.classList.add("poker_card");
            card.id = `poker_cheatcard_${suit}_${num}`;
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
        playerSpan.textContent = `[${player}]`;
    }

    const contentSpan = document.createElement("span");
    li.appendChild(contentSpan);
    contentSpan.textContent = content;
    if (color !== null) {
        contentSpan.style.color = color;
    }
}

/**
 * ポーカー用のプロシージャです。
 * @param {string} message メッセージの種類
 * @param {any} data メッセージの内容
 */
export function pokerProcedure(message, data) {
    if ("room" in data) {
        update(data.room);
    }
    switch (message) {
        case "ENTERED":
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
    }
}
