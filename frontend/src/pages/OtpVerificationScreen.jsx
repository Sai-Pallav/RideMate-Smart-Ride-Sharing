import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import OtpInput from '../components/OtpInput';
import Card from '../components/Card';
import ErrorBanner from '../components/ErrorBanner';
import { verifyOtp, recoverAccount } from '../api/auth';
import useAuthStore from '../store/authStore';

export default function OtpVerificationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const phoneNumber =
    location.state?.phone_number ||
    localStorage.getItem('tempMobile') ||
    '';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [otpError, setOtpError] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const verifyMutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      const responseData = data.data || data;
      const { accessToken, refreshToken, user_id } = responseData;
      const user = { user_id, phone_number: phoneNumber };

      // Store in localStorage per the token storage contract
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Also update Zustand store
      setAuth({ user, accessToken, refreshToken });

      toast.success('Phone verified! Welcome aboard.');
      // If came from registration, go to profile setup; else home
      if (location.state?.fromRegistration) {
        navigate('/profile-setup');
      } else {
        navigate('/home');
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Invalid or expired OTP.';
      setOtpError(msg);
      setOtp('');
    },
  });

  const resendMutation = useMutation({
    mutationFn: recoverAccount,
    onSuccess: () => {
      setTimer(30);
      setResendMessage('Verification code resent successfully!');
      setTimeout(() => setResendMessage(''), 4000);
    },
    onError: () => toast.error('Failed to resend code. Try again.'),
  });

  const handleVerify = useCallback(
    (codeValue) => {
      if (codeValue.length !== 6) return;
      setOtpError('');
      verifyMutation.mutate({ phone_number: phoneNumber, otp: codeValue });
    },
    [phoneNumber, verifyMutation]
  );

  // Auto-submit on 6 digits
  useEffect(() => {
    if (otp.length === 6) {
      const t = setTimeout(() => handleVerify(otp), 0);
      return () => clearTimeout(t);
    }
  }, [otp, handleVerify]);

  const handleResend = () => {
    if (timer > 0 || resendMutation.isPending) return;
    setOtpError('');
    resendMutation.mutate({ phone_number: phoneNumber });
  };

  const isPending = verifyMutation.isPending || resendMutation.isPending;

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto space-y-6">

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-brand-text-primary">
            Verify Identity
          </h1>
          <p className="text-brand-text-secondary text-sm">
            Enter the 6-digit code sent to{' '}
            <span className="font-bold text-brand-primary">{phoneNumber || 'your mobile'}</span>.
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            (Use OTP: <span className="text-slate-400">123456</span> for local testing)
          </p>
        </div>

        {otpError && (
          <ErrorBanner message={otpError} onRetry={() => handleVerify(otp)} />
        )}

        {resendMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center text-sm font-medium">
            {resendMessage}
          </div>
        )}

        <Card className="p-8 border-slate-800/80 bg-brand-bg-card/90 shadow-xl space-y-6">
          <OtpInput
            length={6}
            error={Boolean(otpError)}
            disabled={isPending}
            onChange={(val) => setOtp(val)}
          />

          {isPending && (
            <div className="flex items-center justify-center gap-2 text-xs text-brand-text-secondary">
              <svg className="animate-spin h-3.5 w-3.5 text-brand-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Verifying…
            </div>
          )}

          <div className="text-center space-y-4 pt-4 border-t border-slate-850">
            <div className="text-xs text-brand-text-secondary flex justify-between items-center">
              <span>Didn't receive code?</span>
              {timer > 0 ? (
                <span className="font-mono text-brand-primary font-bold">Resend in {timer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending}
                  className="text-brand-primary hover:text-brand-primary-light font-bold hover:underline cursor-pointer transition select-none active:scale-95 disabled:opacity-50"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        </Card>

        <div className="text-center text-xs text-brand-text-secondary">
          <Link to="/login" className="hover:text-brand-text-primary font-medium underline transition duration-150">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
