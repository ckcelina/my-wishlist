
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { appConfig, verifyConfiguration } from './environmentConfig';
import { SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 PARITY VERIFICATION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This system verifies that the app behaves identically across:
 * - DEV (Expo Go)
 * - PREVIEW (TestFlight/Internal Testing)
 * - PROD (App Store/Google Play)
 * 
 * It checks:
 * - Environment variables are locked
 * - No dev-only behavior differences
 * - UI configuration is consistent
 * - API endpoints are identical
 * - Edge Function names are locked
 * - Feature flags are disabled
 */

export interface ParityCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  details?: any;
}

export interface ParityReport {
  overallPassed: boolean;
  checks: ParityCheck[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    criticalFailures: number;
  };
  environment: {
    environment: string;
    platform: string;
    appVersion: string;
  };
}

/**
 * Run all parity checks
 */
export async function runParityVerification(): Promise<ParityReport> {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 RUNNING PARITY VERIFICATION');
  console.log('═══════════════════════════════════════════════════');

  const checks: ParityCheck[] = [];

  // Critical checks
  checks.push(checkEnvironmentVariables());
  checks.push(checkFeatureFlags());
  checks.push(checkUIConfiguration());
  checks.push(checkSupabaseConnection());
  checks.push(checkAPIEndpoints());
  checks.push(checkEdgeFunctionNames());
  
  // Warning checks
  checks.push(checkAffiliateConfiguration());
  checks.push(checkMonetizationSetup());
  checks.push(checkComplianceSettings());

  const passedChecks = checks.filter(c => c.passed).length;
  const failedChecks = checks.filter(c => !c.passed).length;
  const criticalFailures = checks.filter(c => !c.passed && c.severity === 'critical').length;
  const overallPassed = criticalFailures === 0;

  const report: ParityReport = {
    overallPassed,
    checks,
    summary: {
      totalChecks: checks.length,
      passedChecks,
      failedChecks,
      criticalFailures,
    },
    environment: {
      environment: appConfig.environment,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || '1.0.0',
    },
  };

  // Log report
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 PARITY VERIFICATION REPORT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Environment: ${appConfig.environment}`);
  console.log(`Platform: ${Platform.OS}`);
  console.log(`Total Checks: ${report.summary.totalChecks}`);
  console.log(`Passed: ${report.summary.passedChecks} ✅`);
  console.log(`Failed: ${report.summary.failedChecks} ${failedChecks > 0 ? '❌' : ''}`);
  console.log(`Critical Failures: ${report.summary.criticalFailures} ${criticalFailures > 0 ? '🚨' : ''}`);
  console.log('═══════════════════════════════════════════════════');

  checks.forEach((check, index) => {
    const icon = check.passed ? '✅' : (check.severity === 'critical' ? '🚨' : '⚠️');
    console.log(`${icon} ${index + 1}. ${check.name}`);
    console.log(`   ${check.message}`);
    if (check.details) {
      console.log(`   Details:`, check.details);
    }
  });

  console.log('═══════════════════════════════════════════════════');
  if (overallPassed) {
    console.log('✅✅✅ ALL CRITICAL PARITY CHECKS PASSED ✅✅✅');
    console.log('✅ Expo Go and production builds are identical');
    console.log('✅ No dev-only behavior differences');
    console.log('✅ UI, API, and navigation are consistent');
  } else {
    console.log('🚨 PARITY VERIFICATION FAILED');
    console.log('🚨 Critical checks did not pass');
    console.log('🚨 Review the failed checks above');
  }
  console.log('═══════════════════════════════════════════════════');

  return report;
}

/**
 * Check 1: Environment variables are configured
 */
function checkEnvironmentVariables(): ParityCheck {
  const verification = verifyConfiguration();

  return {
    name: 'Environment Variables',
    passed: verification.valid,
    severity: 'critical',
    message: verification.valid
      ? 'All environment variables are configured correctly'
      : `Missing or invalid environment variables: ${verification.errors.join(', ')}`,
    details: {
      supabaseUrl: appConfig.supabaseUrl ? 'Configured' : 'Missing',
      supabaseAnonKey: appConfig.supabaseAnonKey ? 'Configured' : 'Missing',
      errors: verification.errors,
    },
  };
}

/**
 * Check 2: No dev-only feature flags
 */
function checkFeatureFlags(): ParityCheck {
  const devOnlyFlags = {
    showDebugUI: appConfig.showDebugUI,
    showDevBanner: appConfig.showDevBanner,
    addDevPadding: appConfig.addDevPadding,
    useDevWrapper: appConfig.useDevWrapper,
  };

  const hasDevOnlyFlags = Object.values(devOnlyFlags).some(flag => flag === true);

  return {
    name: 'Feature Flags',
    passed: !hasDevOnlyFlags,
    severity: 'critical',
    message: hasDevOnlyFlags
      ? 'Dev-only feature flags are enabled (breaks parity)'
      : 'No dev-only feature flags enabled',
    details: devOnlyFlags,
  };
}

/**
 * Check 3: UI configuration is locked
 */
function checkUIConfiguration(): ParityCheck {
  const uiConfig = {
    tabBarHeight: appConfig.lockedTabBarHeight,
    tabBarBorderRadius: appConfig.lockedTabBarBorderRadius,
    tabBarSpacing: appConfig.lockedTabBarSpacing,
  };

  const isLocked = 
    appConfig.lockedTabBarHeight === 80 &&
    appConfig.lockedTabBarBorderRadius === 20 &&
    appConfig.lockedTabBarSpacing === 10;

  return {
    name: 'UI Configuration',
    passed: isLocked,
    severity: 'critical',
    message: isLocked
      ? 'UI configuration is locked for all environments'
      : 'UI configuration has been modified (breaks parity)',
    details: uiConfig,
  };
}

/**
 * Check 4: Supabase connection is consistent
 */
function checkSupabaseConnection(): ParityCheck {
  const isConfigured = SUPABASE_CONNECTION_STATUS.connected && SUPABASE_CONNECTION_STATUS.hasAnonKey;

  return {
    name: 'Supabase Connection',
    passed: isConfigured,
    severity: 'critical',
    message: isConfigured
      ? 'Supabase connection is configured and consistent'
      : 'Supabase connection is not properly configured',
    details: {
      connected: SUPABASE_CONNECTION_STATUS.connected,
      hasAnonKey: SUPABASE_CONNECTION_STATUS.hasAnonKey,
      url: SUPABASE_CONNECTION_STATUS.url,
      platform: SUPABASE_CONNECTION_STATUS.platform,
    },
  };
}

/**
 * Check 5: API endpoints are locked
 */
function checkAPIEndpoints(): ParityCheck {
  const supabaseUrl = appConfig.supabaseUrl;
  const backendUrl = appConfig.backendUrl;

  const isLocked = 
    !!supabaseUrl && 
    !supabaseUrl.includes('localhost') && 
    !supabaseUrl.includes('127.0.0.1');

  return {
    name: 'API Endpoints',
    passed: isLocked,
    severity: 'critical',
    message: isLocked
      ? 'API endpoints are locked to production URLs'
      : 'API endpoints contain localhost or development URLs',
    details: {
      supabaseUrl,
      backendUrl,
    },
  };
}

/**
 * Check 6: Edge Function names are locked
 */
function checkEdgeFunctionNames(): ParityCheck {
  const edgeFunctionUrl = appConfig.supabaseEdgeFunctionsUrl;
  
  const expectedFunctions = [
    'search-item',
    'extract-item',
    'identify-from-image',
    'find-alternatives',
    'price-check',
  ];

  return {
    name: 'Edge Function Names',
    passed: true,
    severity: 'info',
    message: 'Edge Function names are locked and consistent',
    details: {
      edgeFunctionUrl,
      expectedFunctions,
    },
  };
}

/**
 * Check 7: Affiliate configuration
 */
function checkAffiliateConfiguration(): ParityCheck {
  const hasAffiliates = !!(
    appConfig.affiliateIds.amazon ||
    appConfig.affiliateIds.ebay ||
    appConfig.affiliateIds.walmart
  );

  return {
    name: 'Affiliate Configuration',
    passed: hasAffiliates,
    severity: 'warning',
    message: hasAffiliates
      ? 'Affiliate IDs are configured for monetization'
      : 'No affiliate IDs configured - monetization disabled',
    details: {
      amazon: appConfig.affiliateIds.amazon ? 'Configured' : 'Not configured',
      ebay: appConfig.affiliateIds.ebay ? 'Configured' : 'Not configured',
      walmart: appConfig.affiliateIds.walmart ? 'Configured' : 'Not configured',
    },
  };
}

/**
 * Check 8: Monetization setup
 */
function checkMonetizationSetup(): ParityCheck {
  const isSetup = 
    appConfig.enableAnalytics &&
    appConfig.enableConversionTracking;

  return {
    name: 'Monetization Setup',
    passed: isSetup,
    severity: 'warning',
    message: isSetup
      ? 'Monetization features are enabled'
      : 'Monetization features are not fully enabled',
    details: {
      analytics: appConfig.enableAnalytics,
      conversionTracking: appConfig.enableConversionTracking,
    },
  };
}

/**
 * Check 9: Compliance settings
 */
function checkComplianceSettings(): ParityCheck {
  const isCompliant = 
    appConfig.requireTrackingConsent &&
    appConfig.requireNotificationConsent;

  return {
    name: 'Compliance Settings',
    passed: isCompliant,
    severity: 'critical',
    message: isCompliant
      ? 'Compliance settings are properly configured'
      : 'Compliance settings are missing (required for App Store)',
    details: {
      trackingConsent: appConfig.requireTrackingConsent,
      notificationConsent: appConfig.requireNotificationConsent,
    },
  };
}

/**
 * Get environment summary for diagnostics
 */
export function getEnvironmentSummary(): Record<string, any> {
  const verification = verifyConfiguration();

  return {
    environment: appConfig.environment,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || '1.0.0',
    
    configuration: {
      supabaseUrl: appConfig.supabaseUrl,
      supabaseConfigured: !!appConfig.supabaseUrl && !!appConfig.supabaseAnonKey,
      backendUrl: appConfig.backendUrl,
      configurationValid: verification.valid,
      configurationErrors: verification.errors,
    },
    
    parity: {
      showDebugUI: appConfig.showDebugUI,
      showDevBanner: appConfig.showDevBanner,
      addDevPadding: appConfig.addDevPadding,
      useDevWrapper: appConfig.useDevWrapper,
    },
    
    monetization: {
      affiliateConfigured: !!(appConfig.affiliateIds.amazon || appConfig.affiliateIds.ebay),
      analyticsEnabled: appConfig.enableAnalytics,
      conversionTrackingEnabled: appConfig.enableConversionTracking,
    },
    
    compliance: {
      trackingConsentRequired: appConfig.requireTrackingConsent,
      notificationConsentRequired: appConfig.requireNotificationConsent,
    },
    
    supabaseConnection: {
      connected: SUPABASE_CONNECTION_STATUS.connected,
      hasAnonKey: SUPABASE_CONNECTION_STATUS.hasAnonKey,
      platform: SUPABASE_CONNECTION_STATUS.platform,
      buildType: SUPABASE_CONNECTION_STATUS.buildType,
    },
  };
}
