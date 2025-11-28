const brightnessSlider = document.getElementById("brightness");
const playButton = document.getElementById("play-button");
const menuToggle = document.getElementById("menu-toggle");
const menuPanel = document.getElementById("menu-panel");
const ambient = document.getElementById("ambient");
const overlay = document.getElementById("overlay");
const timerSlider = document.getElementById("timer");
const timerValue = document.getElementById("timer-value");
const timerClear = document.getElementById("timer-clear");
const blendLayer = document.getElementById("theme-blend");
const tapLayer = document.getElementById("tap-layer");
const menuBackdrop = document.getElementById("menu-backdrop");
const volumeSlider = document.getElementById("volume");
const body = document.body;

const themeTiles = Array.from(document.querySelectorAll("[data-theme]"));
const soundTiles = Array.from(document.querySelectorAll("[data-sound]"));
const themes = ["candyfloss", "ocean-hush", "moon-mist", "forest-lullaby", "aurora", "glacier", "coral", "ember", "rainbow"];

let isPlaying = false;
let currentSound = "rain.mp3";
let timerId = null;
let timerMinutes = Infinity;
let blendTimer = null;
let rippleId = 0;
let activeRipple = null;
let activePointerId = null;
let volume = 0.6;
const STORE_KEY = "nightlight-state";
let stateLoaded = false;
let timerDeadline = null;
let timerInterval = null;

function saveState() {
  const data = {
    sound: currentSound,
    volume,
    brightness: Number(brightnessSlider.value),
    timerMinutes,
  };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.sound) currentSound = data.sound;
    if (typeof data.volume === "number") volume = data.volume;
    if (typeof data.brightness === "number") {
      brightnessSlider.value = data.brightness;
    }
    if (typeof data.timerMinutes === "number") {
      timerMinutes = data.timerMinutes;
      if (timerSlider) {
        if (!isFinite(timerMinutes)) {
          timerSlider.value = 12;
        } else {
          timerSlider.value = Math.min(12, Math.round(timerMinutes / 5));
        }
      }
    }
    stateLoaded = true;
  } catch (_) {}
}

// --- THEME SWITCHING ---
function setTheme(theme) {
  themes.forEach((t) => body.classList.remove(`theme-${t}`));
  body.classList.add(`theme-${theme}`);
  themeTiles.forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.theme === theme);
  });
  triggerBlend();
}

// --- BRIGHTNESS CONTROL ---
function updateBrightness() {
  const value = Number(brightnessSlider.value);
  const maxDim = 0.8;
  const minDim = 0.0;
  const dim = maxDim - (value / 100) * (maxDim - minDim);
  overlay.style.opacity = dim.toFixed(2);
  body.style.setProperty("--glow-strength", (value / 100).toFixed(2));
  saveState();
}

brightnessSlider.addEventListener("input", updateBrightness);
updateBrightness();

// --- AUDIO ---
function updatePlayButton() {
  playButton.classList.toggle("playing", isPlaying);
  playButton.setAttribute("aria-pressed", String(isPlaying));
}

function clearTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDeadline = null;
  updateTimerIndicator();
}

function resetTimer() {
  clearTimer();
  if (!isPlaying) return;
  if (!isFinite(timerMinutes)) return;
  const ms = timerMinutes * 60 * 1000;
  timerDeadline = Date.now() + ms;
  timerId = setTimeout(() => {
    ambient.pause();
    isPlaying = false;
    updatePlayButton();
    updateTimerIndicator();
  }, ms);
  updateTimerIndicator();
  timerInterval = setInterval(updateTimerIndicator, 1000);
}

function setSound(file, autoplay = false) {
  if (!ambient) return;
  const shouldAutoPlay = autoplay && isPlaying;
  isPlaying = false;
  ambient.pause();
  currentSound = file;
  ambient.src = file;
  ambient.load();

  soundTiles.forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.sound === file);
  });
  saveState();

  if (shouldAutoPlay) {
    ambient
      .play()
      .then(() => {
        isPlaying = true;
        updatePlayButton();
        resetTimer();
      })
      .catch((e) => {
        console.warn("Unable to start audio:", e);
        isPlaying = false;
        updatePlayButton();
      });
  } else {
    updatePlayButton();
  }
}

function toggleSound() {
  if (!ambient) return;
  if (!isPlaying) {
    ambient
      .play()
      .then(() => {
        isPlaying = true;
        updatePlayButton();
        resetTimer();
        saveState();
      })
      .catch((e) => {
        console.warn("Unable to start audio:", e);
        isPlaying = false;
        updatePlayButton();
      });
  } else {
    ambient.pause();
    isPlaying = false;
    updatePlayButton();
    clearTimer();
    saveState();
  }
}

playButton.addEventListener("click", toggleSound);

soundTiles.forEach((tile) => {
  tile.addEventListener("click", () => {
    const file = tile.dataset.sound;
    setSound(file, true);
    closeMenu();
  });
});

themeTiles.forEach((tile) => {
  tile.addEventListener("click", () => {
    setTheme(tile.dataset.theme);
    closeMenu();
  });
});

// --- MENU ---
function closeMenu() {
  if (!menuPanel || !menuToggle) return;
  menuPanel.classList.remove("open");
  menuToggle.classList.remove("open");
  if (menuBackdrop) menuBackdrop.classList.remove("open");
}

function toggleMenu() {
  if (!menuPanel || !menuToggle) return;
  menuPanel.classList.toggle("open");
  menuToggle.classList.toggle("open");
  if (menuBackdrop) menuBackdrop.classList.toggle("open");
}

menuToggle.addEventListener("click", toggleMenu);

// --- TIMER ---
function updateTimerLabel(val) {
  if (val >= 12) {
    timerMinutes = Infinity;
    timerValue.textContent = "∞";
  } else {
    timerMinutes = val * 5;
    timerValue.textContent = `${timerMinutes}m`;
  }
}

function onTimerChange() {
  const raw = Number(timerSlider.value);
  timerMinutes = raw >= 12 ? Infinity : raw * 5;
  updateTimerLabel(raw);
  resetTimer();
  saveState();
}

if (timerSlider) {
  timerSlider.addEventListener("input", onTimerChange);
  updateTimerLabel(Number(timerSlider.value));
}

if (timerClear) {
  timerClear.addEventListener("click", () => {
    timerMinutes = Infinity;
    if (timerSlider) timerSlider.value = 12;
    updateTimerLabel(Number(timerSlider?.value || 12));
    clearTimer();
    saveState();
  });
}

function updateTimerIndicator() {
  const el = document.getElementById("timer-indicator");
  if (!el) return;

  if (!isFinite(timerMinutes) || !timerDeadline) {
    el.textContent = "";
    el.classList.remove("show");
    return;
  }

  const remaining = Math.max(0, timerDeadline - Date.now());
  if (remaining <= 0) {
    el.textContent = "";
    el.classList.remove("show");
    return;
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  el.textContent = `${mins}:${secs}`;
  el.classList.add("show");
}

function triggerBlend() {
  if (!blendLayer) return;
  if (blendTimer) {
    clearTimeout(blendTimer);
    blendTimer = null;
  }
  blendLayer.classList.add("active");
  blendTimer = setTimeout(() => {
    blendLayer.classList.remove("active");
  }, 500);
}

// Tap ripple
function spawnRipple(x, y, pointerId) {
  if (!tapLayer) return;
  const ripple = document.createElement("span");
  ripple.className = "ripple hold";
  ripple.dataset.id = `r-${++rippleId}`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.dataset.pointerId = pointerId ?? "";
  tapLayer.appendChild(ripple);
  activeRipple = ripple;
  activePointerId = pointerId ?? null;
}

document.addEventListener("pointerdown", (e) => {
  // avoid generating ripples for scroll bars or non-primary buttons
  if (e.button !== undefined && e.button !== 0) return;
  if (e.target.closest("#menu-panel, #top-bar, #play-cluster, .dial, .tile, .slider-row, .timer-row")) return;
  spawnRipple(e.clientX, e.clientY, e.pointerId);
});

document.addEventListener("pointermove", (e) => {
  if (!activeRipple) return;
  if (activePointerId !== null && e.pointerId !== activePointerId) return;
  activeRipple.style.left = `${e.clientX}px`;
  activeRipple.style.top = `${e.clientY}px`;
});

function releaseRipple(e) {
  if (!activeRipple) return;
  if (activePointerId !== null && e && e.pointerId !== activePointerId) return;
  const rip = activeRipple;
  rip.classList.remove("hold");
  rip.classList.add("release");
  rip.addEventListener(
    "animationend",
    () => {
      rip.remove();
    },
    { once: true }
  );
  activeRipple = null;
  activePointerId = null;
}

document.addEventListener("pointerup", releaseRipple);
document.addEventListener("pointercancel", releaseRipple);
document.addEventListener("pointerleave", releaseRipple);

// Volume
function updateVolume() {
  const val = Number(volumeSlider.value);
  volume = Math.min(1, Math.max(0, val / 100));
  if (ambient) ambient.volume = volume;
  saveState();
}

if (volumeSlider) {
  volumeSlider.addEventListener("input", updateVolume);
}

// Init defaults
loadState();
setTheme("candyfloss");
setSound(currentSound, false);
if (volumeSlider) {
  volumeSlider.value = Math.round(volume * 100);
  updateVolume();
} else if (ambient) {
  ambient.volume = volume;
}
if (!stateLoaded) {
  brightnessSlider.value = 70;
}
updateBrightness();
updatePlayButton();
updateTimerIndicator();

// Optional: reduce brightness a bit by default for desktop
window.addEventListener("load", () => {
  updateBrightness();
});
