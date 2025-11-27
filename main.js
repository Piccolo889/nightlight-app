const themeSelect = document.getElementById("theme");
const brightnessSlider = document.getElementById("brightness");
const brightnessLabel = document.getElementById("brightness-value");
const soundToggleBtn = document.getElementById("sound-toggle");
const ambient = document.getElementById("ambient");
const overlay = document.getElementById("overlay");
const body = document.body;
const themes = ["candyfloss", "ocean-hush", "moon-mist", "forest-lullaby"];

let isPlaying = false;

// --- THEME SWITCHING ---
function setTheme(theme) {
  themes.forEach((t) => body.classList.remove(`theme-${t}`));
  body.classList.add(`theme-${theme}`);
}

themeSelect.addEventListener("change", () => {
  const theme = themeSelect.value;
  setTheme(theme);
});

setTheme(themeSelect.value);

// --- BRIGHTNESS CONTROL ---
// Slider 0-100, we map to overlay opacity
// 0% => darkest (overlay 0.8)
// 100% => brightest (overlay 0.0 or near)
function updateBrightness() {
  const value = Number(brightnessSlider.value);
  brightnessLabel.textContent = `${value}%`;

  const maxDim = 0.8;
  const minDim = 0.0;
  const dim = maxDim - (value / 100) * (maxDim - minDim);
  overlay.style.opacity = dim.toFixed(2);
  body.style.setProperty("--glow-strength", (value / 100).toFixed(2));
}

brightnessSlider.addEventListener("input", updateBrightness);
updateBrightness();

// --- SOUND TOGGLE ---
function updateSoundButton() {
  soundToggleBtn.textContent = isPlaying ? "Stop Ambient Sound" : "Play Ambient Sound";
}

soundToggleBtn.addEventListener("click", async () => {
  if (!ambient) return;

  if (!isPlaying) {
    try {
      await ambient.play();
      isPlaying = true;
    } catch (e) {
      console.warn("Unable to start audio:", e);
      isPlaying = false;
    }
  } else {
    ambient.pause();
    isPlaying = false;
  }

  updateSoundButton();
});

updateSoundButton();

// Optional: reduce brightness a bit by default for desktop
window.addEventListener("load", () => {
  if (window.innerWidth > 600) {
    brightnessSlider.value = 60;
    updateBrightness();
  }
});
