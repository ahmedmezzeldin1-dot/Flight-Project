// =============================================================================
// BACKEND API CONFIGURATION
// =============================================================================
// Configurable endpoint pointing to the Flask Serverless prediction service.
// In production, update this with your deployed Vercel backend URL, e.g.:
// const BACKEND_URL = "https://your-backend-project.vercel.app/api/predict";
// Or dynamically supply window.BACKEND_URL.
let BACKEND_URL = window.BACKEND_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000/api/predict"
    : "/api/predict"
);

let API_BASE = window.API_BASE_URL || (
  BACKEND_URL.includes("/api/predict")
    ? BACKEND_URL.replace(/\/api\/predict\/?$/, "")
    : BACKEND_URL.replace(/\/predict\/?$/, "")
);

function updateEndpoints(url) {
  if (!url) return;
  BACKEND_URL = url.endsWith("/api/predict") ? url : `${url.replace(/\/+$/, "")}/api/predict`;
  API_BASE = BACKEND_URL.replace(/\/api\/predict\/?$/, "");
}


const numberFormat = new Intl.NumberFormat("en-US");
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const state = { health: null, summary: null };

const byId = (id) => document.getElementById(id);
const escapeText = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

async function apiRequest(path, options = {}) {
  const url = API_BASE ? `${API_BASE}${path}` : path;
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || `Request failed (${response.status})`);
  }
  return payload;
}

function setSystemStatus(health) {
  state.health = health;
  const dot = byId("status-dot");
  const isHealthy = health && health.status === "ok";
  dot.classList.toggle("ready", isHealthy);
  dot.classList.toggle("unavailable", !isHealthy);
  byId("system-status").textContent = isHealthy ? "API connected" : "API offline";

  const modelDot = byId("model-dot");
  const modelReady = Boolean(health && health.model_available);
  modelDot.classList.toggle("ready", modelReady);
  modelDot.classList.toggle("unavailable", !modelReady);
  byId("model-status").textContent = modelReady ? "Model ready" : "Model ready (fallback)";
}

function showError(id, message) {
  const element = byId(id);
  if (!element) return;
  element.textContent = message;
  element.classList.remove("hidden");
}

function clearError(id) {
  const element = byId(id);
  if (!element) return;
  element.textContent = "";
  element.classList.add("hidden");
}

function renderMetrics(summary) {
  byId("metric-flights").textContent = numberFormat.format(summary.total_flights || 0);
  byId("metric-delayed").textContent = numberFormat.format(summary.delayed_flights || 0);
  byId("metric-rate").textContent = `${Number(summary.delay_rate || 0).toFixed(1)}%`;
  byId("metric-average").textContent = `${Number(summary.average_delay_minutes || 0).toFixed(1)} min`;
}

function renderTrendChart(elementId, rows, key, colorClass = "") {
  const container = byId(elementId);
  if (!container) return;
  if (!rows || !rows.length) {
    container.innerHTML = '<p class="empty-bars">No monthly trend data available.</p>';
    return;
  }

  const width = 620;
  const height = 220;
  const plot = { left: 43, right: 14, top: 12, bottom: 31 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const maxValue = Math.max(1, ...rows.map((row) => Number(row[key]) || 0));
  const ceiling = Math.ceil(maxValue / 5) * 5 || 5;

  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? plot.left + plotWidth / 2 : plot.left + (index / (rows.length - 1)) * plotWidth;
    const y = plot.top + plotHeight - (Number(row[key]) / ceiling) * plotHeight;
    return { x, y, label: monthNames[Number(row.month) - 1] || String(row.month), value: Number(row[key]) || 0 };
  });

  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${plot.top + plotHeight} L${points[0].x},${plot.top + plotHeight} Z`;

  const grid = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const y = plot.top + plotHeight * fraction;
    const label = (ceiling * (1 - fraction)).toFixed(0);
    return `<line class="chart-grid-line" x1="${plot.left}" y1="${y}" x2="${width - plot.right}" y2="${y}"/><text class="chart-axis-label" x="${plot.left - 9}" y="${y + 3}" text-anchor="end">${label}</text>`;
  }).join("");

  const labels = points.map((point) => `<text class="chart-axis-label" x="${point.x}" y="${height - 7}" text-anchor="middle">${escapeText(point.label)}</text>`).join("");
  const dots = points.map((point) => `<circle class="chart-point ${colorClass ? "orange-point" : ""}" cx="${point.x}" cy="${point.y}" r="4"><title>${escapeText(point.label)}: ${point.value.toFixed(1)}</title></circle>`).join("");

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${grid}<path class="chart-area ${colorClass ? "orange-area" : ""}" d="${area}"/><path class="chart-line ${colorClass ? "orange-line" : ""}" d="${line}"/>${dots}${labels}</svg>`;
}

function renderBars(elementId, rows, labelKey) {
  const container = byId(elementId);
  if (!container) return;
  if (!rows || !rows.length) {
    container.innerHTML = '<p class="empty-bars">No flight volume data available.</p>';
    return;
  }
  const maxCount = Math.max(1, ...rows.map((row) => Number(row.flights) || 0));
  container.innerHTML = rows.map((row) => {
    const width = Math.max(2, (Number(row.flights) / maxCount) * 100);
    return `<div class="bar-row"><span class="bar-name" title="${escapeText(row[labelKey])}">${escapeText(row[labelKey])}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><span class="bar-count">${numberFormat.format(row.flights)}</span></div>`;
  }).join("");
}

function renderAnalytics(summary) {
  state.summary = summary;
  renderMetrics(summary);
  renderTrendChart("delay-chart", summary.monthly || [], "delay_rate");
  renderTrendChart("average-chart", summary.monthly || [], "average_delay_minutes", "orange");
  renderBars("origin-bars", summary.top_origins || [], "origin");
  renderBars("route-bars", summary.top_routes || [], "route");

  const filter = byId("origin-filter");
  if (filter) {
    const selected = filter.value;
    const options = ['<option value="">All airports</option>', ...(summary.origins || []).map((origin) => `<option value="${escapeText(origin)}">${escapeText(origin)}</option>`)];
    filter.innerHTML = options.join("");
    filter.value = selected;
  }
}

async function loadAnalytics(origin = "") {
  clearError("overview-error");
  byId("overview-loading").classList.remove("hidden");
  byId("overview-content").classList.add("hidden");
  try {
    const query = origin ? `?origin=${encodeURIComponent(origin)}` : "";
    const summary = await apiRequest(`/api/analytics${query}`);
    renderAnalytics(summary);
    byId("overview-content").classList.remove("hidden");
  } catch (error) {
    showError("overview-error", `Analytics unavailable: ${error.message}`);
  } finally {
    byId("overview-loading").classList.add("hidden");
  }
}

function initializeSelects() {
  const monthInput = byId("month-input");
  if (monthInput) {
    monthInput.innerHTML = monthNames.map((name, index) => `<option value="${index + 1}">${new Date(2026, index, 1).toLocaleString("en-US", { month: "long" })}</option>`).join("");
    monthInput.value = "10";
  }

  const weekdayInput = byId("weekday-input");
  if (weekdayInput) {
    weekdayInput.innerHTML = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => `<option value="${index + 1}">${day}</option>`).join("");
    weekdayInput.value = "1";
  }
}

function navigate(viewName) {
  const prediction = viewName === "prediction";
  document.querySelectorAll(".nav-link").forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  byId("overview-view").hidden = prediction;
  byId("overview-view").classList.toggle("active", !prediction);
  byId("prediction-view").hidden = !prediction;
  byId("prediction-view").classList.toggle("active", prediction);
  byId("breadcrumb-current").textContent = prediction ? "PREDICTION" : "OVERVIEW";
  document.title = prediction ? "Delay Prediction | Flight Operations" : "Flight Operations | Departure Intelligence";
}

async function submitPrediction(event) {
  event.preventDefault();
  clearError("prediction-error");

  const button = byId("predict-button");
  button.disabled = true;
  button.textContent = "Calculating...";

  const data = new FormData(event.currentTarget);
  const timeRaw = String(data.get("departure_time") || "09:00");
  const [hour, minute] = timeRaw.split(":").map(Number);
  const crs_dep_time = (Number.isFinite(hour) ? hour : 9) * 100 + (Number.isFinite(minute) ? minute : 0);

  const payload = {
    month: Number(data.get("month")),
    day_of_week: Number(data.get("day_of_week")),
    crs_dep_time: crs_dep_time,
    weather_features: {
      HOURLYVISIBILITY: Number(data.get("visibility") || 10),
      HOURLYDRYBULBTEMPF: Number(data.get("temperature") || 55),
      HOURLYRelativeHumidity: Number(data.get("humidity") || 60),
      HOURLYWindSpeed: Number(data.get("wind_speed") || 8),
      HOURLYPrecip: Number(data.get("precipitation") || 0),
    },
  };

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const prediction = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(prediction.error || prediction.detail || `Prediction failed (${response.status})`);
    }

    const probability = Number(prediction.delay_probability || 0);
    byId("result-empty").classList.add("hidden");
    byId("result-populated").classList.remove("hidden");
    byId("result-probability").textContent = `${(probability * 100).toFixed(1)}%`;
    byId("result-classification").textContent = prediction.prediction || (probability >= 0.5 ? "Delayed 15+ minutes" : "On-time or under 15 minutes late");

    const fill = byId("probability-fill");
    fill.style.width = `${Math.min(100, Math.max(0, probability * 100))}%`;
    fill.classList.toggle("high", probability >= (prediction.threshold || 0.5));
  } catch (error) {
    showError("prediction-error", `Prediction service error: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Calculate probability";
  }
}

async function initialize() {
  const todayLabel = byId("today-label");
  if (todayLabel) {
    todayLabel.textContent = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date());
  }

  initializeSelects();

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.view));
  });

  const filter = byId("origin-filter");
  if (filter) {
    filter.addEventListener("change", (event) => loadAnalytics(event.target.value));
  }

  const form = byId("prediction-form");
  if (form) {
    form.addEventListener("submit", submitPrediction);
  }

  try {
    const configResponse = await fetch("/api/config").catch(() => null);
    if (configResponse && configResponse.ok) {
      const config = await configResponse.json().catch(() => null);
      if (config && config.BACKEND_URL) {
        updateEndpoints(config.BACKEND_URL);
      }
    }
  } catch (_) {}

  try {
    const health = await apiRequest("/api/health");
    setSystemStatus(health);
  } catch (err) {
    console.warn("Backend health check:", err.message);
    setSystemStatus({ status: "offline", model_available: false });
  }

  await loadAnalytics();
}

// Start application
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
