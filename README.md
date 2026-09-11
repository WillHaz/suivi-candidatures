# Suivi candidatures — version web V34

Application web construite à partir du classeur Excel de suivi de candidatures et publiée avec GitHub Pages.

## Version courante

- Version : **V34**
- Date : **11/09/2026**
- Candidatures : **594**
- Événements recrutement / contacts : **246**
- Références Gmail : **255**

La V34 conserve les 594 candidatures de la V33 et enrichit l’onglet Entretiens avec 43 événements ajoutés ou requalifiés afin de rétablir la cohérence mensuelle de juillet, août et septembre 2026.

## Onglets

- Dashboard
- Candidatures
- Entretiens
- Référentiel Gmail
- Statistiques
- Contrôles qualité
- Historique versions
- Paramètres
- Audit V34

## Règles métier principales

Une candidature sans réponse reste **En cours** pendant moins de 15 jours. À partir de J+15 sans réponse, elle passe automatiquement en **Aucune réponse**. Le statut **Active — processus engagé** est réservé à un échange téléphonique ou à un entretien réellement engagé ; les accusés de réception, transmissions et relances ajoutés en V34 restent des événements de suivi et ne rendent pas automatiquement la candidature active.

## Contrôle qualité

L’onglet Contrôles qualité vérifie les volumes de référence, la cohérence de la règle des 15 jours, les statuts actifs, les doublons stricts et le rendu visuel des 9 onglets.

## Utilisation GitHub

Le projet suit le workflow **Branch / Branche → Commit / Engagement → Pull Request / Demande de fusion → Merge / Fusionner**. Le site est ensuite déployé via GitHub Pages.
