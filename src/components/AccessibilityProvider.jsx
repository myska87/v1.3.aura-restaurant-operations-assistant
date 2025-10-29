/**
 * AURA Accessibility Provider
 * WCAG 2.1 AA Compliance utilities
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const AccessibilityContext = createContext({
  highContrast: false,
  reducedMotion: false,
  fontSize: 'normal',
  toggleHighContrast: () => {},
  toggleReducedMotion: () => {},
  setFontSize: () => {},
  announceToScreenReader: () => {},
});

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSizeState] = useState('normal');

  useEffect(() => {
    // Check user preferences
    const savedHighContrast = localStorage.getItem('aura-high-contrast') === 'true';
    const savedFontSize = localStorage.getItem('aura-font-size') || 'normal';
    
    setHighContrast(savedHighContrast);
    setFontSizeState(savedFontSize);

    // Check system preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReducedMotion);

    // Apply settings
    applyAccessibilitySettings(savedHighContrast, savedFontSize, prefersReducedMotion);
  }, []);

  const applyAccessibilitySettings = (contrast, size, motion) => {
    const root = window.document.documentElement;
    
    // High contrast
    if (contrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.classList.remove('font-small', 'font-normal', 'font-large', 'font-x-large');
    root.classList.add(`font-${size}`);

    // Reduced motion
    if (motion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  };

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('aura-high-contrast', String(newValue));
    applyAccessibilitySettings(newValue, fontSize, reducedMotion);
  };

  const toggleReducedMotion = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    applyAccessibilitySettings(highContrast, fontSize, newValue);
  };

  const setFontSize = (size) => {
    setFontSizeState(size);
    localStorage.setItem('aura-font-size', size);
    applyAccessibilitySettings(highContrast, size, reducedMotion);
  };

  const announceToScreenReader = (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return (
    <AccessibilityContext.Provider 
      value={{
        highContrast,
        reducedMotion,
        fontSize,
        toggleHighContrast,
        toggleReducedMotion,
        setFontSize,
        announceToScreenReader,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

/**
 * Accessibility Utilities
 */
export const AccessibilityUtils = {
  // Skip to main content link
  SkipLink: () => (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#014D40] focus:text-white focus:rounded-lg"
    >
      Skip to main content
    </a>
  ),

  // Screen reader only text
  SROnly: ({ children }) => (
    <span className="sr-only">{children}</span>
  ),

  // Focus trap for modals
  useFocusTrap: (ref) => {
    useEffect(() => {
      if (!ref.current) return;

      const focusableElements = ref.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTab = (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      ref.current.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => {
        ref.current?.removeEventListener('keydown', handleTab);
      };
    }, [ref]);
  },
};