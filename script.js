const STORAGE_KEY = "bluestarClassroomV2";
const CURRENT_ATTENDANCE_KEY = "bluestarCurrentAttendance";
const youtubeEmbedUrl =
  "https://www.youtube.com/embed/live_stream?channel=UCxkvDuUiK3dnuMWqtbVlxUw&autoplay=1&rel=0";

const defaultState = {
  courseTitle: "藍星科技線上課程",
  teacherName: "藍星科技講師團隊",
  announcement: "歡迎來到藍星科技空中課堂，請於開課前完成簽到。",
  liveStatus: "待命中",
  nextLiveAt: "",
  chats: [
    {
      id: "system-welcome",
      author: "系統",
      text: "YouTube 直播播放器已準備完成，請等待老師開播。",
      system: true,
      createdAt: new Date().toISOString(),
    },
  ],
  questions: [
    {
      id: "sample-question",
      text: "是否能下載講義？",
      anonymous: true,
      likes: 0,
      answer: "可由老師在講義中心發布下載連結。",
      answered: true,
      createdAt: new Date().toISOString(),
    },
  ],
  resources: [],
  replays: [],
  poll: null,
  attendance: [],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...saved,
      chats: Array.isArray(saved.chats) ? saved.chats : structuredClone(defaultState.chats),
      questions: Array.isArray(saved.questions) ? saved.questions : structuredClone(defaultState.questions),
      resources: Array.isArray(saved.resources) ? saved.resources : [],
      replays: Array.isArray(saved.replays) ? saved.replays : [],
      attendance: Array.isArray(saved.attendance) ? saved.attendance : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();
let lastWatchTick = Date.now();

const byId = (id) => document.getElementById(id);
const toast = byId("toast");
const youtubePlayer = byId("youtubePlayer");
const signModal = byId("signModal");
const quizModal = byId("quizModal");
const teacherPanel = byId("teacherPanel");

function makeId(prefix) {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
}

function saveState({ render = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (render) renderAll();
}

function formatDateTime(value) {
  if (!value) return "尚未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未設定";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function openTab(tabName) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });
  document.querySelectorAll("[data-pane]").forEach((pane) => {
    pane.classList.toggle("is-active", pane.dataset.pane === tabName);
  });
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

function renderClassInfo() {
  byId("courseTitleDisplay").textContent = state.courseTitle;
  byId("teacherNameDisplay").textContent = state.teacherName;
  byId("announcementText").textContent = state.announcement || "目前沒有新公告。";
  byId("liveTime").textContent = `直播狀態：${state.liveStatus}`;
  byId("teacherStatus").textContent = `${state.courseTitle}｜${state.teacherName}｜目前${state.liveStatus}`;
  byId("nextLiveTitle").textContent = state.nextLiveAt
    ? `${state.courseTitle}｜${formatDateTime(state.nextLiveAt)}`
    : "課程時間待公布";

  byId("adminCourseTitle").value = state.courseTitle;
  byId("adminTeacherName").value = state.teacherName;
  byId("adminLiveStatus").value = state.liveStatus;
  byId("adminNextLiveAt").value = state.nextLiveAt || "";
  byId("adminAnnouncement").value = state.announcement;
}

function updateCountdown() {
  const fields = ["countdownDays", "countdownHours", "countdownMinutes", "countdownSeconds"];
  if (!state.nextLiveAt) {
    fields.forEach((id) => (byId(id).textContent = "00"));
    return;
  }

  const distance = new Date(state.nextLiveAt).getTime() - Date.now();
  if (!Number.isFinite(distance) || distance <= 0) {
    fields.forEach((id) => (byId(id).textContent = "00"));
    if (state.liveStatus === "待命中") byId("nextLiveTitle").textContent = "預定直播時間已到";
    return;
  }

  const totalSeconds = Math.floor(distance / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  byId("countdownDays").textContent = String(days).padStart(2, "0");
  byId("countdownHours").textContent = String(hours).padStart(2, "0");
  byId("countdownMinutes").textContent = String(minutes).padStart(2, "0");
  byId("countdownSeconds").textContent = String(seconds).padStart(2, "0");
}

function renderChat() {
  const chatList = byId("chatList");
  const mobileChatList = byId("mobileChatList");
  const html = state.chats
    .slice(-100)
    .map(
      (message) => `
        <article class="chat-item${message.system ? " system" : ""}">
          <span>${escapeHtml(message.author)}</span>
          <p>${escapeHtml(message.text)}</p>
        </article>`,
    )
    .join("");
  chatList.innerHTML = html;
  mobileChatList.innerHTML = html;
  chatList.scrollTop = chatList.scrollHeight;
}

function renderQuestions() {
  const questionList = byId("questionList");
  if (!state.questions.length) {
    questionList.innerHTML = '<div class="empty-state"><p>目前還沒有學員提問。</p></div>';
  } else {
    questionList.innerHTML = state.questions
      .slice()
      .sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
      .map(
        (question) => `
          <article class="question-card${question.answered ? " is-answered" : ""}">
            <div class="question-topline">
              <strong>Q：${escapeHtml(question.text)}</strong>
              <button type="button" class="like-button" data-like-question="${question.id}">♡ ${Number(question.likes || 0)}</button>
            </div>
            <p>${question.answer ? `A：${escapeHtml(question.answer)}` : "老師尚未回覆。"}</p>
            <small>${question.answered ? "已解答" : "等待回覆"} · ${formatDateTime(question.createdAt)}</small>
          </article>`,
      )
      .join("");
  }

  const adminList = byId("adminQuestionList");
  if (!state.questions.length) {
    adminList.innerHTML = '<p class="admin-empty">目前沒有提問。</p>';
    return;
  }
  adminList.innerHTML = state.questions
    .map(
      (question) => `
        <article class="admin-question" data-question-id="${question.id}">
          <div><strong>${escapeHtml(question.text)}</strong><small>${Number(question.likes || 0)} 個讚 · ${question.answered ? "已解答" : "待回覆"}</small></div>
          <textarea data-answer-input rows="2" placeholder="輸入老師回覆">${escapeHtml(question.answer || "")}</textarea>
          <div class="admin-actions-row">
            <button type="button" class="primary-action" data-answer-question>儲存回覆</button>
            <button type="button" class="outline-action" data-toggle-question>${question.answered ? "改為未完成" : "標記已解答"}</button>
            <button type="button" class="outline-action danger-action" data-delete-question>刪除</button>
          </div>
        </article>`,
    )
    .join("");
}

function renderResources() {
  const resourceList = byId("resourceList");
  resourceList.innerHTML = state.resources.length
    ? state.resources
        .map(
          (item) => `
            <a class="resource-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
              <span>${escapeHtml(item.type)}</span><strong>${escapeHtml(item.title)}</strong><small>開啟教材 ↗</small>
            </a>`,
        )
        .join("")
    : '<div class="empty-state"><p>老師尚未發布課程講義。</p></div>';

  byId("adminResourceList").innerHTML = state.resources.length
    ? state.resources
        .map(
          (item) => `<div class="admin-mini-item"><span>${escapeHtml(item.title)}</span><button type="button" data-delete-resource="${item.id}">刪除</button></div>`,
        )
        .join("")
    : '<p class="admin-empty">尚無講義。</p>';
}

function renderReplays() {
  const replayList = byId("replayList");
  replayList.innerHTML = state.replays.length
    ? state.replays
        .map(
          (item) => `
            <a class="resource-card replay-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
              <span>${escapeHtml(item.date || "課程回放")}</span><strong>${escapeHtml(item.title)}</strong><small>播放回放 ▶</small>
            </a>`,
        )
        .join("")
    : '<div class="empty-state"><p>尚無回放資訊。</p></div>';

  byId("adminReplayList").innerHTML = state.replays.length
    ? state.replays
        .map(
          (item) => `<div class="admin-mini-item"><span>${escapeHtml(item.title)}</span><button type="button" data-delete-replay="${item.id}">刪除</button></div>`,
        )
        .join("")
    : '<p class="admin-empty">尚無回放。</p>';
}

function renderPoll() {
  const pollShell = byId("pollShell");
  const poll = state.poll;
  if (!poll) {
    pollShell.innerHTML = '<div class="empty-state"><p>老師尚未發布即時投票。</p></div>';
    return;
  }

  const totalVotes = poll.options.reduce((sum, option) => sum + Number(option.votes || 0), 0);
  const voted = localStorage.getItem(`bluestarPollVote:${poll.id}`);
  pollShell.innerHTML = `
    <div class="poll-header"><span>${poll.active ? "投票進行中" : "投票已結束"}</span><h2>${escapeHtml(poll.question)}</h2><p>共 ${totalVotes} 票</p></div>
    <div class="poll-options">
      ${poll.options
        .map((option) => {
          const percent = totalVotes ? Math.round((Number(option.votes || 0) / totalVotes) * 100) : 0;
          return `<button type="button" data-vote-option="${option.id}" ${!poll.active || voted ? "disabled" : ""}>
            <span>${escapeHtml(option.text)}</span><b>${percent}%</b><i style="width:${percent}%"></i>
          </button>`;
        })
        .join("")}
    </div>
    <p class="poll-note">${voted ? "您已完成本題投票。" : poll.active ? "請選擇一個答案。" : "本題已停止投票。"}</p>`;
}

function getCurrentAttendance() {
  const id = localStorage.getItem(CURRENT_ATTENDANCE_KEY);
  return state.attendance.find((item) => item.id === id) || null;
}

function renderAttendance() {
  const current = getCurrentAttendance();
  const attendanceStatus = byId("attendanceStatus");
  const studentStatus = byId("studentStatus");
  if (current) {
    attendanceStatus.textContent = `${current.name} 已簽到｜${formatDuration(current.watchSeconds)}`;
    studentStatus.textContent = `已簽到：${current.name}｜本次觀看 ${formatDuration(current.watchSeconds)}`;
  } else {
    attendanceStatus.textContent = "尚未簽到";
    studentStatus.textContent = "尚未簽到；完成簽到後會開始記錄本機觀看時間。";
  }

  byId("viewerCount").textContent = String(state.attendance.length);
  byId("onlineCount").textContent = `${state.attendance.length} 人已簽到`;
  byId("attendanceCount").textContent = `${state.attendance.length} 筆`;
  byId("attendanceTableBody").innerHTML = state.attendance.length
    ? state.attendance
        .slice()
        .reverse()
        .map(
          (item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.session)}</td><td>${formatDateTime(item.checkinAt)}</td><td>${formatDuration(item.watchSeconds)}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5">目前沒有簽到紀錄。</td></tr>';
}

function renderAll() {
  renderClassInfo();
  updateCountdown();
  renderChat();
  renderQuestions();
  renderResources();
  renderReplays();
  renderPoll();
  renderAttendance();
}

function updateWatchDuration() {
  const now = Date.now();
  const current = getCurrentAttendance();
  if (current && document.visibilityState === "visible") {
    const elapsed = Math.max(0, Math.floor((now - lastWatchTick) / 1000));
    if (elapsed > 0 && elapsed < 120) {
      current.watchSeconds = Number(current.watchSeconds || 0) + elapsed;
      saveState({ render: false });
      renderAttendance();
    }
  }
  lastWatchTick = now;
}

function csvSafe(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportAttendanceCsv() {
  if (!state.attendance.length) {
    showToast("目前沒有可匯出的簽到資料");
    return;
  }
  const rows = [
    ["姓名", "電子信箱", "場次", "簽到時間", "觀看秒數", "觀看時數"],
    ...state.attendance.map((item) => [
      item.name,
      item.email,
      item.session,
      formatDateTime(item.checkinAt),
      item.watchSeconds || 0,
      formatDuration(item.watchSeconds),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvSafe).join(",")).join("\r\n")}`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `藍星科技空中課堂簽到名單-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("簽到名單已匯出");
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText(window.location.href));
});
byId("copyClassroomLink")?.addEventListener("click", () => copyText(window.location.href));
byId("refreshPlayer")?.addEventListener("click", reloadYoutubePlayer);
byId("reloadPlayer")?.addEventListener("click", reloadYoutubePlayer);

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => openTab(button.dataset.tab));
});

byId("signButton")?.addEventListener("click", () => signModal?.showModal());
byId("quizButton")?.addEventListener("click", () => quizModal?.showModal());
byId("openPollTab")?.addEventListener("click", () => {
  quizModal?.close();
  openTab("poll");
  byId("pollShell")?.scrollIntoView({ behavior: "smooth", block: "center" });
});
byId("teacherPanelButton")?.addEventListener("click", () => teacherPanel?.showModal());

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => byId(button.dataset.closeDialog)?.close());
});

byId("chatForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = byId("chatInput");
  const text = input.value.trim();
  if (!text) return;
  const current = getCurrentAttendance();
  state.chats.push({
    id: makeId("chat"),
    author: current?.name || "訪客學員",
    text,
    system: false,
    createdAt: new Date().toISOString(),
  });
  input.value = "";
  saveState();
});

byId("qaForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = byId("qaInput");
  const text = input.value.trim();
  if (!text) return;
  state.questions.unshift({
    id: makeId("question"),
    text,
    anonymous: event.currentTarget.querySelector('input[type="checkbox"]')?.checked ?? true,
    likes: 0,
    answer: "",
    answered: false,
    createdAt: new Date().toISOString(),
  });
  input.value = "";
  saveState();
  showToast("問題已送出");
});

byId("questionList")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-like-question]");
  if (!button) return;
  const question = state.questions.find((item) => item.id === button.dataset.likeQuestion);
  if (!question) return;
  question.likes = Number(question.likes || 0) + 1;
  saveState();
});

byId("pollShell")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-vote-option]");
  if (!button || !state.poll?.active) return;
  const voteKey = `bluestarPollVote:${state.poll.id}`;
  if (localStorage.getItem(voteKey)) return;
  const option = state.poll.options.find((item) => item.id === button.dataset.voteOption);
  if (!option) return;
  option.votes = Number(option.votes || 0) + 1;
  localStorage.setItem(voteKey, option.id);
  saveState();
  showToast("投票完成");
});

byId("attendanceForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = byId("attendanceName").value.trim();
  const email = byId("attendanceEmail").value.trim();
  const session = byId("attendanceSession").value.trim();
  if (!name || !email || !session) return;
  let record = state.attendance.find(
    (item) => item.email.toLowerCase() === email.toLowerCase() && item.session === session,
  );
  if (!record) {
    record = {
      id: makeId("attendance"),
      name,
      email,
      session,
      checkinAt: new Date().toISOString(),
      watchSeconds: 0,
    };
    state.attendance.push(record);
  } else {
    record.name = name;
  }
  localStorage.setItem(CURRENT_ATTENDANCE_KEY, record.id);
  lastWatchTick = Date.now();
  signModal?.close();
  saveState();
  showToast("簽到完成，已開始記錄觀看時間");
});

byId("classSettingsForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  state.courseTitle = byId("adminCourseTitle").value.trim() || defaultState.courseTitle;
  state.teacherName = byId("adminTeacherName").value.trim() || defaultState.teacherName;
  state.liveStatus = byId("adminLiveStatus").value;
  state.nextLiveAt = byId("adminNextLiveAt").value;
  state.announcement = byId("adminAnnouncement").value.trim();
  saveState();
  showToast("課堂設定已更新");
});

byId("clearChatButton")?.addEventListener("click", () => {
  if (!confirm("確定要清空本機聊天室紀錄嗎？")) return;
  state.chats = structuredClone(defaultState.chats);
  saveState();
  showToast("聊天室已清空");
});

byId("resourceForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  state.resources.unshift({
    id: makeId("resource"),
    title: byId("resourceTitle").value.trim(),
    url: byId("resourceUrl").value.trim(),
    type: byId("resourceType").value,
  });
  event.currentTarget.reset();
  saveState();
  showToast("講義已發布");
});

byId("replayForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  state.replays.unshift({
    id: makeId("replay"),
    title: byId("replayTitle").value.trim(),
    url: byId("replayUrl").value.trim(),
    date: byId("replayDate").value,
  });
  event.currentTarget.reset();
  saveState();
  showToast("回放已發布");
});

byId("adminResourceList")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-resource]");
  if (!button) return;
  state.resources = state.resources.filter((item) => item.id !== button.dataset.deleteResource);
  saveState();
});

byId("adminReplayList")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-replay]");
  if (!button) return;
  state.replays = state.replays.filter((item) => item.id !== button.dataset.deleteReplay);
  saveState();
});

byId("pollForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = byId("adminPollQuestion").value.trim();
  const options = byId("adminPollOptions").value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!question || options.length < 2) {
    showToast("投票至少需要兩個選項");
    return;
  }
  state.poll = {
    id: makeId("poll"),
    question,
    active: true,
    options: options.map((text) => ({ id: makeId("option"), text, votes: 0 })),
  };
  event.currentTarget.reset();
  saveState();
  showToast("新投票已發布");
});

byId("closePollButton")?.addEventListener("click", () => {
  if (!state.poll) return;
  state.poll.active = false;
  saveState();
  showToast("投票已結束");
});

byId("adminQuestionList")?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-question-id]");
  if (!card) return;
  const question = state.questions.find((item) => item.id === card.dataset.questionId);
  if (!question) return;
  if (event.target.closest("[data-answer-question]")) {
    question.answer = card.querySelector("[data-answer-input]").value.trim();
    question.answered = Boolean(question.answer);
  } else if (event.target.closest("[data-toggle-question]")) {
    question.answered = !question.answered;
  } else if (event.target.closest("[data-delete-question]")) {
    state.questions = state.questions.filter((item) => item.id !== question.id);
  } else {
    return;
  }
  saveState();
  showToast("提問狀態已更新");
});

byId("exportAttendanceButton")?.addEventListener("click", exportAttendanceCsv);
byId("clearAttendanceButton")?.addEventListener("click", () => {
  if (!confirm("確定要清除這個瀏覽器內的全部簽到紀錄嗎？")) return;
  state.attendance = [];
  localStorage.removeItem(CURRENT_ATTENDANCE_KEY);
  saveState();
  showToast("本機簽到名單已清除");
});

document.addEventListener("visibilitychange", () => {
  updateWatchDuration();
  lastWatchTick = Date.now();
});
window.addEventListener("beforeunload", updateWatchDuration);
setInterval(updateWatchDuration, 15000);
setInterval(updateCountdown, 1000);

renderAll();
