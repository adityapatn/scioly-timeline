// --- Duosmium GitHub Tournament Search ---
const DUOSMIUM_API_URL = 'https://api.github.com/repos/Duosmium/duosmium/contents/data/results';
const DUOSMIUM_RAW_URL = 'https://raw.githubusercontent.com/Duosmium/duosmium/main/data/results/';

const duosmiumSearchInput = document.getElementById('duosmium-tournament-search');
const duosmiumYearMinInput = document.getElementById('duosmium-year-min');
const duosmiumYearMaxInput = document.getElementById('duosmium-year-max');
const duosmiumLoadBtn = document.getElementById('duosmium-load-btn');
const duosmiumResultsDiv = document.getElementById('duosmium-search-results');

let duosmiumFileList = [];
let duosmiumFiltered = [];
let duosmiumSelected = new Set();

async function fetchDuosmiumFileList() {
  if (duosmiumFileList.length) return duosmiumFileList;
  duosmiumResultsDiv.textContent = 'Loading tournament list from GitHub...';
  try {
    const res = await fetch(DUOSMIUM_API_URL);
    if (!res.ok) throw new Error('Failed to fetch tournament list');
    const files = await res.json();
    duosmiumFileList = files.filter(f => f.name.endsWith('.yaml'));
    return duosmiumFileList;
  } catch (e) {
    duosmiumResultsDiv.textContent = 'Error loading tournament list.';
    return [];
  }
}

function parseYearFromFilename(name) {
  const match = name.match(/(19|20)\d{2}/);
  return match ? parseInt(match[0], 10) : null;
}

function parseTournamentNameFromDuosmium(name) {
  // Remove year, division, extension, underscores
  return name.replace(/(19|20)\d{2}/, '')
    .replace(/_div[bc]/i, '')
    .replace(/\.yaml$/, '')
    .replace(/_/g, ' ')
    .trim();
}

function filterDuosmiumFiles() {
  const query = (duosmiumSearchInput.value || '').toLowerCase();
  const yearMin = parseInt(duosmiumYearMinInput.value, 10) || 2000;
  const yearMax = parseInt(duosmiumYearMaxInput.value, 10) || 2100;
  duosmiumFiltered = duosmiumFileList.filter(f => {
    const year = parseYearFromFilename(f.name);
    if (!year || year < yearMin || year > yearMax) return false;
    const tname = parseTournamentNameFromDuosmium(f.name).toLowerCase();
    return !query || tname.includes(query);
  });
  renderDuosmiumResults();
}

function renderDuosmiumResults() {
  if (!duosmiumFiltered.length) {
    duosmiumResultsDiv.innerHTML = '<em>No tournaments found for search.</em>';
    return;
  }
  duosmiumResultsDiv.innerHTML = duosmiumFiltered.map(f => {
    const year = parseYearFromFilename(f.name);
    const tname = parseTournamentNameFromDuosmium(f.name);
    const checked = duosmiumSelected.has(f.name) ? 'checked' : '';
    return `<label style="display:block;margin-bottom:2px;"><input type="checkbox" data-fname="${f.name}" ${checked}/> ${tname} <span style="color:#888">(${year})</span></label>`;
  }).join('');
  // Add event listeners for checkboxes
  duosmiumResultsDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      const fname = cb.getAttribute('data-fname');
      if (cb.checked) duosmiumSelected.add(fname);
      else duosmiumSelected.delete(fname);
    });
  });
}

async function handleDuosmiumSearchInput() {
  await fetchDuosmiumFileList();
  filterDuosmiumFiles();
}

async function handleDuosmiumLoadBtn() {
  if (!duosmiumSelected.size) {
    statusText.textContent = 'Select at least one tournament.';
    return;
  }
  statusText.textContent = 'Loading tournaments from GitHub...';
  const parser = await loadSciolyFF();
  const filesToLoad = Array.from(duosmiumSelected);
  const loaded = await Promise.all(filesToLoad.map(async fname => {
    try {
      const url = DUOSMIUM_RAW_URL + fname;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch ' + fname);
      const text = await res.text();
      const tournament = new parser.Interpreter(text);
      return { fileName: fname, tournament: tournament.tournament };
    } catch (e) {
      return { fileName: fname, error: e instanceof Error ? e.message : String(e) };
    }
  }));
  const successes = loaded.filter(e => !e.error);
  const errors = loaded.filter(e => e.error);
  // Avoid duplicate filenames
  const existingNames = new Set(state.files.map(e => e.fileName));
  successes.forEach(entry => {
    if (!existingNames.has(entry.fileName)) {
      state.files.push(entry);
      existingNames.add(entry.fileName);
    }
  });
  if (!state.files.length) {
    renderError(errors.map(e => `${e.fileName}: ${e.error}`).join('\n'));
    statusText.textContent = 'Parsing failed';
    if (fileListEl) fileListEl.innerHTML = '';
    return;
  }
  if (errors.length) {
    statusText.textContent = `${state.files.length} loaded, ${errors.length} failed`;
    console.warn('Some tournaments failed to load', errors);
  }
  render();
}

if (duosmiumSearchInput && duosmiumYearMinInput && duosmiumYearMaxInput && duosmiumLoadBtn && duosmiumResultsDiv) {
  duosmiumSearchInput.addEventListener('input', handleDuosmiumSearchInput);
  duosmiumYearMinInput.addEventListener('input', handleDuosmiumSearchInput);
  duosmiumYearMaxInput.addEventListener('input', handleDuosmiumSearchInput);
  duosmiumLoadBtn.addEventListener('click', handleDuosmiumLoadBtn);
  // Initial load
  fetchDuosmiumFileList().then(() => filterDuosmiumFiles());
}

const state = {
  files: [],
  options: {
    city: false,
    state: false,
    number: false,
    advanced: true,
    top3: true,
    highlightCount: 3,
    location: true,
    date: true,
    division: true,
    level: true,
    teamNameMax: 28,
    teamsShown: 20,
    medals: false,
    medalCountMax: 3,
  },
};

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const tableRoot = document.getElementById("tables");
const fileListEl = document.getElementById("file-list");
const statusText = document.getElementById("status-text");

const optionInputs = {
  city: document.getElementById("toggle-city"),
  state: document.getElementById("toggle-state"),
  number: document.getElementById("toggle-number"),
  advanced: document.getElementById("toggle-advanced"),
  top3: document.getElementById("toggle-top3"),
  location: document.getElementById("toggle-location"),
  date: document.getElementById("toggle-date"),
  division: document.getElementById("toggle-division"),
  level: document.getElementById("toggle-level"),
  suffix: document.getElementById("toggle-suffix"),
  medals: document.getElementById("toggle-medals"),
};
const medalCountMaxInput = document.getElementById("medal-count-max");
const teamNameMaxInput = document.getElementById("team-name-max");
const highlightCountInput = document.getElementById("highlight-count-max");
const teamsShownInput = document.getElementById("teams-shown-max");

console.error("[app] app.js loaded");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

let SciolyFF;

async function loadSciolyFF() {
  if (SciolyFF) {
    return SciolyFF;
  }

  const module = await import("https://esm.sh/sciolyff@0.19.1?bundle");
  SciolyFF = module.default ?? module;
  return SciolyFF;
}

let html2canvasLib;

async function loadHtml2Canvas() {
  if (html2canvasLib) {
    return html2canvasLib;
  }

  const module = await import("https://esm.sh/html2canvas@1.4.1?bundle");
  html2canvasLib = module.default ?? module;
  return html2canvasLib;
}

function parseBoundedNumberFromInput(input) {
  const raw = input.value;
  const min = Number.parseInt(input.min, 10);
  const max = Number.parseInt(input.max, 10);
  const fallback = Number.parseInt(input.defaultValue || input.getAttribute("value") || "0", 10);

  const boundedMin = Number.isFinite(min) ? min : Number.NEGATIVE_INFINITY;
  const boundedMax = Number.isFinite(max) ? max : Number.POSITIVE_INFINITY;
  const boundedFallback = Number.isFinite(fallback)
    ? Math.min(boundedMax, Math.max(boundedMin, fallback))
    : 0;

  // If the field is currently empty (user is mid-edit), don't clobber their input.
  if (raw === "") {
    return boundedFallback;
  }

  const parsed = Number.parseInt(raw, 10);
  const normalized = Number.isFinite(parsed)
    ? Math.min(boundedMax, Math.max(boundedMin, parsed))
    : boundedFallback;

  input.value = String(normalized);
  return normalized;
}

function updateOptionState() {
  Object.entries(optionInputs).forEach(([key, input]) => {
    state.options[key] = input.checked;
  });

  state.options.teamNameMax = parseBoundedNumberFromInput(teamNameMaxInput);
  document.documentElement.style.setProperty("--team-name-max-ch", String(state.options.teamNameMax));

  state.options.highlightCount = parseBoundedNumberFromInput(highlightCountInput);
  state.options.teamsShown = parseBoundedNumberFromInput(teamsShownInput);
  state.options.medalCountMax = parseBoundedNumberFromInput(medalCountMaxInput);
}

function bindControls() {
  Object.values(optionInputs).forEach((input) => {
    input.addEventListener("change", () => {
      updateOptionState();
      render();
    });
  });

  teamNameMaxInput.addEventListener("input", () => {
    updateOptionState();
    render();
  });

  highlightCountInput.addEventListener("input", () => {
    updateOptionState();
    render();
  });

  teamsShownInput.addEventListener("input", () => {
    updateOptionState();
    render();
  });

  medalCountMaxInput.addEventListener("input", () => {
    updateOptionState();
    render();
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}

function formatFilenameToken(token) {
  if (!token) {
    return "";
  }

  if (/^[a-z]{2,3}$/i.test(token)) {
    return token.toUpperCase();
  }

  if (/^[ivxlcdm]+$/i.test(token)) {
    return token.toUpperCase();
  }

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function parseTournamentNameFromFileName(fileName) {
  const cleaned = String(fileName || "").replace(/\.[^.]+$/, "");
  const tokens = cleaned.split("_").filter(Boolean);
  if (!tokens.length) {
    return "";
  }

  const typeMap = {
    reg: "Reg",
    regional: "Reg",
    regionals: "Reg",
    state: "State",
    states: "State",
    invi: "Invi",
    invite: "Invi",
    invites: "Invi",
    invitational: "Invi",
    invitationals: "Invi",
  };

  const firstTokenYear = tokens[0].match(/^(19|20)\d{2}/);
  const year = firstTokenYear?.[0] ?? tokens.find((token) => /^(19|20)\d{2}$/.test(token)) ?? "";
  const startIndex = firstTokenYear ? 1 : 0;

  const typeIndex = tokens.findIndex((token, index) => {
    return index >= startIndex && Boolean(typeMap[token.toLowerCase()]);
  });

  const divisionIndex = tokens.findIndex((token, index) => {
    if (index < startIndex) {
      return false;
    }
    return /^[bc]$/i.test(token) || /^div[bc]$/i.test(token);
  });

  const endCandidates = [typeIndex, divisionIndex].filter((index) => index >= 0);
  const nameEnd = endCandidates.length ? Math.min(...endCandidates) : tokens.length;
  const nameTokens = tokens.slice(startIndex, nameEnd).map(formatFilenameToken).filter(Boolean);

  const typeLabel = typeIndex >= 0 ? typeMap[tokens[typeIndex].toLowerCase()] : "";
  let division = "";
  if (divisionIndex >= 0) {
    const divisionToken = tokens[divisionIndex].toLowerCase();
    division = divisionToken.startsWith("div") ? divisionToken.slice(-1).toUpperCase() : divisionToken.toUpperCase();
  }

  const parts = [];
  if (nameTokens.length) {
    parts.push(nameTokens.join(" "));
  }
  if (typeLabel) {
    parts.push(typeLabel);
  }
  if (division) {
    parts.push(`Div ${division}`);
  }
  if (year) {
    parts.push(year);
  }

  return parts.join(" ");
}

function formatTournamentLevel(level) {
  if (!level) {
    return "";
  }

  const normalized = String(level).trim().toLowerCase();
  const levelMap = {
    reg: "Reg",
    regional: "Reg",
    regionals: "Reg",
    state: "State",
    states: "State",
    invi: "Invi",
    invite: "Invi",
    invites: "Invi",
    invitational: "Invi",
    invitationals: "Invi",
  };

  if (levelMap[normalized]) {
    return levelMap[normalized];
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function tournamentLabel(entry) {
  const tournament = entry.tournament;
  return (
    tournament.name ||
    tournament.shortName ||
    parseTournamentNameFromFileName(entry.fileName) ||
    "Unnamed Tournament"
  );
}

function buildTeamName(team) {
  return abbreviateHighSchool(team.school || team.name || team.team || "Unknown team");
}

function truncateName(text, maxChars) {
  if (!text || text.length <= maxChars) {
    return text;
  }

  if (maxChars <= 3) {
    return text.slice(0, maxChars);
  }

  return `${text.slice(0, maxChars - 3)}...`;
}

function abbreviateHighSchool(name) {
  return String(name).replace(/\bHigh School\b/gi, "H.S.");
}

function buildTeamLocation(team) {
  if (state.options.city && state.options.state && team.city && team.state) {
    return `${team.city}, ${team.state}`;
  }

  if (state.options.city && team.city) {
    return team.city;
  }

  if (state.options.state && team.state) {
    return team.state;
  }

  return "";
}

function buildTeamMeta(team) {
  const meta = [];
  const location = buildTeamLocation(team);
  if (location) {
    meta.push(location);
  }
  if (state.options.number) {
    meta.push(`#${team.number}`);
  }
  if (team.exhibition) {
    meta.push("Exhibition");
  }
  if (team.disqualified) {
    meta.push("DQ");
  }
  return meta.join(" • ");
}

function buildTournamentMeta(tournament) {
  const dateValue = tournament.date || tournament.startDate || tournament.endDate || tournament.awardsDate;
  const lines = [];

  if (state.options.location) {
    lines.push(`${tournament.location || "—"}`);
  }

  if (state.options.date) {
    lines.push(`${formatDate(dateValue)}`);
  }

  if (state.options.division) {
    lines.push(tournament.division ? `Division ${tournament.division}` : "Division: —");
  }

  if (state.options.level) {
    lines.push(tournament.level ? `${formatTournamentLevel(tournament.level)} Level` : "Level: —");
  }

  return lines;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderError(message) {
  console.error("[app] renderError:", message);
  tableRoot.innerHTML = `<div class="card upload-panel status-error">${escapeHtml(message)}</div>`;
}

function updateExportButtonState(isEnabled) {
  const exportButton = document.getElementById("export-button");
  if (!exportButton) {
    return;
  }

  exportButton.disabled = !isEnabled;
  exportButton.title = isEnabled
    ? "Copy the current table as a PNG image"
    : "Upload files first to enable copying";
}

function handleExportButtonClick(event) {
  console.info("[export] click handler fired");
  event.preventDefault();
  copyTableAsPNG().catch((error) => {
    console.error("[export] copy failure:", error);
    statusText.textContent = "Copy failed";
    alert("Failed to copy table image: " + (error instanceof Error ? error.message : String(error)));
  });
}

function handleDownloadButtonClick(event) {
  console.info("[download] click handler fired");
  event.preventDefault();
  downloadTableAsPNG().catch((error) => {
    console.error("[download] failure:", error);
    statusText.textContent = "Download failed";
    alert("Failed to download table image: " + (error instanceof Error ? error.message : String(error)));
  });
}

async function copyTableAsPNG() {
  console.info("[export] copy routine started");
  const exportTarget = tableRoot.querySelector("table.combined-results");
  if (!exportTarget) {
    console.warn("[export] No rendered table available to copy");
    statusText.textContent = "Upload files first";
    return;
  }

  const exportButton = document.getElementById("export-button");
  const width = Math.ceil(exportTarget.scrollWidth);
  const height = Math.ceil(exportTarget.scrollHeight);

  console.info("[export] target located", { width, height });

  try {
    exportButton.disabled = true;
    exportButton.textContent = "Copying...";
    statusText.textContent = "Copying PNG to clipboard...";

    const html2canvas = await loadHtml2Canvas();
    console.info("[export] html2canvas loaded");

    const canvas = await html2canvas(exportTarget, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    });

    console.info("[export] canvas rendered", { width: canvas.width, height: canvas.height });

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create PNG blob"));
          return;
        }

        resolve(blob);
      }, "image/png");
    });

    console.info("[export] png blob ready", { type: pngBlob.type, size: pngBlob.size });

    if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
      throw new Error("Clipboard image copy is not supported in this browser");
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);

    statusText.textContent = "PNG copied to clipboard";
    console.info("[export] PNG copied to clipboard");
  } catch (error) {
    console.error("[export] copy routine failed:", error);
    statusText.textContent = "Copy failed";
    alert("Failed to copy table image: " + (error instanceof Error ? error.message : String(error)));
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = "Copy Table as PNG";
    console.info("[export] copy routine finished");
  }
}

async function downloadTableAsPNG() {
  console.info("[download] routine started");
  const exportTarget = tableRoot.querySelector("table.combined-results");
  if (!exportTarget) {
    console.warn("[download] No rendered table available to download");
    statusText.textContent = "Upload files first";
    return;
  }

  const downloadButton = document.getElementById("download-button");
  const width = Math.ceil(exportTarget.scrollWidth);
  const height = Math.ceil(exportTarget.scrollHeight);

  try {
    downloadButton.disabled = true;
    downloadButton.textContent = "Downloading...";
    statusText.textContent = "Preparing PNG download...";

    const html2canvas = await loadHtml2Canvas();
    console.info("[download] html2canvas loaded");

    const canvas = await html2canvas(exportTarget, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    });

    console.info("[download] canvas rendered", { width: canvas.width, height: canvas.height });

    canvas.toBlob((blob) => {
      if (!blob) {
        statusText.textContent = "Download failed";
        alert("Failed to create PNG blob");
        downloadButton.disabled = false;
        downloadButton.textContent = "Download Table as PNG";
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scioly-table.png";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      statusText.textContent = "PNG downloaded";
      downloadButton.disabled = false;
      downloadButton.textContent = "Download Table as PNG";
    }, "image/png");
  } catch (error) {
    console.error("[download] routine failed:", error);
    statusText.textContent = "Download failed";
    alert("Failed to download table image: " + (error instanceof Error ? error.message : String(error)));
    downloadButton.disabled = false;
    downloadButton.textContent = "Download Table as PNG";
  }
}

function getTournamentSortValue(tournament) {
  const dateValue = tournament.startDate || tournament.date || tournament.endDate || tournament.awardsDate;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

function sortTournamentTeams(teams) {
  return teams
    .map((team, index) => ({ team, index }))
    .sort((left, right) => {
      const leftRank = Number(left.team.rank);
      const rightRank = Number(right.team.rank);

      if (Number.isFinite(leftRank) && Number.isFinite(rightRank) && leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftPoints = Number(left.team.points);
      const rightPoints = Number(right.team.points);

      if (Number.isFinite(leftPoints) && Number.isFinite(rightPoints) && leftPoints !== rightPoints) {
        return leftPoints - rightPoints;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.team);
}

function render() {
  // Render uploaded filenames (unique) instead of a simple count
  if (fileListEl) {
    fileListEl.innerHTML = "";
    const uniqueNames = [...new Set(state.files.map((e) => e.fileName))];
    uniqueNames.forEach((name) => {
      const li = document.createElement("li");
      li.className = "uploaded-file";

      const span = document.createElement("span");
      span.className = "uploaded-file-name";
      span.textContent = name;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remove-file";
      btn.setAttribute("aria-label", `Remove ${name}`);
      btn.textContent = "✕";
      btn.addEventListener("click", () => {
        state.files = state.files.filter((entry) => entry.fileName !== name);
        render();
      });

      li.appendChild(span);
      li.appendChild(btn);
      fileListEl.appendChild(li);
    });
  }

  if (!state.files.length) {
    tableRoot.innerHTML = `<div class="card upload-panel"><strong>Load one or more SciolyFF .yaml files to see tournament tables.</strong></div>`;
    statusText.textContent = "Waiting for upload";
    updateExportButtonState(false);
    return;
  }

  tableRoot.innerHTML = "";
  statusText.textContent = `${state.files.length} tournament${state.files.length === 1 ? "" : "s"} loaded`;
  updateExportButtonState(true);

  const sortedEntries = [...state.files].sort((left, right) => {
    return getTournamentSortValue(left.tournament) - getTournamentSortValue(right.tournament);
  });

  const wrapper = document.createElement("div");
  wrapper.className = "results-classic-wrapper combined-wrapper card";

  const table = document.createElement("table");
  table.className = "results-classic combined-results";

  const thead = document.createElement("thead");
  const titleRow = document.createElement("tr");
  sortedEntries.forEach((entry) => {
    const th = document.createElement("th");
    th.colSpan = 3 + (state.options.medals ? state.options.medalCountMax : 0);
    th.className = "tournament-group-header";
    const metaLines = buildTournamentMeta(entry.tournament)
      .map((line) => `<span>${escapeHtml(line)}</span>`)
      .join("");
    th.innerHTML = `
      <div class="tournament-title">${escapeHtml(tournamentLabel(entry))}</div>
      <div class="tournament-meta">${metaLines}</div>
    `;
    titleRow.appendChild(th);
  });
  thead.appendChild(titleRow);

  const columnRow = document.createElement("tr");
  columnRow.className = "column-header-row";
  sortedEntries.forEach((_entry, entryIdx) => {
    const teamHeader = document.createElement("th");
    teamHeader.className = "team";
    teamHeader.textContent = "Team Name";

    const rankHeader = document.createElement("th");
    rankHeader.className = "rank";
    rankHeader.textContent = "Rank";

    const pointsHeader = document.createElement("th");
    pointsHeader.className = "total-points";
    pointsHeader.textContent = "Points";

    columnRow.appendChild(teamHeader);
    columnRow.appendChild(rankHeader);
    columnRow.appendChild(pointsHeader);

    // Medal columns for this tournament (now after points)
    if (state.options.medals) {
      for (let i = 1; i <= state.options.medalCountMax; i++) {
        const medalHeader = document.createElement("th");
        medalHeader.className = `medal-col medal-col-${i}` + (i === 1 ? " medal-col-first" : "");
        let label = `${i}th medals`;
        if (i === 1) label = "1sts";
        else if (i === 2) label = "2nds";
        else if (i === 3) label = "3rds";
        else if (i === 4) label = "4ths";
        else if (i === 5) label = "5ths";
        else if (i === 6) label = "6ths";
        else if (i === 7) label = "7ths";
        else if (i === 8) label = "8ths";
        else if (i === 9) label = "9ths";
        else if (i === 10) label = "10ths";
        medalHeader.textContent = label;
        columnRow.appendChild(medalHeader);
      }
    }
  });
  thead.appendChild(columnRow);

  const tbody = document.createElement("tbody");
  for (let rowIndex = 0; rowIndex < state.options.teamsShown; rowIndex += 1) {
    const tr = document.createElement("tr");

    sortedEntries.forEach((entry, entryIdx) => {
      const teams = sortTournamentTeams((entry.tournament.teams ?? []).slice()).slice(0, state.options.teamsShown);
      const team = teams[rowIndex];

      // Team columns for this tournament
      const teamCell = document.createElement("td");
      teamCell.className = "team";
      const teamMeta = buildTeamMeta(team);
      const star = state.options.advanced && team && team.earnedBid ? " ✧" : "";
      let fullTeamName = team ? buildTeamName(team) : "";
      if (state.options.suffix && team && team.suffix) {
        fullTeamName += ` ${team.suffix}`;
      }
      const visibleTeamName = truncateName(fullTeamName, state.options.teamNameMax);
      const teamNameClass = team && state.options.advanced && team.earnedBid ? "team-name is-advancing" : "team-name";
      teamCell.innerHTML = `
        <span class="team-primary">
          <span class="${teamNameClass}" title="${escapeHtml(fullTeamName)}">${escapeHtml(visibleTeamName + star)}</span>
        </span>
        ${teamMeta ? `<span class="team-meta">${escapeHtml(teamMeta)}</span>` : ""}
      `;

      const rankCell = document.createElement("td");
      rankCell.className = "rank";
      const rank = team && Number.isFinite(Number(team.rank)) ? Number(team.rank) : rowIndex + 1;
      if (state.options.top3 && rank >= 1 && rank <= state.options.highlightCount) {
        rankCell.setAttribute("data-trophy", String(rank));
      }
      rankCell.innerHTML = `<div>${escapeHtml(String(rank))}</div>`;

      const pointsCell = document.createElement("td");
      pointsCell.className = "total-points";
      pointsCell.innerHTML = `<div>${escapeHtml(String(team && team.points != null ? team.points : "—"))}</div>`;

      tr.appendChild(teamCell);
      tr.appendChild(rankCell);
      tr.appendChild(pointsCell);

      // Medal columns for this tournament (now after points)
      if (state.options.medals) {
        const medalCounts = Array(state.options.medalCountMax).fill(0);
        if (team && Array.isArray(team.placings)) {
          for (const placing of team.placings) {
            if (
              placing &&
              typeof placing.place === "number" &&
              placing.place >= 1 &&
              placing.place <= state.options.medalCountMax &&
              !placing.ex &&
              !placing.dq
            ) {
              medalCounts[placing.place - 1]++;
            }
          }
        }
        for (let i = 0; i < state.options.medalCountMax; i++) {
          const medalCell = document.createElement("td");
          medalCell.className = `medal-col medal-col-${i + 1}` + (i === 0 ? " medal-col-first" : "");
          medalCell.textContent = String(medalCounts[i]);
          tr.appendChild(medalCell);
        }
      }
    });

    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  wrapper.appendChild(table);
  tableRoot.appendChild(wrapper);
}

async function handleFiles(fileList) {
  const files = [...fileList];
  if (!files.length) {
    return;
  }

  try {
    const parser = await loadSciolyFF();

    const parsed = await Promise.all(files.map(async (file) => {
      const text = await readFileAsText(file);

      try {
        const tournament = new parser.Interpreter(text);
        return {
          fileName: file.name,
          tournament: tournament.tournament,
        };
      } catch (error) {
        return {
          fileName: file.name,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }));

    const successes = parsed.filter((entry) => !entry.error);
    const errors = parsed.filter((entry) => entry.error);

    // Merge new successful parses into existing state.files, avoiding duplicate filenames
    const existingNames = new Set(state.files.map((e) => e.fileName));
    successes.forEach((entry) => {
      if (!existingNames.has(entry.fileName)) {
        state.files.push(entry);
        existingNames.add(entry.fileName);
      }
    });

    if (!state.files.length) {
      renderError(errors.map((entry) => `${entry.fileName}: ${entry.error}`).join("\n"));
      statusText.textContent = "Parsing failed";
      if (fileListEl) fileListEl.innerHTML = "";
      return;
    }

    if (errors.length) {
      statusText.textContent = `${state.files.length} loaded, ${errors.length} failed`;
      console.warn("Some files failed to parse", errors);
    }

    render();
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
    statusText.textContent = "Parser unavailable";
  }
}

function bindDropzone() {
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("drag-over");
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
    handleFiles(event.dataTransfer.files).catch((error) => renderError(String(error)));
  });
}

function init() {
  console.info("[app] init() starting");
  bindControls();
  bindDropzone();
  updateOptionState();

  console.info("[app] DOM lookup", {
    exportButtonExists: Boolean(document.getElementById("export-button")),
    exportSectionExists: Boolean(document.getElementById("export-section")),
  });

  fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files).catch((error) => renderError(String(error)));
  });

  const exportButton = document.getElementById("export-button");
  if (exportButton) {
    exportButton.addEventListener("click", (event) => {
      console.info("[export] direct click listener fired");
      handleExportButtonClick(event);
    });
  } else {
    console.error("[app] export button element missing at init");
  }

  const downloadButton = document.getElementById("download-button");
  if (downloadButton) {
    downloadButton.addEventListener("click", (event) => {
      console.info("[download] direct click listener fired");
      handleDownloadButtonClick(event);
    });
  } else {
    console.error("[app] download button element missing at init");
  }
  
    const downloadSVGButton = document.getElementById("download-svg-button");
    if (downloadSVGButton) {
      downloadSVGButton.addEventListener("click", (event) => {
        console.info("[download-svg] direct click listener fired");
        handleDownloadSVGButtonClick(event);
      });
    } else {
      console.error("[app] download SVG button element missing at init");
    }

  console.info("[app] initialized copy-to-clipboard button listener");
  render();
function handleDownloadSVGButtonClick(event) {
  console.info("[download-svg] click handler fired");
  event.preventDefault();
  downloadTableAsSVG().catch((error) => {
    console.error("[download-svg] failure:", error);
    statusText.textContent = "SVG download failed";
    alert("Failed to download table SVG: " + (error instanceof Error ? error.message : String(error)));
  });
}

async function downloadTableAsSVG() {
  console.info("[download-svg] routine started");
  const exportTarget = tableRoot.querySelector("table.combined-results");
  if (!exportTarget) {
    console.warn("[download-svg] No rendered table available to download");
    statusText.textContent = "Upload files first";
    return;
  }

  const downloadSVGButton = document.getElementById("download-svg-button");
  try {
    downloadSVGButton.disabled = true;
    downloadSVGButton.textContent = "Downloading...";
    statusText.textContent = "Preparing SVG download...";

    // Clone the table and inline computed styles
    const clone = exportTarget.cloneNode(true);
    inlineAllStyles(exportTarget, clone);

    // Wrap in SVG foreignObject
    const bbox = exportTarget.getBoundingClientRect();
    const width = Math.ceil(bbox.width);
    const height = Math.ceil(bbox.height);
    const serializer = new XMLSerializer();
    const html = serializer.serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scioly-table.svg";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    statusText.textContent = "SVG downloaded";
    downloadSVGButton.disabled = false;
    downloadSVGButton.textContent = "Download Table as SVG";
  } catch (error) {
    console.error("[download-svg] routine failed:", error);
    statusText.textContent = "SVG download failed";
    alert("Failed to download table SVG: " + (error instanceof Error ? error.message : String(error)));
    downloadSVGButton.disabled = false;
    downloadSVGButton.textContent = "Download Table as SVG";
  }
}

// Recursively copy computed styles from src to dest
function inlineAllStyles(src, dest) {
  if (!(src instanceof Element) || !(dest instanceof Element)) return;
  const computed = window.getComputedStyle(src);
  dest.setAttribute("style", computed.cssText);
  Array.from(src.children).forEach((child, i) => {
    inlineAllStyles(child, dest.children[i]);
  });
}
}

init();