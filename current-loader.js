// Charge la version courante V35 à partir de la base V34 + ajouts du fichier du 16/09/2026.
(function () {
  const meta = window.V35_META || window.V34_META || {};
  const rawApplications = [...(window.V33_APPLICATION_ROWS || []), ...(window.V35_APPLICATION_ROWS || [])];
  const rawEvents = [...(window.V34_EVENT_ROWS || []), ...(window.V35_EVENT_ROWS || [])];
  const rawGmail = [...(window.V33_GMAIL_ROWS || []), ...(window.V35_GMAIL_ROWS || [])];

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
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

  window.currentBuildApplications = function () {
    return rawApplications.map(row => {
      const [id,date,company,role,family,city,department,channel,companyType,salaryMin,salaryMax,contract,status,steps,source] = row;
      return {
        id,date,month:monthFromDate(date),company,role,family,city,department,channel,companyType,
        size:'',activity:'',salaryMin,salaryMax,contract,status,finalDate:'',steps:Number(steps)||0,
        lastStep:status,source,gmailSubject:'',sourceDate:date,nature:'Candidature effective',action:actionForStatus(status)
      };
    });
  };
  window.currentBuildEvents = function () {
    return rawEvents.map(row => {
      const [applicationId,date,company,role,type,mode,outcome,comment,source,next,month] = row;
      return {applicationId,date,company,role,type,mode,outcome,comment,source,next,month};
    });
  };

  applications.splice(0, applications.length, ...window.currentBuildApplications());
  events.splice(0, events.length, ...window.currentBuildEvents());
  gmailRefs.splice(0, gmailRefs.length, ...rawGmail.map((row,index) => {
    const [date,company,role,city,department,channel,companyType,size,activity,salaryMin,salaryMax,contract,subject] = row;
    return {id:`MAIL-${CONFIG.version || 'V35'}-${String(index+1).padStart(4,'0')}`,date,company,role,city,department,channel,companyType,size,activity,salaryMin,salaryMax,contract,subject};
  }));

  CONFIG.version = meta.version || 'V35';
  CONFIG.updatedAt = meta.updatedAt || '16/09/2026';
  CONFIG.sourceBase = meta.sourceBase || 'V34 — cohérence événements au 11/09/2026';
  CONFIG.totalApplicationsExpected = meta.expectedApplications || 601;
  CONFIG.totalEventsExpected = meta.expectedEvents || 253;
  CONFIG.totalGmailExpected = meta.expectedGmail || 262;
  CONFIG.totalRecruitmentCompaniesExpected = meta.expectedRecruitmentCompanies || 112;
  CONFIG.formalInterviewsExpected = meta.expectedFormalInterviews || 101;
  CONFIG.phoneExchangesExpected = meta.expectedPhoneExchanges || 88;
  CONFIG.substantiveInteractionsExpected = meta.expectedSubstantiveInteractions || 189;
  CONFIG.newLinesV31Expected = 0;

  const statusOrder = ['Aucune réponse','Refus automatique / email','Refus après échange téléphonique','Refus après entretien RH','Refus après entretien Manager/Direction','Refus après entretien final','Candidature reçue / en cours'];
  CONFIG.statusCounts = statusOrder.map(status => [status, applications.filter(a => a.status === status).length]);
  const typeCounts = new Map();
  applications.forEach(a => typeCounts.set(a.companyType,(typeCounts.get(a.companyType)||0)+1));
  CONFIG.companyTypeCounts = [...typeCounts.entries()];
  const monthCounts = new Map();
  applications.forEach(a => { if (!a.month) return; if (!monthCounts.has(a.month)) monthCounts.set(a.month,[0,0]); monthCounts.get(a.month)[0] += 1; });
  events.forEach(e => { if (!e.month) return; if (!monthCounts.has(e.month)) monthCounts.set(e.month,[0,0]); monthCounts.get(e.month)[1] += 1; });
  CONFIG.months = [...monthCounts.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([m,[a,e]]) => [m,a,e]);

  const DATA_VERSION_KEY = 'suivi-candidatures-data-version';
  if (localStorage.getItem(DATA_VERSION_KEY) !== CONFIG.version) {
    localStorage.removeItem('suivi-candidatures-local-v1');
    localStorage.setItem(DATA_VERSION_KEY, CONFIG.version);
  }
  buildApplications = window.currentBuildApplications;

  renderEntretiens = function () {
    const rows = events.map(e => ({cells:[esc(e.applicationId),esc(e.date),esc(e.company),esc(e.role),esc(e.type),esc(e.mode),esc(e.outcome),esc(e.comment),esc(e.source),esc(e.next),esc(e.month)]}));
    document.querySelector('#entretiens').innerHTML = `<div class="page-title"><h2>Entretiens</h2><p>${events.length} lignes détaillées de suivi issues du classeur ${esc(CONFIG.version)}.</p></div>${table(['ID candidature','Date événement','Entreprise','Poste','Type événement','Modalité','Issue','Commentaire','Source / preuve','Suite logique','Mois événement'],rows)}`;
  };
  renderGmail = function () {
    const rows = gmailRefs.map(g => ({cells:[esc(g.date),esc(g.company),esc(g.role),esc(g.city),esc(g.department),esc(g.channel),esc(g.companyType),esc(g.size),esc(g.activity),esc(g.salaryMin),esc(g.salaryMax),esc(g.contract),esc(g.subject)]}));
    document.querySelector('#gmail').innerHTML = `<div class="page-title"><h2>Référentiel Gmail</h2><p>${gmailRefs.length} références intégrées jusqu’au ${esc(CONFIG.updatedAt)}.</p></div>${table(['Date email','Entreprise','Poste / objet détecté','Ville','Département','Canal','Type société','Taille indicative','Activité','Salaire min k€','Salaire max k€','Contrat','Objet Gmail'],rows)}`;
  };
  renderHistorique = function () {
    const rows = (meta.history || []).map(r => ({cells:r.map(esc)}));
    document.querySelector('#historique').innerHTML = `<div class="page-title"><h2>Historique versions</h2><p>Historique importé jusqu’à ${esc(CONFIG.version)}.</p></div>${table(['Version','Date','Objet','Impact'],rows)}`;
  };
  renderAudit = function () {
    const clean = (meta.audit || []).filter(r => r.some(v => v !== null && v !== ''));
    const controls = clean.filter(r => !String(r[0] || '').startsWith('CAN-')).map(r => ({cells:r.map(esc)}));
    const additions = clean.filter(r => String(r[0] || '').startsWith('CAN-')).map(r => ({cells:r.map(esc)}));
    const additionsBlock = additions.length ? `<div class="card pad" style="margin-top:18px"><div class="section-header"><h3>Candidatures ajoutées</h3><small>${additions.length} lignes V35</small></div>${table(['ID candidature','Date candidature','Entreprise','Poste','Canal','Source donnée','Statut final'],additions,'table-orange')}</div>` : '';
    document.querySelector('#audit').innerHTML = `<div class="page-title"><h2>Audit ${esc(CONFIG.version)}</h2><p>Audit et traçabilité de la version ${esc(CONFIG.version)}.</p></div><div class="card pad"><div class="section-header"><h3>Contrôles de mise à jour</h3><small>source ${esc(CONFIG.updatedAt)}</small></div>${table(['Zone contrôlée','Constat / action','Résultat','Niveau','Volume','Commentaire','Date'],controls,'table-green')}</div>${additionsBlock}`;
  };

  renderEntretiens(); renderGmail(); renderHistorique(); renderAudit(); renderStatistiques(); renderQualite(); renderDashboard(); renderCandidatures();
})();
