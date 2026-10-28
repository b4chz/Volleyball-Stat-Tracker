// app.js

// initial team data
const DEFAULT_TEAM_DATA = {
  activeTeamId: "team_default",
  teams: {
    "team_default": {
      id: "team_default",
      name: "Default Team",
      roster: [
        { num: "4", name: "Player 1" },
        { num: "2", name: "Player 2" },
        { num: "5", name: "Player 3" },
        { num: "12", name: "Player 4" },
        { num: "8", name: "Player 5" },
        { num: "15", name: "Player 6" },
        { num: "1", name: "Libero" }
      ],
      startingLineup: { 1: "4", 2: "2", 3: "5", 4: "12", 5: "8", 6: "15", libero: "1" }
    }
  }
};

// global state
let appTeamsData = loadAllTeamsFromStorage();
let activeTeamId = appTeamsData.activeTeamId;
let teamRoster = appTeamsData.teams[activeTeamId].roster;
let defaultStartingLineup = appTeamsData.teams[activeTeamId].startingLineup;

let court = { 1: "4", 2: "2", 3: "5", 4: "12", 5: "8", 6: "15" };
let liberoNumber = "1";
let activeLiberoSubPos = null;
let originalPlayerBeforeLibero = null;

let matchId = Date.now().toString();
let statLogs = [];
let currentPosSelected = null;

// load team from data set
function loadAllTeamsFromStorage() {
  const stored = localStorage.getItem('vb_app_teams_data');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.error(e); }
  }
  return DEFAULT_TEAM_DATA;
}

// team to browser storage
function saveAllTeamsToStorage() {
  appTeamsData.activeTeamId = activeTeamId;
  appTeamsData.teams[activeTeamId].roster = teamRoster;
  appTeamsData.teams[activeTeamId].startingLineup = defaultStartingLineup;
  localStorage.setItem('vb_app_teams_data', JSON.stringify(appTeamsData));
  updateActiveTeamLabel();
}

// initialize active team lineup to court
function applyActiveTeamLineupToCourt() {
  for (let pos = 1; pos <= 6; pos++) {
    court[pos] = defaultStartingLineup[pos] || "1";
  }
  liberoNumber = defaultStartingLineup.libero || "1";
  activeLiberoSubPos = null;
  updateCourtGUI();
}

// lookup player name
function getPlayerName(num) {
  const match = teamRoster.find(p => p.num === num);
  return match ? match.name : "";
}

// court circle gui
function updateCourtGUI() {
  for (let pos = 1; pos <= 6; pos++) {
    const circleEl = document.getElementById(`circle-${pos}`);
    const nodeEl = document.getElementById(`node-${pos}`);
    const playerNum = court[pos];
    const playerName = getPlayerName(playerNum);
    const isLibero = (playerNum === liberoNumber);

    if (nodeEl) {
      if (isLibero) {
        nodeEl.className = "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-950/90 border-2 border-indigo-400 flex flex-col items-center justify-center shadow-xl group-hover:scale-105 transition relative";
      } else if (pos === 1) {
        nodeEl.className = "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-950/85 border-2 border-emerald-400 flex flex-col items-center justify-center shadow-xl group-hover:scale-105 transition relative";
      } else if (pos <= 4) {
        nodeEl.className = "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-950/85 border-2 border-amber-400 flex flex-col items-center justify-center shadow-xl group-hover:scale-105 transition relative";
      } else {
        nodeEl.className = "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-950/85 border-2 border-slate-300 flex flex-col items-center justify-center shadow-xl group-hover:scale-105 transition relative";
      }
    }

    if (circleEl) {
      circleEl.innerHTML = `
        <span class="text-xs sm:text-sm ${isLibero ? 'text-indigo-300' : 'text-white'} font-black leading-none">#${playerNum}</span>
        <span class="text-[8px] sm:text-[9px] text-slate-200 font-bold truncate max-w-[48px] leading-tight mt-0.5">${playerName}</span>
      `;
    }
  }
  const liberoDisplay = document.getElementById('liberoStatusDisplay');
  if (liberoDisplay) {
    liberoDisplay.innerText = `Active Libero: #${liberoNumber} (${getPlayerName(liberoNumber)})`;
  }
}

// rotation handler
function rotateCourt(direction = 'cw') {
  try {
    // 1. Add a sliding transition class to all court nodes before rotating
    for (let pos = 1; pos <= 6; pos++) {
      const nodeEl = document.getElementById(`node-${pos}`);
      if (nodeEl) {
        nodeEl.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
        nodeEl.style.transform = direction === 'cw' ? 'translateY(15px) scale(0.9)' : 'translateY(-15px) scale(0.9)';
        nodeEl.style.opacity = '0.4';
      }
    }

    // 2. Perform rotation data logic after a tiny micro-delay for the exit transition
    setTimeout(() => {
      if (direction === 'cw') {
        const temp1 = court[1];
        court[1] = court[2];
        court[2] = court[3];
        court[3] = court[4];
        court[4] = court[5];
        court[5] = court[6];
        court[6] = temp1;
      } else {
        const temp1 = court[1];
        court[1] = court[6];
        court[6] = court[5];
        court[5] = court[4];
        court[4] = court[3];
        court[3] = court[2];
        court[2] = temp1;
      }

      // Re-render the court GUI with the new player assignments
      updateCourtGUI();

      // 3. Animate nodes sliding smoothly back into place
      for (let pos = 1; pos <= 6; pos++) {
        const nodeEl = document.getElementById(`node-${pos}`);
        if (nodeEl) {
          nodeEl.style.transform = 'translateY(0) scale(1)';
          nodeEl.style.opacity = '1';
        }
      }

      saveCurrentMatchState(false);
    }, 150);

  } catch (err) {
    console.error("Error during rotation animation:", err);
    saveCurrentMatchState(false);
  }
}

// quick libero sub
function toggleLiberoSub(posStr) {
  const pos = parseInt(posStr);
  if (court[pos] === liberoNumber) {
    if (originalPlayerBeforeLibero) {
      court[pos] = originalPlayerBeforeLibero;
      originalPlayerBeforeLibero = null;
    }
    activeLiberoSubPos = null;
  } else {
    originalPlayerBeforeLibero = court[pos];
    court[pos] = liberoNumber;
    activeLiberoSubPos = pos;
  }
  updateCourtGUI();
  saveCurrentMatchState(false);
}

// open stat modal
function openStatModal(pos) {
  currentPosSelected = pos;
  const num = court[pos];
  const name = getPlayerName(num);

  const posTitle = document.getElementById('modalPosTitle');
  const playerTitle = document.getElementById('modalPlayerTitle');
  if (posTitle) posTitle.innerText = `POSITION ${pos}`;
  if (playerTitle) playerTitle.innerText = `#${num} ${name}`;

  renderBenchSubButtons();
  const statModal = document.getElementById('statModal');
  if (statModal) statModal.classList.remove('hidden');
}

function closeStatModal() {
  const statModal = document.getElementById('statModal');
  if (statModal) statModal.classList.add('hidden');
  currentPosSelected = null;
}

// sub button generator
function renderBenchSubButtons() {
  const container = document.getElementById('benchSubContainer');
  if (!container) return;
  container.innerHTML = '';

  teamRoster.forEach(p => {
    const btn = document.createElement('button');
    btn.className = "px-2 py-1 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition";
    btn.innerHTML = `<span class="text-amber-400">#${p.num}</span> <span>${p.name}</span>`;
    btn.onclick = function() { applyDirectSub(p.num); };
    container.appendChild(btn);
  });
}

function applyDirectSub(newNum) {
  if (!currentPosSelected) return;
  court[currentPosSelected] = newNum;
  const playerName = getPlayerName(newNum);
  const playerTitle = document.getElementById('modalPlayerTitle');
  if (playerTitle) playerTitle.innerText = `#${newNum} ${playerName}`;
  updateCourtGUI();
  saveCurrentMatchState(false);
}

// log action/stat
function logStat(type, value) {
  if (!currentPosSelected) return;

  const playerNum = court[currentPosSelected];
  const opponentEl = document.getElementById('opponentInput');
  const setEl = document.getElementById('setSelect');

  const opponent = opponentEl ? opponentEl.value : 'Opponent';
  const setVal = setEl ? setEl.value : '1';

  const entry = {
    timestamp: new Date().toISOString(),
    opponent: opponent,
    set: setVal,
    player: playerNum,
    position: currentPosSelected,
    type: type,
    value: value
  };

  statLogs.push(entry);
  saveCurrentMatchState(false);
  updateBoxScore();
  closeStatModal();
}

// update summary box score table
function updateBoxScore() {
  const tbody = document.getElementById('boxScoreTbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const statsMap = {};

  teamRoster.forEach(p => {
    statsMap[p.num] = { kills: 0, errors: 0, serves: [], digs: 0, blocks: 0, passes: [] };
  });

  statLogs.forEach(log => {
    if (!statsMap[log.player]) {
      statsMap[log.player] = { kills: 0, errors: 0, serves: [], digs: 0, blocks: 0, passes: [] };
    }
    const s = statsMap[log.player];
    if (log.type === 'Attack' && log.value === 'Kill') s.kills++;
    if (log.type === 'Attack' && log.value === 'Error') s.errors++;
    if (log.type === 'Serve') s.serves.push(Number(log.value));
    if (log.type === 'Defense' && log.value === 'Dig') s.digs++;
    if (log.type === 'Block') s.blocks++;
    if (log.type === 'Pass') s.passes.push(Number(log.value));
  });

  Object.keys(statsMap).forEach(num => {
    const s = statsMap[num];
    const pName = getPlayerName(num);
    const serveAvg = s.serves.length > 0 ? (s.serves.reduce((a, b) => a + b, 0) / s.serves.length).toFixed(2) : '-';
    const passAvg = s.passes.length > 0 ? (s.passes.reduce((a, b) => a + b, 0) / s.passes.length).toFixed(2) : '-';

    // Format individual serve and pass logs into scrollable chips/text
    const servesListStr = s.serves.length > 0 ? s.serves.join(', ') : '-';
    const passesListStr = s.passes.length > 0 ? s.passes.join(', ') : '-';

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-800/50 transition";
    tr.innerHTML = `
      <td class="py-1.5 px-1 font-bold text-amber-400">#${num}</td>
      <td class="py-1.5 px-1 font-semibold text-white">${pName}</td>
      <td class="py-1.5 px-1">${s.kills}</td>
      <td class="py-1.5 px-1 text-rose-400">${s.errors}</td>
      <td class="py-1.5 px-1 text-emerald-400 font-bold">${serveAvg}</td>
      <td class="py-1.5 px-1">
        <div class="overflow-x-auto max-w-[120px] whitespace-nowrap text-emerald-300 font-mono text-[11px] pb-0.5">
          ${servesListStr}
        </div>
      </td>
      <td class="py-1.5 px-1">${s.digs}</td>
      <td class="py-1.5 px-1">${s.blocks}</td>
      <td class="py-1.5 px-1 font-bold text-amber-300">${passAvg}</td>
      <td class="py-1.5 px-1">
        <div class="overflow-x-auto max-w-[120px] whitespace-nowrap text-amber-200 font-mono text-[11px] pb-0.5">
          ${passesListStr}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// team manager modal
function openTeamManagerModal() {
  renderTeamsList();
  const modal = document.getElementById('teamManagerModal');
  if (modal) modal.classList.remove('hidden');
}

function closeTeamManagerModal() {
  const modal = document.getElementById('teamManagerModal');
  if (modal) modal.classList.add('hidden');
}

function renderTeamsList() {
  const container = document.getElementById('savedTeamsContainer');
  if (!container) return;
  container.innerHTML = '';

  Object.values(appTeamsData.teams).forEach(team => {
    const isActive = team.id === activeTeamId;
    const card = document.createElement('div');
    card.className = `flex items-center justify-between p-3 rounded-lg border transition ${
      isActive ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
    }`;

    card.innerHTML = `
      <div class="flex items-center gap-2.5">
        <i class="fa-solid ${isActive ? 'fa-circle-check text-amber-400' : 'fa-circle text-slate-600'} text-sm"></i>
        <div>
          <div class="font-bold text-sm ${isActive ? 'text-amber-400' : 'text-white'}">${team.name}</div>
          <div class="text-[11px] text-slate-400">${team.roster.length} Players Registered</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${!isActive ? `<button onclick="switchActiveTeam('${team.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded text-xs font-bold">Select</button>` : '<span class="text-xs font-black text-amber-400 uppercase tracking-wider px-2">Active</span>'}
        ${Object.keys(appTeamsData.teams).length > 1 ? `<button onclick="deleteTeam('${team.id}')" class="p-1.5 text-slate-500 hover:text-red-400 transition"><i class="fa-solid fa-trash-can text-xs"></i></button>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function createNewTeam() {
  const nameInput = document.getElementById('newTeamNameInput');
  if (!nameInput) return;
  const teamName = nameInput.value.trim();

  if (!teamName) {
    alert("Please enter a valid team name.");
    return;
  }

  const newId = 'team_' + Date.now();
  appTeamsData.teams[newId] = {
    id: newId,
    name: teamName,
    roster: [
      { num: "1", name: "Player 1" },
      { num: "2", name: "Player 2" },
      { num: "3", name: "Player 3" },
      { num: "4", name: "Player 4" },
      { num: "5", name: "Player 5" },
      { num: "6", name: "Player 6" },
      { num: "7", name: "Libero" }
    ],
    startingLineup: { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", libero: "7" }
  };

  nameInput.value = '';
  switchActiveTeam(newId);
}

function switchActiveTeam(teamId) {
  if (!appTeamsData.teams[teamId]) return;

  activeTeamId = teamId;
  teamRoster = appTeamsData.teams[teamId].roster;
  defaultStartingLineup = appTeamsData.teams[teamId].startingLineup;

  saveAllTeamsToStorage();
  applyActiveTeamLineupToCourt();
  renderTeamsList();
  updateBoxScore();
}

function deleteTeam(teamId) {
  if (Object.keys(appTeamsData.teams).length <= 1) {
    alert("You must keep at least one team.");
    return;
  }

  const teamName = appTeamsData.teams[teamId].name;
  if (!confirm(`Are you sure you want to delete "${teamName}"?`)) return;

  delete appTeamsData.teams[teamId];

  if (activeTeamId === teamId) {
    activeTeamId = Object.keys(appTeamsData.teams)[0];
    teamRoster = appTeamsData.teams[activeTeamId].roster;
    defaultStartingLineup = appTeamsData.teams[activeTeamId].startingLineup;
  }

  saveAllTeamsToStorage();
  applyActiveTeamLineupToCourt();
  renderTeamsList();
  updateBoxScore();
}

function updateActiveTeamLabel() {
  const currentTeam = appTeamsData.teams[activeTeamId];
  const label = document.getElementById('activeTeamDisplayLabel');
  if (label && currentTeam) {
    label.innerText = `Team: ${currentTeam.name}`;
  }
}

// team setup modal
function openTeamSetupModal() {
  renderRosterEditorInputs();
  populateLineupSelectDropdowns();
  const modal = document.getElementById('teamSetupModal');
  if (modal) modal.classList.remove('hidden');
}

function closeTeamSetupModal() {
  const modal = document.getElementById('teamSetupModal');
  if (modal) modal.classList.add('hidden');
}

function renderRosterEditorInputs() {
  const container = document.getElementById('rosterInputsList');
  if (!container) return;
  container.innerHTML = '';

  teamRoster.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = "flex items-center gap-2";
    row.innerHTML = `
      <input type="text" placeholder="#" value="${p.num}" class="roster-num-input w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-400 font-bold focus:outline-none">
      <input type="text" placeholder="Player Name" value="${p.name}" class="roster-name-input flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-bold focus:outline-none">
      <button onclick="removeRosterRow(${idx})" class="p-1 text-slate-500 hover:text-rose-400 transition"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(row);
  });
}

function addRosterRow() {
  teamRoster.push({ num: "", name: "" });
  renderRosterEditorInputs();
}

function removeRosterRow(idx) {
  teamRoster.splice(idx, 1);
  renderRosterEditorInputs();
  populateLineupSelectDropdowns();
}

function populateLineupSelectDropdowns() {
  const numInputs = document.querySelectorAll('.roster-num-input');
  const nameInputs = document.querySelectorAll('.roster-name-input');
  const tempRoster = [];

  numInputs.forEach((numEl, i) => {
    if (numEl.value.trim() !== '') {
      tempRoster.push({ num: numEl.value.trim(), name: nameInputs[i].value.trim() });
    }
  });

  const positions = [1, 2, 3, 4, 5, 6, 'libero'];

  positions.forEach(pos => {
    const select = document.getElementById(`lineup-select-${pos}`);
    if (!select) return;
    select.innerHTML = '';

    tempRoster.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.num;
      opt.innerText = `#${p.num} ${p.name}`;
      if (defaultStartingLineup[pos] === p.num) opt.selected = true;
      select.appendChild(opt);
    });
  });
}

function saveTeamSetup() {
  const numInputs = document.querySelectorAll('.roster-num-input');
  const nameInputs = document.querySelectorAll('.roster-name-input');
  const updatedRoster = [];

  numInputs.forEach((numEl, i) => {
    const num = numEl.value.trim();
    const name = nameInputs[i].value.trim();
    if (num !== '') {
      updatedRoster.push({ num, name });
    }
  });

  teamRoster = updatedRoster;

  const positions = [1, 2, 3, 4, 5, 6, 'libero'];
  positions.forEach(pos => {
    const select = document.getElementById(`lineup-select-${pos}`);
    if (select && select.value) {
      defaultStartingLineup[pos] = select.value;
    }
  });

  saveAllTeamsToStorage();
  applyActiveTeamLineupToCourt();
  updateBoxScore();
  closeTeamSetupModal();
}

// match state persistence
function saveCurrentMatchState(isUIOnly = false) {
  const opponentInput = document.getElementById('opponentInput');
  const setSelect = document.getElementById('setSelect');

  const state = {
    court,
    liberoNumber,
    matchId,
    statLogs,
    opponent: opponentInput ? opponentInput.value : 'Opponent',
    set: setSelect ? setSelect.value : '1'
  };
  localStorage.setItem('vb_live_match_state', JSON.stringify(state));
}

function loadSavedMatchState() {
  const saved = localStorage.getItem('vb_live_match_state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (state.court) court = state.court;
      if (state.liberoNumber) liberoNumber = state.liberoNumber;
      if (state.matchId) matchId = state.matchId;
      if (state.statLogs) statLogs = state.statLogs;
      
      const opponentInput = document.getElementById('opponentInput');
      const setSelect = document.getElementById('setSelect');
      if (state.opponent && opponentInput) opponentInput.value = state.opponent;
      if (state.set && setSelect) setSelect.value = state.set;
    } catch (e) { console.error(e); }
  }
}

function startNewGame() {
  if (!confirm("Start a new game? This will reset the live court to your active team's starting lineup.")) return;
  matchId = Date.now().toString();
  statLogs = [];
  applyActiveTeamLineupToCourt();
  saveCurrentMatchState(false);
  updateBoxScore();
}

function exportCSV() {
  if (statLogs.length === 0) {
    alert("No logged stats to export yet.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Timestamp,Opponent,Set,PlayerNum,PlayerName,CourtPosition,StatType,RatingValue\n";
  
  statLogs.forEach(row => {
    const pName = getPlayerName(row.player);
    csvContent += `${row.timestamp},${row.opponent},${row.set},${row.player},"${pName}",${row.position},${row.type},${row.value}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const opponentInput = document.getElementById('opponentInput');
  const setSelect = document.getElementById('setSelect');
  const oppName = opponentInput ? opponentInput.value : 'Opponent';
  const setName = setSelect ? setSelect.value : '1';
  link.setAttribute("download", `vb_stats_${oppName}_Set${setName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// initialization on page load
document.addEventListener('DOMContentLoaded', () => {
  updateActiveTeamLabel();
  loadSavedMatchState();
  updateCourtGUI();
  updateBoxScore();
});