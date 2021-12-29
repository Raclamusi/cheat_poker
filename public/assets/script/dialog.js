const dialogOuter = document.getElementById("dialog_outer");
const dialog = document.getElementById("dialog");
const dialogBody = document.getElementById("dialog_body");
const closeButton = document.getElementById("dialog_close");

/** @type {string[]} */
const dialogQueue = [];

/** @type {Map<string, HTMLElement>} */
const contentTable = new Map();

/** @param {string} id */
function showImpl(id) {
    const content = document.getElementById(id) ?? contentTable.get(id);
    contentTable.set(id, content);
    dialogBody.replaceChild(content, dialogBody.firstChild);
    dialogOuter.classList.remove("hidden");
    dialog.classList.remove("hidden");
}

/**
 * ダイアログを表示します。ダイアログが表示中の場合は、キューに追加します。
 * @param {string} id 表示するHTML要素のid属性
 */
export function showDialog(id) {
    dialogQueue.push(id);
    if (dialogQueue.length > 1) return;
    showImpl(id);
}

/**
 * 表示中のダイアログを非表示にします。キューが空でなければ、次のダイアログを表示します。
 */
export function hideDialog() {
    dialog.classList.add("hidden");
    dialogQueue.shift();
    if (dialogQueue.length > 0) {
        setTimeout(() => {
            showImpl(dialogQueue[0]);
        }, 100);
        return;
    }
    dialogOuter.classList.add("hidden");
}

closeButton.addEventListener("click", () => {
    hideDialog();
});
