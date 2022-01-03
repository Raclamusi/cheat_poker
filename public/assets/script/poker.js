import { showDialog, hideDialog } from "./dialog.js";
import { sendMessage } from "./ws.js"

const leaveButton = document.getElementById("poker_leave");
const openChatButton = document.getElementById("poker_open_chat");
const chatDiv = document.getElementById("poker_chat");
const chatContentsDiv = document.getElementById("poker_chat_contents");
const chatList = document.getElementById("poker_chat_list");
const chatTextInput = document.getElementById("poker_chat_text");
const chatSendButton = document.getElementById("poker_chat_send");

const raiseNumber = document.getElementById("poker_raise_number");
const raiseRange = document.getElementById("poker_raise_range");
const cheatButton = document.getElementById("poker_operations_cheat");

const cheatcardsDiv = document.getElementById("poker_cheatcards");

const dialogLeaveRoomSpan = document.getElementById("poker_dialog_leave_room");
const dialogLeaveOkButton = document.getElementById("poker_dialog_leave_ok");

let room = null;

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

raiseRange.addEventListener("input", () => {
    raiseNumber.value = raiseRange.value;
});

cheatButton.addEventListener("click", () => {
    cheatcardsDiv.classList.toggle("hidden");
});

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
