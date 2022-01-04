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

const playersDivs = [document.getElementById("poker_players1"), document.getElementById("poker_players2")];
const holeCardsDiv = document.getElementById("poker_hole_cards");
const potDiv = document.getElementById("poker_pot");

const raiseNumber = document.getElementById("poker_raise_number");
const raiseRange = document.getElementById("poker_raise_range");
const cheatButton = document.getElementById("poker_operations_cheat");

const cheatcardsDiv = document.getElementById("poker_cheatcards");
const cheatcardsGridDiv = document.getElementById("poker_cheatcards_grid");

const dialogLeaveRoomSpan = document.getElementById("poker_dialog_leave_room");
const dialogLeaveOkButton = document.getElementById("poker_dialog_leave_ok");

let room = null;
const suits = ["spade", "club", "diamond", "heart"];
const cardNumbers = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

function update(roomInfo) {
    room = roomInfo;

}

leaveButton.addEventListener("click", () => {
    dialogLeaveRoomSpan.textContent = room.name;
    showDialog("poker_dialog_leave");
});

dialogLeaveOkButton.addEventListener("click", () => {
    hideDialog();
    sendMessage("LEAVE", {});
});

openChatButton.addEventListener("click", () => {
    chatDiv.classList.toggle("open");
    chatContentsDiv.scrollTo(0, chatDiv.classList.contains("open") ? chatContentsDiv.scrollHeight - chatContentsDiv.clientHeight : 0);
});

chatSendButton.addEventListener("click", () => {
    if (chatTextInput.value.length > 0) {
        sendMessage("CHAT", { content: chatTextInput.value });
        chatTextInput.value = "";
    }
});

potDiv.addEventListener("click", () => {
    if (room.pot === 0) return;
    raiseNumber.value = raiseRange.value = room.pot;
});

raiseNumber.addEventListener("input", () => {
    raiseRange.value = raiseNumber.value;
});

raiseRange.addEventListener("input", () => {
    raiseNumber.value = raiseRange.value;
});


/** @type {HTMLDivElement} */
let activeCheatcard = null;

cheatButton.addEventListener("click", () => {
    cheatcardsDiv.classList.toggle("hidden");
    if (cheatcardsDiv.classList.contains("hidden")) {
        if (activeCheatcard !== null) {
            activeCheatcard.classList.remove("glow");
            activeCheatcard = null;
            holeCardsDiv.classList.remove("glow");
        }
    }
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
    cheatcardsGridDiv
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
            const scrolling = chatDiv.classList.contains("open") && chatContentsDiv.scrollHeight - chatContentsDiv.scrollTop <= chatContentsDiv.clientHeight;
            pushChat(data.player, data.content);
            if (scrolling) {
                chatContentsDiv.scrollTo(0, chatContentsDiv.scrollHeight - chatContentsDiv.clientHeight);
            }
            break;
        }
    }
}
