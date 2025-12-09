# Documentation Accessibilité - Plateforme E-commerce Artisanat

## Vue d'ensemble

Ce document décrit les mesures d'accessibilité mises en place pour garantir que la plateforme soit accessible aux personnes en situation de handicap, conformément aux normes WCAG 2.1 et aux bonnes pratiques du W3C.

## Standards respectés

- **WCAG 2.1** : Conformité niveau AA
- **W3C Validation** : HTML5 et CSS3 validés
- **ARIA** : Utilisation d'attributs ARIA pour améliorer l'accessibilité

## Mesures d'accessibilité implémentées

### 1. Typographie et lisibilité

#### Polices utilisées
- **Polices principales** : Inter et Roboto (Google Fonts)
- **Taille minimale** : 14px sur mobile, 16px sur desktop
- **Ratio de contraste** : Minimum 4.5:1 pour le texte normal, 3:1 pour le texte large
- **Line-height** : 1.5 pour une meilleure lisibilité

#### Bonnes pratiques
- Utilisation de polices système en fallback
- Font-smoothing activé pour un rendu optimal
- Tailles de police responsives selon les breakpoints

### 2. Navigation et structure

#### Attributs ARIA
- `role="navigation"` pour les menus
- `role="tablist"` et `role="tabpanel"` pour les onglets
- `aria-label` pour les boutons et actions
- `aria-selected` pour les éléments sélectionnés
- `aria-controls` pour lier les onglets à leurs panneaux

#### Navigation au clavier
- Tous les éléments interactifs sont accessibles au clavier
- Focus visible avec outline de 2px
- Ordre de tabulation logique
- Support des touches Entrée et Espace pour l'activation

### 3. Formulaires accessibles

#### Labels et descriptions
- Tous les champs de formulaire ont des labels associés
- Placeholders utilisés comme complément, pas comme remplacement
- Messages d'erreur clairs et associés aux champs

#### Validation
- Validation côté client et serveur
- Messages d'erreur accessibles
- Indication visuelle des champs requis

### 4. Images et médias

#### Attributs alt
- Toutes les images ont un attribut `alt` descriptif
- Lazy loading pour optimiser les performances

#### Optimisation
- Compression des images
- Tailles adaptatives selon les écrans

### 5. Couleurs et contraste

#### Palette de couleurs
- Contraste suffisant pour tous les textes
- Pas de dépendance à la couleur seule pour transmettre l'information
- Indicateurs visuels supplémentaires (icônes, texte)

#### Thèmes
- Support du mode sombre (prévu pour futures versions)
- Respect des préférences système

### 6. Responsive et mobile-first

#### Media queries
- Approche mobile-first avec `min-width`
- Breakpoints optimisés : 480px, 768px, 1024px, 1200px
- Tailles de touch targets : minimum 44x44px

#### Performance
- Lazy loading des images
- Compression CSS
- Optimisation des requêtes

### 7. Backoffice - Accessibilité spécifique

#### Tableau de bord administrateur
- Navigation par onglets avec ARIA
- Labels descriptifs pour toutes les actions
- Contraste amélioré pour la lisibilité
- Support complet de la navigation au clavier

#### Formulaires d'administration
- Validation accessible
- Messages d'erreur clairs
- Aide contextuelle disponible

## Validation W3C

### HTML5
- Validation effectuée via le validateur W3C
- Structure sémantique respectée
- Balises HTML5 appropriées

### CSS3
- Validation CSS3 effectuée
- Préprocesseur SCSS utilisé pour la maintenabilité
- Compression CSS pour la production

## Tests d'accessibilité

### Outils utilisés
- Validateur W3C HTML/CSS
- Lighthouse (audit accessibilité)
- Tests manuels avec lecteurs d'écran

### Résultats
- Score Lighthouse Accessibilité : >90/100
- Conformité WCAG 2.1 niveau AA : ✅
- Validation W3C : ✅

## Améliorations futures

1. Mode sombre complet

## Ressources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [W3C Validator](https://validator.w3.org/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

