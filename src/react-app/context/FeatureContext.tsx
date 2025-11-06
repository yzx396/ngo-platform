/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { EnabledFeatures } from '../../types/features';
import { getEnabledFeatures } from '../services/featureService';

interface FeatureContextType {
  features: EnabledFeatures;
  isFeatureEnabled: (key: string) => boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

/**
 * FeatureProvider component that wraps the application
 * Manages feature flags state and provides feature checking utilities
 */
export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<EnabledFeatures>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch enabled features from the API
   */
  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const enabledFeatures = await getEnabledFeatures();
      setFeatures(enabledFeatures);
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch features');
      // Set empty features on error to fail closed (all features disabled)
      setFeatures({});
    } finally {
      setLoading(false);
    }
  };

  // Load features on mount
  useEffect(() => {
    fetchFeatures();
  }, []);

  /**
   * Check if a feature is enabled
   * @param key - Feature key to check
   * @returns true if feature is enabled, false otherwise
   */
  const isFeatureEnabled = (key: string): boolean => {
    return features[key] === true;
  };

  /**
   * Refetch features from the API
   * Useful after admin changes to refresh the feature state
   */
  const refetch = async () => {
    await fetchFeatures();
  };

  const value: FeatureContextType = {
    features,
    isFeatureEnabled,
    loading,
    error,
    refetch,
  };

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

/**
 * Hook to access feature context
 * Must be used within a FeatureProvider
 */
export function useFeatures(): FeatureContextType {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
}
