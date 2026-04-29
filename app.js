const STORAGE_KEY = "personal-study-tracker-v1";
const GOAL_KEY = "personal-study-goals-v1";

const state = {
  sessions: load(STORAGE_KEY, []),
  goals: normalizeGoals(load(GOAL_KEY, {})),
  visibleMonth: startOfMonth(new Date()),
  timer: {
    running: false,
    startedAt: null,
    elapsedMs: 0,
    intervalId: null,
  },
};

const els = {
  todayTotal: document.querySelector("#todayTotal"),
  goalTitle: document.querySelector("#goalTitle"),
  goalText: document.querySelector("#goalText"),
  goalProgress: document.querySelector("#goalProgress"),
  goalStatus: document.querySelector("#goalStatus"),
  currentStreak: document.querySelector("#currentStreak"),
  bestStreak: document.querySelector("#bestStreak"),
  streakNudge: document.querySelector("#streakNudge"),
  timerStatus: document.querySelector("#timerStatus"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerStart: document.querySelector("#timerStart"),
  timerStop: document.querySelector("#timerStop"),
  timerReset: document.querySelector("#timerReset"),
  studyForm: document.querySelector("#studyForm"),
  minutes: document.querySelector("#minutes"),
  endTime: document.querySelector("#endTime"),
  subject: document.querySelector("#subject"),
  topic: document.querySelector("#topic"),
  mode: document.querySelector("#mode"),
  startPreview: document.querySelector("#startPreview"),
  sessionList: document.querySelector("#sessionList"),
  emptyState: document.querySelector("#emptyState"),
  exportCsv: document.querySelector("#exportCsv"),
  clearAll: document.querySelector("#clearAll"),
  monthLabel: document.querySelector("#monthLabel"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  calendar: document.querySelector("#calendar"),
  barChart: document.querySelector("#barChart"),
  weekTotal: document.querySelector("#weekTotal"),
  subjectBreakdown: document.querySelector("#subjectBreakdown"),
  topicBreakdown: document.querySelector("#topicBreakdown"),
  goalForm: document.querySelector("#goalForm"),
  primaryGoal: document.querySelector("#primaryGoal"),
  dailyGoal: document.querySelector("#dailyGoal"),
  weeklyGoal: document.querySelector("#weeklyGoal"),
  monthlyGoal: document.querySelector("#monthlyGoal"),
  todayGoalStat: document.querySelector("#todayGoalStat"),
  weekGoalStat: document.querySelector("#weekGoalStat"),
  monthGoalStat: document.querySelector("#monthGoalStat"),
  streakStat: document.querySelector("#streakStat"),
  allTimeStat: document.querySelector("#allTimeStat"),
  installButton: document.querySelector("#installButton"),
};

let deferredInstallPrompt = null;

init();

function init() {
  els.endTime.value = toDateTimeInputValue(new Date());
  els.primaryGoal.value = state.goals.primary;
  els.dailyGoal.value = state.goals.daily;
  els.weeklyGoal.value = state.goals.weekly;
  els.monthlyGoal.value = state.goals.monthly;
  bindEvents();
  updateStartPreview();
  renderTimer();
  render();
  registerServiceWorker();
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  ["input", "change"].forEach((eventName) => {
    els.minutes.addEventListener(eventName, updateStartPreview);
    els.endTime.addEventListener(eventName, updateStartPreview);
  });

  els.studyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const minutes = Number(els.minutes.value);
    const end = new Date(els.endTime.value);

    if (!Number.isFinite(minutes) || minutes < 1 || Number.isNaN(end.getTime())) {
      return;
    }

    const start = new Date(end.getTime() - minutes * 60 * 1000);
    state.sessions.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      minutes,
      start: start.toISOString(),
      end: end.toISOString(),
      subject: cleanText(els.subject.value),
      topic: cleanText(els.topic.value),
      mode: els.mode.value,
      createdAt: new Date().toISOString(),
    });

    save(STORAGE_KEY, state.sessions);
    els.studyForm.reset();
    els.endTime.value = toDateTimeInputValue(new Date());
    els.mode.value = "Read";
    resetTimer();
    updateStartPreview();
    render();
  });

  els.clearAll.addEventListener("click", () => {
    if (!state.sessions.length || !confirm("Clear all study logs?")) return;
    state.sessions = [];
    save(STORAGE_KEY, state.sessions);
    render();
  });

  els.exportCsv.addEventListener("click", () => {
    exportSessionsCsv();
  });

  els.sessionList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-delete]");
    if (!button) return;
    state.sessions = state.sessions.filter((session) => session.id !== button.dataset.delete);
    save(STORAGE_KEY, state.sessions);
    render();
  });

  els.prevMonth.addEventListener("click", () => {
    state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  els.nextMonth.addEventListener("click", () => {
    state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  els.goalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.goals = {
      primary: els.primaryGoal.value,
      daily: Number(els.dailyGoal.value),
      weekly: Number(els.weeklyGoal.value),
      monthly: Number(els.monthlyGoal.value),
    };
    save(GOAL_KEY, state.goals);
    render();
  });

  els.timerStart.addEventListener("click", () => {
    if (state.timer.running) return;
    state.timer.running = true;
    state.timer.startedAt = Date.now();
    state.timer.intervalId = window.setInterval(renderTimer, 1000);
    renderTimer();
  });

  els.timerStop.addEventListener("click", () => {
    const elapsed = currentTimerMs();
    if (elapsed < 1000) return;
    state.timer.elapsedMs = elapsed;
    state.timer.running = false;
    state.timer.startedAt = null;
    window.clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;

    const minutes = Math.max(1, Math.round(elapsed / 60000));
    els.minutes.value = minutes;
    els.endTime.value = toDateTimeInputValue(new Date());
    updateStartPreview();
    renderTimer();
  });

  els.timerReset.addEventListener("click", () => {
    resetTimer();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installButton.hidden = true;
  });
}

function render() {
  renderSummary();
  renderStreakSummary();
  renderSessions();
  renderCalendar();
  renderBars();
  renderBreakdown({
    element: els.subjectBreakdown,
    title: "subject",
    getLabel: sessionSubject,
  });
  renderSubjects();
  renderGoalStats();
}

function renderSummary() {
  const todayMinutes = totalForDate(new Date());
  const goal = activeGoal();
  const pct = Math.min(100, Math.round((goal.total / goal.target) * 100) || 0);
  els.todayTotal.textContent = `${todayMinutes} min`;
  els.goalTitle.textContent = `${goal.label} goal`;
  els.goalText.textContent = `${goal.target} min`;
  els.goalProgress.style.width = `${pct}%`;
  els.goalStatus.textContent = pct >= 100
    ? `${goal.label} goal complete. 🎉`
    : `${Math.max(0, goal.target - goal.total)} min left for this ${goal.period}.`;
}

function renderStreakSummary() {
  const current = calculateCurrentStreak();
  const best = calculateBestStreak();
  const studiedToday = totalForDate(new Date()) > 0;
  els.currentStreak.textContent = `${current} ${pluralize("day", current)}`;
  els.bestStreak.textContent = `${best} ${pluralize("day", best)}`;
  els.streakNudge.textContent = studiedToday
    ? "Streak protected for today."
    : current > 0
      ? "Log any reading or study today to keep it going."
      : "Log any reading or study today to start a streak.";
}

function renderSessions() {
  const sessions = [...state.sessions].sort((a, b) => new Date(b.end) - new Date(a.end));
  els.emptyState.hidden = sessions.length > 0;
  els.exportCsv.disabled = sessions.length === 0;
  els.sessionList.innerHTML = sessions.map((session) => {
    const start = new Date(session.start);
    const end = new Date(session.end);
    const subject = sessionSubject(session);
    const topic = sessionTopic(session);
    return `
      <li class="session">
        <strong>${escapeHtml(subject)} · ${escapeHtml(topic)} · ${session.minutes} min</strong>
        <button type="button" data-delete="${session.id}" aria-label="Delete ${escapeHtml(topic)} session">×</button>
        <time>${formatDate(start)} · ${formatTime(start)}-${formatTime(end)}</time>
        <span>${escapeHtml(session.mode)}</span>
      </li>
    `;
  }).join("");
}

function exportSessionsCsv() {
  if (!state.sessions.length) return;
  const sessions = [...state.sessions].sort((a, b) => new Date(a.end) - new Date(b.end));
  const rows = [
    ["Date", "Start time", "End time", "Minutes", "Subject", "Topic", "Mode"],
    ...sessions.map((session) => {
      const start = new Date(session.start);
      const end = new Date(session.end);
      return [
        dateKey(end),
        formatTime(start),
        formatTime(end),
        session.minutes,
        sessionSubject(session),
        sessionTopic(session),
        session.mode,
      ];
    }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `study-tracker-${dateKey(new Date())}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderCalendar() {
  const month = state.visibleMonth;
  const firstGridDay = new Date(month);
  const offset = (firstGridDay.getDay() + 6) % 7;
  firstGridDay.setDate(firstGridDay.getDate() - offset);
  els.monthLabel.textContent = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + index);
    const minutes = totalForDate(date);
    const isCurrentMonth = date.getMonth() === month.getMonth();
    const isToday = isSameDay(date, new Date());
    const heatLevel = studyHeatLevel(minutes);
    days.push(`
      <div class="day ${isCurrentMonth ? "" : "muted"} ${isToday ? "today" : ""} heat-${heatLevel}">
        <strong>${date.getDate()}</strong>
        <span>${minutes || ""}</span>
      </div>
    `);
  }
  els.calendar.innerHTML = days.join("");
}

function renderBars() {
  const days = lastNDays(7);
  const totals = days.map((date) => totalForDate(date));
  const max = Math.max(state.goals.daily, ...totals, 1);
  els.weekTotal.textContent = `${totals.reduce((sum, value) => sum + value, 0)} min`;
  els.barChart.innerHTML = days.map((date, index) => {
    const total = totals[index];
    const height = Math.max(4, Math.round((total / max) * 100));
    return `
      <div class="bar-wrap">
        <div class="bar-track"><div class="bar" style="height: ${height}%"></div></div>
        <strong>${total}</strong>
        <span>${date.toLocaleDateString(undefined, { weekday: "short" })}</span>
      </div>
    `;
  }).join("");
}

function renderSubjects() {
  renderBreakdown({
    element: els.topicBreakdown,
    title: "topic",
    getLabel: sessionTopic,
  });
}

function renderBreakdown({ element, title, getLabel }) {
  const totals = state.sessions.reduce((map, session) => {
    const label = getLabel(session);
    map.set(label, (map.get(label) || 0) + session.minutes);
    return map;
  }, new Map());
  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);
  element.innerHTML = entries.length
    ? entries.map(([label, minutes]) => `
      <div class="subject-row">
        <div><span>${escapeHtml(label)}</span><span>${minutes} min</span></div>
        <div class="subject-meter"><span style="width: ${Math.round((minutes / max) * 100)}%"></span></div>
      </div>
    `).join("")
    : `<div class="empty">No ${title} data yet.</div>`;
}

function renderGoalStats() {
  const today = totalForDate(new Date());
  const week = totalForRange(startOfWeek(new Date()), endOfDay(new Date()));
  const month = totalForRange(startOfMonth(new Date()), endOfDay(new Date()));
  const allTime = state.sessions.reduce((sum, session) => sum + session.minutes, 0);
  els.todayGoalStat.textContent = goalPercent(today, state.goals.daily);
  els.weekGoalStat.textContent = goalPercent(week, state.goals.weekly);
  els.monthGoalStat.textContent = goalPercent(month, state.goals.monthly);
  const streak = calculateCurrentStreak();
  els.streakStat.textContent = `${streak} ${pluralize("day", streak)}`;
  els.allTimeStat.textContent = `${allTime} min`;
}

function renderTimer() {
  const elapsed = currentTimerMs();
  els.timerDisplay.textContent = formatDuration(elapsed);
  els.timerStatus.textContent = state.timer.running ? "Running" : elapsed ? "Paused" : "Ready";
  els.timerStart.disabled = state.timer.running;
  els.timerStop.disabled = elapsed < 1000;
}

function resetTimer() {
  state.timer.running = false;
  state.timer.startedAt = null;
  state.timer.elapsedMs = 0;
  window.clearInterval(state.timer.intervalId);
  state.timer.intervalId = null;
  renderTimer();
}

function updateStartPreview() {
  const minutes = Number(els.minutes.value);
  const end = new Date(els.endTime.value);
  if (!Number.isFinite(minutes) || minutes < 1 || Number.isNaN(end.getTime())) {
    els.startPreview.textContent = "-";
    return;
  }
  const start = new Date(end.getTime() - minutes * 60 * 1000);
  els.startPreview.textContent = `${formatDate(start)} · ${formatTime(start)}`;
}

function switchView(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });
}

function totalForDate(date) {
  const start = startOfDay(date);
  const end = endOfDay(date);
  return totalForRange(start, end);
}

function totalForRange(start, end) {
  return state.sessions.reduce((sum, session) => {
    const sessionEnd = new Date(session.end);
    return sessionEnd >= start && sessionEnd <= end ? sum + session.minutes : sum;
  }, 0);
}

function activeGoal() {
  const today = totalForDate(new Date());
  const week = totalForRange(startOfWeek(new Date()), endOfDay(new Date()));
  const month = totalForRange(startOfMonth(new Date()), endOfDay(new Date()));
  const goals = {
    daily: { label: "Daily", period: "day", total: today, target: state.goals.daily },
    weekly: { label: "Weekly", period: "week", total: week, target: state.goals.weekly },
    monthly: { label: "Monthly", period: "month", total: month, target: state.goals.monthly },
  };
  return goals[state.goals.primary] || goals.weekly;
}

function currentTimerMs() {
  if (!state.timer.running) return state.timer.elapsedMs;
  return state.timer.elapsedMs + (Date.now() - state.timer.startedAt);
}

function goalPercent(total, target) {
  return `${Math.round((total / target) * 100) || 0}%`;
}

function studyHeatLevel(minutes) {
  if (minutes <= 0) return 0;
  const ratio = minutes / state.goals.daily;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function calculateCurrentStreak() {
  let streak = 0;
  const date = new Date();
  while (totalForDate(date) > 0) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function calculateBestStreak() {
  const activeDays = [...new Set(state.sessions.map((session) => dateKey(new Date(session.end))))]
    .sort((a, b) => a.localeCompare(b));
  let best = 0;
  let current = 0;
  let previous = null;

  activeDays.forEach((key) => {
    const date = parseDateKey(key);
    if (previous && daysBetween(previous, date) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = date;
  });

  return best;
}

function lastNDays(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return date;
  });
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

function toDateTimeInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function cleanText(value) {
  return value.trim().replace(/\s+/g, " ");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sessionSubject(session) {
  return session.subject || "General";
}

function sessionTopic(session) {
  return session.topic || session.subject || "Untitled";
}

function normalizeGoals(goals) {
  return {
    primary: ["daily", "weekly", "monthly"].includes(goals.primary) ? goals.primary : "weekly",
    daily: validGoal(goals.daily, 120),
    weekly: validGoal(goals.weekly, 720),
    monthly: validGoal(goals.monthly, 3000),
  };
}

function validGoal(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function pluralize(word, count) {
  return count === 1 ? word : `${word}s`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
}
