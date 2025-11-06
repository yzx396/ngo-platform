import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatures } from '../context/FeatureContext';

interface FeatureRouteProps {
  featureKey: string;
  children: ReactNode;
  redirectTo?: string;
}

/**
 * FeatureRoute component
 * Wraps routes that should only be accessible when a feature flag is enabled
 * Redirects to home if feature is disabled
 */
export function FeatureRoute({ featureKey, children, redirectTo = '/' }: FeatureRouteProps) {
  const { isFeatureEnabled } = useFeatures();

  if (!isFeatureEnabled(featureKey)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
