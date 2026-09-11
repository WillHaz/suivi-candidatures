// Angle entretiens : distingue les sociétés, les interactions suivies et les vrais échanges/entretiens.
(function () {
  const esc = v => cmEscape(v);

  function isFormalInterview(event) {
    return /^Entretien\b/i.test(String(event.type || '').trim());
  }

  function isPhoneExchange(event) {
    return String(event.type || '').trim() === 'Échange téléphonique';
  }

  function interviewMetrics() {
    const companies = typeof window.recruitmentCompanyCount === 'function'
      ? window.recruitmentCompanyCount()
      : new Set(events.map(e => String(e.company || '').trim().toLocaleLowerCase('fr')).filter(Boolean)).size;
    const formalInterviews = events.filter(isFormalInterview).length;
    const phoneExchanges = events.filter(isPhoneExchange).length;
    const substantive = formalInterviews + phoneExchanges;
    const interactions = events.length;
    return {
      companies,
      formalInterviews,
      phoneExchanges,
      substantive,
      interactions,
      interactionsPerCompany: companies ? interactions / companies : 0,
      substantivePerCompany: companies ? substantive / companies : 0
    };
  }

  window.interviewMetrics = interviewMetrics;

  const baseDashboard = renderDashboard;
  renderDashboard = function () {
    baseDashboard();
    const m = interviewMetrics();
    const core = document.querySelector('#dashboard .dashboard-core-kpis');
    if (core && !document.querySelector('#dashboard .interview-angle-card')) {
      core.insertAdjacentHTML('afterend', `
        <div class="card pad interview-angle-card" style="margin-bottom:18px">
          <div class="section-header"><h3>Parcours recrutement</h3><small>sociétés, entretiens et intensité du suivi</small></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px">
            <div class="kpi"><div class="label">Sociétés en recrutement</div><div class="value">${m.companies}</div><div class="note">1 société = 1 événement recrutement</div></div>
            <div class="kpi"><div class="label">Entretiens / interactions suivies</div><div class="value">${m.interactions}</div><div class="note">Toutes les lignes détaillées de l’onglet Entretiens</div></div>
            <div class="kpi"><div class="label">Moyenne par société</div><div class="value">${m.interactionsPerCompany.toFixed(1).replace('.', ',')}</div><div class="note">${m.interactions} interactions ÷ ${m.companies} sociétés</div></div>
          </div>
          <p class="small" style="margin:12px 0 0"><strong>Lecture précise :</strong> sur les ${m.interactions} interactions enregistrées, ${m.substantive} sont des échanges téléphoniques ou entretiens substantiels (${m.phoneExchanges} échanges téléphoniques + ${m.formalInterviews} entretiens formels). Cela représente ${m.substantivePerCompany.toFixed(1).replace('.', ',')} étape substantielle par société en moyenne.</p>
        </div>`);
    }

    const indicatorRows = [...document.querySelectorAll('#dashboard .grid-2 .table-green tbody tr')];
    indicatorRows.forEach(tr => {
      const first = tr.querySelector('td')?.textContent?.trim();
      if (first === 'Événements recrutement / contacts') {
        tr.children[0].textContent = 'Sociétés en recrutement';
        tr.children[1].textContent = String(m.companies);
        tr.children[2].textContent = '1 société = 1 événement recrutement';
      }
    });
    const indicatorBody = document.querySelector('#dashboard .grid-2 .table-green tbody');
    if (indicatorBody && ![...indicatorBody.querySelectorAll('tr')].some(tr => tr.firstElementChild?.textContent?.trim() === 'Entretiens formels')) {
      indicatorBody.insertAdjacentHTML('beforeend', `
        <tr><td>Entretiens formels</td><td>${m.formalInterviews}</td><td>RH + Manager/Direction + entretien final</td></tr>
        <tr><td>Échanges téléphoniques</td><td>${m.phoneExchanges}</td><td>Échanges de recrutement par téléphone</td></tr>
        <tr><td>Échanges / entretiens substantiels</td><td>${m.substantive}</td><td>${m.substantivePerCompany.toFixed(1).replace('.', ',')} par société en moyenne</td></tr>`);
    }
  };

  const baseEntretiens = renderEntretiens;
  renderEntretiens = function () {
    baseEntretiens();
    const m = interviewMetrics();
    const intro = document.querySelector('#entretiens .page-title p');
    if (intro) {
      intro.textContent = `${m.interactions} interactions de suivi pour ${m.companies} sociétés, soit ${m.interactionsPerCompany.toFixed(1).replace('.', ',')} interactions par société en moyenne. Parmi elles : ${m.phoneExchanges} échanges téléphoniques et ${m.formalInterviews} entretiens formels.`;
    }
  };

  const baseAudit = renderAudit;
  renderAudit = function () {
    baseAudit();
    const m = interviewMetrics();
    const auditCard = document.querySelector('#audit .audit-reference-card tbody');
    if (auditCard && ![...auditCard.querySelectorAll('tr')].some(tr => tr.firstElementChild?.textContent?.trim() === 'Moyenne interactions / société')) {
      auditCard.insertAdjacentHTML('beforeend', `
        <tr><td>Moyenne interactions / société</td><td>${m.interactionsPerCompany.toFixed(1).replace('.', ',')}</td><td>${m.interactions} lignes ÷ ${m.companies} sociétés</td></tr>
        <tr><td>Échanges / entretiens substantiels</td><td>${m.substantive}</td><td>${m.phoneExchanges} téléphoniques + ${m.formalInterviews} entretiens formels</td></tr>`);
    }
  };

  renderDashboard();
  renderEntretiens();
  renderAudit();
})();
