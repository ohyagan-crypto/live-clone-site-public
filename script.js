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
const liveVideo = document.querySelector("#liveVideo");
const coverImage = document.querySelector("#coverImage");
const playerScreen = document.querySelector(".player-screen");
const startShare = document.querySelector("#startShare");
const stopShare = document.querySelector("#stopShare");
const copyStudentLink = document.querySelector("#copyStudentLink");
const roomCodeInput = document.querySelector("#roomCode");
const teacherStatus = document.querySelector("#teacherStatus");
const studentCount = document.querySelector("#studentCount");
const joinForm = document.querySelector("#joinForm");
const studentRoomInput = document.querySelector("#studentRoomInput");
const studentStatus = document.querySelector("#studentStatus");

let isPlaying = false;
let progress = 18;
let viewers = 1328;
let teacherPeer = null;
let studentPeer = null;
let screenStream = null;
let activeRoomId = "";
const activeCalls = new Set();

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

function setLiveVideo(stream, muted) {
  if (!liveVideo) return;
  liveVideo.srcObject = stream;
  liveVideo.muted = muted;
  playerScreen?.classList.add("is-live");
  coverImage?.setAttribute("aria-hidden", "true");
  liveVideo.play().catch(() => showToast("請點一下播放器開始播放"));
  isPlaying = true;
  playToggle?.classList.add("is-playing");
}

function clearLiveVideo() {
  if (!liveVideo) return;
  liveVideo.pause();
  liveVideo.srcObject = null;
  playerScreen?.classList.remove("is-live");
  coverImage?.removeAttribute("aria-hidden");
  isPlaying = false;
  playToggle?.classList.remove("is-playing");
}

function makeRoomId() {
  return `blue-${Math.random().toString(36).slice(2, 6)}-${Date.now().toString(36).slice(-4)}`;
}

function makeStudentLink(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "student");
  return url.toString();
}

function updateStudentCount() {
  if (studentCount) studentCount.textContent = `目前 ${activeCalls.size} 位學員連線`;
}

function stopLiveShare() {
  activeCalls.forEach((call) => call.close());
  activeCalls.clear();
  screenStream?.getTracks().forEach((track) => track.stop());
  screenStream = null;
  teacherPeer?.destroy();
  teacherPeer = null;
  activeRoomId = "";
  clearLiveVideo();
  if (roomCodeInput) roomCodeInput.value = "尚未開播";
  if (teacherStatus) teacherStatus.textContent = "直播已停止。";
  if (studentCount) studentCount.textContent = "目前 0 位學員連線";
  if (startShare) startShare.disabled = false;
  if (stopShare) stopShare.disabled = true;
  if (copyStudentLink) copyStudentLink.disabled = true;
}

async function startLiveShare() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    showToast("此瀏覽器不支援螢幕分享");
    if (teacherStatus) teacherStatus.textContent = "此瀏覽器不支援螢幕分享，請用新版 Chrome 或 Edge。";
    return;
  }

  if (!window.Peer) {
    showToast("連線模組尚未載入完成，請稍後再試");
    return;
  }

  try {
    if (startShare) startShare.disabled = true;
    if (teacherStatus) teacherStatus.textContent = "正在要求螢幕分享權限，請選擇要展示的畫面。";
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    });

    activeRoomId = makeRoomId();
    teacherPeer = new Peer(activeRoomId, { debug: 0 });
    setLiveVideo(screenStream, true);

    screenStream.getVideoTracks()[0]?.addEventListener("ended", stopLiveShare);

    teacherPeer.on("open", () => {
      if (roomCodeInput) roomCodeInput.value = activeRoomId;
      if (teacherStatus) {
        teacherStatus.textContent = "直播中。把教室碼或學員連結給學員，他們就能看到你的電腦畫面。";
      }
      if (stopShare) stopShare.disabled = false;
      if (copyStudentLink) copyStudentLink.disabled = false;
      showToast("老師端已開播");
    });

    teacherPeer.on("call", (call) => {
      call.answer(screenStream);
      activeCalls.add(call);
      updateStudentCount();
      call.on("close", () => {
        activeCalls.delete(call);
        updateStudentCount();
      });
      call.on("error", () => {
        activeCalls.delete(call);
        updateStudentCount();
      });
    });

    teacherPeer.on("error", (error) => {
      if (teacherStatus) teacherStatus.textContent = "直播連線建立失敗，請重新開播。";
      showToast("直播連線建立失敗");
      stopLiveShare();
      console.warn(error);
    });
  } catch (error) {
    if (startShare) startShare.disabled = false;
    if (teacherStatus) teacherStatus.textContent = "尚未開播，螢幕分享未啟動。";
    showToast("未啟動螢幕分享");
  }
}

function joinLiveRoom(roomId) {
  if (!roomId) {
    showToast("請先輸入教室碼");
    return;
  }

  if (!window.Peer) {
    showToast("連線模組尚未載入完成，請稍後再試");
    return;
  }

  studentPeer?.destroy();
  studentPeer = new Peer(undefined, { debug: 0 });
  if (studentStatus) studentStatus.textContent = "正在連線到老師直播...";

  studentPeer.on("open", () => {
    const call = studentPeer.call(roomId, new MediaStream());
    call.on("stream", (remoteStream) => {
      setLiveVideo(remoteStream, false);
      if (studentStatus) studentStatus.textContent = "已加入直播，正在觀看老師的電腦畫面。";
      showToast("已加入直播");
    });
    call.on("close", () => {
      if (studentStatus) studentStatus.textContent = "老師端已停止直播。";
      clearLiveVideo();
    });
    call.on("error", () => {
      if (studentStatus) studentStatus.textContent = "連線失敗，請確認教室碼是否正確。";
      showToast("連線失敗");
    });
  });

  studentPeer.on("error", () => {
    if (studentStatus) studentStatus.textContent = "連線失敗，請確認老師是否已開播。";
    showToast("連線失敗");
  });
}

playToggle?.addEventListener("click", () => {
  if (liveVideo?.srcObject) {
    if (liveVideo.paused) {
      liveVideo.play();
      isPlaying = true;
    } else {
      liveVideo.pause();
      isPlaying = false;
    }
  } else {
    isPlaying = !isPlaying;
  }
  playToggle.classList.toggle("is-playing", isPlaying);
  showToast(isPlaying ? "已開始播放直播" : "已暫停播放");
});

document.querySelector("#muteToggle")?.addEventListener("click", () => {
  if (liveVideo?.srcObject) {
    liveVideo.muted = !liveVideo.muted;
    showToast(liveVideo.muted ? "已靜音" : "已開啟聲音");
    return;
  }
  showToast("已切換聲音狀態");
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText(window.location.href));
});

startShare?.addEventListener("click", startLiveShare);
stopShare?.addEventListener("click", stopLiveShare);
copyStudentLink?.addEventListener("click", () => {
  if (!activeRoomId) return;
  copyText(makeStudentLink(activeRoomId));
});

joinForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  joinLiveRoom(studentRoomInput.value.trim());
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
  if (!isPlaying && !liveVideo?.srcObject) hookCard?.classList.add("is-visible");
}, 12000);

const urlRoom = new URLSearchParams(window.location.search).get("room");
if (urlRoom && studentRoomInput) {
  studentRoomInput.value = urlRoom;
  window.setTimeout(() => joinLiveRoom(urlRoom), 1200);
}

updateProgress();
syncMobileChat();
