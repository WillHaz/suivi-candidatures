// Charge les données du classeur V33 dans l'application web.
(function () {
  const meta = window.V33_META || {};
  const rawApplications = window.V33_APPLICATION_ROWS || [];
  const rawEvents = window.V33_EVENT_ROWS || [];
  const rawGmail = window.V33_GMAIL_ROWS || [];

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function monthFromDate(value) {
    const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}` : '';
  }

  function actionForStatus(status) {
    if (status === 'Aucune réponse') return 'Relancer si poste prioritaire';
    if (status === 'Candidature reçue / en cours') return 'Suivre le processus';
    return 'Archiver / capitaliser';
  }

  window.v33BuildApplications = function () {
    return rawApplications.map(row => {
      const [id,date,company,role,family,city,department,channel,companyType,salaryMin,salaryMax,contract,status,steps,source] = row;
      return {
        id, date, month: monthFromDate(date), company, role, family, city, department,
        channel, companyType, size: '', activity: '', salaryMin, salaryMax, contract,
        status, finalDate: '', steps: Number(steps) || 0, lastStep: status,
        source, gmailSubject: '', sourceDate: date, nature: 'Candidature effective',
        action: actionForStatus(status)
      };
    });
  };

  window.v33BuildEvents = function () {
    return rawEvents.map(row => {
      const [applicationId,date,company,role,type,mode,outcome,comment,next,month] = row;
      return { applicationId,date,company,role,type,mode,outcome,comment,source:'Classeur V33',next,month };
    });
  };

  const loadedApps = window.v33BuildApplications();
  const loadedEvents = window.v33BuildEvents();
  applications.splice(0, applications.length, ...loadedApps);
  events.splice(0, events.length, ...loadedEvents);

  const loadedGmail = rawGmail.map((row, index) => {
    const [date,company,role,city,department,channel,companyType,size,activity,salaryMin,salaryMax,contract,subject] = row;
    return {
      id:`MAIL-V33-${String(index + 1).padStart(4,'0')}`, date, company, role, city, department,
      channel, companyType, size, activity, salaryMin, salaryMax, contract, subject
    };
  });
  gmailRefs.splice(0, gmailRefs.length, ...loadedGmail);

  CONFIG.version = meta.version || 'V33';
  CONFIG.updatedAt = meta.updatedAt || '11/09/2026';
  CONFIG.sourceBase = meta.sourceBase || 'V32 — mise à jour Gmail au 11/09/2026';
  CONFIG.totalApplicationsExpected = 594;
  CONFIG.totalEventsExpected = 203;
  CONFIG.newLinesV31Expected = 0;
  CONFIG.statusCounts = [
    ['Aucune réponse', 391],
    ['Refus automatique / email', 107],
    ['Refus après échange téléphonique', 23],
    ['Refus après entretien RH', 38],
    ['Refus après entretien Manager/Direction', 18],
    ['Refus après entretien final', 9],
    ['Candidature reçue / en cours', 8]
  ];

  const typeCounts = new Map();
  applications.forEach(a => typeCounts.set(a.companyType, (typeCounts.get(a.companyType) || 0) + 1));
  CONFIG.companyTypeCounts = [...typeCounts.entries()];

  const monthCounts = new Map();
  applications.forEach(a => {
    if (!a.month) return;
    if (!monthCounts.has(a.month)) monthCounts.set(a.month, [0, 0]);
    monthCounts.get(a.month)[0] += 1;
  });
  events.forEach(e => {
    if (!e.month) return;
    if (!monthCounts.has(e.month)) monthCounts.set(e.month, [0, 0]);
    monthCounts.get(e.month)[1] += 1;
  });
  CONFIG.months = [...monthCounts.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([m,[a,e]]) => [m,a,e]);

  // Une ancienne sauvegarde locale de la démo ne doit pas remplacer la V33 lors de la première ouverture.
  const DATA_VERSION_KEY = 'suivi-candidatures-data-version';
  if (localStorage.getItem(DATA_VERSION_KEY) !== 'V33') {
    localStorage.removeItem('suivi-candidatures-local-v1');
    localStorage.setItem(DATA_VERSION_KEY, 'V33');
  }

  // Le bouton de réinitialisation du gestionnaire réutilisera désormais la vraie base V33.
  buildApplications = window.v33BuildApplications;

  renderEntretiens = function () {
    const rows = events.map(e => ({cells:[
      esc(e.applicationId),esc(e.date),esc(e.company),esc(e.role),esc(e.type),esc(e.mode),
      esc(e.outcome),esc(e.comment),esc(e.source),esc(e.next),esc(e.month)
    ]}));
    document.querySelector('#entretiens').innerHTML = `
      <div class="page-title"><h2>Entretiens</h2><p>${events.length} événements issus du classeur V33.</p></div>
      ${table(['ID candidature','Date événement','Entreprise','Poste','Type événement','Modalité','Issue','Commentaire','Source','Suite logique','Mois'], rows)}`;
  };

  renderGmail = function () {
    const rows = gmailRefs.map(g => ({cells:[
      esc(g.date),esc(g.company),esc(g.role),esc(g.city),esc(g.department),esc(g.channel),
      esc(g.companyType),esc(g.size),esc(g.activity),esc(g.salaryMin),esc(g.salaryMax),esc(g.contract),esc(g.subject)
    ]}));
    document.querySelector('#gmail').innerHTML = `
      <div class="page-title"><h2>Référentiel Gmail</h2><p>${gmailRefs.length} références importées du classeur V33.</p></div>
      ${table(['Date email','Entreprise','Poste / objet détecté','Ville','Département','Canal','Type société','Taille indicative','Activité','Salaire min k€','Salaire max k€','Contrat','Objet Gmail'], rows)}`;
  };

  renderHistorique = function () {
    const rows = (meta.history || []).map(r => ({cells:r.map(esc)}));
    document.querySelector('#historique').innerHTML = `
      <div class="page-title"><h2>Historique versions</h2><p>Historique importé du fichier V33.</p></div>
      ${table(['Version','Date','Évolution','Commentaire'], rows)}`;
  };

  renderParametres = function () {
    const rows = (meta.params || []).map(r => ({cells:r.map(esc)}));
    document.querySelector('#parametres').innerHTML = `
      <div class="page-title"><h2>Paramètres</h2><p>Paramètres et règles de référence du classeur V33.</p></div>
      ${table(['Paramètre','Valeur'], rows)}`;
  };

  renderAudit = function () {
    const controls = (meta.audit || []).slice(0, 10).map(r => ({cells:r.map(esc)}));
    const corrections = (meta.audit || []).slice(11).filter(r => r[0]).map(r => ({cells:[esc(r[0]),esc(r[1]),esc(r[2]),esc(r[3])]}));
    document.querySelector('#audit').innerHTML = `
      <div class="page-title"><h2>Audit V33</h2><p>Audit intégral du 11/09/2026 et corrections de données.</p></div>
      <div class="card pad"><div class="section-header"><h3>Contrôles</h3><small>source : classeur V33</small></div>${table(['Zone contrôlée','Constat initial','Correction appliquée','Résultat','Niveau','Commentaire','Date'], controls)}</div>
      <div class="card pad" style="margin-top:18px"><div class="section-header"><h3>Corrections de candidatures</h3><small>${corrections.length} corrections tracées</small></div>${table(['ID candidature','Entreprise avant','Entreprise après','Type correction'], corrections)}</div>`;
  };

  renderQualite = function () {
    const duplicateKeys = new Map();
    applications.forEach(a => {
      const key = `${String(a.company).trim().toLowerCase()}|${a.date}|${String(a.role).trim().toLowerCase()}`;
      duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
    });
    const strictDuplicates = [...duplicateKeys.values()].filter(n => n > 1).reduce((s,n) => s + n - 1, 0);
    const genericCompanies = applications.filter(a => /nom générique|employeur identifié/i.test(a.company || '')).length;
    const missingEventMonths = events.filter(e => !e.month).length;
    const allowed = new Set(CONFIG.statusCounts.map(([s]) => s));
    const invalidStatuses = applications.filter(a => !allowed.has(a.status)).length;
    const checks = [
      ['Total candidatures', applications.length, 594, applications.length === 594 ? 'OK' : 'Écart local', 'Base V33 = 594 ; les ajouts/suppressions locaux peuvent faire évoluer ce total'],
      ['Événements recrutement', events.length, 203, events.length === 203 ? 'OK' : 'À vérifier', 'Référence V33'],
      ['Doublons stricts entreprise/date/poste', strictDuplicates, 0, strictDuplicates === 0 ? 'OK' : 'À vérifier', 'Contrôle dynamique'],
      ['Entreprises génériques', genericCompanies, 0, genericCompanies === 0 ? 'OK' : 'À vérifier', 'Aucun nom générique attendu'],
      ['Événements sans mois', missingEventMonths, 0, missingEventMonths === 0 ? 'OK' : 'À vérifier', 'Tous les événements doivent être datés'],
      ['Statuts hors référentiel', invalidStatuses, 0, invalidStatuses === 0 ? 'OK' : 'À vérifier', 'Référentiel dynamique après règle des 15 jours'],
      ['Version des données', CONFIG.version, 'V33', CONFIG.version === 'V33' ? 'OK' : 'À vérifier', `Mise à jour ${CONFIG.updatedAt}`]
    ];
    document.querySelector('#qualite').innerHTML = `
      <div class="page-title"><h2>Contrôles qualité</h2><p>Contrôles dynamiques sur la base V33 et les éventuelles modifications locales.</p></div>
      ${table(['Contrôle','Valeur observée','Référence','Résultat','Lecture'], checks.map(r => ({cells:r.map(esc)})), 'table-green')}`;
  };

  renderEntretiens();
  renderGmail();
  renderHistorique();
  renderParametres();
  renderAudit();
  renderStatistiques();
  renderQualite();
  renderDashboard();
  renderCandidatures();
})();
