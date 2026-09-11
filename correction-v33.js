// Correctifs V33 : affichage complet et statut "En cours" calculé selon l'âge réel.
(function () {
  const originalStatusById = new Map((window.V33_APPLICATION_ROWS || []).map(row => [row[0], row[12]]));
  const substantiveTypes = new Set([
    'Échange téléphonique',
    'Entretien RH',
    'Entretien Manager/Direction',
    'Entretien final'
  ]);

  function hasSubstantiveOpenProcess(application) {
    const related = events.filter(event => event.applicationId === application.id);
    if (!related.length) return false;

    const latest = related[related.length - 1];
    if (latest.outcome === 'Refus' || String(latest.next || '').toLowerCase().includes('clos')) return false;

    return related.some(event => substantiveTypes.has(event.type) && event.outcome !== 'Refus');
  }

  // Remplace la première version de la règle :
  // - toute candidature sans réponse de moins de 15 jours = En cours ;
  // - à J+15 = Aucune réponse ;
  // - Active uniquement si un vrai processus est engagé, ou si l'utilisateur l'a explicitement classée Active.
  srApplyStatusRules = function () {
    let changed = false;

    applications.forEach(application => {
      let nextStatus = application.status;
      const originalStatus = originalStatusById.get(application.id);
      const wasLegacyAutoActive = nextStatus === SR_ACTIVE_STATUS && originalStatus === SR_LEGACY_STATUS;
      const isAutomaticWaitingStatus = [SR_LEGACY_STATUS, SR_WAITING_STATUS, SR_NO_RESPONSE_STATUS].includes(nextStatus) || wasLegacyAutoActive;

      if (isAutomaticWaitingStatus) {
        if (hasSubstantiveOpenProcess(application)) {
          nextStatus = SR_ACTIVE_STATUS;
        } else {
          const age = srDaysSince(application.date);
          nextStatus = age !== null && age < SR_DAY_LIMIT ? SR_WAITING_STATUS : SR_NO_RESPONSE_STATUS;
        }
      }

      const nextAction = srActionForStatus(nextStatus);
      if (application.status !== nextStatus || application.action !== nextAction) {
        application.status = nextStatus;
        application.action = nextAction;
        changed = true;
      }
    });

    return changed;
  };

  function currentFilteredApplications() {
    const query = (currentApplicationFilter.query || '').toLowerCase().trim();
    const status = currentApplicationFilter.status || 'Tous';
    const month = currentApplicationFilter.month || 'Tous';
    const source = currentApplicationFilter.source || 'Tous';

    return applications.filter(application => {
      const text = `${application.id} ${application.company} ${application.role} ${application.family} ${application.city} ${application.status} ${application.channel} ${application.source}`.toLowerCase();
      return (!query || text.includes(query))
        && (status === 'Tous' || application.status === status)
        && (month === 'Tous' || application.month === month)
        && (source === 'Tous' || application.source === source);
    });
  }

  function statusClass(status) {
    if (status === SR_WAITING_STATUS) return 'waiting-process';
    if (status === SR_ACTIVE_STATUS) return 'active-process';
    if (status === SR_NO_RESPONSE_STATUS) return 'silent';
    return 'closed';
  }

  const previousRenderCandidatures = renderCandidatures;
  renderCandidatures = function () {
    previousRenderCandidatures();

    const filtered = currentFilteredApplications();
    const extras = filtered.slice(120);
    const tbody = document.querySelector('#candidatures table tbody');

    if (tbody && extras.length) {
      const html = extras.map(application => `
        <tr data-full-row="1">
          <td><div class="row-actions"><button class="icon-button edit-candidate-extra" data-id="${cmEscape(application.id)}" type="button">Modifier</button><button class="icon-button danger delete-candidate-extra" data-id="${cmEscape(application.id)}" type="button">Supprimer</button></div></td>
          <td>${cmEscape(application.id)}</td>
          <td>${cmEscape(application.date)}</td>
          <td>${cmEscape(application.month)}</td>
          <td>${cmEscape(application.company)}</td>
          <td>${cmEscape(application.role)}</td>
          <td>${cmEscape(application.family)}</td>
          <td>${cmEscape(application.city)}</td>
          <td>${cmEscape(application.department)}</td>
          <td>${cmEscape(application.channel)}</td>
          <td>${cmEscape(application.companyType)}</td>
          <td>${cmEscape(application.salaryMin)}</td>
          <td>${cmEscape(application.salaryMax)}</td>
          <td>${cmEscape(application.contract)}</td>
          <td><span class="status-pill ${statusClass(application.status)}">${cmEscape(application.status)}</span></td>
          <td>${cmEscape(application.source)}</td>
          <td>${cmEscape(application.action)}</td>
        </tr>`).join('');
      tbody.insertAdjacentHTML('beforeend', html);

      document.querySelectorAll('.edit-candidate-extra').forEach(button => button.addEventListener('click', () => cmOpenModal(button.dataset.id)));
      document.querySelectorAll('.delete-candidate-extra').forEach(button => button.addEventListener('click', () => cmDeleteCandidate(button.dataset.id)));
    }

    const note = [...document.querySelectorAll('#candidatures .small')].find(element => element.textContent.includes('Affichage limité'));
    if (note) note.textContent = `Affichage complet : ${filtered.length} ligne(s) correspondant aux filtres.`;
  };

  const changed = srApplyStatusRules();
  if (changed) cmSaveApplications();
  cmRefreshViews();
})();
