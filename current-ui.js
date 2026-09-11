// Ajustements d'interface pour la version courante V34.
(function () {
  const baseDashboard = renderDashboard;
  renderDashboard = function () {
    baseDashboard();
    const title = document.querySelector('#dashboard .page-title p');
    if (title) title.textContent = `Base V34 importée le ${CONFIG.updatedAt} · règle automatique des 15 jours.`;
  };

  const baseCandidates = renderCandidatures;
  renderCandidatures = function () {
    baseCandidates();
    const filtered = applications.filter(a => {
      const query=(currentApplicationFilter.query||'').toLowerCase().trim();
      const status=currentApplicationFilter.status||'Tous';
      const month=currentApplicationFilter.month||'Tous';
      const source=currentApplicationFilter.source||'Tous';
      const text=`${a.id} ${a.company} ${a.role} ${a.family} ${a.city} ${a.status} ${a.channel} ${a.source}`.toLowerCase();
      return (!query || text.includes(query)) && (status==='Tous'||a.status===status) && (month==='Tous'||a.month===month) && (source==='Tous'||a.source===source);
    });
    const extras=filtered.slice(120);
    const tbody=document.querySelector('#candidatures table tbody');
    if (tbody && extras.length) {
      const cls=s => s===SR_WAITING_STATUS?'waiting-process':s===SR_ACTIVE_STATUS?'active-process':s===SR_NO_RESPONSE_STATUS?'silent':'closed';
      tbody.insertAdjacentHTML('beforeend',extras.map(a=>`<tr><td><div class="row-actions"><button class="icon-button edit-current-extra" data-id="${cmEscape(a.id)}" type="button">Modifier</button><button class="icon-button danger delete-current-extra" data-id="${cmEscape(a.id)}" type="button">Supprimer</button></div></td><td>${cmEscape(a.id)}</td><td>${cmEscape(a.date)}</td><td>${cmEscape(a.month)}</td><td>${cmEscape(a.company)}</td><td>${cmEscape(a.role)}</td><td>${cmEscape(a.family)}</td><td>${cmEscape(a.city)}</td><td>${cmEscape(a.department)}</td><td>${cmEscape(a.channel)}</td><td>${cmEscape(a.companyType)}</td><td>${cmEscape(a.salaryMin)}</td><td>${cmEscape(a.salaryMax)}</td><td>${cmEscape(a.contract)}</td><td><span class="status-pill ${cls(a.status)}">${cmEscape(a.status)}</span></td><td>${cmEscape(a.source)}</td><td>${cmEscape(a.action)}</td></tr>`).join(''));
      document.querySelectorAll('.edit-current-extra').forEach(b=>b.addEventListener('click',()=>cmOpenModal(b.dataset.id)));
      document.querySelectorAll('.delete-current-extra').forEach(b=>b.addEventListener('click',()=>cmDeleteCandidate(b.dataset.id)));
    }
    const note=[...document.querySelectorAll('#candidatures .small')].find(e=>e.textContent.includes('Affichage limité'));
    if (note) note.textContent=`Affichage complet : ${filtered.length} ligne(s) correspondant aux filtres.`;
    const reset=document.querySelector('#reset-candidates'); if (reset) reset.textContent='Réinitialiser depuis V34';
    const intro=document.querySelector('#candidatures .page-title p');
    if (intro && !intro.textContent.includes('V34')) intro.insertAdjacentHTML('beforeend',' <strong>Source :</strong> classeur V34 du 11/09/2026.');
  };

  cmResetDemo = function () {
    if (!window.confirm('Réinitialiser les modifications locales et revenir aux 594 candidatures de référence V34 ?')) return;
    applications.splice(0,applications.length,...window.currentBuildApplications());
    localStorage.removeItem('suivi-candidatures-local-v1');
    localStorage.setItem('suivi-candidatures-data-version','V34');
    Object.assign(currentApplicationFilter,{query:'',status:'Tous',month:'Tous',source:'Tous'});
    cmRefreshViews();
  };

  renderDashboard(); renderCandidatures(); renderEntretiens(); renderGmail(); renderStatistiques(); renderQualite(); renderHistorique(); renderParametres(); renderAudit();
})();
