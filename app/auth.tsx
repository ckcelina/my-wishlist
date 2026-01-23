
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";

type Mode = "signin" | "signup" | "forgot-password";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  socialButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  socialButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#333",
  },
  dividerText: {
    color: "#999",
    paddingHorizontal: 16,
    fontSize: 14,
  },
  switchModeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  switchModeText: {
    color: "#999",
    fontSize: 14,
  },
  switchModeButton: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  forgotPasswordButton: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
  },
  backButton: {
    alignSelf: "center",
    marginTop: 16,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 14,
  },
  successMessage: {
    backgroundColor: "#1a4d2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successMessageText: {
    color: "#4ade80",
    fontSize: 14,
    textAlign: "center",
  },
});

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signInWithGitHub, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (mode === "signup" && !name) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        console.log('[AuthScreen] User tapped Sign In button');
        await signInWithEmail(email, password);
        console.log('[AuthScreen] Sign in successful, navigating to wishlists');
        router.replace("/wishlists");
      } else {
        console.log('[AuthScreen] User tapped Sign Up button');
        await signUpWithEmail(email, password, name);
        console.log('[AuthScreen] Sign up successful');
        // Navigation is handled in AuthContext after signup
      }
    } catch (error: any) {
      console.error('[AuthScreen] Authentication error:', error);
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      console.log('[AuthScreen] User tapped Reset Password button');
      await resetPassword(email);
      setResetEmailSent(true);
      console.log('[AuthScreen] Password reset email sent');
    } catch (error: any) {
      console.error('[AuthScreen] Password reset error:', error);
      Alert.alert("Error", error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple" | "github") => {
    setLoading(true);
    try {
      console.log(`[AuthScreen] User tapped ${provider} sign in button`);
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      } else {
        await signInWithGitHub();
      }
      console.log(`[AuthScreen] ${provider} sign in successful, navigating to wishlists`);
      router.replace("/wishlists");
    } catch (error: any) {
      console.error(`[AuthScreen] ${provider} sign in error:`, error);
      Alert.alert("Error", error.message || `${provider} sign in failed`);
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPasswordScreen = () => {
    const titleText = "Reset Password";
    const subtitleText = "Enter your email to receive a password reset link";
    const buttonText = "Send Reset Link";
    const backButtonText = "Back to Sign In";

    return (
      <View style={styles.scrollContent}>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        {resetEmailSent && (
          <View style={styles.successMessage}>
            <Text style={styles.successMessageText}>
              Password reset email sent! Check your inbox.
            </Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setMode("signin");
            setResetEmailSent(false);
          }}
        >
          <Text style={styles.backButtonText}>{backButtonText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAuthScreen = () => {
    const isSignIn = mode === "signin";
    const titleText = isSignIn ? "Welcome Back" : "Create Account";
    const subtitleText = isSignIn
      ? "Sign in to continue to your wishlists"
      : "Sign up to start saving your wishlist items";
    const buttonText = isSignIn ? "Sign In" : "Sign Up";
    const switchText = isSignIn
      ? "Don't have an account?"
      : "Already have an account?";
    const switchButtonText = isSignIn ? "Sign Up" : "Sign In";

    return (
      <View style={styles.scrollContent}>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        {!isSignIn && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {isSignIn && (
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => setMode("forgot-password")}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth("google")}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth("apple")}
            disabled={loading}
          >
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth("github")}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Continue with GitHub</Text>
        </TouchableOpacity>

        <View style={styles.switchModeContainer}>
          <Text style={styles.switchModeText}>{switchText}</Text>
          <TouchableOpacity onPress={() => setMode(isSignIn ? "signup" : "signin")}>
            <Text style={styles.switchModeButton}>{switchButtonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {mode === "forgot-password" ? renderForgotPasswordScreen() : renderAuthScreen()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
