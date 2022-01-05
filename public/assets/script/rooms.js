import { showDialog, hideDialog } from "./dialog.js";
import { sendMessage } from "./ws.js"


const createButton = document.getElementById("rooms_create");
const roomList = document.getElementById("rooms_list");

const dialogCreateNameInput = document.getElementById("rooms_dialog_create_name");
const dialogCreateLockedCheckbox = document.getElementById("rooms_dialog_create_locked");
const dialogCreatePasswordInput = document.getElementById("rooms_dialog_create_password");
const dialogCreateDiscriptionTextarea = document.getElementById("rooms_dialog_create_discription");
const dialogCreateStartChipsInput = document.getElementById("rooms_dialog_create_start_chips");
const dialogCreateWaitingTimeInput = document.getElementById("rooms_dialog_create_waiting_time");
const dialogCreateBlindIntervalInput = document.getElementById("rooms_dialog_create_blind_interval");
const dialogCreateCheatCheckbox = document.getElementById("rooms_dialog_create_cheat");
const dialogCreatePlayerInput = document.getElementById("rooms_dialog_create_player");
const dialogCreateButton = document.getElementById("rooms_dialog_create_button");

const dialogJoinRoom = document.getElementById("rooms_dialog_join_room");
const dialogJoinPassword = document.getElementById("rooms_dialog_join_password_outer");
const dialogJoinPlayerInput = document.getElementById("rooms_dialog_join_player");
const dialogJoinPasswordInput = document.getElementById("rooms_dialog_join_password");
const dialogJoinButton = document.getElementById("rooms_dialog_join_button");

let roomsInfo = [];

createButton.addEventListener("click", () => {
    showDialog("rooms_dialog_create");
});

dialogCreateLockedCheckbox.addEventListener("click", () => {
    dialogCreatePasswordInput.disabled = !dialogCreateLockedCheckbox.checked;
});

dialogCreateButton.addEventListener("click", () => {
    hideDialog();
    const name = dialogCreateNameInput.value;
    const locked = dialogCreateLockedCheckbox.checked;
    const password = locked ? dialogCreatePasswordInput.value : null;
    const discription = dialogCreateDiscriptionTextarea.value;
    const startChips = parseInt(dialogCreateStartChipsInput.value);
    const waitingTime = parseInt(dialogCreateWaitingTimeInput.value);
    const blindInterval = parseInt(dialogCreateBlindIntervalInput.value);
    const cheat = dialogCreateCheatCheckbox.checked;
    const player = dialogCreatePlayerInput.value;
    sendMessage("CREATE", {
        name, locked, password, discription,
        startChips, waitingTime, blindInterval,
        cheat, player,
    });
});

function onSelectRoom() {
    const id = parseInt(this.id.slice("rooms_room_".length));
    const room = roomsInfo.find(e => e.id === id);
    dialogJoinRoom.textContent = room.name;
    dialogJoinPassword.classList[room.locked ? "remove" : "add"]("hidden");
    dialogJoinButton.onclick = () => {
        hideDialog();
        const player = dialogJoinPlayerInput.value;
        const password = room.locked ? dialogJoinPasswordInput.value : null;
        sendMessage("JOIN", { id, player, password });
    };
    showDialog("rooms_dialog_join");
}

function updateRooms(rooms) {
    roomsInfo = rooms;
    roomList.innerText = "";
    rooms.forEach(room => {
        const li = document.createElement("li");
        roomList.appendChild(li);

        const button = document.createElement("button");
        li.appendChild(button);
        button.id = `rooms_room_${room.id}`;
        button.classList.add("rooms_room");
        button.addEventListener("click", onSelectRoom);
        
        const stateDiv = document.createElement("div");
        button.append(stateDiv);
        stateDiv.classList.add("rooms_room_state");
        stateDiv.textContent = `${room.participants}/10 ${room.started ? "対戦" : "待機"}中`;

        const nameDiv = document.createElement("div");
        button.append(nameDiv);
        nameDiv.classList.add("rooms_room_name");
        if (room.locked) nameDiv.classList.add("locked");
        nameDiv.textContent = room.name;
        
        const discDiv = document.createElement("div");
        button.append(discDiv);
        discDiv.classList.add("rooms_room_discription");
        discDiv.textContent = room.discription;
    });
}

/**
 * ルーム選択用のプロシージャです。
 * @param {string} message メッセージの種類
 * @param {any} data メッセージの内容
 */
export function roomsProcedure(message, data) {
    switch (message) {
        case "ROOMS":
            updateRooms(data);
            break;
    }
}
