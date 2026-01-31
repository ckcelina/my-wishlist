
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { trackAppVersion } from '@/utils/versionTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Safe wrapper for trackAppVersion - ensures it never throws
 */
const safeTrackAppVersion = async () => {
  try {
    if (typeof trackAppVersion === 'function') {
      await trackAppVersion();
    }
  } catch (e) {
    // Swallow - never throw from error handler
    console.warn('[ErrorBoundary] trackAppVersion failed:', e);
  }
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error caught:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Track app version (fire-and-forget, never blocks)
    safeTrackAppVersion();

    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    console.log('[ErrorBoundary] Resetting error state');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleCopyDiagnostics = async () => {
    try {
      const diagnostics = this.getDiagnosticsText();
      await Clipboard.setStringAsync(diagnostics);
      console.log('[ErrorBoundary] Diagnostics copied to clipboard');
      // Show a simple alert (cross-platform compatible)
      if (Platform.OS === 'web') {
        alert('Diagnostics copied to clipboard');
      }
    } catch (error) {
      console.error('[ErrorBoundary] Failed to copy diagnostics:', error);
    }
  };

  getDiagnosticsText = (): string => {
    const appVersion = Constants.expoConfig?.version || 'unknown';
    const buildNumber = Application.nativeBuildVersion || 'unknown';
    const platform = Platform.OS;
    const platformVersion = Platform.Version;
    
    const errorMessage = this.state.error?.message || 'Unknown error';
    const errorStack = this.state.error?.stack || 'No stack trace';
    const componentStack = this.state.errorInfo?.componentStack || 'No component stack';
    
    return `
=== MY WISHLIST ERROR DIAGNOSTICS ===

App Version: ${appVersion}
Build Number: ${buildNumber}
Platform: ${platform} ${platformVersion}
Timestamp: ${new Date().toISOString()}

=== ERROR ===
${errorMessage}

=== STACK TRACE ===
${errorStack}

=== COMPONENT STACK ===
${componentStack}

=== END DIAGNOSTICS ===
    `.trim();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Determine theme colors (default to light theme if theme context unavailable)
      const isDark = true; // Default to dark for better error visibility
      const backgroundColor = isDark ? '#765943' : '#ede8e3';
      const textColor = isDark ? '#FFFFFF' : '#000000';
      const secondaryTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
      const cardBackground = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
      const buttonBackground = isDark ? '#FFFFFF' : '#765943';
      const buttonTextColor = isDark ? '#765943' : '#FFFFFF';

      const styles = StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor,
        },
        title: {
          fontSize: 24,
          fontWeight: '700',
          marginBottom: 12,
          color: textColor,
          textAlign: 'center',
        },
        message: {
          fontSize: 16,
          textAlign: 'center',
          color: secondaryTextColor,
          marginBottom: 32,
          lineHeight: 24,
        },
        errorDetails: {
          maxHeight: 200,
          width: '100%',
          padding: 16,
          backgroundColor: cardBackground,
          borderRadius: 12,
          marginBottom: 24,
        },
        errorTitle: {
          fontSize: 14,
          fontWeight: '600',
          marginBottom: 8,
          color: '#FF3B30',
        },
        errorText: {
          fontSize: 12,
          color: textColor,
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
          marginBottom: 8,
        },
        errorStack: {
          fontSize: 10,
          color: secondaryTextColor,
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        },
        buttonContainer: {
          width: '100%',
          gap: 12,
        },
        button: {
          backgroundColor: buttonBackground,
          paddingHorizontal: 32,
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          width: '100%',
        },
        buttonSecondary: {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: buttonBackground,
        },
        buttonText: {
          color: buttonTextColor,
          fontSize: 16,
          fontWeight: '600',
        },
        buttonTextSecondary: {
          color: buttonBackground,
        },
        diagnosticsInfo: {
          fontSize: 12,
          color: secondaryTextColor,
          textAlign: 'center',
          marginTop: 16,
        },
      });

      const errorMessage = this.state.error?.message || 'Unknown error';
      const showDiagnostics = __DEV__ || true; // Always show for debugging

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            Try again, or copy diagnostics to share with support.
          </Text>

          {showDiagnostics && this.state.error && (
            <ScrollView style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {this.state.error.stack && (
                <Text style={styles.errorStack}>
                  {this.state.error.stack.substring(0, 500)}
                  {this.state.error.stack.length > 500 ? '...' : ''}
                </Text>
              )}
            </ScrollView>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            {showDiagnostics && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={this.handleCopyDiagnostics}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Copy Diagnostics
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showDiagnostics && (
            <Text style={styles.diagnosticsInfo}>
              Diagnostics include app version, platform info, and error details
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
