const state = {
  files: [],
  options: {
    location: true,
    date: true,
    division: true,
    level: true,
    state: false,
    suffix: false,
    number: false,
    advanced: true,
    top3: true,
    summary: true,
  },
};

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const tableRoot = document.getElementById("tables");
const fileCount = document.getElementById("file-count");
const statusText = document.getElementById("status-text");
const template = document.getElementById("tournament-template");

const optionInputs = {
  location: document.getElementById("toggle-location"),
  date: document.getElementById("toggle-date"),
  division: document.getElementById("toggle-division"),
  level: document.getElementById("toggle-level"),
  state: document.getElementById("toggle-state"),
  suffix: document.getElementById("toggle-suffix"),
  number: document.getElementById("toggle-number"),
  advanced: document.getElementById("toggle-advanced"),
  top3: document.getElementById("toggle-top3"),
  summary: document.getElementById("toggle-summary"),
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
  const parts = [team.school];
  if (team.suffix) {
    parts.push(team.suffix);
  }
  return parts.join(" ");
}

function buildTeamMeta(team) {
  const meta = [];
  if (state.options.number) {
    meta.push(`#${team.number}`);
  }
  if (state.options.state && team.state) {
    meta.push(team.state);
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
  const details = [];
  if (state.options.location && tournament.location) {
    details.push(`<div><strong>Location:</strong> ${escapeHtml(tournament.location)}</div>`);
  }
  if (state.options.date) {
    const dateValue = tournament.date || tournament.startDate || tournament.endDate || tournament.awardsDate;
    details.push(`<div><strong>Date:</strong> ${formatDate(dateValue)}</div>`);
  }
  if (state.options.division && tournament.division) {
    details.push(`<div><strong>Division:</strong> ${escapeHtml(tournament.division)}</div>`);
  }
  if (state.options.level && tournament.level) {
    details.push(`<div><strong>Level:</strong> ${escapeHtml(tournament.level)}</div>`);
  }

  return details.join("");
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

function render() {
  fileCount.textContent = String(state.files.length);

  if (!state.files.length) {
    tableRoot.innerHTML = `<div class="card upload-panel"><strong>Load one or more SciolyFF .yaml files to see tournament tables.</strong></div>`;
    statusText.textContent = "Waiting for upload";
    return;
  }

  tableRoot.innerHTML = "";
  statusText.textContent = `${state.files.length} tournament${state.files.length === 1 ? "" : "s"} loaded`;

  state.files.forEach((entry, index) => {
    const clone = template.content.firstElementChild.cloneNode(true);
    const kicker = clone.querySelector(".tournament-kicker");
    const title = clone.querySelector(".tournament-title");
    const badge = clone.querySelector(".tournament-badge");
    const summary = clone.querySelector(".tournament-summary");
    const tbody = clone.querySelector("tbody");

    const tournament = entry.tournament;
    const teams = (tournament.teams ?? []).slice(0, 20);

    kicker.textContent = `Tournament ${index + 1}`;
    title.textContent = tournamentLabel(tournament, entry.fileName);
    badge.textContent = `${tournament.year ?? ""}`.trim() || "SciolyFF";

    summary.innerHTML = state.options.summary ? getTournamentDetails(tournament) : "";

    const rows = [];
    for (let rowIndex = 0; rowIndex < 20; rowIndex += 1) {
      const team = teams[rowIndex];
      if (!team) {
        rows.push(`
          <tr class="empty-row">
            <td colspan="4">No more teams</td>
          </tr>
        `);
        continue;
      }

      const rank = team.rank ?? rowIndex + 1;
      const rowClasses = [
        rank <= 3 && state.options.top3 ? `rank-${rank}` : "",
        rank <= 3 && state.options.top3 ? "top-3" : "",
      ].filter(Boolean).join(" ");

      const teamMeta = buildTeamMeta(team);
      const star = state.options.advanced && team.earnedBid ? "★" : "";

      rows.push(`
        <tr class="${rowClasses}">
          <td class="rank-cell">${escapeHtml(rank)}</td>
          <td class="team-cell">
            <div class="team-primary">
              <span class="team-name">${escapeHtml(buildTeamName(team))}</span>
            </div>
            ${teamMeta ? `<div class="team-meta">${escapeHtml(teamMeta)}</div>` : ""}
          </td>
          <td class="points-cell">${team.points ?? "—"}</td>
          <td class="star-cell">${star}</td>
        </tr>
      `);
    }

    tbody.innerHTML = rows.join("");
    tableRoot.appendChild(clone);
  });
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