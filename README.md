# Suivi candidatures — version web

Prototype pédagogique construit à partir de la structure d'un classeur Excel de suivi de candidatures.

## Objectif

Reproduire dans une application web les onglets suivants :

- Dashboard
- Candidatures
- Entretiens
- Référentiel Gmail
- Statistiques
- Contrôles qualité
- Historique versions
- Paramètres
- Audit V31

Les données du classeur original ne sont **pas** publiées. Le prototype génère des données synthétiques afin de conserver les mêmes volumes globaux (584 candidatures, 203 événements) et de démontrer les calculs.

## Formules Excel → JavaScript

Quelques équivalences utilisées :

- `COUNTIF / NB.SI` → `countWhere(...)`
- `COUNTA / NBVAL` → `array.length`
- `SUM / SOMME` → `reduce(...)`
- `IF / SI` → opérateur conditionnel JavaScript

## Utilisation

Ouvrir `index.html` dans un navigateur, ou publier le dépôt avec GitHub Pages.

## Prochaine étape

Brancher une vraie couche de stockage privée avant d'utiliser des données personnelles réelles.
