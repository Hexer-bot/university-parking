// Default Parking Bays
const DEFAULT_SLOTS = [
  { id: "A-01", occupied: true, plate: "PB-65-8821", role: "Faculty", entryTime: Date.now() - 3600000 * 2.5 },
  { id: "A-02", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-03", occupied: true, plate: "CH-01-AB-1200", role: "Student", entryTime: Date.now() - 3600000 * 1.2 },
  { id: "A-04", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-05", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-06", occupied: true, plate: "DL-3C-9090", role: "Visitor", entryTime: Date.now() - 3600000 * 0.8 },
  { id: "A-07", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-08", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-09", occupied: true, plate: "HR-03-F-4421", role: "Student", entryTime: Date.now() - 3600000 * 3 },
  { id: "A-10", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-11", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-12", occupied: true, plate: "PB-10-CZ-5511", role: "Faculty", entryTime: Date.now() - 3600000 * 1.5 },
  { id: "A-13", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-14", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-15", occupied: false, plate: null, role: null, entryTime: null },
  { id: "A-16", occupied: false, plate: null, role: null, entryTime: null }
];

let parkingSlots = [];
try {
  parkingSlots = JSON.parse(localStorage.getItem('unipark_v5_slots')) || DEFAULT_SLOTS;
} catch (e) {
  parkingSlots = DEFAULT_SLOTS;
}

let violations = [
  { plate: "DL-04-CA-1122", loc: "Emergency Ambulance Corridor", fine: 1000, time: "10:15 AM" }
];

// Login Handling Functions
function openDashboard() {
  const authScreen = document.getElementById('authScreen');
  const appContainer = document.getElementById('appContainer');

  authScreen.classList.add('d-none');
  appContainer.classList.remove('d-none');

  try {
    sessionStorage.setItem('unipark_logged_in', 'true');
  } catch (e) {}

  renderDashboard();
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const errBox = document.getElementById('loginError');

  if ((u === 'guard01' || u === 'admin') && p === '1234') {
    errBox.style.display = 'none';
    openDashboard();
  } else {
    errBox.style.display = 'block';
  }
}

function forceBypassLogin() {
  openDashboard();
}

function logoutApp() {
  try {
    sessionStorage.removeItem('unipark_logged_in');
  } catch (e) {}

  document.getElementById('authScreen').classList.remove('d-none');
  document.getElementById('appContainer').classList.add('d-none');
}

function persistData() {
  try {
    localStorage.setItem('unipark_v5_slots', JSON.stringify(parkingSlots));
  } catch (e) {}
}

// Navigation Tab Switcher
function navigate(tabId, triggerBtn) {
  document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active-screen'));
  const targetScreen = document.getElementById(tabId);
  if (targetScreen) targetScreen.classList.add('active-screen');

  document.querySelectorAll('.nav-link, .dock-btn').forEach(b => b.classList.remove('active'));
  if (triggerBtn) triggerBtn.classList.add('active');

  const headers = {
    'tab-bays': ['Smart Bay Allocator', 'Manage parking spaces and avoid campus congestion[cite: 3, 9].'],
    'tab-map': ['Campus Telemetry Map', 'Live zone capacity and smart transit overview[cite: 9, 11].'],
    'tab-registry': ['Gate Registry & Clearance', 'Live security checkout and billing log.'],
    'tab-violations': ['Violations & Towing', 'Penalty enforcement and road clearance registry[cite: 3, 11].'],
    'tab-profile': ['Guard Duty Terminal', 'Active officer authentication & gate assignment.']
  };

  if (headers[tabId]) {
    document.getElementById('pageTitle').textContent = headers[tabId][0];
    document.getElementById('pageDesc').textContent = headers[tabId][1];
  }

  renderDashboard();
}

// Master Render
function renderDashboard() {
  renderBayGrid();
  populateSelector();
  renderRegistryTable();
  renderViolationsQueue();
  updateMetrics();
  persistData();
}

function renderBayGrid() {
  const grid = document.getElementById('baysGrid');
  if (!grid) return;
  grid.innerHTML = '';

  parkingSlots.forEach(slot => {
    const card = document.createElement('div');
    card.className = `bay-item ${slot.occupied ? 'busy' : 'free'}`;
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="bay-code">${slot.id}</span>
        <span style="font-size:0.68rem; font-weight:700;">${slot.occupied ? '● IN-USE' : '● FREE'}</span>
      </div>
      <div class="bay-plate-label">${slot.occupied ? slot.plate : 'AVAILABLE'}</div>
    `;

    card.onclick = () => {
      if (slot.occupied) {
        checkoutSlot(slot.id);
      } else {
        document.getElementById('slotSelect').value = slot.id;
        document.getElementById('plateInput').focus();
      }
    };

    grid.appendChild(card);
  });
}

function populateSelector() {
  const sel = document.getElementById('slotSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Choose Free Slot --</option>';
  parkingSlots.filter(s => !s.occupied).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.id} (Free)`;
    sel.appendChild(opt);
  });
}

function renderRegistryTable() {
  const tbody = document.getElementById('registryTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  parkingSlots.filter(s => s.occupied).forEach(s => {
    const hours = Math.max(1, Math.round((Date.now() - (s.entryTime || Date.now())) / 3600000));
    let fee = s.role === 'Student' ? 10 : (s.role === 'Faculty' ? 0 : hours * 30);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color:var(--neon-cyan);">${s.id}</strong></td>
      <td><strong>${s.plate}</strong></td>
      <td>${s.role}</td>
      <td>${new Date(s.entryTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${hours}h (~ ₹${fee})</td>
      <td><button class="btn-exit-cell" onclick="checkoutSlot('${s.id}')">Exit Gate</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderViolationsQueue() {
  const box = document.getElementById('violationsList');
  if (!box) return;
  box.innerHTML = '';
  let fineSum = 0;

  violations.forEach((v, i) => {
    fineSum += parseInt(v.fine);
    const item = document.createElement('div');
    item.style.cssText = 'background:rgba(255,255,255,0.02); border:1px solid rgba(244,63,94,0.3); border-radius:10px; padding:0.8rem; margin-bottom:0.7rem; display:flex; justify-content:space-between; align-items:center;';
    item.innerHTML = `
      <div>
        <strong style="color:var(--neon-rose);">${v.plate}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted);">${v.loc} • ${v.time}</div>
      </div>
      <div>
        <strong>₹${v.fine}</strong>
        <button onclick="clearViolation(${i})" style="background:none; border:none; color:var(--neon-cyan); margin-left:10px; cursor:pointer; font-size:0.75rem;">Clear</button>
      </div>
    `;
    box.appendChild(item);
  });

  const fineMetric = document.getElementById('metricFines');
  if (fineMetric) fineMetric.textContent = '₹' + fineSum;
}

function updateMetrics() {
  const total = parkingSlots.length;
  const occupied = parkingSlots.filter(s => s.occupied).length;
  const free = total - occupied;

  const totalEl = document.getElementById('metricTotal');
  const freeEl = document.getElementById('metricFree');
  const occEl = document.getElementById('metricOccupancy');

  if (totalEl) totalEl.textContent = total;
  if (freeEl) freeEl.textContent = free;
  if (occEl) occEl.textContent = Math.round((occupied / total) * 100) + '%';
}

// Vehicle Check-in
function handleCheckIn(event) {
  event.preventDefault();
  const plate = document.getElementById('plateInput').value.trim().toUpperCase();
  const role = document.getElementById('roleInput').value;
  const slotId = document.getElementById('slotSelect').value;

  if (!slotId) return alert('Select an available bay first!');

  const slot = parkingSlots.find(s => s.id === slotId);
  if (slot) {
    slot.occupied = true;
    slot.plate = plate;
    slot.role = role;
    slot.entryTime = Date.now();
  }

  document.getElementById('ticketBay').textContent = `BAY ${slotId}`;
  document.getElementById('ticketPlate').textContent = plate;
  document.getElementById('ticketMeta').textContent = `${role} • Just Issued`;
  document.getElementById('ticketPass').style.display = 'block';

  document.getElementById('plateInput').value = '';
  renderDashboard();
}

// Checkout Slot
function checkoutSlot(slotId) {
  const slot = parkingSlots.find(s => s.id === slotId);
  if (slot && slot.occupied) {
    if (confirm(`Check-out vehicle ${slot.plate} from ${slot.id} and raise barrier?`)) {
      slot.occupied = false;
      slot.plate = null;
      slot.role = null;
      slot.entryTime = null;
      const pass = document.getElementById('ticketPass');
      if (pass) pass.style.display = 'none';
      renderDashboard();
    }
  }
}

// Report Violation
function handleViolationSubmit(event) {
  event.preventDefault();
  const plate = document.getElementById('vioPlate').value.trim().toUpperCase();
  const loc = document.getElementById('vioLocation').value;
  const fine = document.getElementById('vioFine').value;

  violations.unshift({
    plate,
    loc,
    fine,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  document.getElementById('vioPlate').value = '';
  renderDashboard();
  alert(`Towing alert issued for ${plate}![cite: 11]`);
}

function clearViolation(i) {
  violations.splice(i, 1);
  renderDashboard();
}

function selectMapZone(name) {
  const fb = document.getElementById('mapFeedback');
  if (fb) fb.textContent = `Active Telemetry: ${name}`;
}

function filterRegistryTable() {
  const query = document.getElementById('tableFilter').value.toLowerCase();
  document.querySelectorAll('#registryTableBody tr').forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(query) ? '' : 'none';
  });
}

function resetSlots() {
  if (confirm('Reset matrix to initial defaults?')) {
    parkingSlots = JSON.parse(JSON.stringify(DEFAULT_SLOTS));
    renderDashboard();
  }
}

// Check session on load
window.addEventListener('DOMContentLoaded', () => {
  try {
    if (sessionStorage.getItem('unipark_logged_in') === 'true') {
      openDashboard();
    }
  } catch (e) {}
});
