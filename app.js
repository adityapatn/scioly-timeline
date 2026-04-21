const state = {
  files: [],
  options: {
    city: false,
    state: false,
    number: false,
    advanced: true,
    top3: true,
    location: true,
    date: true,
    division: true,
    level: true,
    teamNameMax: 28,
  },
};

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const tableRoot = document.getElementById("tables");
const fileCount = document.getElementById("file-count");
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
};
const teamNameMaxInput = document.getElementById("team-name-max");

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

function updateOptionState() {
  Object.entries(optionInputs).forEach(([key, input]) => {
    state.options[key] = input.checked;
  });

  const parsed = Number.parseInt(teamNameMaxInput.value, 10);
  state.options.teamNameMax = Number.isFinite(parsed)
    ? Math.min(120, Math.max(8, parsed))
    : 28;
  teamNameMaxInput.value = String(state.options.teamNameMax);
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

function tournamentLabel(tournament) {
  return (
    tournament.name ||
    tournament.shortName ||
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
    lines.push(`Location: ${tournament.location || "—"}`);
  }

  if (state.options.date) {
    lines.push(`Date: ${formatDate(dateValue)}`);
  }

  if (state.options.division) {
    lines.push(tournament.division ? `Division: ${tournament.division}` : "Division: —");
  }

  if (state.options.level) {
    lines.push(tournament.level ? `Level: ${tournament.level}` : "Level: —");
  }

  if (!lines.length) {
    lines.push("No tournament metadata selected");
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
  fileCount.textContent = String(state.files.length);

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
    th.colSpan = 3;
    th.className = "tournament-group-header";
    const metaLines = buildTournamentMeta(entry.tournament)
      .map((line) => `<span>${escapeHtml(line)}</span>`)
      .join("");
    th.innerHTML = `
      <div class="tournament-title">${escapeHtml(tournamentLabel(entry.tournament))}</div>
      <div class="tournament-meta">${metaLines}</div>
    `;
    titleRow.appendChild(th);
  });
  thead.appendChild(titleRow);

  const columnRow = document.createElement("tr");
  columnRow.className = "column-header-row";
  sortedEntries.forEach(() => {
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
  });
  thead.appendChild(columnRow);

  const tbody = document.createElement("tbody");
  for (let rowIndex = 0; rowIndex < 20; rowIndex += 1) {
    const tr = document.createElement("tr");

    sortedEntries.forEach((entry) => {
      const teams = sortTournamentTeams((entry.tournament.teams ?? []).slice()).slice(0, 20);
      const team = teams[rowIndex];

      if (!team) {
        ["team", "rank", "total-points"].forEach((className) => {
          const emptyCell = document.createElement("td");
          emptyCell.className = `${className} empty-row`;
          emptyCell.textContent = "—";
          tr.appendChild(emptyCell);
        });
        return;
      }

      const rank = Number.isFinite(Number(team.rank)) ? Number(team.rank) : rowIndex + 1;

      const teamCell = document.createElement("td");
      teamCell.className = "team";
      const teamMeta = buildTeamMeta(team);
      const star = state.options.advanced && team.earnedBid ? " ✧" : "";
      const fullTeamName = buildTeamName(team);
      const visibleTeamName = truncateName(fullTeamName, state.options.teamNameMax);
      teamCell.innerHTML = `
        <span class="team-primary">
          <span class="team-name" title="${escapeHtml(fullTeamName)}">${escapeHtml(visibleTeamName + star)}</span>
        </span>
        ${teamMeta ? `<span class="team-meta">${escapeHtml(teamMeta)}</span>` : ""}
      `;

      const rankCell = document.createElement("td");
      rankCell.className = "rank";
      if (state.options.top3 && rank >= 1 && rank <= 3) {
        rankCell.setAttribute("data-trophy", String(rank));
      }
      rankCell.innerHTML = `<div>${escapeHtml(String(rank))}</div>`;

      const pointsCell = document.createElement("td");
      pointsCell.className = "total-points";
      pointsCell.innerHTML = `<div>${escapeHtml(String(team.points ?? "—"))}</div>`;

      tr.appendChild(teamCell);
      tr.appendChild(rankCell);
      tr.appendChild(pointsCell);
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

    state.files = parsed.filter((entry) => !entry.error);
    const errors = parsed.filter((entry) => entry.error);

    if (!state.files.length) {
      renderError(errors.map((entry) => `${entry.fileName}: ${entry.error}`).join("\n"));
      statusText.textContent = "Parsing failed";
      fileCount.textContent = "0";
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

  console.info("[app] initialized copy-to-clipboard button listener");
  render();
}

init();