import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../lib/analyticsService';

// Custom hook for analytics integration
export const useAnalytics = () => {
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track page views automatically
  const trackPageView = useCallback((pageName: string, additionalData?: any) => {
    return analyticsService.trackPageView(pageName, additionalData);
  }, []);

  // Track feature usage
  const trackFeature = useCallback((featureName: string, additionalData?: any) => {
    analyticsService.trackFeatureUsage(featureName, additionalData);
  }, []);

  // Track errors
  const trackError = useCallback((error: Error, context?: string) => {
    analyticsService.trackError(error, context);
  }, []);

  // Create session analytics
  const createSessionAnalytics = useCallback(async (sessionData: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.createSessionAnalytics(sessionData);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session analytics';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get dashboard summary
  const fetchDashboardSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await analyticsService.getDashboardSummary();
      setDashboardSummary(summary);
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard summary';
      setError(errorMessage);
      console.error('Dashboard summary error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get business metrics
  const fetchBusinessMetrics = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const metrics = await analyticsService.getBusinessMetrics(filters);
      return metrics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch business metrics';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user activity
  const fetchUserActivity = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const activity = await analyticsService.getUserActivity(filters);
      return activity;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user activity';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get system performance
  const fetchSystemPerformance = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const performance = await analyticsService.getSystemPerformance(filters);
      return performance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system performance';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Data
    dashboardSummary,
    loading,
    error,
    
    // Actions
    trackPageView,
    trackFeature,
    trackError,
    createSessionAnalytics,
    fetchDashboardSummary,
    fetchBusinessMetrics,
    fetchUserActivity,
    fetchSystemPerformance,
    
    // Utility
    clearError: () => setError(null)
  };
};

// Custom hook for page tracking
export const usePageTracking = (pageName: string, additionalData?: any) => {
  useEffect(() => {
    const trackExit = analyticsService.trackPageView(pageName, additionalData);
    
    // Track page exit when component unmounts
    return trackExit;
  }, [pageName, additionalData]);
};

// Custom hook for feature tracking with click counter
export const useFeatureTracking = () => {
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  
  const trackFeatureClick = useCallback((featureName: string, additionalData?: any) => {
    // Update click count
    setClickCounts(prev => ({
      ...prev,
      [featureName]: (prev[featureName] || 0) + 1
    }));
    
    // Track the feature usage
    analyticsService.trackFeatureUsage(featureName, {
      ...additionalData,
      click_count: (clickCounts[featureName] || 0) + 1
    });
  }, [clickCounts]);

  return {
    trackFeatureClick,
    clickCounts
  };
};

// Custom hook for error boundary integration
export const useErrorTracking = () => {
  const trackError = useCallback((error: Error, errorInfo?: any) => {
    analyticsService.trackError(error, errorInfo?.componentStack || 'unknown');
  }, []);

  return { trackError };
};
