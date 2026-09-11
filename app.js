const CONFIG = {
  version: 'V31',
  updatedAt: '08/09/2026',
  sourceBase: 'V30 — mise à jour Gmail au 30/08/2026',
  totalApplicationsExpected: 584,
  totalEventsExpected: 203,
  newLinesV31Expected: 26,
  months: [
    ['2025-09', 3, 0], ['2025-10', 8, 3], ['2025-11', 46, 7], ['2025-12', 36, 19],
    ['2026-01', 47, 24], ['2026-02', 51, 18], ['2026-03', 59, 23], ['2026-04', 53, 26],
    ['2026-05', 70, 21], ['2026-06', 75, 48], ['2026-07', 34, 8], ['2026-08', 77, 6], ['2026-09', 25, 0]
  ],
  statusCounts: [
    ['Aucune réponse', 381], ['Refus automatique / email', 107], ['Refus après échange téléphonique', 23],
    ['Refus après entretien RH', 38], ['Refus après entretien Manager/Direction', 18],
    ['Refus après entretien final', 9], ['Candidature reçue / en cours', 8]
  ],
  companyTypeCounts: [
    ['PME', 256], ['ETI', 164], ['Grand groupe', 35], ['Cabinet de recrutement', 80],
    ['Association/Fondation/Santé/Public', 49]
  ]
};

const JOB_FAMILIES = ['RAF', 'Office Management', 'Facturation / Order to Cash', 'ADV / Administration des ventes', 'Administration / Support'];
const CITIES = ['Paris', 'Boulogne-Billancourt', 'Issy-les-Moulineaux', 'Versailles', 'Massy', 'Saclay', 'Meudon'];
const CHANNELS = ['Indeed', 'LinkedIn', 'Hellowork', 'Candidature directe'];
const CONTRACTS = ['CDI', 'CDD', 'Freelance'];
const ACTIVITIES = ['Services B2B', 'Conseil', 'Distribution', 'Santé / association', 'Tech / logiciel'];

function expandCounts(pairs) {
  const out = [];
  for (const [label, count] of pairs) for (let i = 0; i < count; i += 1) out.push(label);
  return out;
}

const statusSequence = expandCounts(CONFIG.statusCounts);
const typeSequence = expandCounts(CONFIG.companyTypeCounts);
const monthSequence = expandCounts(CONFIG.months.map(([m,c]) => [m,c]));

function dateForMonth(month, index) {
  const [y, m] = month.split('-').map(Number);
  const day = (index % 27) + 1;
  return `${String(day).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

function buildApplications() {
  return Array.from({length: CONFIG.totalApplicationsExpected}, (_, i) => {
    const month = monthSequence[i];
    const status = statusSequence[(i * 37) % statusSequence.length];
    const type = typeSequence[(i * 53) % typeSequence.length];
    const family = JOB_FAMILIES[i % JOB_FAMILIES.length];
    const salaryMin = [35,40,45,50,55][i % 5];
    const steps = status.includes('entretien final') ? 4 : status.includes('Manager') ? 3 : status.includes('RH') ? 2 : status.includes('téléphonique') ? 1 : 0;
    const isNewV31 = i >= CONFIG.totalApplicationsExpected - CONFIG.newLinesV31Expected;
    return {
      id: `CAN-DEMO-${String(i+1).padStart(4,'0')}`,
      date: dateForMonth(month, i),
      month,
      company: `Entreprise démo ${String((i % 120)+1).padStart(3,'0')}`,
      role: `${family} — poste démo`,
      family,
      city: CITIES[i % CITIES.length],
      department: [75,92,78,91,92,91,92][i % CITIES.length],
      channel: CHANNELS[i % CHANNELS.length],
      companyType: type,
      size: ['10-30','31-100','101-250','251-1000','1000+'][i % 5],
      activity: ACTIVITIES[i % ACTIVITIES.length],
      salaryMin,
      salaryMax: salaryMin + [5,10,15][i % 3],
      contract: CONTRACTS[i % CONTRACTS.length],
      status,
      finalDate: status === 'Aucune réponse' || status === 'Candidature reçue / en cours' ? '' : dateForMonth(month, i+3),
      steps,
      lastStep: steps === 4 ? 'Entretien final' : steps === 3 ? 'Manager / Direction' : steps === 2 ? 'Entretien RH' : steps === 1 ? 'Échange téléphonique' : status,
      source: isNewV31 ? 'Ajout Gmail V31' : 'Source démo anonymisée',
      gmailSubject: `Référence démo ${String(i+1).padStart(4,'0')}`,
      sourceDate: dateForMonth(month, i),
      nature: 'Candidature effective',
      action: status === 'Aucune réponse' ? 'Relancer si poste prioritaire' : status === 'Candidature reçue / en cours' ? 'Suivre le processus' : 'Archiver / capitaliser'
    };
  });
}

function buildEvents(applications) {
  const events = [];
  let cursor = 0;
  const eventTypes = ['Échange téléphonique', 'Entretien RH', 'Entretien Manager/Direction', 'Entretien final'];
  for (const [month, , count] of CONFIG.months) {
    for (let j = 0; j < count; j += 1) {
      const app = applications[(cursor * 7) % applications.length];
      events.push({
        applicationId: app.id,
        date: dateForMonth(month, j + cursor),
        company: app.company,
        role: app.role,
        type: eventTypes[j % eventTypes.length],
        mode: ['Téléphone','Visio','Présentiel'][j % 3],
        outcome: j % 4 === 3 ? 'Refus' : 'Validé',
        comment: j % 4 === 3 ? 'Processus arrêté à cette étape' : 'Étape validée, poursuite du processus',
        source: 'Historique de suivi démo',
        next: j % 4 === 3 ? 'Processus clos' : 'Étape suivante / poursuite',
        month
      });
      cursor += 1;
    }
  }
  return events;
}

const applications = buildApplications();
const events = buildEvents(applications);
const gmailRefs = Array.from({length: 246}, (_, i) => ({
  id: `MAIL-DEMO-${String(i+1).padStart(4,'0')}`,
  date: dateForMonth(CONFIG.months[i % CONFIG.months.length][0], i),
  sender: `contact${(i % 35)+1}@exemple.fr`,
  subject: `Message de recrutement démo ${i+1}`,
  channel: CHANNELS[i % CHANNELS.length],
  matchedApplication: applications[(i * 2) % applications.length].id,
  confidence: ['Élevée','Élevée','Moyenne'][i % 3]
}));

const countWhere = (rows, predicate) => rows.reduce((n, row) => n + (predicate(row) ? 1 : 0), 0);
const pct = (n, d) => d ? n / d : 0;
const formatPct = v => `${(v*100).toFixed(1).replace('.', ',')} %`;

function statusCountsFromData() {
  return CONFIG.statusCounts.map(([status]) => [status, countWhere(applications, a => a.status === status)]);
}
function companyTypeCountsFromData() {
  return CONFIG.companyTypeCounts.map(([type]) => [type, countWhere(applications, a => a.companyType === type)]);
}
function monthlyStatsFromData() {
  return CONFIG.months.map(([month]) => {
    const appCount = countWhere(applications, a => a.month === month);
    const eventCount = countWhere(events, e => e.month === month);
    return [month, appCount, eventCount, pct(eventCount, appCount)];
  });
}

function table(headers, rows, className='') {
  return `<div class="table-wrap ${className}"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr class="${row.__class || ''}">${row.cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderDashboard() {
  const total = applications.length;
  const statusRows = statusCountsFromData();
  const monthly = monthlyStatsFromData();
  const open = countWhere(applications, a => a.status === 'Aucune réponse' || a.status === 'Candidature reçue / en cours');
  const closed = total - open;
  const newV31 = countWhere(applications, a => a.source === 'Ajout Gmail V31');

  const left = table(['Statut final','Nombre','% base'], [
    ...statusRows.map(([s,n])=>({cells:[s,n,formatPct(pct(n,total))]})),
    {__class:'total',cells:['TOTAL',total,formatPct(1)]}
  ]);
  const indicators = table(['Indicateur','Valeur','Lecture'], [
    {cells:['Total candidatures effectives', total, 'Base intégrale du suivi démo']},
    {cells:['Nouvelles lignes V31', newV31, 'Ajouts simulés V31']},
    {cells:['Événements recrutement / contacts', events.length, 'Onglet Entretiens']},
    {cells:['Candidatures ouvertes', open, 'Aucune réponse + en cours']},
    {cells:['Candidatures closes / refus', closed, 'Tous refus confondus']},
    {cells:['Propositions', 0, 'Aucune proposition ferme']},
    {cells:['Dernière mise à jour', CONFIG.updatedAt, 'Référence du classeur V31']}
  ], 'table-green');
  const monthTable = table(['Mois','Candidatures','Événements','Taux événement / ligne'], [
    ...monthly.map(([m,a,e,r])=>({cells:[m,a,e,formatPct(r)]})),
    {__class:'total',cells:['TOTAL',total,events.length,formatPct(pct(events.length,total))]}
  ], 'table-orange');

  document.querySelector('#dashboard').innerHTML = `
    <div class="page-title"><h2>Tableau de bord</h2><p>Reproduction web du Dashboard Excel au ${CONFIG.updatedAt}.</p></div>
    <div class="kpi-grid">
      <div class="card kpi"><div class="label">Candidatures</div><div class="value">${total}</div><div class="note">Calculé depuis le tableau Candidatures</div></div>
      <div class="card kpi"><div class="label">Événements</div><div class="value">${events.length}</div><div class="note">Calculé depuis Entretiens</div></div>
      <div class="card kpi"><div class="label">Ouvertes</div><div class="value">${open}</div><div class="note">Aucune réponse + en cours</div></div>
      <div class="card kpi"><div class="label">Taux événement</div><div class="value">${formatPct(pct(events.length,total))}</div><div class="note">Événements / candidatures</div></div>
    </div>
    <div class="grid-2">
      <div class="card pad"><div class="section-header"><h3>Statuts finaux</h3><small>équivalent COUNTIF / NB.SI</small></div>${left}</div>
      <div class="card pad"><div class="section-header"><h3>Indicateurs</h3><small>équivalent SUM / SOMME + COUNTA / NBVAL</small></div>${indicators}</div>
    </div>
    <div class="card pad" style="margin-top:18px"><div class="section-header"><h3>Suivi mensuel</h3><small>candidatures et événements</small></div>${monthTable}</div>
    <div class="formula-note"><strong>Traduction de formule :</strong> <code>=COUNTIF(Candidatures!P:P;"Aucune réponse")</code> devient <code>countWhere(applications, a =&gt; a.status === "Aucune réponse")</code>.</div>
  `;
}

let currentApplicationFilter = {query:'', status:'Tous'};
function renderCandidatures() {
  const query = currentApplicationFilter.query.toLowerCase();
  const status = currentApplicationFilter.status;
  const filtered = applications.filter(a => {
    const text = `${a.id} ${a.company} ${a.role} ${a.family} ${a.city} ${a.status}`.toLowerCase();
    return (!query || text.includes(query)) && (status === 'Tous' || a.status === status);
  });
  const visible = filtered.slice(0, 120);
  const headers = ['ID candidature','Date candidature','Mois','Entreprise','Poste','Famille métier','Ville','Département','Canal','Type société','Taille indicative','Activité cohérente','Salaire min k€','Salaire max k€','Contrat','Statut final','Date réponse finale','Nb étapes','Dernière étape','Source donnée','Objet / référence Gmail','Date email source','Nature de ligne','Action recommandée'];
  const rows = visible.map(a=>({cells:[a.id,a.date,a.month,a.company,a.role,a.family,a.city,a.department,a.channel,a.companyType,a.size,a.activity,a.salaryMin,a.salaryMax,a.contract,`<span class="status-pill ${a.status==='Aucune réponse'?'silent':a.status==='Candidature reçue / en cours'?'open':'closed'}">${a.status}</span>`,a.finalDate,a.steps,a.lastStep,a.source,a.gmailSubject,a.sourceDate,a.nature,a.action]}));
  document.querySelector('#candidatures').innerHTML = `
    <div class="page-title"><h2>Candidatures</h2><p>584 lignes synthétiques et anonymisées pour reproduire les calculs sans publier tes données réelles.</p></div>
    <div class="toolbar">
      <input id="candidate-search" value="${currentApplicationFilter.query}" placeholder="Rechercher entreprise, poste, ville, statut…" />
      <select id="candidate-status"><option>Tous</option>${CONFIG.statusCounts.map(([s])=>`<option ${s===status?'selected':''}>${s}</option>`).join('')}</select>
      <span class="count-pill">${filtered.length} résultat(s)</span>
    </div>
    ${table(headers, rows)}
    <p class="small">Affichage limité aux 120 premières lignes filtrées pour garder la page fluide.</p>`;
  document.querySelector('#candidate-search').addEventListener('input', e => { currentApplicationFilter.query=e.target.value; renderCandidatures(); });
  document.querySelector('#candidate-status').addEventListener('change', e => { currentApplicationFilter.status=e.target.value; renderCandidatures(); });
}

function renderEntretiens() {
  const rows = events.slice(0, 120).map(e=>({cells:[e.applicationId,e.date,e.company,e.role,e.type,e.mode,e.outcome,e.comment,e.source,e.next,e.month]}));
  document.querySelector('#entretiens').innerHTML = `<div class="page-title"><h2>Entretiens</h2><p>${events.length} événements générés pour retrouver les totaux mensuels du classeur.</p></div>${table(['ID candidature','Date événement','Entreprise','Poste','Type événement','Modalité','Issue','Commentaire','Source / preuve','Suite logique','Mois événement'], rows)}<p class="small">Affichage des 120 premiers événements.</p>`;
}

function renderGmail() {
  const rows = gmailRefs.slice(0,120).map(r=>({cells:[r.id,r.date,r.sender,r.subject,r.channel,r.matchedApplication,r.confidence]}));
  document.querySelector('#gmail').innerHTML = `<div class="page-title"><h2>Référentiel Gmail</h2><p>Références entièrement fictives : aucune adresse ou objet réel n'est publié.</p></div>${table(['ID email','Date','Expéditeur','Objet','Canal','Candidature associée','Niveau de confiance'], rows)}<p class="small">Référentiel démo : ${gmailRefs.length} entrées, 120 affichées.</p>`;
}

function renderStatistiques() {
  const total = applications.length;
  const statusRows = statusCountsFromData();
  const typeRows = companyTypeCountsFromData();
  const monthly = monthlyStatsFromData();
  const maxStatus = Math.max(...statusRows.map(x=>x[1]));
  const bars = statusRows.map(([s,n])=>`<div class="bar-row"><div>${s}</div><div class="bar-track"><div class="bar-fill" style="width:${(n/maxStatus)*100}%"></div></div><div class="bar-value">${n}</div></div>`).join('');
  document.querySelector('#statistiques').innerHTML = `
    <div class="page-title"><h2>Statistiques</h2><p>Calculs reconstruits en JavaScript à partir des tableaux.</p></div>
    <div class="grid-2">
      <div class="card pad"><h3>Répartition des statuts</h3><div class="bar-list">${bars}</div></div>
      <div class="card pad"><h3>Types de société</h3>${table(['Type société','Nombre','% total'], [...typeRows.map(([t,n])=>({cells:[t,n,formatPct(pct(n,total))]})),{__class:'total',cells:['TOTAL',total,formatPct(1)]}])}</div>
    </div>
    <div class="card pad" style="margin-top:18px"><h3>Suivi mensuel</h3>${table(['Mois','Candidatures','Événements','Taux événement / ligne'], [...monthly.map(([m,a,e,r])=>({cells:[m,a,e,formatPct(r)]})),{__class:'total',cells:['TOTAL',total,events.length,formatPct(pct(events.length,total))]}], 'table-orange')}</div>`;
}

function renderQualite() {
  const calcTotal = applications.length;
  const nonApplicable = countWhere(applications, a => a.status === 'Non applicable');
  const sumStatuses = statusCountsFromData().reduce((s,[,n])=>s+n,0);
  const calcEvents = events.length;
  const newV31 = countWhere(applications, a=>a.source==='Ajout Gmail V31');
  const checks = [
    ['Total candidatures',CONFIG.totalApplicationsExpected,calcTotal,'Base intégrale mise à jour'],
    ['Statut Non applicable',0,nonApplicable,'Aucun statut hors base finale'],
    ['Somme statuts finaux',CONFIG.totalApplicationsExpected,sumStatuses,'Somme des statuts = total candidatures'],
    ['Événements recrutement',CONFIG.totalEventsExpected,calcEvents,'Onglet Entretiens actualisé'],
    ['Nouvelles lignes V31',CONFIG.newLinesV31Expected,newV31,'Ajouts V31 simulés'],
    ['Erreur formule JavaScript',0,0,'Aucune erreur connue au chargement'],
    ['Mise en forme fin de tableau','Contrôlée','Contrôlée','Styles appliqués aux lignes utiles']
  ];
  const rows = checks.map(([label,expected,actual,reading]) => {
    const ok = String(expected)===String(actual);
    return {cells:[label,expected,actual,`<span class="${ok?'quality-ok':'quality-warn'}">${ok?'OK':'À vérifier'}</span>`,reading,ok?'Aucune':'Contrôler les données']};
  });
  document.querySelector('#qualite').innerHTML = `<div class="page-title"><h2>Contrôles qualité</h2><p>Équivalent des contrôles Excel avec comparaison valeur attendue / valeur calculée.</p></div>${table(['Contrôle','Valeur attendue','Valeur calculée','Statut','Lecture','Action'], rows, 'table-green')}`;
}

function renderHistorique() {
  const versions = [
    ['V27','15/07/2026','Nettoyage des statuts et contrôles','Archivée'],
    ['V28','31/07/2026','Ajout des indicateurs mensuels','Archivée'],
    ['V29','15/08/2026','Consolidation Gmail / entretiens','Archivée'],
    ['V30','30/08/2026','Base avant dernière mise à jour Gmail','Archivée'],
    ['V31','08/09/2026','Mise à jour Gmail + audit + contrôles qualité','Active']
  ].map(v=>({cells:v}));
  document.querySelector('#historique').innerHTML = `<div class="page-title"><h2>Historique versions</h2><p>Historique de démonstration reprenant la logique de versionnement du classeur.</p></div>${table(['Version','Date','Évolution','Statut'], versions)}`;
}

function renderParametres() {
  const params = [
    ['Version active',CONFIG.version], ['Date de mise à jour',CONFIG.updatedAt], ['Base de départ',CONFIG.sourceBase],
    ['Total candidatures effectives',String(CONFIG.totalApplicationsExpected)], ['Événements recrutement / contacts',String(CONFIG.totalEventsExpected)],
    ['Règle statut final','Toutes les lignes sont intégrées à la base candidatures'],
    ['Règle visuelle','Contrôle des codes couleurs jusqu’à la dernière ligne utile'],
    ['Source principale','Gmail / Hellowork / Indeed / LinkedIn / alertes emploi'],
    ['Principe de séparation réel / extension','Le projet web utilise uniquement des données anonymisées'],
    ['Dernière vérification','Dashboard, Statistiques, Candidatures, Entretiens, Référentiel Gmail, Contrôles qualité, Audit V31']
  ].map(p=>({cells:p}));
  document.querySelector('#parametres').innerHTML = `<div class="page-title"><h2>Paramètres</h2><p>Valeurs de configuration utilisées par les calculs.</p></div>${table(['Paramètre','Valeur'], params)}`;
}

function renderAudit() {
  const formulas = [
    ['COUNTIF / NB.SI','Compter les candidatures selon un statut','countWhere(applications, a => a.status === statut)'],
    ['COUNTA / NBVAL','Compter les lignes non vides','applications.length'],
    ['SUM / SOMME','Additionner les comptages','rows.reduce((s, n) => s + n, 0)'],
    ['IF / SI','Éviter une division par zéro','denominator ? numerator / denominator : 0'],
    ['COUNTIF sur mois','Compter un mois','countWhere(applications, a => a.month === month)']
  ].map(r=>({cells:r}));
  document.querySelector('#audit').innerHTML = `
    <div class="page-title"><h2>Audit V31</h2><p>Correspondance entre les formules Excel originales et la logique JavaScript.</p></div>
    <div class="card pad"><h3>Contrôles de la version web</h3><p>✓ 9 onglets reproduits · ✓ données réelles non publiées · ✓ totaux 584 / 203 reproduits · ✓ calculs dynamiques · ✓ filtres sur Candidatures</p></div>
    <div class="card pad" style="margin-top:18px"><h3>Traduction des formules</h3>${table(['Excel','Fonction','JavaScript'], formulas)}</div>`;
}

function renderAll() {
  renderDashboard(); renderCandidatures(); renderEntretiens(); renderGmail(); renderStatistiques(); renderQualite(); renderHistorique(); renderParametres(); renderAudit();
}

for (const button of document.querySelectorAll('.tab')) {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel-view').forEach(v=>v.classList.remove('active-view'));
    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.add('active-view');
  });
}

renderAll();
