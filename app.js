const state = {
  files: [],
  options: {
    city: false,
    state: false,
    number: false,
    advanced: true,
    top3: true,
  },
};

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const tableRoot = document.getElementById("tables");
const fileCount = document.getElementById("file-count");
const statusText = document.getElementById("status-text");
const template = document.getElementById("tournament-template");

const optionInputs = {
  city: document.getElementById("toggle-city"),
  state: document.getElementById("toggle-state"),
  number: document.getElementById("toggle-number"),
  advanced: document.getElementById("toggle-advanced"),
  top3: document.getElementById("toggle-top3"),
};

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

function updateOptionState() {
  Object.entries(optionInputs).forEach(([key, input]) => {
    state.options[key] = input.checked;
  });
}

function bindControls() {
  Object.values(optionInputs).forEach((input) => {
    input.addEventListener("change", () => {
      updateOptionState();
      render();
    });
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

function tournamentLabel(tournament, fileName) {
  return (
    tournament.shortName ||
    tournament.name ||
    fileName.replace(/\.[^.]+$/, "")
  );
}

function buildTeamName(team) {
  return abbreviateHighSchool(team.school);
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

function getTournamentDetails(tournament) {
  const dateValue = tournament.date || tournament.startDate || tournament.endDate || tournament.awardsDate;
  return [
    tournament.location ? `Location: ${escapeHtml(tournament.location)}` : "Location: —",
    `Date: ${escapeHtml(formatDate(dateValue))}`,
    tournament.division ? `Division: ${escapeHtml(tournament.division)}` : "Division: —",
    tournament.level ? `Level: ${escapeHtml(tournament.level)}` : "Level: —",
  ].join(" • ");
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
  tableRoot.innerHTML = `<div class="card upload-panel status-error">${escapeHtml(message)}</div>`;
}

function getTournamentSortValue(tournament) {
  const dateValue = tournament.startDate || tournament.date || tournament.endDate || tournament.awardsDate;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

function render() {
  fileCount.textContent = String(state.files.length);

  if (!state.files.length) {
    tableRoot.innerHTML = `<div class="card upload-panel"><strong>Load one or more SciolyFF .yaml files to see tournament tables.</strong></div>`;
    statusText.textContent = "Waiting for upload";
    return;
  }

  tableRoot.innerHTML = "";
  statusText.textContent = `${state.files.length} tournament${state.files.length === 1 ? "" : "s"} loaded`;

  const sortedEntries = [...state.files].sort((left, right) => {
    return getTournamentSortValue(left.tournament) - getTournamentSortValue(right.tournament);
  });

  const table = document.createElement("table");
  table.className = "results-table combined-table card";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headerRow = document.createElement("tr");
  sortedEntries.forEach((entry) => {
    const tournament = entry.tournament;
    const th = document.createElement("th");
    th.colSpan = 3;
    th.className = "tournament-group-header";
    th.innerHTML = `
      <div class="tournament-title-line">${escapeHtml(tournamentLabel(tournament, entry.fileName))}</div>
      <div class="tournament-meta-line">${escapeHtml(getTournamentDetails(tournament))}</div>
    `;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const columnRow = document.createElement("tr");
  sortedEntries.forEach(() => {
    ["Team Name", "Rank", "Total Points"].forEach((label, index) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.className = index === 0 ? "col-team" : index === 1 ? "col-rank" : "col-points";
      columnRow.appendChild(th);
    });
  });
  thead.appendChild(columnRow);

  const maxRows = 20;
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const tr = document.createElement("tr");
    sortedEntries.forEach((entry) => {
      const tournament = entry.tournament;
      const teams = (tournament.teams ?? []).slice(0, 20);
      const team = teams[rowIndex];

      if (!team) {
        ["team-cell", "rank-cell", "points-cell"].forEach((className, columnIndex) => {
          const emptyCell = document.createElement("td");
          emptyCell.className = `${className} empty-row`;
          emptyCell.textContent = columnIndex === 0 ? "No more teams" : "";
          tr.appendChild(emptyCell);
        });
        return;
      }

      const rank = team.rank ?? rowIndex + 1;
      const rowClasses = [
        rank <= 3 && state.options.top3 ? `rank-${rank}` : "",
        rank <= 3 && state.options.top3 ? "top-3" : "",
      ].filter(Boolean).join(" ");

      const teamMeta = buildTeamMeta(team);
      const star = state.options.advanced && team.earnedBid ? " ✧" : "";

      if (rowClasses) {
        tr.className = rowClasses;
      }

      const teamCell = document.createElement("td");
      teamCell.className = "team-cell";
      teamCell.innerHTML = `
        <div class="team-primary">
          <span class="team-name">${escapeHtml(buildTeamName(team) + star)}</span>
        </div>
        ${teamMeta ? `<div class="team-meta">${escapeHtml(teamMeta)}</div>` : ""}
      `;

      const rankCell = document.createElement("td");
      rankCell.className = "rank-cell";
      rankCell.textContent = String(rank);

      const pointsCell = document.createElement("td");
      pointsCell.className = "points-cell";
      pointsCell.textContent = team.points ?? "—";

      tr.appendChild(teamCell);
      tr.appendChild(rankCell);
      tr.appendChild(pointsCell);
    });
    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  tableRoot.appendChild(table);
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
  bindControls();
  bindDropzone();
  updateOptionState();

  fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files).catch((error) => renderError(String(error)));
  });

  render();
}

init();