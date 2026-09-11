// Ajustements d'interface propres à l'import V33, chargés après les règles de statut.
(function () {
  const baseDashboard = renderDashboard;
  renderDashboard = function () {
    baseDashboard();
    document.querySelectorAll('#dashboard table tbody tr').forEach(tr => {
      const first = tr.querySelector('td')?.textContent?.trim();
      if (first === 'Nouvelles lignes V31') tr.remove();
    });
    const title = document.querySelector('#dashboard .page-title p');
    if (title) title.textContent = `Base V33 importée le ${CONFIG.updatedAt} · règle automatique des 15 jours.`;
  };

  const baseCandidates = renderCandidatures;
  renderCandidatures = function () {
    baseCandidates();
    const reset = document.querySelector('#reset-candidates');
    if (reset) reset.textContent = 'Réinitialiser depuis V33';
    const intro = document.querySelector('#candidatures .page-title p');
    if (intro) intro.insertAdjacentHTML('beforeend', ' <strong>Source :</strong> classeur V33 du 11/09/2026.');
  };

  cmResetDemo = function () {
    if (!window.confirm('Réinitialiser toutes les modifications locales et revenir aux 594 candidatures du classeur V33 ?')) return;
    applications.splice(0, applications.length, ...window.v33BuildApplications());
    localStorage.removeItem('suivi-candidatures-local-v1');
    localStorage.setItem('suivi-candidatures-data-version', 'V33');
    Object.assign(currentApplicationFilter, {query:'', status:'Tous', month:'Tous', source:'Tous'});
    cmRefreshViews();
  };

  // Le gestionnaire avait déjà relié le bouton à l'ancienne fonction : on re-rend pour brancher la nouvelle.
  renderDashboard();
  renderCandidatures();
  renderEntretiens();
  renderGmail();
  renderStatistiques();
  renderQualite();
  renderHistorique();
  renderParametres();
  renderAudit();
})();
