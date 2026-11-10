(() => {
  "use strict";

  const STORAGE_KEY = "workday.schedule.v1";
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const els = {
    yearSelect: document.querySelector("#yearSelect"),
    calendarGrid: document.querySelector("#calendarGrid"), yearLabel: document.querySelector("#calendarYearLabel"),
    holidayStatus: document.querySelector("#holidayStatus"), saveStatus: document.querySelector("#saveStatus"),
    dayDialog: document.querySelector("#dayDialog"), dayForm: document.querySelector("#dayForm"),
    dayHours: document.querySelector("#dayHours"), dialogTitle: document.querySelector("#dialogTitle"),
    dialogHoliday: document.querySelector("#dialogHoliday"), importFile: document.querySelector("#importFile")
  };

  let state = loadState();
  let viewMonth = state.year === today.getFullYear() ? today.getMonth() : 0;
  let holidayMap = new Map();
  let selectedDate = null;
  let requestSequence = 0;

  renderYearOptions();
  renderScheduleInputs();
  renderCalendar();
  loadHolidays(state.year);

  document.querySelector("#saveButton").addEventListener("click", () => {
    if (!validateWeeklyInputs()) return;
    if (!validateAnchorDate()) return;
    state.weeklyHours = readWeeklyHours("a");
    state.weekBHours = state.patternType === "biweekly" ? readWeeklyHours("b") : [...state.weeklyHours];
    state.anchorDate = document.querySelector("#anchorDate").value;
    if (!saveState()) return;
    renderCalendar();
    els.saveStatus.textContent = "Saved. This replaced the previous schedule on this device.";
  });

  document.querySelector("#resetButton").addEventListener("click", () => {
    state.weeklyHours = Array(7).fill(0);
    state.weekBHours = Array(7).fill(0);
    state.patternType = "weekly";
    state.anchorDate = mondayKey(today);
    state.overrides = {};
    renderScheduleInputs();
    if (!saveState()) return;
    renderCalendar();
    els.saveStatus.textContent = "Schedule reset.";
  });

  els.yearSelect.addEventListener("change", () => {
    state.year = Number(els.yearSelect.value);
    viewMonth = state.year === today.getFullYear() ? today.getMonth() : 0;
    saveState();
    renderCalendar();
    loadHolidays(state.year);
  });
  document.querySelector("#weeklyPattern").addEventListener("click", () => setPatternType("weekly"));
  document.querySelector("#biweeklyPattern").addEventListener("click", () => setPatternType("biweekly"));
  document.querySelector("#anchorDate").addEventListener("change", () => {
    state.anchorDate = document.querySelector("#anchorDate").value;
    els.saveStatus.textContent = "";
    renderCalendar();
  });
  document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
  document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
  document.querySelector("#schedulePatterns").addEventListener("focusin", (event) => {
    if (event.target.matches('input[type="text"]')) event.target.select();
  });
  els.calendarGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (button) openDay(button.dataset.date);
  });

  document.querySelector("#exportButton").addEventListener("click", exportSchedule);
  document.querySelector("#importButton").addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importSchedule);
  document.querySelector("#clearOverride").addEventListener("click", () => {
    if (!selectedDate) return;
    delete state.overrides[selectedDate];
    const saved = saveState();
    renderCalendar();
    if (saved) els.dayDialog.close();
  });
  els.dayForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedDate) return;
    const hours = Number(els.dayHours.value);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24 || !Number.isInteger(hours * 4)) {
      els.dayHours.setCustomValidity("Enter a value from 0 to 24 in quarter-hour increments.");
      els.dayHours.reportValidity();
      return;
    }
    els.dayHours.setCustomValidity("");
    state.overrides[selectedDate] = hours;
    const saved = saveState();
    renderCalendar();
    if (saved) els.dayDialog.close();
  });
  els.dayHours.addEventListener("input", () => els.dayHours.setCustomValidity(""));
  els.dayHours.addEventListener("focus", () => els.dayHours.select());

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.weeklyHours) && saved.weeklyHours.length === 7) {
        const hours = saved.weeklyHours.map(validHours);
        const overrides = sanitizeOverrides(saved.overrides);
        const weekBHours = Array.isArray(saved.weekBHours) && saved.weekBHours.length === 7 ? saved.weekBHours.map(validHours) : [...hours];
        const year = Number(saved.year);
        return {
          year: Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : today.getFullYear(),
          weeklyHours: hours,
          weekBHours,
          patternType: saved.patternType === "biweekly" ? "biweekly" : "weekly",
          anchorDate: parseDateKey(saved.anchorDate) ? saved.anchorDate : mondayKey(today),
          overrides
        };
      }
    } catch { /* Ignore unavailable or malformed saved data and start fresh. */ }
    return { year: today.getFullYear(), weeklyHours: Array(7).fill(0), weekBHours: Array(7).fill(0), patternType: "weekly", anchorDate: mondayKey(today), overrides: {} };
  }

  function validHours(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 24 && Number.isInteger(number * 4) ? number : 0;
  }

  function sanitizeOverrides(value) {
    const overrides = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return overrides;
    for (const [date, hours] of Object.entries(value)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || validHours(hours) !== Number(hours)) continue;
      const [year, month, day] = date.split("-").map(Number);
      const parsed = new Date(year, month - 1, day);
      if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) overrides[date] = Number(hours);
    }
    return overrides;
  }

  function validateWeeklyInputs() {
    const inputs = [...document.querySelectorAll("[data-week-hours] input")];
    for (const input of inputs) {
      const hours = Number(input.value);
      if (input.value.trim() === "" || (Number.isFinite(hours) && hours >= 0 && hours <= 24 && Number.isInteger(hours * 4))) continue;
      input.setCustomValidity("Enter a value from 0 to 24 in quarter-hour increments.");
      input.reportValidity();
      input.focus();
      return false;
    }
    inputs.forEach((input) => input.setCustomValidity(""));
    return true;
  }

  function validateAnchorDate() {
    if (state.patternType !== "biweekly") return true;
    const input = document.querySelector("#anchorDate");
    const date = parseDateKey(input.value);
    if (date && date.getDay() === 1) { input.setCustomValidity(""); return true; }
    input.setCustomValidity("Choose a Monday to start Week A.");
    input.reportValidity();
    input.focus();
    return false;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      els.saveStatus.textContent = "Could not save. Check that browser storage is available.";
      return false;
    }
  }

  function renderYearOptions() {
    const start = Math.min(today.getFullYear() - 2, state.year - 2);
    const end = Math.max(today.getFullYear() + 6, state.year + 2);
    els.yearSelect.innerHTML = "";
    for (let year = start; year <= end; year += 1) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      option.selected = year === state.year;
      els.yearSelect.append(option);
    }
  }

  function renderScheduleInputs() {
    const patterns = document.querySelector("#schedulePatterns");
    const biweekly = state.patternType === "biweekly";
    patterns.classList.toggle("is-biweekly", biweekly);
    patterns.innerHTML = renderPatternPanel("a", "Week A", state.weeklyHours, !biweekly) + (biweekly ? renderPatternPanel("b", "Week B", state.weekBHours, false) : "");
    document.querySelector("#weeklyPattern").classList.toggle("is-active", !biweekly);
    document.querySelector("#weeklyPattern").setAttribute("aria-pressed", String(!biweekly));
    document.querySelector("#biweeklyPattern").classList.toggle("is-active", biweekly);
    document.querySelector("#biweeklyPattern").setAttribute("aria-pressed", String(biweekly));
    document.querySelector("#anchorPicker").classList.toggle("is-visible", biweekly);
    document.querySelector("#anchorDate").value = state.anchorDate;
    patterns.querySelectorAll("input").forEach((input) => input.addEventListener("input", () => { input.setCustomValidity(""); els.saveStatus.textContent = ""; }));
  }

  function renderPatternPanel(key, title, hours, longLabels) {
    const days = WEEKDAYS.map((day, index) => {
      const label = longLabels ? day : SHORT_DAYS[index];
      return `<div class="schedule-day"><label for="hours-${key}-${index}">${label}</label><div class="hours-entry"><input id="hours-${key}-${index}" type="text" value="${hours[index]}" inputmode="decimal" autocomplete="off" aria-label="Week ${key.toUpperCase()} hours worked on ${day}"><span class="hours-suffix">hrs</span></div></div>`;
    }).join("");
    return `<section class="pattern-panel"><h3>${title}</h3><div class="schedule-grid" data-week-hours="${key}">${days}</div></section>`;
  }

  function readWeeklyHours(key) {
    return WEEKDAYS.map((_, index) => validHours(document.querySelector(`#hours-${key}-${index}`).value));
  }

  function setPatternType(type) {
    if (state.patternType === "biweekly") {
      state.weeklyHours = readWeeklyHours("a");
      state.weekBHours = readWeeklyHours("b");
    } else {
      state.weeklyHours = readWeeklyHours("a");
      state.weekBHours = [...state.weeklyHours];
    }
    state.patternType = type;
    renderScheduleInputs();
    renderCalendar();
    els.saveStatus.textContent = "";
  }

  function changeMonth(offset) {
    const absoluteMonth = state.year * 12 + viewMonth + offset;
    const year = Math.floor(absoluteMonth / 12);
    if (year < 1900 || year > 9999) return;
    const previousYear = state.year;
    state.year = year;
    viewMonth = ((absoluteMonth % 12) + 12) % 12;
    renderYearOptions();
    saveState();
    renderCalendar();
    if (year !== previousYear) loadHolidays(year);
  }

  function renderCalendar() {
    els.yearSelect.value = String(state.year);
    els.yearLabel.textContent = `${MONTHS[viewMonth]} ${state.year}`;
    els.calendarGrid.innerHTML = renderMonth(state.year, viewMonth);
  }

  function renderMonth(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let blank = 0; blank < firstDay; blank += 1) cells.push('<span class="day-cell" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = toKey(year, month, day);
      const hours = Object.hasOwn(state.overrides, key) ? state.overrides[key] : getPatternHours(date);
      const holiday = holidayMap.get(key);
      const scopes = holiday ? (holiday.canada ? ["Federal and provincial holiday"] : [holiday.ontario ? "Ontario-only holiday" : "", holiday.quebec ? "Québec-only holiday" : ""].filter(Boolean)) : [];
      const holidayDetails = holiday ? `${scopes.join(" and ")}: ${holiday.names.join(", ")}` : "";
      const classes = ["day-cell", "is-date", hours > 0 ? "is-work" : "is-off", key === todayKey ? "is-today" : ""].filter(Boolean).join(" ");
      const title = `${MONTHS[month]} ${day}, ${year}: ${hours} work hours${holidayDetails ? `; ${holidayDetails}` : ""}`;
      const sharedDot = holiday?.canada ? '<span class="day-marker shared-marker" aria-hidden="true"></span>' : "";
      const ontarioDot = !holiday?.canada && holiday?.ontario ? '<span class="day-marker ontario-marker" aria-hidden="true"></span>' : "";
      const quebecDot = !holiday?.canada && holiday?.quebec ? '<span class="day-marker quebec-marker" aria-hidden="true"></span>' : "";
      cells.push(`<button class="${classes}" type="button" data-date="${key}" title="${escapeAttribute(title)}" aria-label="${escapeAttribute(title)}"><span>${day}</span>${sharedDot}${ontarioDot}${quebecDot}</button>`);
    }
    const weekdays = SHORT_DAYS.map((day) => `<span class="weekday">${day}</span>`).join("");
    return `<article class="month-card"><div class="month-week">${weekdays}</div><div class="month-days">${cells.join("")}</div></article>`;
  }

  function getPatternHours(date) {
    if (state.patternType !== "biweekly") return state.weeklyHours[date.getDay()];
    const anchor = parseDateKey(state.anchorDate) || parseDateKey(mondayKey(today));
    const dayDifference = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) / 86400000);
    const weekIndex = Math.floor(dayDifference / 7);
    const useWeekB = ((weekIndex % 2) + 2) % 2 === 1;
    return (useWeekB ? state.weekBHours : state.weeklyHours)[date.getDay()];
  }

  async function loadHolidays(year) {
    const sequence = ++requestSequence;
    holidayMap = new Map();
    renderCalendar();
    setHolidayStatus("Checking current holiday dates…", "loading");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/CA`, { cache: "no-cache", signal: controller.signal });
      if (!response.ok) throw new Error(`Holiday service returned ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("Holiday data was not in the expected format");
      const relevant = payload.filter((holiday) => holiday.global === true || (Array.isArray(holiday.counties) && (holiday.counties.includes("CA-ON") || holiday.counties.includes("CA-QC"))));
      holidayMap = groupHolidays(relevant);
      try { localStorage.setItem(`workday.holidays.${year}`, JSON.stringify({ fetchedAt: Date.now(), holidays: relevant })); }
      catch { /* Live dates still work when browser storage is unavailable. */ }
      if (sequence !== requestSequence) return;
      setHolidayStatus(`Holiday dates refreshed from Nager.Date · ${holidayMap.size} Canada-wide, Ontario, and Québec dates`, "fresh");
    } catch (error) {
      if (sequence !== requestSequence) return;
      const cached = readHolidayCache(year);
      if (cached) {
        holidayMap = groupHolidays(cached.holidays);
        setHolidayStatus(`Using saved holiday dates · Last refreshed ${new Date(cached.fetchedAt).toLocaleDateString()}`, "error");
      } else {
        setHolidayStatus("Holiday service is unavailable. Check your connection and refresh to try again.", "error");
      }
    } finally {
      clearTimeout(timeout);
      if (sequence === requestSequence) renderCalendar();
    }
  }

  function groupHolidays(holidays) {
    const grouped = new Map();
    for (const holiday of holidays) {
      if (!holiday || typeof holiday.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) continue;
      const entry = grouped.get(holiday.date) || { names: [], canada: false, quebec: false };
      const name = holiday.localName || holiday.name || "Public holiday";
      if (!entry.names.includes(name)) entry.names.push(name);
      entry.canada ||= holiday.global === true;
      entry.ontario ||= Array.isArray(holiday.counties) && holiday.counties.includes("CA-ON");
      entry.quebec ||= Array.isArray(holiday.counties) && holiday.counties.includes("CA-QC");
      grouped.set(holiday.date, entry);
    }
    return grouped;
  }

  function readHolidayCache(year) {
    try {
      const saved = JSON.parse(localStorage.getItem(`workday.holidays.${year}`));
      return saved && Array.isArray(saved.holidays) && Number.isFinite(saved.fetchedAt) ? saved : null;
    } catch { return null; }
  }

  function setHolidayStatus(message, kind) {
    els.holidayStatus.className = `holiday-status${kind === "fresh" ? " is-fresh" : kind === "error" ? " is-error" : ""}`;
    els.holidayStatus.innerHTML = kind === "loading" ? `<span class="status-spinner"></span>${message}` : `<span aria-hidden="true">${kind === "fresh" ? "●" : "•"}</span>${escapeText(message)}`;
  }

  function openDay(key) {
    selectedDate = key;
    const [year, month, day] = key.split("-").map(Number);
    const defaultHours = getPatternHours(new Date(year, month - 1, day));
    const currentHours = Object.hasOwn(state.overrides, key) ? state.overrides[key] : defaultHours;
    els.dialogTitle.textContent = new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const holiday = holidayMap.get(key);
    const holidayScopes = holiday ? (holiday.canada ? ["Federal and provincial"] : [holiday.ontario ? "Ontario-only" : "", holiday.quebec ? "Québec-only" : ""].filter(Boolean)) : [];
    els.dialogHoliday.textContent = holiday ? `${holidayScopes.join(" + ")} · ${holiday.names.join(" · ")}` : "";
    els.dayHours.value = String(currentHours);
    els.dayDialog.showModal();
    els.dayHours.focus();
  }

  function exportSchedule() {
    if (!validateWeeklyInputs()) return;
    if (!validateAnchorDate()) return;
    state.weeklyHours = readWeeklyHours("a");
    state.weekBHours = state.patternType === "biweekly" ? readWeeklyHours("b") : [...state.weeklyHours];
    state.anchorDate = document.querySelector("#anchorDate").value;
    saveState();
    const blob = new Blob([JSON.stringify({ app: "Workday Calendar", version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `workday-schedule-${state.year}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importSchedule(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!imported || !Array.isArray(imported.weeklyHours) || imported.weeklyHours.length !== 7) throw new Error("This file does not contain a weekly schedule.");
      const year = Number(imported.year);
      const weekA = imported.weeklyHours.map(validHours);
      state = {
        year: Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : state.year,
        weeklyHours: weekA,
        weekBHours: Array.isArray(imported.weekBHours) && imported.weekBHours.length === 7 ? imported.weekBHours.map(validHours) : [...weekA],
        patternType: imported.patternType === "biweekly" ? "biweekly" : "weekly",
        anchorDate: parseDateKey(imported.anchorDate) ? imported.anchorDate : mondayKey(today),
        overrides: sanitizeOverrides(imported.overrides)
      };
      viewMonth = state.year === today.getFullYear() ? today.getMonth() : 0;
      renderYearOptions();
      renderScheduleInputs();
      const saved = saveState();
      renderCalendar();
      loadHolidays(state.year);
      if (saved) els.saveStatus.textContent = "Schedule imported and saved on this device.";
    } catch (error) {
      els.saveStatus.textContent = error instanceof SyntaxError ? "That file is not valid schedule JSON." : error.message || "Could not import that schedule.";
    } finally { event.target.value = ""; }
  }

  function toKey(year, month, day) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
  function parseDateKey(key) {
    if (!isDateKey(key)) return null;
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }
  function isDateKey(key) { return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && Number(key.slice(0, 4)) >= 1900; }
  function mondayKey(date) {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return toKey(monday.getFullYear(), monday.getMonth(), monday.getDate());
  }
  function escapeText(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
  function escapeAttribute(value) { return escapeText(value); }
})();

