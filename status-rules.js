const SR_LEGACY_STATUS = 'Candidature reçue / en cours';
const SR_WAITING_STATUS = 'En cours — attente de réponse (<15 jours)';
const SR_ACTIVE_STATUS = 'Active — processus engagé';
const SR_NO_RESPONSE_STATUS = 'Aucune réponse';
const SR_DAY_LIMIT = 15;

function srConfigureStatuses() {
  const legacyIndex = CONFIG.statusCounts.findIndex(([status]) => status === SR_LEGACY_STATUS);
  if (legacyIndex >= 0) CONFIG.statusCounts[legacyIndex] = [SR_WAITING_STATUS, CONFIG.statusCounts[legacyIndex][1]];
  if (!CONFIG.statusCounts.some(([status]) => status === SR_ACTIVE_STATUS)) {
    CONFIG.statusCounts.push([SR_ACTIVE_STATUS, 0]);
  }
}

function srParseDisplayDate(value) {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

function srDaysSince(value) {
  const parsed = srParseDisplayDate(value);
  if (!parsed) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const applicationUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
  return Math.floor((todayUtc - applicationUtc) / 86400000);
}

function srActionForStatus(status) {
  if (status === SR_WAITING_STATUS) return 'Attendre la réponse / bascule automatique à J+15';
  if (status === SR_ACTIVE_STATUS) return 'Suivre le processus de recrutement';
  if (status === SR_NO_RESPONSE_STATUS) return 'Relancer si poste prioritaire';
  return 'Archiver / capitaliser';
}

function srApplyStatusRules() {
  let changed = false;

  applications.forEach(application => {
    let nextStatus = application.status;

    if (nextStatus === SR_LEGACY_STATUS) {
      nextStatus = Number(application.steps || 0) > 0 ? SR_ACTIVE_STATUS : SR_WAITING_STATUS;
    }

    if (nextStatus === SR_WAITING_STATUS) {
      const age = srDaysSince(application.date);
      if (age !== null && age >= SR_DAY_LIMIT) nextStatus = SR_NO_RESPONSE_STATUS;
    }

    const nextAction = srActionForStatus(nextStatus);
    if (application.status !== nextStatus || application.action !== nextAction) {
      application.status = nextStatus;
      application.action = nextAction;
      changed = true;
    }
  });

  return changed;
}

srConfigureStatuses();
cmActionForStatus = srActionForStatus;

const srBaseOpenModal = cmOpenModal;
cmOpenModal = function(applicationId = '') {
  srBaseOpenModal(applicationId);
  if (!applicationId) {
    const statusField = document.querySelector('#candidate-status-field');
    if (statusField) statusField.value = SR_WAITING_STATUS;
  }
};

const srBaseRefreshViews = cmRefreshViews;
cmRefreshViews = function() {
  const changed = srApplyStatusRules();
  if (changed) cmSaveApplications();
  srBaseRefreshViews();
};

const srBaseRenderCandidatures = renderCandidatures;
renderCandidatures = function() {
  srBaseRenderCandidatures();

  const intro = document.querySelector('#candidatures .page-title p');
  if (intro) {
    intro.insertAdjacentHTML('beforeend', ' <strong>Règle active :</strong> une candidature sans réponse passe automatiquement en « Aucune réponse » à partir de J+15.');
  }

  document.querySelectorAll('#candidatures .status-pill').forEach(pill => {
    const text = pill.textContent.trim();
    pill.classList.remove('open', 'closed', 'silent', 'waiting-process', 'active-process');
    if (text === SR_WAITING_STATUS) pill.classList.add('waiting-process');
    else if (text === SR_ACTIVE_STATUS) pill.classList.add('active-process');
    else if (text === SR_NO_RESPONSE_STATUS) pill.classList.add('silent');
    else pill.classList.add('closed');
  });
};

renderDashboard = function() {
  const total = applications.length;
  const waiting = countWhere(applications, a => a.status === SR_WAITING_STATUS);
  const active = countWhere(applications, a => a.status === SR_ACTIVE_STATUS);
  const noResponse = countWhere(applications, a => a.status === SR_NO_RESPONSE_STATUS);
  const refusals = countWhere(applications, a => String(a.status).startsWith('Refus'));
  const newV31 = countWhere(applications, a => a.source === 'Ajout Gmail V31');
  const statusRows = statusCountsFromData();
  const monthly = monthlyStatsFromData();

  const left = table(['Statut final', 'Nombre', '% base'], [
    ...statusRows.map(([status, number]) => ({ cells: [status, number, formatPct(pct(number, total))] })),
    { __class: 'total', cells: ['TOTAL', total, formatPct(1)] }
  ]);

  const indicators = table(['Indicateur', 'Valeur', 'Lecture'], [
    { cells: ['Total candidatures effectives', total, 'Base active du suivi'] },
    { cells: ['En cours (<15 jours)', waiting, 'En attente d’une première réponse'] },
    { cells: ['Candidatures actives', active, 'Réponse reçue / processus engagé'] },
    { cells: ['Sans réponse', noResponse, '15 jours ou plus sans réponse'] },
    { cells: ['Refus / candidatures closes', refusals, 'Tous refus confondus'] },
    { cells: ['Nouvelles lignes V31', newV31, 'Ajouts simulés V31'] },
    { cells: ['Événements recrutement / contacts', events.length, 'Onglet Entretiens'] },
    { cells: ['Dernière référence Excel', CONFIG.updatedAt, 'Classeur V31'] }
  ], 'table-green');

  const monthTable = table(['Mois', 'Candidatures', 'Événements', 'Taux événement / ligne'], [
    ...monthly.map(([month, appCount, eventCount, ratio]) => ({ cells: [month, appCount, eventCount, formatPct(ratio)] })),
    { __class: 'total', cells: ['TOTAL', total, events.length, formatPct(pct(events.length, total))] }
  ], 'table-orange');

  document.querySelector('#dashboard').innerHTML = `
    <div class="page-title"><h2>Tableau de bord</h2><p>Suivi dynamique des candidatures · règle automatique des ${SR_DAY_LIMIT} jours.</p></div>
    <div class="kpi-grid status-kpis">
      <div class="card kpi"><div class="label">Candidatures</div><div class="value">${total}</div><div class="note">Total de la base active</div></div>
      <div class="card kpi waiting-kpi"><div class="label">En cours</div><div class="value">${waiting}</div><div class="note">Sans réponse depuis moins de ${SR_DAY_LIMIT} jours</div></div>
      <div class="card kpi active-kpi"><div class="label">Actives</div><div class="value">${active}</div><div class="note">Réponse reçue / processus engagé</div></div>
      <div class="card kpi silent-kpi"><div class="label">Sans réponse</div><div class="value">${noResponse}</div><div class="note">${SR_DAY_LIMIT} jours ou plus sans réponse</div></div>
      <div class="card kpi"><div class="label">Événements</div><div class="value">${events.length}</div><div class="note">Calculé depuis Entretiens</div></div>
      <div class="card kpi"><div class="label">Taux événement</div><div class="value">${formatPct(pct(events.length, total))}</div><div class="note">Événements / candidatures</div></div>
    </div>
    <div class="grid-2">
      <div class="card pad"><div class="section-header"><h3>Statuts finaux</h3><small>calculés sur la base active</small></div>${left}</div>
      <div class="card pad"><div class="section-header"><h3>Indicateurs</h3><small>règles métier dynamiques</small></div>${indicators}</div>
    </div>
    <div class="card pad" style="margin-top:18px"><div class="section-header"><h3>Suivi mensuel</h3><small>candidatures et événements</small></div>${monthTable}</div>
    <div class="formula-note"><strong>Règle des 15 jours :</strong> une candidature « En cours » reste dans cette catégorie jusqu’à J+14. À partir de J+15 sans réponse, elle devient automatiquement « Aucune réponse ». Une candidature où le recrutement est engagé doit être classée « Active — processus engagé » et n’est pas concernée par cette bascule.</div>
  `;
};

const srInitialChange = srApplyStatusRules();
if (srInitialChange) cmSaveApplications();
renderDashboard();
renderCandidatures();
renderStatistiques();
renderQualite();

setInterval(() => {
  if (srApplyStatusRules()) {
    cmSaveApplications();
    cmRefreshViews();
  }
}, 60 * 60 * 1000);
