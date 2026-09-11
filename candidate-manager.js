const CM_STORAGE_KEY = 'suivi-candidatures-local-v1';

function cmEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cmDisplayDateToInput(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function cmInputDateToDisplay(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function cmActionForStatus(status) {
  if (status === 'Aucune réponse') return 'Relancer si poste prioritaire';
  if (status === 'Candidature reçue / en cours') return 'Suivre le processus';
  return 'Archiver / capitaliser';
}

function cmLoadSavedApplications() {
  try {
    const raw = localStorage.getItem(CM_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved) && saved.length) applications.splice(0, applications.length, ...saved);
  } catch (error) {
    console.warn('Sauvegarde locale illisible :', error);
  }
}

function cmSaveApplications() {
  localStorage.setItem(CM_STORAGE_KEY, JSON.stringify(applications));
}

function cmRefreshViews() {
  renderDashboard();
  renderCandidatures();
  renderStatistiques();
  renderQualite();
}

monthlyStatsFromData = function() {
  const months = [...new Set([
    ...CONFIG.months.map(([month]) => month),
    ...applications.map(a => a.month).filter(Boolean)
  ])].sort();

  return months.map(month => {
    const appCount = countWhere(applications, a => a.month === month);
    const eventCount = countWhere(events, e => e.month === month);
    return [month, appCount, eventCount, pct(eventCount, appCount)];
  });
};

Object.assign(currentApplicationFilter, {month: 'Tous', source: 'Tous'});

function cmOpenModal(applicationId = '') {
  const modal = document.querySelector('#candidate-modal');
  const form = document.querySelector('#candidate-form');
  if (!modal || !form) return;

  form.reset();
  const existing = applicationId ? applications.find(a => a.id === applicationId) : null;
  document.querySelector('#candidate-modal-title').textContent = existing ? 'Modifier la candidature' : 'Ajouter une candidature';
  document.querySelector('#candidate-id').value = applicationId;
  document.querySelector('#candidate-date').value = existing ? cmDisplayDateToInput(existing.date) : new Date().toISOString().slice(0, 10);
  document.querySelector('#candidate-company').value = existing?.company || '';
  document.querySelector('#candidate-role').value = existing?.role || '';
  document.querySelector('#candidate-family').value = existing?.family || JOB_FAMILIES[0];
  document.querySelector('#candidate-city').value = existing?.city || '';
  document.querySelector('#candidate-department').value = existing?.department || '';
  document.querySelector('#candidate-channel').value = existing?.channel || CHANNELS[0];
  document.querySelector('#candidate-company-type').value = existing?.companyType || CONFIG.companyTypeCounts[0][0];
  document.querySelector('#candidate-contract').value = existing?.contract || CONTRACTS[0];
  document.querySelector('#candidate-salary-min').value = existing?.salaryMin ?? '';
  document.querySelector('#candidate-salary-max').value = existing?.salaryMax ?? '';
  document.querySelector('#candidate-status-field').value = existing?.status || 'Candidature reçue / en cours';
  document.querySelector('#candidate-source').value = existing?.source || 'Saisie manuelle';

  modal.hidden = false;
  document.body.classList.add('modal-open');
  setTimeout(() => document.querySelector('#candidate-company')?.focus(), 0);
}

function cmCloseModal() {
  const modal = document.querySelector('#candidate-modal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('modal-open');
}

function cmSaveCandidate(event) {
  event.preventDefault();
  const id = document.querySelector('#candidate-id').value;
  const index = id ? applications.findIndex(a => a.id === id) : -1;
  const old = index >= 0 ? applications[index] : null;
  const inputDate = document.querySelector('#candidate-date').value;
  const status = document.querySelector('#candidate-status-field').value;

  const record = {
    ...(old || {}),
    id: old?.id || `CAN-LOCAL-${Date.now()}`,
    date: cmInputDateToDisplay(inputDate),
    month: inputDate ? inputDate.slice(0, 7) : '',
    company: document.querySelector('#candidate-company').value.trim(),
    role: document.querySelector('#candidate-role').value.trim(),
    family: document.querySelector('#candidate-family').value,
    city: document.querySelector('#candidate-city').value.trim(),
    department: document.querySelector('#candidate-department').value.trim(),
    channel: document.querySelector('#candidate-channel').value,
    companyType: document.querySelector('#candidate-company-type').value,
    size: old?.size || '',
    activity: old?.activity || '',
    salaryMin: Number(document.querySelector('#candidate-salary-min').value) || 0,
    salaryMax: Number(document.querySelector('#candidate-salary-max').value) || 0,
    contract: document.querySelector('#candidate-contract').value,
    status,
    finalDate: old?.finalDate || '',
    steps: old?.steps || 0,
    lastStep: old?.lastStep || status,
    source: document.querySelector('#candidate-source').value.trim() || 'Saisie manuelle',
    gmailSubject: old?.gmailSubject || '',
    sourceDate: old?.sourceDate || cmInputDateToDisplay(inputDate),
    nature: old?.nature || 'Candidature effective',
    action: cmActionForStatus(status)
  };

  if (!record.date || !record.company || !record.role) return;
  if (index >= 0) applications[index] = record;
  else applications.unshift(record);

  cmSaveApplications();
  cmCloseModal();
  cmRefreshViews();
}

function cmDeleteCandidate(id) {
  const index = applications.findIndex(a => a.id === id);
  if (index < 0) return;
  const item = applications[index];
  if (!window.confirm(`Supprimer la candidature « ${item.company} — ${item.role} » ?`)) return;
  applications.splice(index, 1);
  cmSaveApplications();
  cmRefreshViews();
}

function cmResetDemo() {
  if (!window.confirm('Réinitialiser toutes les modifications locales et revenir aux 584 lignes de démonstration ?')) return;
  const fresh = buildApplications();
  applications.splice(0, applications.length, ...fresh);
  localStorage.removeItem(CM_STORAGE_KEY);
  Object.assign(currentApplicationFilter, {query: '', status: 'Tous', month: 'Tous', source: 'Tous'});
  cmRefreshViews();
}

renderCandidatures = function() {
  const query = (currentApplicationFilter.query || '').toLowerCase().trim();
  const status = currentApplicationFilter.status || 'Tous';
  const month = currentApplicationFilter.month || 'Tous';
  const source = currentApplicationFilter.source || 'Tous';

  const filtered = applications.filter(a => {
    const text = `${a.id} ${a.company} ${a.role} ${a.family} ${a.city} ${a.status} ${a.channel} ${a.source}`.toLowerCase();
    return (!query || text.includes(query))
      && (status === 'Tous' || a.status === status)
      && (month === 'Tous' || a.month === month)
      && (source === 'Tous' || a.source === source);
  });

  const visible = filtered.slice(0, 120);
  const months = [...new Set(applications.map(a => a.month).filter(Boolean))].sort().reverse();
  const sources = [...new Set(applications.map(a => a.source).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

  const headers = ['Actions', 'ID candidature', 'Date', 'Mois', 'Entreprise', 'Poste', 'Famille métier', 'Ville', 'Département', 'Canal', 'Type société', 'Salaire min k€', 'Salaire max k€', 'Contrat', 'Statut final', 'Source', 'Action recommandée'];
  const rows = visible.map(a => ({cells: [
    `<div class="row-actions"><button class="icon-button edit-candidate" data-id="${cmEscape(a.id)}" type="button">Modifier</button><button class="icon-button danger delete-candidate" data-id="${cmEscape(a.id)}" type="button">Supprimer</button></div>`,
    cmEscape(a.id), cmEscape(a.date), cmEscape(a.month), cmEscape(a.company), cmEscape(a.role), cmEscape(a.family), cmEscape(a.city), cmEscape(a.department), cmEscape(a.channel), cmEscape(a.companyType), cmEscape(a.salaryMin), cmEscape(a.salaryMax), cmEscape(a.contract),
    `<span class="status-pill ${a.status === 'Aucune réponse' ? 'silent' : a.status === 'Candidature reçue / en cours' ? 'open' : 'closed'}">${cmEscape(a.status)}</span>`,
    cmEscape(a.source), cmEscape(a.action)
  ]}));

  document.querySelector('#candidatures').innerHTML = `
    <div class="page-title"><h2>Candidatures</h2><p>Base active : ${applications.length} candidature(s). Les changements sont enregistrés uniquement dans ce navigateur.</p></div>
    <div class="candidate-actions">
      <button id="add-candidate" class="primary-action" type="button">+ Ajouter une candidature</button>
      <button id="reset-candidates" class="secondary-action" type="button">Réinitialiser la démo</button>
      <span class="local-save-badge">Sauvegarde locale active</span>
    </div>
    <div class="toolbar candidate-toolbar">
      <input id="candidate-search" value="${cmEscape(currentApplicationFilter.query || '')}" placeholder="Rechercher entreprise, poste, ville, source…" />
      <select id="candidate-status"><option>Tous</option>${CONFIG.statusCounts.map(([s]) => `<option ${s === status ? 'selected' : ''}>${cmEscape(s)}</option>`).join('')}</select>
      <select id="candidate-month"><option>Tous</option>${months.map(m => `<option ${m === month ? 'selected' : ''}>${cmEscape(m)}</option>`).join('')}</select>
      <select id="candidate-source-filter"><option>Tous</option>${sources.map(s => `<option ${s === source ? 'selected' : ''}>${cmEscape(s)}</option>`).join('')}</select>
      <span class="count-pill">${filtered.length} résultat(s)</span>
    </div>
    ${table(headers, rows)}
    <p class="small">Affichage limité aux 120 premières lignes filtrées. Le Dashboard calcule toujours toute la base.</p>

    <div id="candidate-modal" class="modal" hidden>
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="candidate-modal-title">
        <div class="modal-header"><div><span class="modal-kicker">Candidatures</span><h3 id="candidate-modal-title">Ajouter une candidature</h3></div><button type="button" class="modal-close" data-close-modal aria-label="Fermer">×</button></div>
        <form id="candidate-form">
          <input id="candidate-id" type="hidden" />
          <div class="form-grid">
            <label>Date candidature<input id="candidate-date" type="date" required /></label>
            <label>Entreprise<input id="candidate-company" required placeholder="Nom de l'entreprise" /></label>
            <label class="span-2">Poste<input id="candidate-role" required placeholder="Intitulé du poste" /></label>
            <label>Famille métier<select id="candidate-family">${JOB_FAMILIES.map(v => `<option>${cmEscape(v)}</option>`).join('')}</select></label>
            <label>Ville<input id="candidate-city" placeholder="Paris, Massy…" /></label>
            <label>Département<input id="candidate-department" placeholder="75, 91, 92…" /></label>
            <label>Canal<select id="candidate-channel">${CHANNELS.map(v => `<option>${cmEscape(v)}</option>`).join('')}</select></label>
            <label>Type de société<select id="candidate-company-type">${CONFIG.companyTypeCounts.map(([v]) => `<option>${cmEscape(v)}</option>`).join('')}</select></label>
            <label>Contrat<select id="candidate-contract">${CONTRACTS.map(v => `<option>${cmEscape(v)}</option>`).join('')}</select></label>
            <label>Salaire min k€<input id="candidate-salary-min" type="number" min="0" step="1" /></label>
            <label>Salaire max k€<input id="candidate-salary-max" type="number" min="0" step="1" /></label>
            <label class="span-2">Statut<select id="candidate-status-field">${CONFIG.statusCounts.map(([v]) => `<option>${cmEscape(v)}</option>`).join('')}</select></label>
            <label class="span-2">Source<input id="candidate-source" placeholder="Indeed, LinkedIn, saisie manuelle…" /></label>
          </div>
          <div class="modal-actions"><button class="secondary-action" type="button" data-close-modal>Annuler</button><button class="primary-action" type="submit">Enregistrer</button></div>
        </form>
      </div>
    </div>`;

  const search = document.querySelector('#candidate-search');
  search.addEventListener('input', event => {
    currentApplicationFilter.query = event.target.value;
    const pos = event.target.selectionStart ?? event.target.value.length;
    renderCandidatures();
    requestAnimationFrame(() => {
      const next = document.querySelector('#candidate-search');
      next?.focus();
      next?.setSelectionRange(pos, pos);
    });
  });
  document.querySelector('#candidate-status').addEventListener('change', e => { currentApplicationFilter.status = e.target.value; renderCandidatures(); });
  document.querySelector('#candidate-month').addEventListener('change', e => { currentApplicationFilter.month = e.target.value; renderCandidatures(); });
  document.querySelector('#candidate-source-filter').addEventListener('change', e => { currentApplicationFilter.source = e.target.value; renderCandidatures(); });
  document.querySelector('#add-candidate').addEventListener('click', () => cmOpenModal());
  document.querySelector('#reset-candidates').addEventListener('click', cmResetDemo);
  document.querySelector('#candidate-form').addEventListener('submit', cmSaveCandidate);
  document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', cmCloseModal));
  document.querySelectorAll('.edit-candidate').forEach(button => button.addEventListener('click', () => cmOpenModal(button.dataset.id)));
  document.querySelectorAll('.delete-candidate').forEach(button => button.addEventListener('click', () => cmDeleteCandidate(button.dataset.id)));
};

cmLoadSavedApplications();
renderDashboard();
renderCandidatures();
renderStatistiques();
renderQualite();
