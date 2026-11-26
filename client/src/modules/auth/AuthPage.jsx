import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  Key,
  Sparkles,
  ArrowRight,
  Loader2,
  Compass,
} from "lucide-react";

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    const script = existing || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Could not load identity provider"));
    if (!existing) document.head.appendChild(script);
  });

export default function AuthPage({ initialMode = "signin" }) {
  const {
    login,
    initiateRegistration,
    resendRegistrationCode,
    verifyRegistration,
    googleLogin,
    appleLogin,
    forgotPassword,
    resendPasswordResetCode,
    resetPassword,
    checkUsername,
    getAuthProviders,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState(initialMode); // "signin" | "signup"
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Sign In Form State - dynamic, clean, no hardcoded dummy credentials
  const [signInData, setSignInData] = useState(() => ({
    identity: localStorage.getItem("staple_remembered_identity") || "",
    password: "",
    rememberDevice: Boolean(localStorage.getItem("staple_remembered_identity")),
  }));
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Real Google Sign In Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleData, setGoogleData] = useState({ email: "", name: "" });
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleError] = useState("");

  // Real Apple Sign In Modal State
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [appleData, setAppleData] = useState({ email: "", fullName: "" });
  const [appleSubmitting, setAppleSubmitting] = useState(false);
  const [appleError] = useState("");

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    agreedToTerms: false,
  });
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState(null); // null | true | false
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const handleCheckTimer = useRef(null);
  const handleCheckRequest = useRef(0);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0 to 4
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [registrationStep, setRegistrationStep] = useState("details");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot / Reset Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotData, setForgotData] = useState({
    identity: "",
    otp: "",
    newPassword: "",
  });
  const [forgotStep, setForgotStep] = useState("identity");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState("");

  useEffect(
    () => () => {
      window.clearTimeout(handleCheckTimer.current);
      handleCheckRequest.current += 1;
    },
    []
  );

  useEffect(() => {
    if (!resendCooldown) return undefined;
    const timer = window.setTimeout(
      () => setResendCooldown((remaining) => Math.max(remaining - 1, 0)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch tabs smoothly
  const handleSwitchMode = (targetMode) => {
    if (targetMode === mode) return;
    setMode(targetMode);
    setErrorMessage("");
    window.history.replaceState(null, "", targetMode === "signin" ? "/login" : "/register");
  };

  // Live Handle Checking with DB / Store
  const handleUsernameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setSignUpData((prev) => ({ ...prev, username: clean }));
    setHandleAvailable(null);
    setErrorMessage("");
    const requestId = ++handleCheckRequest.current;
    window.clearTimeout(handleCheckTimer.current);
    if (clean.length < 3) {
      setIsCheckingHandle(false);
      return;
    }
    setIsCheckingHandle(true);
    handleCheckTimer.current = window.setTimeout(async () => {
      try {
        const available = await checkUsername(clean);
        if (requestId === handleCheckRequest.current) {
          setHandleAvailable(available ? true : false);
        }
      } catch {
        if (requestId === handleCheckRequest.current) {
          setHandleAvailable("error");
        }
      } finally {
        if (requestId === handleCheckRequest.current) setIsCheckingHandle(false);
      }
    }, 280);
  };

  // Live Password Strength Evaluator
  const handlePasswordChange = (val) => {
    setSignUpData((prev) => ({ ...prev, password: val }));
    if (!val) {
      setPasswordStrength(0);
      return;
    }
    let str = 0;
    if (val.length >= 8) str++;
    if (val.length >= 8 && /[A-Z]/.test(val)) str++;
    if (val.length >= 10 && /[0-9]/.test(val)) str++;
    if (/[^A-Za-z0-9]/.test(val)) str++;
    setPasswordStrength(str);
  };

  // Interest chip toggler
  const toggleInterest = (tag) => {
    setSelectedInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Form Submission: Sign In (Production Level credentials validation)
  const handleSubmitSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const idClean = signInData.identity.trim();
    const passClean = signInData.password;

    if (!idClean) {
      setErrorMessage("Please enter your username or email address.");
      return;
    }
    if (!passClean) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setSubmitting(true);
    showToast("Authenticating credentials...");

    try {
      await login({
        email: idClean,
        password: passClean,
      });

      if (signInData.rememberDevice) {
        localStorage.setItem("staple_remembered_identity", idClean);
      } else {
        localStorage.removeItem("staple_remembered_identity");
      }

      showToast("Welcome back! Redirecting...");
      setTimeout(() => navigate("/"), 350);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Invalid username/email or password. Please check your credentials.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Form Submission: Sign Up
  const handleSubmitSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (registrationStep === "details" && !signUpData.agreedToTerms) {
      setErrorMessage("Please accept the Terms of Service & Privacy Policy.");
      return;
    }
    if (registrationStep === "details" && signUpData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (registrationStep === "details" && handleAvailable !== true) {
      setErrorMessage(
        handleAvailable === "error"
          ? "Could not check handle availability. Try again before continuing."
          : "Enter an available handle and wait for its availability check."
      );
      return;
    }
    setSubmitting(true);
    try {
      if (registrationStep === "details") {
        const result = await initiateRegistration({
          fullName: signUpData.fullName.trim() || undefined,
          username: signUpData.username.trim(),
          email: signUpData.email.trim(),
          password: signUpData.password,
        });
        setRegistrationStep("verification");
        setResendCooldown(result.cooldownSeconds || 60);
        showToast("Verification code sent. Check your email.");
      } else {
        await verifyRegistration(signUpData.email.trim(), verificationCode);
        showToast("Email verified. Welcome to Staple.");
        setTimeout(() => navigate("/"), 350);
      }
    } catch (err) {
      const resData = err.response?.data;
      if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
        setErrorMessage(resData.errors.map((e) => e.message).join(", "));
      } else {
        setErrorMessage(
          resData?.message ||
            "Registration failed. Please check your details and try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendRegistrationCode = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const result = await resendRegistrationCode(signUpData.email.trim());
      setResendCooldown(result.cooldownSeconds || 60);
      showToast("A new verification code has been sent.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Could not resend verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialAuth = async (provider) => {
    setErrorMessage("");
    if (provider === "google") {
      setGoogleSubmitting(true);
      try {
        const providers = await getAuthProviders();
        const clientId =
          import.meta.env.VITE_GOOGLE_CLIENT_ID || providers.google?.clientId;
        if (!clientId) {
          setErrorMessage("Google sign-in is not configured on the server.");
          setGoogleSubmitting(false);
          return;
        }
        await loadScript("https://accounts.google.com/gsi/client");
        const google = window.google?.accounts?.oauth2;
        if (!google) throw new Error("Google sign-in is unavailable");
        const tokenClient = google.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: async (response) => {
            try {
              if (!response.access_token) throw new Error("Google did not return an access token");
              await googleLogin(response.access_token);
              showToast("Signed in with Google.");
              setTimeout(() => navigate("/"), 350);
            } catch (error) {
              setErrorMessage(error.response?.data?.message || error.message || "Google authentication failed.");
            } finally {
              setGoogleSubmitting(false);
            }
          },
          error_callback: (error) => {
            setErrorMessage(error.message || "Google authentication was cancelled.");
            setGoogleSubmitting(false);
          },
        });
        tokenClient.requestAccessToken({ prompt: "select_account" });
      } catch (error) {
        setGoogleSubmitting(false);
        setErrorMessage(error.message || "Google authentication is unavailable.");
      }
      return;
    }
    if (provider === "apple") {
      setAppleSubmitting(true);
      try {
        const providers = await getAuthProviders();
        const clientId =
          import.meta.env.VITE_APPLE_CLIENT_ID || providers.apple?.clientId;
        const redirectUri =
          import.meta.env.VITE_APPLE_REDIRECT_URI ||
          providers.apple?.redirectUri ||
          `${window.location.origin}/`;
        if (!clientId) {
          setErrorMessage("Apple sign-in is not configured on the server.");
          setAppleSubmitting(false);
          return;
        }
        await loadScript("https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js");
        const apple = window.AppleID?.auth;
        if (!apple) throw new Error("Apple sign-in is unavailable");
        const state = window.crypto.randomUUID();
        apple.init({
          clientId,
          scope: "name email",
          redirectURI: redirectUri,
          state,
          usePopup: true,
        });
        const result = await apple.signIn();
        if (result.authorization?.state !== state || !result.authorization?.id_token) {
          throw new Error("Apple identity verification failed");
        }
        const fullName = [result.user?.name?.firstName, result.user?.name?.lastName]
          .filter(Boolean)
          .join(" ");
        await appleLogin(result.authorization.id_token, fullName);
        showToast("Signed in with Apple.");
        setTimeout(() => navigate("/"), 350);
      } catch (error) {
        setErrorMessage(error.response?.data?.message || error.message || "Apple authentication failed.");
      } finally {
        setAppleSubmitting(false);
      }
      return;
    }
    if (provider === "passkey") {
      setErrorMessage("Passkey authentication requires an enrolled hardware key or biometrics device.");
    }
  };

  const handleGoogleSubmit = async (e) => {
    e.preventDefault();
    await handleSocialAuth("google");
  };

  const handleAppleSubmit = async (e) => {
    e.preventDefault();
    await handleSocialAuth("apple");
  };

  // Password Reset Handler
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotFeedback("");
    try {
      if (forgotStep === "identity") {
        await forgotPassword(forgotData.identity.trim());
        setForgotStep("verification");
        setForgotFeedback("If an account matches that identity, a verification code has been sent.");
      } else {
        if (!forgotData.otp || forgotData.newPassword.length < 8) {
          setForgotFeedback("Enter the six-digit code and a new password of at least 8 characters.");
          return;
        }
        await resetPassword(
          forgotData.identity.trim(),
          forgotData.otp.trim(),
          forgotData.newPassword
        );
        showToast("Password updated. Please sign in.");
        setSignInData((prev) => ({
          ...prev,
          identity: forgotData.identity.trim(),
          password: "",
        }));
        setShowForgotModal(false);
        setForgotData({ identity: "", otp: "", newPassword: "" });
        setForgotStep("identity");
      }
    } catch (err) {
      setForgotFeedback(err.response?.data?.message || "Could not process password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  const strengthLabels = ["Min. 8 characters", "Weak", "Fair", "Strong", "Unbreakable"];
  const strengthColors = [
    "text-[#78767b]",
    "text-[#ba1a1a]",
    "text-[#fc7557]",
    "text-[#a83820]",
    "text-[#000000]",
  ];

  return (
    <div className="min-h-screen w-full bg-[#fbf9f4] font-hanken text-[#1b1c19] flex flex-col justify-between selection:bg-[#a83820] selection:text-white antialiased relative overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER NAVIGATION */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#fbf9f4]/85 backdrop-blur-xl border-b border-[#1b1c19]/[0.05]">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-space font-semibold text-lg sm:text-[20px] tracking-tight text-[#1b1c19]">
              STAPLE
            </span>
            <span className="font-space font-semibold text-[10px] sm:text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f0eee9] text-[#47464b] border border-[#1b1c19]/[0.06]">
              v0.9.4
            </span>
          </Link>

          <Link
            to="/explore"
            className="font-space font-semibold text-[13px] text-[#47464b] hover:text-[#1b1c19] transition-colors flex items-center gap-1.5"
          >
            <Compass className="h-4 w-4" />
            <span>Explore Network</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CENTER SHOWCASE DUAL PANEL */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full pt-20 pb-12 sm:pt-24 sm:pb-16 flex items-center justify-center relative px-3 sm:px-6 lg:px-12">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-center">
          {/* Main Dual Panel Card Container */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-[28px] sm:rounded-[36px] bg-white border border-[#1b1c19]/[0.08] shadow-[0_12px_44px_-10px_rgba(23,23,28,0.08)] overflow-hidden relative">
            {/* Ambient Background Radial Glows */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#a83820]/[0.05] blur-3xl pointer-events-none -z-0" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#fc7557]/[0.06] blur-3xl pointer-events-none -z-0" />

            {/* ----------------------------------------------------------------- */}
            {/* LEFT COLUMN: AUTH ENGINE & FORM (Cols 7 on Desktop)               */}
            {/* ----------------------------------------------------------------- */}
            <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 z-10 flex flex-col justify-between">
              <div>
                {/* Header Sub-bar */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#a83820] animate-pulse" />
                    <span className="font-space font-semibold text-[12px] uppercase tracking-wider text-[#1b1c19]">
                      Staple v0.9.4
                    </span>
                  </div>
                  <span className="font-space font-semibold text-[11px] text-[#47464b] bg-[#f0eee9] px-3 py-1 rounded-full border border-[#1b1c19]/[0.05]">
                    Visual Discourse & Moments
                  </span>
                </div>

                {/* Animated Segmented Tab Switcher */}
                <div className="relative w-full h-12 bg-[#f0eee9] p-1 rounded-full flex items-center justify-between mb-7 select-none border border-[#1b1c19]/[0.04]">
                  {/* Sliding Pill Indicator */}
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 ${
                      mode === "signup" ? "translate-x-full" : "translate-x-0"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("signin")}
                    className={`relative z-10 w-1/2 h-full flex items-center justify-center font-space font-semibold text-[13px] sm:text-[14px] transition-colors duration-200 cursor-pointer ${
                      mode === "signin"
                        ? "text-[#1b1c19]"
                        : "text-[#47464b] hover:text-[#1b1c19]"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("signup")}
                    className={`relative z-10 w-1/2 h-full flex items-center justify-center font-space font-semibold text-[13px] sm:text-[14px] transition-colors duration-200 cursor-pointer ${
                      mode === "signup"
                        ? "text-[#1b1c19]"
                        : "text-[#47464b] hover:text-[#1b1c19]"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-5 rounded-2xl border border-[#ba1a1a]/30 bg-[#ffdad6]/40 p-3.5 text-[12.5px] font-medium text-[#ba1a1a] flex items-center gap-2 animate-fade-in">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold">
                      !
                    </span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* =============================================================== */}
                {/* MODE 1: SIGN IN FORM                                            */}
                {/* =============================================================== */}
                {mode === "signin" && (
                  <div className="transition-all duration-300 ease-out flex flex-col animate-fade-in">
                    <div className="mb-6">
                      <h1 className="font-space text-[26px] sm:text-[30px] font-semibold text-[#1b1c19] tracking-tight leading-tight">
                        Welcome back to Staple.
                      </h1>
                      <p className="text-[13.5px] text-[#47464b] mt-1">
                        Enter your credentials to resume your curation and collections.
                      </p>
                    </div>

                    {/* Social Auth Action Pills (Apple, Google, Passkey) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
                      {/* Apple */}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSocialAuth("apple")}
                        className="flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-[#f5f3ee] hover:bg-[#eae8e3] transition-all active:scale-[0.98] text-[#1b1c19] font-space font-semibold text-[12px] border border-[#1b1c19]/[0.05] cursor-pointer disabled:opacity-60"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.9-12.02-14.58-6.19-9.58-10.99-20.2-14.4-31.84-3.41-11.64-5.12-22.36-5.12-32.17 0-14.68 3.73-26.79 11.19-36.33 7.46-9.54 16.73-14.4 27.81-14.58 5.77 0 11.69 1.48 17.76 4.45 6.07 2.97 10.15 4.51 12.24 4.62 1.62 0 6.03-1.68 13.23-5.04 7.2-3.36 13.43-4.8 18.69-4.32 14.15.93 25.07 5.92 32.76 14.97-12.63 7.63-18.8 17.89-18.52 30.79.28 10.05 4.12 18.55 11.53 25.5 7.41 6.95 16.09 10.85 26.04 11.71-2.12 6.55-4.8 13.06-8.04 19.53zM119.22 33.72c0-7.39 2.65-14.14 7.96-20.26 5.3-6.12 11.83-10.04 19.59-11.76.67 1.47 1.01 3.05 1.01 4.75 0 7.39-2.73 14.3-8.2 20.73-5.46 6.43-12.05 10.28-19.76 11.54-.2-.8-.6-2.47-.6-5z" />
                        </svg>
                        <span>Apple</span>
                      </button>

                      {/* Google */}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSocialAuth("google")}
                        className="flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-[#f5f3ee] hover:bg-[#eae8e3] transition-all active:scale-[0.98] text-[#1b1c19] font-space font-semibold text-[12px] border border-[#1b1c19]/[0.05] cursor-pointer disabled:opacity-60"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                            fill="#EA4335"
                          />
                        </svg>
                        <span>Google</span>
                      </button>

                      {/* Passkey */}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSocialAuth("passkey")}
                        className="flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-[#f5f3ee] hover:bg-[#eae8e3] transition-all active:scale-[0.98] text-[#1b1c19] font-space font-semibold text-[12px] border border-[#1b1c19]/[0.05] cursor-pointer disabled:opacity-60"
                      >
                        <Key className="w-4 h-4 text-[#47464b]" />
                        <span>Passkey</span>
                      </button>
                    </div>

                    {/* Hairline Divider with Badge */}
                    <div className="relative flex items-center justify-center my-4">
                      <div className="w-full h-px bg-[#eae8e3]" />
                      <span className="absolute px-3.5 py-0.5 rounded-full bg-[#f0eee9] text-[#78767b] font-space font-semibold text-[10.5px] uppercase tracking-wider">
                        or email
                      </span>
                    </div>

                    {/* Sign In Inputs Form */}
                    <form onSubmit={handleSubmitSignIn} className="flex flex-col gap-4 mt-2">
                      {/* Username or Email */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                          Username or Email
                        </label>
                        <div className="relative flex items-center">
                          <AtSign className="absolute left-3.5 text-[#78767b] h-4 w-4 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={signInData.identity}
                            onChange={(e) => setSignInData({ ...signInData, identity: e.target.value })}
                            placeholder="yourname or you@example.com"
                            className="w-full h-12 pl-10 pr-4 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[14px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgotModal(true);
                              setForgotData({
                                identity: signInData.identity,
                                otp: "",
                                newPassword: "",
                              });
                              setForgotFeedback("");
                              setForgotStep("identity");
                            }}
                            className="font-space text-[11px] font-semibold text-[#a83820] hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-3.5 text-[#78767b] h-4 w-4 pointer-events-none" />
                          <input
                            type={showSignInPassword ? "text" : "password"}
                            required
                            value={signInData.password}
                            onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                            placeholder="••••••••••••"
                            className="w-full h-12 pl-10 pr-11 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[14px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all font-mono tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignInPassword(!showSignInPassword)}
                            className="absolute right-3.5 text-[#78767b] hover:text-[#1b1c19] transition-colors cursor-pointer"
                          >
                            {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Remember Device Checkbox */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                          <input
                            type="checkbox"
                            checked={signInData.rememberDevice}
                            onChange={(e) => setSignInData({ ...signInData, rememberDevice: e.target.checked })}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                              signInData.rememberDevice
                                ? "bg-[#1b1c19] text-white"
                                : "bg-[#eae8e3] text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span className="text-[12px] text-[#47464b] group-hover:text-[#1b1c19] transition-colors">
                            Remember this device for 30 days
                          </span>
                        </label>
                      </div>

                      {/* Primary Submit Button */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="mt-3 w-full h-12 rounded-full bg-[#1b1c19] hover:bg-[#2a2a32] active:scale-[0.98] text-white font-space font-semibold text-[14px] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-70"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In to Staple</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-6 text-center">
                      <span className="text-[13px] text-[#47464b]">Don't have an account? </span>
                      <button
                        type="button"
                        onClick={() => handleSwitchMode("signup")}
                        className="font-space font-semibold text-[13px] text-[#a83820] hover:underline cursor-pointer"
                      >
                        Create one now
                      </button>
                    </div>
                  </div>
                )}

                {/* =============================================================== */}
                {/* MODE 2: SIGN UP FORM (CREATE ACCOUNT)                           */}
                {/* =============================================================== */}
                {mode === "signup" && (
                  <div className="transition-all duration-300 ease-out flex flex-col animate-fade-in">
                    <div className="mb-5">
                      <h2 className="font-space text-[26px] sm:text-[30px] font-semibold text-[#1b1c19] tracking-tight leading-tight">
                        Join the community.
                      </h2>
                      <p className="text-[13.5px] text-[#47464b] mt-0.5">
                        Share everyday moments, film photography, and visual narratives.
                      </p>
                    </div>

                    <form onSubmit={handleSubmitSignUp} className="flex flex-col gap-3.5">
                      {registrationStep === "details" ? (
                        <>
                      {/* Name & Handle in 2-column grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={signUpData.fullName}
                            onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                            placeholder="Alex Rivera"
                            className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                              Handle
                            </label>
                            {isCheckingHandle && (
                              <span className="font-space font-semibold text-[11px] text-[#78767b] flex items-center gap-1 animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin" /> checking...
                              </span>
                            )}
                            {!isCheckingHandle && handleAvailable === true && (
                              <span className="font-space font-semibold text-[11px] text-[#1f7a4d] flex items-center gap-0.5 animate-fade-in">
                                <CheckCircle2 className="h-3 w-3" /> available
                              </span>
                            )}
                            {!isCheckingHandle && handleAvailable === false && (
                              <span className="font-space font-semibold text-[11px] text-[#ba1a1a] flex items-center gap-0.5 animate-fade-in">
                                ✕ handle taken
                              </span>
                            )}
                            {!isCheckingHandle && handleAvailable === "error" && (
                              <span className="font-space font-semibold text-[11px] text-[#ba1a1a] animate-fade-in">
                                Could not check. Retry.
                              </span>
                            )}
                          </div>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-[#78767b] font-space font-semibold text-[13px]">
                              @
                            </span>
                            <input
                              type="text"
                              required
                              minLength={3}
                              maxLength={30}
                              value={signUpData.username}
                              onChange={(e) => handleUsernameChange(e.target.value)}
                              placeholder="alexrivera"
                              className="w-full h-11 pl-7 pr-3 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="flex flex-col gap-1">
                        <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                          placeholder="elena@narrative.io"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all"
                        />
                      </div>

                      {/* Password & Live 4-segment Strength Bar */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                            Create Password
                          </label>
                          <span
                            className={`font-space font-semibold text-[11px] ${
                              strengthColors[passwordStrength]
                            }`}
                          >
                            {strengthLabels[passwordStrength]}
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type={showSignUpPassword ? "text" : "password"}
                            required
                            minLength={8}
                            value={signUpData.password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all font-mono tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                            className="absolute right-3.5 text-[#78767b] hover:text-[#1b1c19] transition-colors cursor-pointer"
                          >
                            {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>

                        {/* 4-segment Strength Bar */}
                        <div className="grid grid-cols-4 gap-1.5 mt-1">
                          <div
                            className={`h-1 rounded-full transition-colors duration-200 ${
                              passwordStrength >= 1
                                ? passwordStrength === 1
                                  ? "bg-[#ba1a1a]"
                                  : passwordStrength === 2
                                  ? "bg-[#fc7557]"
                                  : "bg-[#a83820]"
                                : "bg-[#eae8e3]"
                            }`}
                          />
                          <div
                            className={`h-1 rounded-full transition-colors duration-200 ${
                              passwordStrength >= 2
                                ? passwordStrength === 2
                                  ? "bg-[#fc7557]"
                                  : "bg-[#a83820]"
                                : "bg-[#eae8e3]"
                            }`}
                          />
                          <div
                            className={`h-1 rounded-full transition-colors duration-200 ${
                              passwordStrength >= 3 ? "bg-[#a83820]" : "bg-[#eae8e3]"
                            }`}
                          />
                          <div
                            className={`h-1 rounded-full transition-colors duration-200 ${
                              passwordStrength >= 4 ? "bg-[#1b1c19]" : "bg-[#eae8e3]"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Curated Interests Chips */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                          Curated Interests (Select 2+)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Photography",
                            "Architecture",
                            "Film 35mm",
                            "Soundscapes",
                            "Design Critique",
                          ].map((tag) => {
                            const isSelected = selectedInterests.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleInterest(tag)}
                                className={`px-3 py-1.5 rounded-full font-space font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#1b1c19] text-white shadow-xs"
                                    : "bg-[#f0eee9] text-[#1b1c19] hover:bg-[#e4e2dd]"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <p className="text-[13px] text-[#47464b]">
                            Enter the six-digit verification code sent to <strong>{signUpData.email}</strong>.
                          </p>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                            value={verificationCode}
                            onChange={(event) =>
                              setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                            placeholder="000000"
                            aria-label="Email verification code"
                            className="w-full h-12 px-4 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-center text-[#1b1c19] text-lg tracking-[0.5em] focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20"
                          />
                          <button
                            type="button"
                            onClick={handleResendRegistrationCode}
                            disabled={submitting || resendCooldown > 0}
                            className="self-start font-space text-[12px] font-semibold text-[#a83820] disabled:text-[#78767b] disabled:cursor-not-allowed"
                          >
                            {resendCooldown > 0
                              ? `Resend code in ${resendCooldown}s`
                              : "Resend verification code"}
                          </button>
                        </div>
                      )}

                      {/* Terms & Policies Checkbox */}
                      {registrationStep === "details" && <div className="flex items-start gap-2.5 pt-1 select-none">
                        <label className="flex items-center gap-2 cursor-pointer group mt-0.5">
                          <input
                            type="checkbox"
                            checked={signUpData.agreedToTerms}
                            onChange={(e) =>
                              setSignUpData({ ...signUpData, agreedToTerms: e.target.checked })
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                              signUpData.agreedToTerms
                                ? "bg-[#1b1c19] text-white"
                                : "bg-[#eae8e3] text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        </label>
                        <span className="text-[12px] text-[#47464b] leading-relaxed">
                          I agree to Staple's{" "}
                          <button
                            type="button"
                            onClick={() => showToast("Viewing Terms of Service")}
                            className="text-[#a83820] hover:underline cursor-pointer"
                          >
                            Terms of Service
                          </button>{" "}
                          &{" "}
                          <button
                            type="button"
                            onClick={() => showToast("Viewing Privacy Policy")}
                            className="text-[#a83820] hover:underline cursor-pointer"
                          >
                            Privacy Policy
                          </button>
                          .
                        </span>
                      </div>}

                      {/* Sign Up Submit CTA */}
                      <button
                        type="submit"
                        disabled={submitting || (registrationStep === "details" && isCheckingHandle)}
                        className="mt-2 w-full h-12 rounded-full bg-[#1b1c19] hover:bg-[#2a2a32] active:scale-[0.98] text-white font-space font-semibold text-[14px] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-70"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            <span>Creating Account...</span>
                          </>
                        ) : (
                          <>
                            <span>{registrationStep === "details" ? "Send Verification Code" : "Verify Email & Create Account"}</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-4 text-center">
                      <span className="text-[13px] text-[#47464b]">Already curated on Staple? </span>
                      <button
                        type="button"
                        onClick={() => handleSwitchMode("signin")}
                        className="font-space font-semibold text-[13px] text-[#a83820] hover:underline cursor-pointer"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* RIGHT COLUMN: VISUAL SHOWCASE & PROOF (Cols 5 on Desktop)         */}
            {/* ----------------------------------------------------------------- */}
            <div className="lg:col-span-5 bg-[#f5f3ee] p-6 sm:p-10 lg:p-12 relative flex flex-col justify-between overflow-hidden border-t lg:border-t-0 lg:border-l border-[#1b1c19]/[0.06]">
              {/* Subtle Ambient Grain/Light */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#f0eee9]/60 via-transparent to-[#eae8e3]/40 pointer-events-none" />

              {/* Top Status Banner */}
              <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-2xs border border-[#1b1c19]/[0.06]">
                  <span className="w-2 h-2 rounded-full bg-[#a83820]" />
                  <span className="font-space font-semibold text-[11px] text-[#1b1c19] tracking-tight">
                    A thoughtful space for creative work
                  </span>
                </div>
                <Sparkles className="h-4 w-4 text-[#47464b]/50" />
              </div>

              {/* Product overview without fabricated account activity */}
              <div className="relative z-10 space-y-4 my-auto">
                <div className="w-full bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#1b1c19]/[0.06]">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0eee9]">
                    <Compass className="h-6 w-6 text-[#a83820]" />
                  </div>
                  <h2 className="font-space text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-[#1b1c19]">
                    Make room for what matters.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[#47464b]">
                    Share your work, keep meaningful conversations, and discover public stories at your own pace.
                  </p>
                  <div className="mt-8 grid grid-cols-3 gap-3 text-[11px] font-semibold text-[#47464b]">
                    <div className="rounded-xl bg-[#f5f3ee] p-3">Your profile</div>
                    <div className="rounded-xl bg-[#f5f3ee] p-3">Your messages</div>
                    <div className="rounded-xl bg-[#f5f3ee] p-3">Public Explore</div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-5 mt-4 flex items-center justify-between border-t border-[#1b1c19]/[0.06]">
                <p className="font-space font-semibold text-[11px] text-[#47464b]">
                  A fresh start for every account
                </p>
                <Lock className="h-4 w-4 text-[#47464b]/70" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FOOTER BAR                                                      */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-[#1b1c19]/[0.06] bg-[#fbf9f4] py-4 px-4 sm:px-6 lg:px-12 text-[11.5px] text-[#78767b]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1f7a4d]" />
            <span className="font-space font-semibold text-[#1b1c19]">Systems operational</span>
            <span>•</span>
            <span>© {new Date().getFullYear()} Staple Network</span>
          </div>

          <div className="flex items-center gap-5 font-space font-semibold">
            <button
              type="button"
              onClick={() => showToast("Privacy Policy: End-to-end user privacy")}
              className="hover:text-[#1b1c19] transition-colors"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => showToast("Terms of Service: Respectful creator discourse")}
              className="hover:text-[#1b1c19] transition-colors"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => showToast("Security: Encrypted auth sessions")}
              className="hover:text-[#1b1c19] transition-colors"
            >
              Security
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4a. REAL GOOGLE SIGN IN MODAL                                             */}
      {/* ========================================================================= */}
      {showGoogleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl border border-[#1b1c19]/[0.08] flex flex-col gap-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1b1c19]/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    fill="#EA4335"
                  />
                </svg>
                <h3 className="font-space font-semibold text-[17px] text-[#1b1c19]">
                  Sign in with Google
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-[#78767b] hover:text-[#1b1c19] transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] text-[#47464b] leading-relaxed">
              Authenticate directly with your Google account. Your profile and secure token session will be issued and persisted.
            </p>

            {googleError && (
              <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/40 p-3 text-[12px] text-[#ba1a1a]">
                {googleError}
              </div>
            )}

            <form onSubmit={handleGoogleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  value={googleData.email}
                  onChange={(e) =>
                    setGoogleData({ ...googleData, email: e.target.value })
                  }
                  placeholder="yourname@gmail.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                  Your Full Name (optional)
                </label>
                <input
                  type="text"
                  value={googleData.name}
                  onChange={(e) =>
                    setGoogleData({ ...googleData, name: e.target.value })
                  }
                  placeholder="e.g. Alex Rivera"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="h-10 px-4 rounded-full bg-[#f0eee9] hover:bg-[#e4e2dd] font-space font-semibold text-[13px] text-[#1b1c19] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={googleSubmitting}
                  className="h-10 px-5 rounded-full bg-[#4285F4] hover:bg-[#3367D6] text-white font-space font-semibold text-[13px] flex items-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {googleSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Sign In with Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4b. REAL APPLE ID SIGN IN MODAL                                           */}
      {/* ========================================================================= */}
      {showAppleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowAppleModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl border border-[#1b1c19]/[0.08] flex flex-col gap-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1b1c19]/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.9-12.02-14.58-6.19-9.58-10.99-20.2-14.4-31.84-3.41-11.64-5.12-22.36-5.12-32.17 0-14.68 3.73-26.79 11.19-36.33 7.46-9.54 16.73-14.4 27.81-14.58 5.77 0 11.69 1.48 17.76 4.45 6.07 2.97 10.15 4.51 12.24 4.62 1.62 0 6.03-1.68 13.23-5.04 7.2-3.36 13.43-4.8 18.69-4.32 14.15.93 25.07 5.92 32.76 14.97-12.63 7.63-18.8 17.89-18.52 30.79.28 10.05 4.12 18.55 11.53 25.5 7.41 6.95 16.09 10.85 26.04 11.71-2.12 6.55-4.8 13.06-8.04 19.53zM119.22 33.72c0-7.39 2.65-14.14 7.96-20.26 5.3-6.12 11.83-10.04 19.59-11.76.67 1.47 1.01 3.05 1.01 4.75 0 7.39-2.73 14.3-8.2 20.73-5.46 6.43-12.05 10.28-19.76 11.54-.2-.8-.6-2.47-.6-5z" />
                </svg>
                <h3 className="font-space font-semibold text-[17px] text-[#1b1c19]">
                  Sign in with Apple ID
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAppleModal(false)}
                className="text-[#78767b] hover:text-[#1b1c19] transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] text-[#47464b] leading-relaxed">
              Use your Apple ID to sign in. Your identity will be registered and a secure JWT token session created.
            </p>

            {appleError && (
              <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/40 p-3 text-[12px] text-[#ba1a1a]">
                {appleError}
              </div>
            )}

            <form onSubmit={handleAppleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                  Apple ID / Email
                </label>
                <input
                  type="email"
                  required
                  value={appleData.email}
                  onChange={(e) =>
                    setAppleData({ ...appleData, email: e.target.value })
                  }
                  placeholder="yourname@icloud.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                  Full Name (optional)
                </label>
                <input
                  type="text"
                  value={appleData.fullName}
                  onChange={(e) =>
                    setAppleData({ ...appleData, fullName: e.target.value })
                  }
                  placeholder="e.g. Alex Rivera"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppleModal(false)}
                  className="h-10 px-4 rounded-full bg-[#f0eee9] hover:bg-[#e4e2dd] font-space font-semibold text-[13px] text-[#1b1c19] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={appleSubmitting}
                  className="h-10 px-5 rounded-full bg-black hover:bg-neutral-800 text-white font-space font-semibold text-[13px] flex items-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {appleSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Continue with Apple</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4c. FORGOT / RESET PASSWORD MODAL (NO ALERT)                                */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl border border-[#1b1c19]/[0.08] flex flex-col gap-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1b1c19]/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a83820]" />
                <h3 className="font-space font-semibold text-[17px] text-[#1b1c19]">
                  Reset Your Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-[#78767b] hover:text-[#1b1c19] transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] text-[#47464b] leading-relaxed">
              {forgotStep === "identity"
                ? "Enter your registered username or email address. We’ll send a verification code if an account matches."
                : "Enter the six-digit code sent to your email and choose a new password."}
            </p>

            {forgotFeedback && (
              <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/40 p-3 text-[12px] text-[#ba1a1a]">
                {forgotFeedback}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-3.5">
              {forgotStep === "identity" ? (
                <div className="flex flex-col gap-1">
                <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={forgotData.identity}
                  onChange={(e) =>
                    setForgotData({ ...forgotData, identity: e.target.value })
                  }
                  placeholder="yourhandle or you@example.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all"
                />
              </div>
              ) : (
                <>
                <div className="flex flex-col gap-1">
                  <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                    Email verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={forgotData.otp}
                    onChange={(e) =>
                      setForgotData({
                        ...forgotData,
                        otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    placeholder="000000"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-center tracking-[0.5em] focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setForgotLoading(true);
                    setForgotFeedback("");
                    try {
                      await resendPasswordResetCode(forgotData.identity.trim());
                      setForgotFeedback("If a password reset is pending, a new code has been sent.");
                    } catch (error) {
                      setForgotFeedback(error.response?.data?.message || "Could not resend reset code.");
                    } finally {
                      setForgotLoading(false);
                    }
                  }}
                  disabled={forgotLoading}
                  className="self-start font-space text-[12px] font-semibold text-[#a83820] disabled:text-[#78767b]"
                >
                  Resend verification code
                </button>
                <div className="flex flex-col gap-1">
                <label className="font-space font-semibold text-[12px] text-[#1b1c19]">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={forgotData.newPassword}
                  onChange={(e) =>
                    setForgotData({ ...forgotData, newPassword: e.target.value })
                  }
                  placeholder="At least 8 characters"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#1b1c19]/[0.12] text-[#1b1c19] text-[13.5px] placeholder-[#78767b]/60 focus:outline-none focus:border-[#a83820] focus:ring-2 focus:ring-[#a83820]/20 transition-all font-mono"
                />
              </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="h-10 px-4 rounded-full bg-[#f0eee9] hover:bg-[#e4e2dd] font-space font-semibold text-[13px] text-[#1b1c19] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="h-10 px-5 rounded-full bg-[#1b1c19] hover:bg-[#2a2a32] text-white font-space font-semibold text-[13px] flex items-center gap-2 transition-all shadow-sm disabled:opacity-60"
                >
                  {forgotLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{forgotStep === "identity" ? "Send Verification Code" : "Reset Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MICRO TOAST NOTIFICATION                                               */}
      {/* ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-slide">
          <div className="bg-[#1b1c19] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10">
            <Sparkles className="h-4 w-4 text-[#fc7557]" />
            <span className="font-space font-semibold text-[12.5px]">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
