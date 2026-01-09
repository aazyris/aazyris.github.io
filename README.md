# Aazyris GitHub Pages Portfolio

Bienvenue sur le portfolio GitHub Pages de Aazyris ! Ce site présente mes projets, compétences et informations de contact.

## 🚀 Démarrage rapide

### Prérequis
- Un compte GitHub
- Un dépôt nommé `aazyris.github.io`

### Installation locale

1. Clonez ce dépôt :
```bash
git clone https://github.com/aazyris/aazyris.github.io.git
cd aazyris.github.io
```

2. Ouvrez `index.html` dans votre navigateur pour voir le site localement

### Déploiement sur GitHub Pages

1. Poussez les fichiers vers votre dépôt :
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Activez GitHub Pages :
   - Allez dans les paramètres de votre dépôt
   - Cliquez sur "Pages" dans la barre latérale
   - Sous "Source", sélectionnez "Deploy from a branch"
   - Choisissez la branche `main` et le dossier `/root`
   - Cliquez sur "Save"

3. Votre site sera disponible à l'adresse : https://aazyris.github.io

## 📁 Structure du projet

```
aazyris.github.io/
├── index.html          # Page principale
├── styles.css          # Feuille de style
├── script.js           # JavaScript interactif
├── _config.yml         # Configuration Jekyll
├── README.md           # Documentation
└── assets/             # Images et ressources (optionnel)
```

## 🎨 Personnalisation

### Modifier les informations de base
Éditez `_config.yml` pour changer :
- Le titre et la description du site
- Vos informations personnelles
- Les liens vers vos réseaux sociaux

### Personnaliser le contenu
1. **Profil principal** : Modifiez la section `<header>` dans `index.html`
2. **Projets** : Mettez à jour les cartes dans la section `#projets`
3. **Compétences** : Ajustez les barres de progression dans la section `#competences`
4. **Contact** : Changez les informations dans la section `#contact`

### Styles et thèmes
- Les couleurs sont définies dans `:root` au début de `styles.css`
- Le site inclut un mode sombre/clair automatique
- Les animations sont entièrement personnalisables

## 🛠️ Technologies utilisées

- **HTML5** : Structure sémantique moderne
- **CSS3** : Animations avancées, Grid, Flexbox
- **JavaScript ES6+** : Interactivité et animations
- **Font Awesome** : Icônes professionnelles
- **Jekyll** : Générateur de site statique (GitHub Pages)

## ✨ Fonctionnalités

- 📱 **Responsive Design** : Adaptation parfaite mobile/desktop
- 🌙 **Mode Sombre** : Basculement automatique thème clair/sombre
- ⚡ **Animations Fluides** : Transitions et micro-interactions
- 🎯 **SEO Optimisé** : Balises méta et structure sémantique
- 📊 **Animations au Scroll** : Révélation progressive du contenu
- 🔄 **Formulaire de Contact** : Validation et feedback utilisateur

## 🚀 Déploiement

Le site est automatiquement déployé par GitHub Pages lorsque vous poussez des modifications sur la branche principale.

### Temps de déploiement
- Premier déploiement : 1-10 minutes
- Mises à jour : 1-2 minutes

## 🔧 Maintenance

### Ajouter un nouveau projet
```html
<article class="project-card">
    <div class="project-image">
        <div class="project-overlay">
            <a href="URL_DU_PROJET" class="project-link">
                <i class="fas fa-external-link-alt"></i>
            </a>
            <a href="URL_GITHUB" class="project-github">
                <i class="fab fa-github"></i>
            </a>
        </div>
    </div>
    <div class="project-content">
        <h3>Nom du Projet</h3>
        <p>Description du projet...</p>
        <div class="project-tags">
            <span class="tag">Technologie1</span>
            <span class="tag">Technologie2</span>
        </div>
    </div>
</article>
```

### Modifier une compétence
```html
<div class="skill-item">
    <span>Nouvelle Compétence</span>
    <div class="skill-bar">
        <div class="skill-progress" data-progress="85"></div>
    </div>
</div>
```

## 📈 Performance

- **Score Lighthouse** : 95+ sur mobile et desktop
- **Optimisation** : Images lazy loading, code minifié
- **Accessibilité** : Structure ARIA et contraste WCAG AA

## 🤝 Contribuer

1. Fork ce dépôt
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Commitez vos modifications (`git commit -m 'Add amazing feature'`)
4. Pushez vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Contact

- **Email** : contact@aazyris.com
- **GitHub** : [@aazyris](https://github.com/aazyris)
- **Site Web** : [aazyris.github.io](https://aazyris.github.io)

---

Made with ❤️ by [Aazyris](https://github.com/aazyris)
