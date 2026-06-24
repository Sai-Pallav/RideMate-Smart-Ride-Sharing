import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import InputField from '../components/InputField';
import Button from '../components/Button';
import Card from '../components/Card';
import ErrorBanner from '../components/ErrorBanner';
import { loginUser } from '../api/auth';
import useAuthStore from '../store/authStore';

export default function LoginScreen() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      const responseData = data.data || data;
      const { accessToken, refreshToken, user_id, email, phone_number } = responseData;
      
      // Store in localStorage per the token storage contract
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify({ user_id, email, phone_number }));
      
      // Also update Zustand store
      setAuth({ user: { user_id, email, phone_number }, accessToken, refreshToken });
      
      toast.success('Logged in successfully!');
      navigate('/home');
    },
    onError: (err) => {
      const errorData = err.response?.data;
      const msg = errorData?.message || 'Login failed. Check your credentials.';
      // Backend sends 403 with step=awaiting_otp_verification if phone not verified
      if (errorData?.step === 'awaiting_otp_verification') {
        toast('OTP required — redirecting to verification.', { icon: '🔐' });
        navigate('/otp-verification', {
          state: { phone_number: errorData.phone_number || identifier.trim() },
        });
        return;
      }
      toast.error(msg);
    },
  });

  const validate = () => {
    let valid = true;
    if (!identifier.trim()) {
      setIdentifierError('Please enter your email or mobile number.');
      valid = false;
    } else {
      setIdentifierError('');
    }
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    loginMutation.mutate({ identifier: identifier.trim(), password });
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-brand-text-primary">
            Sign In
          </h1>
          <p className="text-brand-text-secondary text-sm">
            Use your registered email or mobile number and password.
          </p>
        </div>

        {loginMutation.isError && !loginMutation.error?.response?.data?.step && (
          <ErrorBanner
            message={loginMutation.error?.response?.data?.message || 'Login failed. Please try again.'}
            onRetry={handleSubmit}
          />
        )}

        <Card className="p-8 border-slate-800/80 bg-brand-bg-card/90 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              id="login-identifier"
              label="Email or Mobile Number"
              type="text"
              placeholder="e.g. test@test.com or 9876543210"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setIdentifierError(''); }}
              disabled={loginMutation.isPending}
              error={identifierError}
              helperText="Enter the email or mobile number you registered with."
            />

            <InputField
              id="login-password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              disabled={loginMutation.isPending}
              error={passwordError}
            />

            <Button
              type="submit"
              variant="primary"
              disabled={loginMutation.isPending}
              loading={loginMutation.isPending}
              className="w-full justify-center"
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </Card>

        {/* Quick test hint */}
        <div className="text-center text-[11px] text-slate-600 bg-slate-900/40 border border-slate-800 rounded-xl p-3">
          <span className="font-bold text-slate-500">Test credentials: </span>
          <span className="font-mono text-slate-400">test@test.com / Test@1234</span>
        </div>

        <div className="text-center text-xs text-brand-text-secondary pt-1">
          Don't have an account?{' '}
          <Link
            to="/registration"
            className="text-brand-primary hover:text-brand-primary-light font-bold underline transition duration-150"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
