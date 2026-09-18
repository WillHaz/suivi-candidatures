# Suivi candidatures — application web

Version web du suivi de candidatures, synchronisée avec le classeur **V35 du 16/09/2026**.

## Base de référence

- 601 candidatures
- 253 lignes de suivi / interactions dans l’onglet Entretiens
- 262 références Gmail
- 112 sociétés distinctes ayant au moins un événement de recrutement
- règle automatique : une candidature sans réponse reste **En cours** pendant 14 jours puis passe en **Aucune réponse** à J+15
- une société compte pour **1 événement recrutement**, quel que soit le nombre d’entretiens

## Lecture des entretiens

Les 253 lignes de suivi ne sont pas toutes des entretiens formels. L’application distingue :
- les entretiens formels ;
- les échanges téléphoniques ;
- les interactions légères (accusés, transmissions, relances, contacts réseau).

Les indicateurs sont calculés dynamiquement depuis les données chargées.

## Données et stockage

Les données source sont publiées dans le dépôt. Les modifications réalisées directement dans l’application sont enregistrées localement dans le navigateur via **Local Storage / Stockage local**.

## GitHub Pages

Le site est publié depuis la branche `main / principal`.
