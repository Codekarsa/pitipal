import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID as string;

// Initialize Google Analytics
export const initializeGA = () => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
  }
};

// Track page views
export const trackPageView = (path: string) => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
};

// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      action,
      category,
      label,
      value,
    });
  }
};

// Predefined event helpers for common actions
export const analytics = {
  // User events
  trackSignUp: (method: string) => {
    trackEvent('sign_up', 'user', method);
  },

  trackLogin: (method: string) => {
    trackEvent('login', 'user', method);
  },

  trackLogout: () => {
    trackEvent('logout', 'user');
  },

  // Transaction events
  trackTransactionCreated: (type: 'expense' | 'income') => {
    trackEvent('transaction_created', 'transactions', type);
  },

  trackTransactionDeleted: () => {
    trackEvent('transaction_deleted', 'transactions');
  },

  // Pocket events
  trackPocketCreated: (pocketType: string) => {
    trackEvent('pocket_created', 'pockets', pocketType);
  },

  trackPocketDeleted: () => {
    trackEvent('pocket_deleted', 'pockets');
  },

  // Data management events
  trackImportCompleted: (dataType: string, count: number) => {
    trackEvent('import_completed', 'data', dataType, count);
  },

  trackExportCompleted: (dataType: string) => {
    trackEvent('export_completed', 'data', dataType);
  },

  // Feature usage events
  trackFeatureUsed: (featureName: string) => {
    trackEvent('feature_used', 'engagement', featureName);
  },
};
