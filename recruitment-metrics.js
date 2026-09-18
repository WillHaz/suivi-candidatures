// Métrique métier : une société = un événement recrutement, quel que soit le nombre d'entretiens.
(function () {
  const esc = v => cmEscape(v);

  function normalizeCompany(value) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('fr')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function recruitmentCompanyKey(event) {
    const company = normalizeCompany(event.company);
    return company || `application:${event.applicationId || ''}`;
  }

  function recruitmentCompanies() {
    const map = new Map();
    events.forEach(event => {
      const key = recruitmentCompanyKey(event);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }

  function parseDisplayDate(value) {
    const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  }

  function firstRecruitmentEvent(group) {
    return [...group].sort((a, b) => {
      const da = parseDisplayDate(a.date)?.getTime() || 0;
      const db = parseDisplayDate(b.date)?.getTime() || 0;
      return da - db;
    })[0];
  }

  function uniqueRecruitmentCount() {
    return recruitmentCompanies().size;
  }

  function monthlyRecruitmentCounts() {
    const counts = new Map();
    recruitmentCompanies().forEach(group => {
      const first = firstRecruitmentEvent(group);
      const month = first?.month || '';
      if (month) counts.set(month, (counts.get(month) || 0) + 1);
    });
    return counts;
  }

  window.recruitmentCompanyCount = uniqueRecruitmentCount;
  window.recruitmentCompanies = recruitmentCompanies;

  monthlyStatsFromData = function () {
    const recruitmentByMonth = monthlyRecruitmentCounts();
    const months = [...new Set([
      ...CONFIG.months.map(([month]) => month),
      ...applications.map(a => a.month).filter(Boolean),
      ...recruitmentByMonth.keys()
    ])].sort();

    return months.map(month => {
      const appCount = countWhere(applications, a => a.month === month);
      const recruitmentCount = recruitmentByMonth.get(month) || 0;
      return [month, appCount, recruitmentCount, pct(recruitmentCount, appCount)];
    });
  };

  renderDashboard = function () {
    const total = applications.length;
    const waiting = countWhere(applications, a => a.status === SR_WAITING_STATUS);
    const active = countWhere(applications, a => a.status === SR_ACTIVE_STATUS);
    const noResponse = countWhere(applications, a => a.status === SR_NO_RESPONSE_STATUS);
    const refusals = countWhere(applications, a => String(a.status).startsWith('Refus'));
    const recruitmentCount = uniqueRecruitmentCount();
    const statusRows = statusCountsFromData();
    const monthly = monthlyStatsFromData();

    const left = table(['Statut final', 'Nombre', '% base'], [
      ...statusRows.map(([status, number]) => ({cells:[status, number, formatPct(pct(number, total))]})),
      {__class:'total', cells:['TOTAL', total, formatPct(1)]}
    ]);

    const indicators = table(['Indicateur', 'Valeur', 'Lecture'], [
      {cells:['Total candidatures effectives', total, 'Base active du suivi']},
      {cells:['En cours (<15 jours)', waiting, 'En attente d’une première réponse']},
      {cells:['Candidatures actives', active, 'Réponse reçue / processus engagé']},
      {cells:['Sans réponse', noResponse, '15 jours ou plus sans réponse']},
      {cells:['Refus / candidatures closes', refusals, 'Tous refus confondus']},
      {cells:['Événements recrutement / contacts', recruitmentCount, '1 société = 1 événement, quel que soit le nombre d’entretiens']}
    ], 'table-green');

    const monthTable = table(['Mois', 'Candidatures', 'Sociétés en recrutement', 'Taux sociétés / candidatures'], [
      ...monthly.map(([month, appCount, recruitmentCountMonth, ratio]) => ({cells:[month, appCount, recruitmentCountMonth, formatPct(ratio)]})),
      {__class:'total', cells:['TOTAL', total, recruitmentCount, formatPct(pct(recruitmentCount, total))]}
    ], 'table-orange');

    document.querySelector('#dashboard').innerHTML = `
      <div class="page-title"><h2>Tableau de bord</h2><p>Base ${esc(CONFIG.version)} importée le ${esc(CONFIG.updatedAt)} · règle automatique des ${SR_DAY_LIMIT} jours.</p></div>
      <div class="kpi-grid dashboard-core-kpis">
        <div class="card kpi"><div class="label">Candidatures</div><div class="value">${total}</div><div class="note">Total de la base active</div></div>
        <div class="card kpi waiting-kpi"><div class="label">En cours</div><div class="value">${waiting}</div><div class="note">Sans réponse depuis moins de ${SR_DAY_LIMIT} jours</div></div>
        <div class="card kpi active-kpi"><div class="label">Actives</div><div class="value">${active}</div><div class="note">Réponse reçue / processus engagé</div></div>
        <div class="card kpi silent-kpi"><div class="label">Sans réponse</div><div class="value">${noResponse}</div><div class="note">${SR_DAY_LIMIT} jours ou plus sans réponse</div></div>
      </div>
      <div class="grid-2">
        <div class="card pad"><div class="section-header"><h3>Statuts finaux</h3><small>calculés sur la base active</small></div>${left}</div>
        <div class="card pad"><div class="section-header"><h3>Indicateurs</h3><small>règles métier dynamiques</small></div>${indicators}</div>
      </div>
      <div class="card pad" style="margin-top:18px"><div class="section-header"><h3>Suivi mensuel</h3><small>une société n’est comptée qu’une fois, au mois de son premier événement</small></div>${monthTable}</div>
      <div class="formula-note"><strong>Règles métier :</strong> une candidature « En cours » passe en « Aucune réponse » à J+15 sans réponse. Pour la métrique recrutement, une société compte pour un seul événement, même si le processus comprend plusieurs entretiens.</div>`;
  };

  renderStatistiques = function () {
    const total = applications.length;
    const recruitmentCount = uniqueRecruitmentCount();
    const statusRows = statusCountsFromData();
    const typeRows = companyTypeCountsFromData();
    const monthly = monthlyStatsFromData();
    const maxStatus = Math.max(1, ...statusRows.map(x => x[1]));
    const bars = statusRows.map(([s,n]) => `<div class="bar-row"><div>${esc(s)}</div><div class="bar-track"><div class="bar-fill" style="width:${(n/maxStatus)*100}%"></div></div><div class="bar-value">${n}</div></div>`).join('');
    document.querySelector('#statistiques').innerHTML = `
      <div class="page-title"><h2>Statistiques</h2><p>Calculs dynamiques sur la base ${esc(CONFIG.version)}. Les métriques recrutement comptent les sociétés distinctes, pas le nombre d’entretiens.</p></div>
      <div class="grid-2">
        <div class="card pad"><h3>Répartition des statuts</h3><div class="bar-list">${bars}</div></div>
        <div class="card pad"><h3>Types de société</h3>${table(['Type société','Nombre','% total'], [...typeRows.map(([t,n])=>({cells:[esc(t),n,formatPct(pct(n,total))]})),{__class:'total',cells:['TOTAL',total,formatPct(1)]}])}</div>
      </div>
      <div class="card pad" style="margin-top:18px"><h3>Suivi mensuel</h3>${table(['Mois','Candidatures','Sociétés en recrutement','Taux sociétés / candidatures'], [...monthly.map(([m,a,e,r])=>({cells:[m,a,e,formatPct(r)]})),{__class:'total',cells:['TOTAL',total,recruitmentCount,formatPct(pct(recruitmentCount,total))]}], 'table-orange')}</div>`;
  };

  const baseEntretiens = renderEntretiens;
  renderEntretiens = function () {
    baseEntretiens();
    const intro = document.querySelector('#entretiens .page-title p');
    if (intro) intro.textContent = `${events.length} lignes détaillées de suivi / entretiens issues du classeur ${CONFIG.version}. Elles correspondent à ${uniqueRecruitmentCount()} sociétés distinctes en recrutement.`;
  };

  const baseAudit = renderAudit;
  renderAudit = function () {
    baseAudit();
    const title = document.querySelector('#audit .page-title');
    if (title) {
      const recruitmentCount = uniqueRecruitmentCount();
      title.insertAdjacentHTML('afterend', `<div class="card pad audit-reference-card" style="margin-bottom:18px"><div class="section-header"><h3>Référence et métriques source</h3><small>traçabilité</small></div>${table(['Référence','Valeur','Lecture'], [
        {cells:['Dernière référence Excel', esc(CONFIG.updatedAt), `Classeur ${esc(CONFIG.version)}`]},
        {cells:['Lignes de suivi / entretiens', events.length, 'Détail brut du classeur']},
        {cells:['Événements recrutement', recruitmentCount, 'Sociétés distinctes · 1 société = 1 événement']}
      ], 'table-green')}</div>`);
    }
  };

  const baseQualite = renderQualite;
  renderQualite = function () {
    baseQualite();
    const firstTable = document.querySelector('#qualite .card .table-wrap tbody');
    if (firstTable) {
      const count = uniqueRecruitmentCount();
      firstTable.insertAdjacentHTML('beforeend', `<tr><td>Événements recrutement — sociétés distinctes</td><td>${count}</td><td>${CONFIG.totalRecruitmentCompaniesExpected}</td><td><span class="${count === CONFIG.totalRecruitmentCompaniesExpected ? 'quality-ok' : 'quality-warn'}">${count === CONFIG.totalRecruitmentCompaniesExpected ? 'OK' : 'À vérifier'}</span></td><td>1 société = 1 événement ; ${events.length} lignes détaillées restent disponibles dans Entretiens</td></tr>`);
    }
  };

  const baseParametres = renderParametres;
  renderParametres = function () {
    baseParametres();
    const tbody = document.querySelector('#parametres table tbody');
    if (tbody) {
      [...tbody.querySelectorAll('tr')].forEach(tr => {
        const first = tr.querySelector('td')?.textContent?.trim();
        if (first === 'Événements de référence') {
          tr.children[0].textContent = 'Lignes de suivi / entretiens';
          tr.children[1].textContent = String(events.length);
        }
      });
      tbody.insertAdjacentHTML('beforeend', `<tr><td>Événements recrutement de référence</td><td>${uniqueRecruitmentCount()} sociétés distinctes</td></tr><tr><td>Définition événement recrutement</td><td>1 société distincte = 1 événement, quel que soit le nombre d’entretiens</td></tr>`);
    }
  };

  renderDashboard();
  renderStatistiques();
  renderEntretiens();
  renderParametres();
  renderAudit();
  renderQualite();
})();
