/**
 * Tests pour le composant AppTitle
 * Utilise React Testing Library + Vitest (ou Jest)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppTitle from './AppTitle';
import { appTitleConfig, mergeConfig } from '../config/appTitleConfig';

// Mock window.history
const mockHistoryBack = vi.spyOn(window.history, 'back');
const mockLocationReload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});

describe('AppTitle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAppTitle = (props = {}) => {
    return render(
      <BrowserRouter>
        <AppTitle {...props} />
      </BrowserRouter>
    );
  };

  // ========================
  // Tests de rendu
  // ========================
  describe('Rendering', () => {
    it('devrait afficher la barre de titre', () => {
      renderAppTitle();
      const titleBar = screen.getByRole('button', { name: /retour/i }).closest('.app-title-bar');
      expect(titleBar).toBeInTheDocument();
    });

    it('devrait afficher les deux boutons par défaut', () => {
      renderAppTitle();
      const backButton = screen.getByRole('button', { name: /retour/i });
      const refreshButton = screen.getByRole('button', { name: /actualiser/i });
      expect(backButton).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();
    });

    it('ne devrait pas afficher les boutons si showControls=false', () => {
      renderAppTitle({ showControls: false });
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('ne devrait pas afficher si config.enabled=false', () => {
      const config = mergeConfig({ enabled: false });
      renderAppTitle({ config });
      const titleBar = document.querySelector('.app-title-bar');
      expect(titleBar).not.toBeInTheDocument();
    });
  });

  // ========================
  // Tests du bouton retour
  // ========================
  describe('Back Button', () => {
    it('devrait appeler history.back au clic', () => {
      renderAppTitle();
      const backButton = screen.getByRole('button', { name: /retour/i });
      fireEvent.click(backButton);
      expect(mockHistoryBack).toHaveBeenCalled();
    });

    it('devrait appeler onBack personnalisé si fourni', () => {
      const onBack = vi.fn();
      renderAppTitle({ onBack });
      const backButton = screen.getByRole('button', { name: /retour/i });
      fireEvent.click(backButton);
      expect(onBack).toHaveBeenCalled();
    });

    it('ne devrait pas afficher le bouton retour si config.back.enabled=false', () => {
      const config = mergeConfig({ back: { enabled: false } });
      renderAppTitle({ config });
      const backButton = screen.queryByRole('button', { name: /retour/i });
      expect(backButton).not.toBeInTheDocument();
    });

    it('devrait avoir le titre "Retour"', () => {
      renderAppTitle();
      const backButton = screen.getByRole('button', { name: /retour/i });
      expect(backButton).toHaveAttribute('title', 'Retour');
    });
  });

  // ========================
  // Tests du bouton actualiser
  // ========================
  describe('Refresh Button', () => {
    it('devrait appeler location.reload au clic', () => {
      renderAppTitle();
      const refreshButton = screen.getByRole('button', { name: /actualiser/i });
      fireEvent.click(refreshButton);
      expect(mockLocationReload).toHaveBeenCalled();
    });

    it('devrait appeler onRefresh personnalisé si fourni', () => {
      const onRefresh = vi.fn();
      renderAppTitle({ onRefresh });
      const refreshButton = screen.getByRole('button', { name: /actualiser/i });
      fireEvent.click(refreshButton);
      expect(onRefresh).toHaveBeenCalled();
    });

    it('ne devrait pas afficher le bouton actualiser si config.refresh.enabled=false', () => {
      const config = mergeConfig({ refresh: { enabled: false } });
      renderAppTitle({ config });
      const refreshButton = screen.queryByRole('button', { name: /actualiser/i });
      expect(refreshButton).not.toBeInTheDocument();
    });

    it('devrait avoir le titre "Actualiser"', () => {
      renderAppTitle();
      const refreshButton = screen.getByRole('button', { name: /actualiser/i });
      expect(refreshButton).toHaveAttribute('title', 'Actualiser');
    });
  });

  // ========================
  // Tests de configuration
  // ========================
  describe('Configuration', () => {
    it('devrait utiliser les labels personnalisés', () => {
      const config = mergeConfig({
        accessibility: {
          backButtonLabel: 'Précédent',
          refreshButtonLabel: 'Recharger',
        },
      });
      renderAppTitle({ config });
      const backButton = screen.getByRole('button', { name: /précédent/i });
      const refreshButton = screen.getByRole('button', { name: /recharger/i });
      expect(backButton).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();
    });

    it('devrait appeler les callbacks si configurés', () => {
      const beforeBack = vi.fn();
      const afterBack = vi.fn();
      const config = mergeConfig({
        callbacks: {
          beforeBack,
          afterBack,
        },
      });
      renderAppTitle({ config });
      const backButton = screen.getByRole('button', { name: /retour/i });
      fireEvent.click(backButton);
      expect(beforeBack).toHaveBeenCalled();
      expect(afterBack).toHaveBeenCalled();
    });
  });

  // ========================
  // Tests d'accessibilité
  // ========================
  describe('Accessibility', () => {
    it('devrait avoir des labels aria', () => {
      renderAppTitle();
      const backButton = screen.getByRole('button', { name: /retour/i });
      const refreshButton = screen.getByRole('button', { name: /actualiser/i });
      expect(backButton).toHaveAttribute('aria-label');
      expect(refreshButton).toHaveAttribute('aria-label');
    });

    it('devrait être focusable au clavier', () => {
      renderAppTitle();
      const backButton = screen.getByRole('button', { name: /retour/i });
      backButton.focus();
      expect(document.activeElement).toBe(backButton);
    });
  });

  // ========================
  // Tests d'intégration
  // ========================
  describe('Integration', () => {
    it('devrait gérer plusieurs clics successifs', () => {
      const onBack = vi.fn();
      renderAppTitle({ onBack });
      const backButton = screen.getByRole('button', { name: /retour/i });

      fireEvent.click(backButton);
      fireEvent.click(backButton);
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(3);
    });

    it('devrait gérer les callbacks même si onBack est fourni', () => {
      const beforeBack = vi.fn();
      const afterBack = vi.fn();
      const onBack = vi.fn();
      const config = mergeConfig({
        callbacks: {
          beforeBack,
          afterBack,
        },
      });

      renderAppTitle({ config, onBack });
      const backButton = screen.getByRole('button', { name: /retour/i });
      fireEvent.click(backButton);

      expect(beforeBack).toHaveBeenCalled();
      expect(onBack).toHaveBeenCalled();
      expect(afterBack).toHaveBeenCalled();
    });
  });
});

