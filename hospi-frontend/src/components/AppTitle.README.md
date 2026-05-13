# AppTitle Component - Documentation

## 📋 Aperçu

Le composant `AppTitle` affiche une barre de titre en haut de l'application avec deux boutons de navigation:
- **Retour** (←): Permet de revenir à la page précédente
- **Actualiser** (⟳): Permet de rafraîchir la page actuelle

## 🎯 Utilisation

### Basic Usage (Partout dans l'application)

Le composant est automatiquement intégré dans `App.jsx` et s'affiche en haut de toutes les pages:

```jsx
<BrowserRouter>
  <AppTitle />
  <Routes>
    {/* ... vos routes ... */}
  </Routes>
</BrowserRouter>
```

### Advanced Usage (Dans les Layouts)

Vous pouvez personnaliser le comportement en passant des props:

```jsx
import AppTitle from './components/AppTitle';

function MyLayout() {
  const handleCustomBack = () => {
    // Logique personnalisée de retour
    navigate('/dashboard');
  };

  const handleCustomRefresh = () => {
    // Logique personnalisée de rafraîchissement
    // Par exemple: recharger les données
    fetchData();
  };

  return (
    <>
      <AppTitle 
        showControls={true}
        onBack={handleCustomBack}
        onRefresh={handleCustomRefresh}
      />
      {/* ... reste du contenu ... */}
    </>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showControls` | `boolean` | `true` | Affiche les boutons de contrôle |
| `onBack` | `function` | `null` | Fonction personnalisée pour le bouton retour |
| `onRefresh` | `function` | `null` | Fonction personnalisée pour le bouton actualiser |

## 🎨 Styling

Le composant utilise:
- **Icônes Lucide React** pour les icônes
- **CSS personnalisé** (`AppTitle.css`) pour le styling
- **Support du mode sombre** via media queries
- **Responsive design** pour mobile et desktop

### Personnaliser les couleurs

Modifiez `AppTitle.css`:

```css
.title-btn {
  color: #606060; /* Couleur par défaut */
}

.title-btn:hover {
  background-color: #e8e8e8; /* Couleur au survol */
  color: #212121;
}
```

## 💡 Exemples

### Désactiver les boutons sur certaines pages

```jsx
<AppTitle showControls={false} />
```

### Redirection personnalisée après retour

```jsx
<AppTitle 
  onBack={() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }}
/>
```

### Afficher une notification lors du rafraîchissement

```jsx
<AppTitle 
  onRefresh={() => {
    toast.promise(
      new Promise(resolve => {
        setTimeout(() => {
          window.location.reload();
          resolve();
        }, 500);
      }),
      {
        loading: 'Actualisation...',
        success: 'Page actualisée!',
        error: 'Erreur lors de l\'actualisation'
      }
    );
  }}
/>
```

## 📱 Responsive

Le composant s'adapte automatiquement sur mobile:
- Taille réduite des boutons sur petit écran
- Hauteur de 56px sur desktop, 48px sur mobile
- Espacement adapté

## ♿ Accessibilité

- Tous les boutons ont des labels aria
- Support du focus pour la navigation au clavier
- Design adapté au contraste pour l'accessibilité
- Feedback visuel au clic

## 🚀 Performance

- Composant léger et simple
- Pas de re-renders inutiles
- Utilise les hooks React natifs
- Intégration avec React Router pour la navigation

---

**Note**: Le composant est indépendant et peut être réutilisé dans d'autres projets React.

