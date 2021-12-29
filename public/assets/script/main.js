import { addMessageListener, removeMessageListener, sendMessage } from "./ws.js";
import { showDialog } from "./dialog.js";
import { roomsProcedure } from "./rooms.js";
import { pokerProcedure } from "./poker.js";

const rooms = document.getElementById("scene_rooms");
const poker = document.getElementById("scene_poker");
const errorMessage = document.getElementById("common_dialog_error_message");

addMessageListener((message, data) => {
    switch (message) {
        case "ENTERED":
            addMessageListener(pokerProcedure);
            removeMessageListener(roomsProcedure);
            poker.classList.remove("hidden");
            rooms.classList.add("hidden");
            localStorage.setItem("joiningRoom", { })
            break;
        case "EXITED":
            addMessageListener(roomsProcedure);
            removeMessageListener(pokerProcedure);
            rooms.classList.remove("hidden");
            poker.classList.add("hidden");
            localStorage.removeItem("joiningRoom");
            break;
        case "ERROR":
            errorMessage.textContent = message;
            showDialog("common_dialog_error");
            break;
    }
});
addMessageListener(roomsProcedure);
rooms.classList.remove("hidden");

const joiningRoom = JSON.parse(localStorage.getItem("joiningRoom"));
if (joiningRoom !== null) {
    sendMessage("JOIN", joiningRoom);
}
