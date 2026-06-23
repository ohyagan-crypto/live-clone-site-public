const toast = document.querySelector("#toast");
const playToggle = document.querySelector("#playToggle");
const progressBar = document.querySelector("#progressBar");
const timeLabel = document.querySelector("#timeLabel");
const viewerCount = document.querySelector("#viewerCount");
const onlineCount = document.querySelector("#onlineCount");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatList = document.querySelector("#chatList");
const mobileChatList = document.querySelector("#mobileChatList");
const qaForm = document.querySelector("#qaForm");
const qaInput = document.querySelector("#qaInput");
const questionList = document.querySelector("#questionList");
const signModal = document.querySelector("#signModal");
const quizModal = document.querySelector("#quizModal");
const quizResult = document.querySelector("#quizResult");
const hookCard = document.querySelector("#hookCard");

let isPlaying = false;
let progress = 18;
let viewers = 1328;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function formatSeconds(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateProgress() {
  if (!progressBar || !timeLabel) return;
  const total = 38944;
  const seconds = Math.floor((progress / 100) * total);
  progressBar.style.width = `${progress}%`;
  timeLabel.textContent = `${formatSeconds(seconds)} / 10:49:04`;
}

function syncMobileChat() {
  if (!mobileChatList || !chatList) return;
  mobileChatList.innerHTML = chatList.innerHTML;
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast("連結已複製"),
      () => showToast("無法自動複製，請手動複製"),
    );
    return;
  }
  showToast("請手動複製目前網址");
}

playToggle?.addEventListener("click", () => {
  isPlaying = !isPlaying;
  playToggle.classList.toggle("is-playing", isPlaying);
  showToast(isPlaying ? "已開始播放直播" : "已暫停播放");
});

document.querySelector("#muteToggle")?.addEventListener("click", () => {
  showToast("已切換聲音狀態");
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText("https://example.com/live/x-academy"));
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    document.querySelectorAll("[data-tab]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.tab === tab);
    });
    document.querySelectorAll("[data-pane]").forEach((pane) => {
      pane.classList.toggle("is-active", pane.dataset.pane === tab);
    });
  });
});

document.querySelector("#signButton")?.addEventListener("click", () => {
  signModal?.showModal();
});

document.querySelector("#quizButton")?.addEventListener("click", () => {
  if (quizResult) quizResult.textContent = "";
  quizModal?.showModal();
});

document.querySelector("#releaseHook")?.addEventListener("click", () => {
  hookCard?.classList.remove("is-visible");
  showToast("已解除掛機提醒");
});

document.querySelectorAll("[data-answer]").forEach((button) => {
  button.addEventListener("click", () => {
    const correct = button.dataset.answer === "yes";
    if (quizResult) {
      quizResult.textContent = correct
        ? "答對了，這個模板可以替換成正式品牌內容。"
        : "再想一下，這個模板就是為了替換內容而設計的。";
    }
  });
});

chatForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const message = document.createElement("article");
  message.className = "chat-item";
  message.innerHTML = `
    <span>訪客學員</span>
    <p></p>
  `;
  message.querySelector("p").textContent = text;
  chatList.append(message);
  chatInput.value = "";
  chatList.scrollTop = chatList.scrollHeight;
  syncMobileChat();
});

qaForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = qaInput.value.trim();
  if (!text) return;

  const item = document.createElement("article");
  item.innerHTML = "<strong></strong><p>主持端尚未回覆。</p>";
  item.querySelector("strong").textContent = `Q：${text}`;
  questionList.prepend(item);
  qaInput.value = "";
  showToast("問題已送出");
});

window.setInterval(() => {
  if (!isPlaying) return;
  progress = Math.min(100, progress + 0.28);
  updateProgress();
}, 1200);

window.setInterval(() => {
  viewers += Math.random() > 0.42 ? 1 : -1;
  viewers = Math.max(1280, viewers);
  const label = viewers.toLocaleString("zh-TW");
  if (viewerCount) viewerCount.textContent = label;
  if (onlineCount) onlineCount.textContent = `${label} 人在線`;
}, 2800);

window.setTimeout(() => {
  if (!isPlaying) hookCard?.classList.add("is-visible");
}, 12000);

updateProgress();
syncMobileChat();
