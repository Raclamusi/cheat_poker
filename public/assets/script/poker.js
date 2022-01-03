import { showDialog, hideDialog } from "./dialog.js";
import { sendMessage } from "./ws.js"

const leaveButton = document.getElementById("poker_leave");
const openChatButton = document.getElementById("poker_open_chat");
const chatList = document.getElementById("poker_chat_list");

const dialogLeaveRoomSpan = document.getElementById("poker_dialog_leave_room");
const dialogLeaveOkButton = document.getElementById("poker_dialog_leave_ok");

let room = null;

leaveButton.addEventListener("click", () => {
    dialogLeaveRoomSpan.textContent = room.name;
    showDialog("poker_dialog_leave");
});

dialogLeaveOkButton.addEventListener("click", () => {
    hideDialog();
    sendMessage("LEAVE", {});
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
        room = data.room;
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
    }
}
