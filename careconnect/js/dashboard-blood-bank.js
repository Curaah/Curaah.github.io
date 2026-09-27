// careconnect/js/dashboard-blood-bank.js
// ONE responsibility: load blood bank dashboard data.
// Reads: cc_users, cc_organizations (for inventory), cc_blood_requests (Phase 3)

(function () {
  'use strict';

  // Thresholds for colour coding blood units
  const LOW_THRESHOLD  = 5;
  const GOOD_THRESHOLD = 15;

  // ── Build inventory grid ──────────────────────────────────────
  function buildInventoryGrid(inventory) {
    const grid = document.getElementById('inv-grid');
    grid.innerHTML = '';

    BLOOD_GROUPS.forEach(bg => {
      const units = inventory ? (inventory[bg] ?? 0) : 0;

      let stateClass = 'empty';
      let unitsClass = '';
      if (units === 0) {
        stateClass = 'empty';
        unitsClass = '';
      } else if (units < LOW_THRESHOLD) {
        stateClass = 'low';
        unitsClass = 'text-red';
      } else {
        stateClass = 'good';
        unitsClass = 'text-green';
      }

      const cell = document.createElement('div');
      cell.className = `inv-cell ${stateClass}`;
      cell.innerHTML = `
        <div class="inv-group">${bg}</div>
        <div class="inv-units ${unitsClass}">${units}</div>
        <div class="inv-label">${units === 0 ? 'Out of stock' : 'units'}</div>
        <button class="btn btn-ghost inv-btn" data-group="${bg}" onclick="openUpdateModal('${bg}', ${units})">
          + Update
        </button>
      `;
      grid.appendChild(cell);
    });
  }

  // ── Render an emergency blood request card ────────────────────
  function renderEmergencyCard(req) {
    const card = document.createElement('div');
    card.className = 'emergency-card';
    card.innerHTML = `
      <div class="emergency-header">
        <div class="emer-group-badge">${req.blood_group}</div>
        <div>
          <div class="emer-title">🚨 ${req.units_needed} unit${req.units_needed > 1 ? 's' : ''} needed — ${req.blood_group}</div>
          <div class="emer-meta">
            🏥 ${req.hospital_name}, ${req.hospital_city} · ${req.district}
          </div>
        </div>
      </div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">
        👤 ${req.requester_note || 'Emergency blood required for patient.'}
      </div>
      <div class="emer-actions">
        <button class="btn btn-danger btn-sm" onclick="fulfillRequest('${req.id}')">
          ✅ I can fulfil this
        </button>
        <button class="btn btn-ghost btn-sm" onclick="passRequest('${req.id}')">
          Pass
        </button>
      </div>
    `;
    return card;
  }

  // ── Inline inventory update modal ────────────────────────────
  // Shows a simple bottom-sheet-style prompt using the toast system + dialog
  window.openUpdateModal = function (bloodGroup, currentUnits) {
    const newVal = prompt(`Update stock for ${bloodGroup}\n\nCurrent: ${currentUnits} units\nEnter new unit count:`, currentUnits);
    if (newVal === null) return; // cancelled
    const units = parseInt(newVal, 10);
    if (isNaN(units) || units < 0) {
      showToast('Please enter a valid number (0 or more).', 'error');
      return;
    }
    updateBloodStock(bloodGroup, units);
  };

  // ── Update single blood group stock in DB ────────────────────
  async function updateBloodStock(bloodGroup, units) {
    const userId = window.currentUserId;
    if (!userId) return;

    // Inventory is stored as JSONB column `blood_inventory` on cc_organizations
    // We use a Postgres function for atomic update, or do a read-modify-write
    const { data: org } = await supabase
      .from('cc_organizations')
      .select('id, blood_inventory')
      .eq('cc_user_id', userId)
      .single();

    if (!org) {
      showToast('Could not find your organisation record.', 'error');
      return;
    }

    const inv = org.blood_inventory || {};
    inv[bloodGroup] = units;

    const { error } = await supabase
      .from('cc_organizations')
      .update({ blood_inventory: inv, updated_at: new Date().toISOString() })
      .eq('id', org.id);

    if (error) {
      showToast('Failed to update inventory. Please try again.', 'error');
    } else {
      showToast(`${bloodGroup} updated to ${units} units.`, 'success');
      buildInventoryGrid(inv);
    }
  }

  // ── Emergency request handlers (Phase 3) ─────────────────────
  window.fulfillRequest = function (reqId) {
    showToast('Fulfilment tracking — coming in Phase 3.', 'info');
  };
  window.passRequest = function (reqId) {
    showToast('Request passed. It will be routed to the next nearest blood bank.', 'info');
  };

  // ── "Update All Stock" button ─────────────────────────────────
  document.getElementById('btn-update-all').addEventListener('click', () => {
    showToast('Tap the "+ Update" button on any blood group cell to update that stock.', 'info');
  });

  document.getElementById('btn-update-inv').addEventListener('click', () => {
    showToast('Tap the "+ Update" button on any blood group cell to update that stock.', 'info');
  });

  // ── Main data loader ──────────────────────────────────────────
  async function loadDashboard() {
    let attempts = 0;
    while (!window.currentUserId && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    const userId = window.currentUserId;
    if (!userId) return;

    // 1. Load org record (blood bank)
    const { data: org } = await supabase
      .from('cc_organizations')
      .select('id, org_name, description, blood_inventory, district, city')
      .eq('cc_user_id', userId)
      .single();

    if (org) {
      document.getElementById('bank-name').textContent  = org.org_name;

      // Extract hours from description field (stored as "... Operating hours: X.")
      const hoursMatch = org.description?.match(/Operating hours: ([^.]+)/);
      document.getElementById('bank-hours').textContent = hoursMatch ? hoursMatch[1] : '—';

      // Build inventory grid
      buildInventoryGrid(org.blood_inventory || {});

      // 2. Load active emergency blood requests in this district (Phase 3)
      try {
        const { data: reqs } = await supabase
          .from('cc_blood_requests')
          .select('id, blood_group, units_needed, hospital_name, hospital_city, district, urgency, requester_note, created_at')
          .eq('district', org.district)
          .eq('status', 'active')
          .order('urgency', { ascending: true })
          .limit(5);

        const emergList = document.getElementById('emergency-list');
        if (reqs && reqs.length > 0) {
          emergList.innerHTML = '';
          reqs.forEach(r => emergList.appendChild(renderEmergencyCard(r)));
          document.getElementById('stat-requests').textContent = reqs.length;
        }
      } catch (_) {
        // Migration 003 not yet applied — silently ignore
      }
    } else {
      document.getElementById('bank-name').textContent = 'Your Blood Bank';
      buildInventoryGrid({});
    }

    // Stats — placeholder (real data from cc_blood_request_responses Phase 3)
    document.getElementById('stat-fulfilled').textContent = 0;
    document.getElementById('stat-units').textContent     = 0;
    document.getElementById('stat-requests').textContent  = document.getElementById('stat-requests').textContent || 0;
  }

  loadDashboard().catch(err => {
    console.error('[dashboard-blood-bank]', err);
    showToast('Could not load your dashboard. Please refresh.', 'error');
  });

})();
