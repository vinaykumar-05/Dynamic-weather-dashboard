/* ====== CONFIG ====== */
const API_KEY = "efd8587a05095622f4008d78de058181"; // replace this
const DEFAULT_CITY = "Visakhapatnam";

/* ====== DOM ====== */
const cityEl = document.getElementById("cityName");
const condEl = document.getElementById("condition");
const tempEl = document.getElementById("temperature");
const dateEl = document.getElementById("date");
const timeEl = document.getElementById("time");

const pressureEl = document.getElementById("pressure");
const windEl = document.getElementById("wind");
const humidityEl = document.getElementById("humidity");
const visibilityEl = document.getElementById("visibility");

const forecastEl = document.getElementById("forecast");
const hourlyEl = document.getElementById("hourly");

const pm25El = document.getElementById("pm25");
const so2El = document.getElementById("so2");
const no2El = document.getElementById("no2");
const o3El = document.getElementById("o3");

const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");

const searchInput = document.getElementById("searchCity");
const searchBtn = document.getElementById("searchBtn");

/* ====== EFFECTS CANVAS ====== */
const canvas = document.getElementById("effects-canvas");
const ctx = canvas.getContext("2d");
let particles = [];
let effectMode = "clear"; // rain, snow, night, clear
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", () => {
  initGeolocation();

  // Search
  searchBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    if (q) fetchByCity(q);
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBtn.click();
  });

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Animation loop
  requestAnimationFrame(particlesLoop);

  // Touch support for mobile (tap canvas to trigger rain)
  canvas.addEventListener("touchstart", () => {
    if (effectMode !== "rain") setMode("rain");
  });
});

/* ====== GEOLOCATION ====== */
function initGeolocation() {
  if (!navigator.geolocation) {
    fetchByCity(DEFAULT_CITY);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => fetchByCity(DEFAULT_CITY),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/* ====== UTILS ====== */
function updateClock() {
  const now = new Date();
  dateEl.textContent = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  timeEl.textContent = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

/* ====== FETCH ====== */
async function fetchByCity(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
    const data = await fetchJSON(url);
    updateMain(data);
    fetchForecast(data.coord.lat, data.coord.lon, data.timezone);
    fetchAQI(data.coord.lat, data.coord.lon);
  } catch (e) {
    alert("City not found or API error. Check spelling & API key.");
    console.error(e);
  }
}

async function fetchByCoords(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const data = await fetchJSON(url);
    updateMain(data);
    fetchForecast(lat, lon, data.timezone);
    fetchAQI(lat, lon);
  } catch (e) {
    console.error(e);
    fetchByCity(DEFAULT_CITY);
  }
}

/* ====== FORECAST & AQI ====== */
async function fetchForecast(lat, lon, tz = 0) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const data = await fetchJSON(url);

    // Daily forecast
    const daily = {};
    data.list.forEach(item => {
      const date = item.dt_txt.split(" ")[0];
      if (!daily[date] && item.dt_txt.includes("12:00:00")) daily[date] = item;
      else if (!daily[date]) daily[date] = item;
    });

    forecastEl.innerHTML = "";
    forecastEl.className = "forecast-cards";
    Object.keys(daily).slice(0, 5).forEach(k => {
      const d = daily[k];
      const dayName = new Date(d.dt * 1000).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
      const icon = d.weather[0].icon;
      const temp = Math.round(d.main.temp);
      const el = document.createElement("div");
      el.className = "forecast-card";
      el.innerHTML = `
        <div style="font-weight:600">${dayName}</div>
        <div style="font-size:13px; color:rgba(255,255,255,0.8)">${d.weather[0].main}</div>
        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="" width="48" height="48">
        <div style="margin-top:6px; font-weight:700">${temp}°C</div>
      `;
      forecastEl.appendChild(el);
    });

    // Hourly forecast
    hourlyEl.innerHTML = "";
    data.list.slice(0, 8).forEach(hour => {
      const t = new Date(hour.dt * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      const icon = hour.weather[0].icon;
      const tmp = Math.round(hour.main.temp);
      const el = document.createElement("div");
      el.className = "hourly-card";
      el.innerHTML = `<div style="font-size:13px">${t}</div>
                      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="" width="44" height="44">
                      <div style="font-weight:700">${tmp}°C</div>`;
      hourlyEl.appendChild(el);
    });
  } catch (e) { console.error("Forecast error", e); }
}

async function fetchAQI(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const data = await fetchJSON(url);
    const comp = data.list[0].components;
    pm25El.textContent = comp.pm2_5 ?? "--";
    so2El.textContent = comp.so2 ?? "--";
    no2El.textContent = comp.no2 ?? "--";
    o3El.textContent = comp.o3 ?? "--";
  } catch (e) { console.error("AQI error", e); }
}

/* ====== UPDATE MAIN ====== */
function updateMain(data) {
  cityEl.textContent = `${data.name}, ${data.sys.country}`;
  condEl.textContent = capitalize(data.weather[0].description);
  tempEl.textContent = `${Math.round(data.main.temp)}°C`;
  pressureEl.textContent = `${data.main.pressure}`;
  humidityEl.textContent = `${data.main.humidity}`;
  windEl.textContent = `${(data.wind.speed * 3.6).toFixed(1)}`;
  visibilityEl.textContent = `${(data.visibility / 1000).toFixed(1)}`;

  sunriseEl.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  sunsetEl.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const desc = data.weather[0].description.toLowerCase();
  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;

  let bg = "assets/bg-day.jpg";
  effectMode = "clear";

  if (desc.includes("broken clouds")) { bg = "assets/bg-broken-clouds.jpg"; effectMode = "clear"; }
  else if (desc.includes("overcast clouds")) { bg = "assets/bg-overcast.jpg"; effectMode = "clear"; }
  else if (desc.includes("few clouds")) { bg = "assets/bg-few-clouds.jpg"; effectMode = "clear"; }
  else if (desc.includes("scattered clouds")) { bg = "assets/bg-scattered.jpg"; effectMode = "clear"; }
  else if (desc.includes("thunderstorm")) { bg = "assets/bg-thunderstorm.jpg"; effectMode = "rain"; }
  else if (desc.includes("drizzle")) { bg = "assets/bg-drizzle.jpg"; effectMode = "rain"; }
  else if (desc.includes("rain")) { bg = "assets/bg-rain.jpg"; effectMode = "rain"; }
  else if (desc.includes("snow")) { bg = "assets/bg-snow.jpg"; effectMode = "snow"; }
  else if (desc.includes("mist") || desc.includes("haze") || desc.includes("fog")) { bg = "assets/bg-haze.jpg"; effectMode = "clear"; }
  else { bg = isNight ? "assets/bg-night.jpg" : "assets/bg-day.jpg"; effectMode = isNight ? "night" : "clear"; }

  document.body.style.backgroundImage = `url('${bg}')`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
}

/* ====== HELPERS ====== */
function capitalize(s) {
  return s.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

/* ====== PARTICLES & EFFECTS ====== */
function particlesLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (effectMode === "rain") { spawnRain(); updateRain(); }
  else if (effectMode === "snow") { spawnSnow(); updateSnow(); }
  else if (effectMode === "night") { spawnStars(); updateStars(); }
  else { spawnFloaters(); updateFloaters(); }

  requestAnimationFrame(particlesLoop);
}

/* RAIN */
function spawnRain() {
  if (particles.length < 250) {
    particles.push({ x: Math.random() * canvas.width, y: Math.random() * -canvas.height, vx: Math.random() * 1 - 0.2, vy: 4 + Math.random() * 6, len: 12 + Math.random() * 12, alpha: 0.2 + Math.random() * 0.25 });
  }
}
function updateRain() {
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  particles.forEach((p, i) => {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.vx * p.len, p.y + p.vy * p.len);
    ctx.stroke();
    p.x += p.vx;
    p.y += p.vy;
    if (p.y > canvas.height) particles.splice(i, 1);
  });
}

/* SNOW */
function spawnSnow() {
  if (particles.length < 150) { particles.push({ x: Math.random() * canvas.width, y: Math.random() * -50, vx: Math.random() * 0.8 - 0.4, vy: 0.6 + Math.random() * 1.4, r: 1 + Math.random() * 3, alpha: 0.5 + Math.random() * 0.5 }); }
}
function updateSnow() { particles.forEach((s, i) => { ctx.beginPath(); ctx.fillStyle = `rgba(255,255,255,${s.alpha})`; ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); s.x += s.vx; s.y += s.vy; if (s.y > canvas.height) particles.splice(i, 1); }); }

/* STARS */
function spawnStars() { if (particles.length < 120) { particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.6, r: Math.random() * 1.6 + 0.3, alpha: Math.random() * 0.7 + 0.3, blink: Math.random() * 0.02 + 0.01 }); } }
function updateStars() { particles.forEach((s) => { s.alpha += (Math.random() - 0.5) * s.blink; if (s.alpha < 0.1) s.alpha = 0.1; if (s.alpha > 1) s.alpha = 1; ctx.fillStyle = `rgba(255,255,255,${s.alpha})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }); }

/* FLOATERS */
function spawnFloaters() { if (particles.length < 40) { particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2 + 0.6, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, alpha: Math.random() * 0.12 + 0.02 }); } }
function updateFloaters() { particles.forEach((p, i) => { ctx.beginPath(); ctx.fillStyle = `rgba(255,255,255,${p.alpha})`; ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); p.x += p.vx; p.y += p.vy; if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) particles.splice(i, 1); }); }

/* MODE CHANGE */
function setMode(mode) { effectMode = mode; particles = []; }
