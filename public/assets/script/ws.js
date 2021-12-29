import { showDialog } from "./dialog.js";

const host = location.origin.replace(/^http/, "ws");
const ws = new WebSocket(host);

/** @type {((message: string, data: any) => void)[]} */
const listeners = [];

const errorMessage = document.getElementById("common_dialog_error_message");

ws.addEventListener("close", event => {
    errorMessage.textContent = "通信が切断されました";
    showDialog("common_dialog_error");
});

ws.addEventListener("error", event => {
    errorMessage.textContent = "通信エラーが発生しました";
    showDialog("common_dialog_error");
});

ws.addEventListener("message", event => {
    const data = JSON.parse(event.data);
    console.log(`-> [${data.message}]`);
    console.log(data.data);
    listeners.forEach(listener => listener(data.message, data.data));
});

/**
 * サーバからのメッセージを受け取る関数を追加します。
 * @param {(message: string, data: any) => void} listener メッセージを受け取る関数
 */
export function addMessageListener(listener) {
    if (!listeners.includes(listener)) {
        listeners.push(listener);
    }
}

/**
 * サーバからのメッセージを受け取る関数を削除します。
 * @param {(message: string, data: any) => void} listener メッセージを受け取る関数
 */
export function removeMessageListener(listener) {
    if (listeners.includes(listener)) {
        listeners.splice(listeners.findIndex(listener), 1);
    }
}

/**
 * サーバにメッセージを送信します。
 * @param {string} message メッセージの種類
 * @param {any} data メッセージの内容
 */
export function sendMessage(message, data) {
    console.log(`<- [${message}]`);
    console.log(data);
    ws.send(JSON.stringify({ message, data }))
}
