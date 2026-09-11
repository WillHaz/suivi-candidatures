// Audit web global V33 : règles, cohérence des paramètres et contrôle visuel des 9 onglets.
(function () {
  const META = window.V33_META || {};
  const WAITING = SR_WAITING_STATUS;
  const ACTIVE = SR_ACTIVE_STATUS;
  const NO_RESPONSE = SR_NO_RESPONSE_STATUS;
  const LEGACY = SR_LEGACY_STATUS;
  const LIMIT = SR_DAY_LIMIT;
  const labels = {
    dashboard:'Dashboard', candidatures:'Candidatures', entretiens:'Entretiens', gmail:'Référentiel Gmail',
    statistiques:'Statistiques', qualite:'Contrôles qualité', historique:'Historique versions',
    parametres:'Paramètres', audit:'Audit V33'
  };
  const esc = v => cmEscape(v);
  const originalStatus = new Map((window.V33_APPLICATION_ROWS || []).map(r => [r[0], r[12]]));

  function parseDate(value) {
    const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? new Date(+m[3], +m[2]-1, +m[1]) : null;
  }
  function age(value) { return srDaysSince(value); }
  function processOpen(app) {
    const related = events.filter(e => e.applicationId === app.id)
      .sort((a,b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0));
    if (!related.length) return false;
    const last = related[related.length-1];
    return !String(last.outcome || '').toLowerCase().includes('refus') && !String(last.next || '').toLowerCase().includes('clos');
  }

  // Règle métier unique, dans les deux sens.
  srApplyStatusRules = function () {
    let changed = false;
    applications.forEach(app => {
      let next = app.status;
      const imported = originalStatus.get(app.id);
      const manualActive = app.statusManual === true && next === ACTIVE;
      const automatic = [LEGACY, WAITING, NO_RESPONSE].includes(next)
        || (next === ACTIVE && !app.statusManual && imported === LEGACY);
      if (!manualActive && automatic) {
        if (processOpen(app)) next = ACTIVE;
        else next = (age(app.date) ?? LIMIT) < LIMIT ? WAITING : NO_RESPONSE;
      }
      const action = srActionForStatus(next);
      if (next !== app.status || action !== app.action) {
        app.status = next; app.action = action; changed = true;
      }
    });
    return changed;
  };

  // Une mise en Active choisie manuellement doit rester Active.
  const baseSave = cmSaveCandidate;
  cmSaveCandidate = function (event) {
    const id = document.querySelector('#candidate-id')?.value || '';
    const old = id ? applications.find(a => a.id === id) : null;
    const selected = document.querySelector('#candidate-status-field')?.value || WAITING;
    if (old && selected !== old.status) old.statusManual = selected === ACTIVE;
    baseSave(event);
    const savedId = id || applications[0]?.id;
    const saved = applications.find(a => a.id === savedId);
    if (saved && selected === ACTIVE) { saved.statusManual = true; saved.status = ACTIVE; saved.action = srActionForStatus(ACTIVE); cmSaveApplications(); }
  };

  // Paramètres : supprime les anciennes références V31/V32 contradictoires.
  renderParametres = function () {
    const rows = [
      ['Version active','V33'], ['Date de mise à jour',CONFIG.updatedAt], ['Base source',CONFIG.sourceBase],
      ['Total V33 de référence','594'], ['Événements de référence','203'],
      ['Règle En cours',`Moins de ${LIMIT} jours sans réponse`], ['Règle Sans réponse',`À partir de J+${LIMIT}`],
      ['Règle Active','Réponse reçue / processus engagé'], ['Sauvegarde','Modifications locales dans le navigateur'],
      ['Contrôle visuel','9 onglets vérifiés automatiquement au chargement']
    ].map(r => ({cells:r.map(esc)}));
    document.querySelector('#parametres').innerHTML = `<div class="page-title"><h2>Paramètres</h2><p>Paramètres normalisés de la version web V33.</p></div>${table(['Paramètre','Valeur'],rows)}`;
  };

  function visualAudit() {
    const out = [];
    for (const [id,label] of Object.entries(labels)) {
      const panel = document.getElementById(id);
      if (!panel) { out.push([label,'À vérifier','Onglet absent']); continue; }
      const oldStyle = panel.getAttribute('style');
      const active = panel.classList.contains('active-view');
      panel.style.cssText = 'display:block;position:absolute;visibility:hidden;left:-100000px;top:0;width:1200px';
      const tables = [...panel.querySelectorAll('table')];
      const wrapped = tables.every(t => t.closest('.table-wrap'));
      const scroll = [...panel.querySelectorAll('.table-wrap')].every(w => ['auto','scroll'].includes(getComputedStyle(w).overflowX));
      const overflow = panel.scrollWidth > panel.clientWidth + 2;
      const legacy = /120 premi|V31|démonstration|démo anonymisée/i.test(panel.textContent || '');
      const title = Boolean(panel.querySelector('h2'));
      const ok = title && wrapped && scroll && !overflow && !legacy;
      out.push([label,ok?'OK':'À vérifier',[title?'titre OK':'titre absent',wrapped?'tableaux encapsulés':'tableau hors scroll',scroll?'scroll horizontal géré':'scroll non géré',overflow?'débordement externe':'pas de débordement externe',legacy?'ancien texte détecté':'texte V33 cohérent'].join(' · ')]);
      if (oldStyle === null) panel.removeAttribute('style'); else panel.setAttribute('style',oldStyle);
      panel.classList.toggle('active-view',active);
    }
    return out;
  }

  let visualRows = [];
  renderQualite = function () {
    const total = applications.length;
    const waitingOld = applications.filter(a => a.status === WAITING && (age(a.date) ?? LIMIT) >= LIMIT).length;
    const recentNoResponse = applications.filter(a => a.status === NO_RESPONSE && (age(a.date) ?? LIMIT) < LIMIT).length;
    const statusesTotal = [...new Set(applications.map(a=>a.status))].reduce((n,s)=>n+countWhere(applications,a=>a.status===s),0);
    const dup = new Map();
    applications.forEach(a => { const k=`${String(a.company).trim().toLowerCase()}|${a.date}|${String(a.role).trim().toLowerCase()}`; dup.set(k,(dup.get(k)||0)+1); });
    const duplicates = [...dup.values()].reduce((n,c)=>n+Math.max(0,c-1),0);
    const checks = [
      ['Base candidatures',total,594,total===594?'OK':'Info',total===594?'Conforme V33':'Écart dû aux modifications locales'],
      ['Somme des statuts',statusesTotal,total,statusesTotal===total?'OK':'À vérifier','Doit égaler le total'],
      ['Événements',events.length,203,events.length===203?'OK':'À vérifier','Référence V33'],
      ['Références Gmail',gmailRefs.length,255,gmailRefs.length===255?'OK':'À vérifier','Référence V33'],
      [`En cours âgés de ≥ ${LIMIT} jours`,waitingOld,0,waitingOld===0?'OK':'À vérifier','Doivent basculer en Aucune réponse'],
      [`Sans réponse âgés de < ${LIMIT} jours`,recentNoResponse,0,recentNoResponse===0?'OK':'À vérifier','Doivent apparaître En cours'],
      ['Doublons stricts entreprise/date/poste',duplicates,0,duplicates===0?'OK':'À vérifier','Contrôle dynamique']
    ];
    const frows = checks.map(r=>({cells:[esc(r[0]),esc(r[1]),esc(r[2]),`<span class="${r[3]==='OK'?'quality-ok':r[3]==='Info'?'':'quality-warn'}">${esc(r[3])}</span>`,esc(r[4])]}));
    const vrows = visualRows.map(r=>({cells:[esc(r[0]),`<span class="${r[1]==='OK'?'quality-ok':'quality-warn'}">${esc(r[1])}</span>`,esc(r[2])]}));
    document.querySelector('#qualite').innerHTML = `<div class="page-title"><h2>Contrôles qualité</h2><p>Contrôles fonctionnels et visuels de la version web V33.</p></div>
      <div class="card pad"><div class="section-header"><h3>Contrôles fonctionnels</h3><small>données et règles métier</small></div>${table(['Contrôle','Valeur observée','Référence','Résultat','Lecture'],frows,'table-green')}</div>
      <div class="card pad" style="margin-top:18px"><div class="section-header"><h3>Contrôles visuels des 9 onglets</h3><small>structure, débordements, scroll, textes obsolètes</small></div>${table(['Onglet','Résultat','Détail'],vrows,'table-green')}</div>`;
  };

  const changed = srApplyStatusRules();
  if (changed) cmSaveApplications();
  renderDashboard(); renderCandidatures(); renderEntretiens(); renderGmail(); renderStatistiques(); renderHistorique(); renderParametres(); renderAudit();
  visualRows = Object.values(labels).map(label => [label,'En cours','Mesure en cours']); renderQualite();
  visualRows = visualAudit(); renderQualite();

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTimeout(() => {
    visualRows = visualAudit(); if (b.dataset.tab === 'qualite') renderQualite();
  },0)));
})();
