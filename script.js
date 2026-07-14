const toast = document.querySelector("#toast");
const viewerCount = document.querySelector("#viewerCount");
const onlineCount = document.querySelector("#onlineCount");
const liveTime = document.querySelector("#liveTime");
const youtubePlayer = document.querySelector("#youtubePlayer");
const refreshPlayer = document.querySelector("#refreshPlayer");
const reloadPlayer = document.querySelector("#reloadPlayer");
const copyClassroomLink = document.querySelector("#copyClassroomLink");
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

const youtubeEmbedUrl =
  "https://www.youtube.com/embed/live_stream?channel=UCxkvDuUiK3dnuMWqtbVlxUw&autoplay=1&rel=0";

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function syncMobileChat() {
  if (!mobileChatList || !chatList) return;
  mobileChatList.innerHTML = chatList.innerHTML;
}

function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    showToast("請手動複製目前網址");
    return;
  }

  navigator.clipboard.writeText(text).then(
    () => showToast("學員連結已複製"),
    () => showToast("無法自動複製，請手動複製"),
  );
}

function reloadYoutubePlayer() {
  if (!youtubePlayer) return;
  youtubePlayer.src = `${youtubeEmbedUrl}&refresh=${Date.now()}`;
  showToast("正在重新載入直播畫面");
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText(window.location.href));
});

copyClassroomLink?.addEventListener("click", () => copyText(window.location.href));
refreshPlayer?.addEventListener("click", reloadYoutubePlayer);
reloadPlayer?.addEventListener("click", reloadYoutubePlayer);

document.querySelector(".login-button")?.addEventListener("click", () => {
  showToast("目前使用免登入觀看模式");
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

document.querySelectorAll("[data-answer]").forEach((button) => {
  button.addEventListener("click", () => {
    const correct = button.dataset.answer === "yes";
    if (!quizResult) return;
    quizResult.textContent = correct
      ? "答對了，這個直播教室可以替換為正式品牌內容。"
      : "再想一下，這個直播教室已經支援 YouTube 嵌入。";
  });
});

chatForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const message = document.createElement("article");
  message.className = "chat-item";
  message.innerHTML = "<span>訪客學員</span><p></p>";
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

if (liveTime) liveTime.textContent = "YouTube 直播待命";
if (viewerCount) viewerCount.textContent = "0";
if (onlineCount) onlineCount.textContent = "0 人在線";
syncMobileChat();
