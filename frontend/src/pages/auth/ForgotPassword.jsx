import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Banner } from "../../components/ui/Primitives";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.verifyResetOtp({ email, otp });
      setStep(3);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, new_password: newPassword });
      setSuccess("Your password has been successfully reset!");
      setStep(4);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded border border-ink/10 bg-white p-8 shadow-stamp">
        <div>
          <h2 className="text-2xl font-bold text-ink">Forgot Password</h2>
          {step === 1 && <p className="mt-2 text-sm text-inkfaint">Enter your email address to receive a 6-digit OTP.</p>}
          {step === 2 && (
            <div className="mt-2 space-y-2 text-sm text-inkfaint">
              <p>Check your email for the OTP and enter it below.</p>
              <p className="font-medium text-amber">This OTP will expire in 15 minutes.</p>
              <p className="text-xs italic text-inkfaint/80">
                Note: You will only receive an OTP if the email is already registered with an account.
              </p>
            </div>
          )}
          {step === 3 && <p className="mt-2 text-sm text-inkfaint">Create a new secure password for your account.</p>}
        </div>

        {error && <Banner kind="error">{error}</Banner>}
        {success && <Banner kind="success">{success}</Banner>}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="mt-8 space-y-6">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-circuit hover:underline">Back to sign in</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
            <div>
              <label className="label">6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                className="input font-mono tracking-widest text-center text-lg"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                placeholder="000000"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <div className="text-center text-sm">
              <button type="button" onClick={() => setStep(1)} className="text-inkfaint hover:underline">Use a different email</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="mt-8 text-center">
            <Link to="/login" className="btn-primary inline-block w-full">Sign in with new password</Link>
          </div>
        )}
      </div>
    </div>
  );
}
