import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import InputField from '../components/InputField';
import Button from '../components/Button';
import Card from '../components/Card';

import ErrorBanner from '../components/ErrorBanner';
import { registerUser } from '../api/auth';

export default function RegistrationScreen() {
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    // Pre-fill phone if coming from OTP flow
    const saved = localStorage.getItem('tempMobile') || '';
    if (saved) {
      const t = setTimeout(() => setPhoneNumber(saved), 0);
      return () => clearTimeout(t);
    }
  }, []);

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      const responseData = data.data || data;
      const phone = responseData?.phone_number || phoneNumber;
      toast.success('Account created! Please verify your OTP.');
      navigate('/otp-verification', { state: { phone_number: phone, fromRegistration: true } });
    },
    onError: (err) => {
      const errorData = err.response?.data;
      const msg = errorData?.message || 'Registration failed. Please try again.';
      
      if (err.response?.status === 409) {
        if (msg.toLowerCase().includes('phone number') || msg.toLowerCase().includes('email')) {
          setPhoneError('This mobile number or email is already registered.');
          setEmailError('This mobile number or email is already registered.');
        } else {
          toast.error(msg);
        }
      } else if (err.response?.status === 400) {
        if (msg.toLowerCase().includes('email')) {
          setEmailError(msg);
        } else if (msg.toLowerCase().includes('phone') || msg.toLowerCase().includes('mobile')) {
          setPhoneError(msg);
        } else {
          toast.error(msg);
        }
      } else {
        toast.error(msg);
      }
    },
  });

  const validate = () => {
    let valid = true;

    if (!fullName || fullName.trim().length < 2) {
      setNameError('Please enter a valid name (at least 2 characters).');
      valid = false;
    } else setNameError('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else setEmailError('');

    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      valid = false;
    } else setPhoneError('');

    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    } else setPasswordError('');

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      valid = false;
    } else setConfirmPasswordError('');

    return valid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!termsAccepted) {
      toast.error('You must accept the Terms and Conditions to register.');
      return;
    }
    registerMutation.mutate({
      phone_number: phoneNumber,
      email,
      password,
      full_name: fullName,
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto space-y-6">

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-brand-text-primary">
            Create Account
          </h1>
          <p className="text-brand-text-secondary text-sm">
            Enter your details to register. You'll verify via OTP next.
          </p>
        </div>

        {registerMutation.isError && (
          <ErrorBanner
            message={registerMutation.error?.response?.data?.message || 'Registration failed.'}
            onRetry={handleSubmit}
          />
        )}

        <Card className="p-8 border-slate-800/80 bg-brand-bg-card/90 shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              id="reg-name"
              label="Full Name"
              type="text"
              placeholder="e.g. Sai Pallavi"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setNameError(''); }}
              disabled={registerMutation.isPending}
              error={nameError}
              helperText="Enter your name as it appears on your ID card."
            />

            <InputField
              id="reg-email"
              label="Email Address"
              type="email"
              placeholder="e.g. sai.p@institution.edu"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              disabled={registerMutation.isPending}
              error={emailError}
            />

            <InputField
              id="reg-phone"
              label="Mobile Number"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(val);
                setPhoneError('');
              }}
              disabled={registerMutation.isPending}
              error={phoneError}
              helperText="10-digit Indian mobile number. OTP will be sent here."
            />

            <InputField
              id="reg-password"
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              disabled={registerMutation.isPending}
              error={passwordError}
            />

            <InputField
              id="reg-confirm-password"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); }}
              disabled={registerMutation.isPending}
              error={confirmPasswordError}
            />

            <div className="flex items-start gap-3 text-left pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={registerMutation.isPending}
                className="mt-1 h-4 w-4 rounded border-slate-800 bg-brand-bg-card text-brand-primary focus:ring-brand-primary"
              />
              <label htmlFor="terms" className="text-xs text-brand-text-secondary select-none leading-relaxed">
                I agree to the{' '}
                <a href="#terms" className="text-brand-primary font-semibold hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#privacy" className="text-brand-primary font-semibold hover:underline">Privacy Policy</a>
                , and confirm I am sharing costs rather than operating a commercial taxi.
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={registerMutation.isPending}
              loading={registerMutation.isPending}
              className="w-full justify-center mt-2"
            >
              {registerMutation.isPending ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
        </Card>

        <div className="text-center text-xs text-brand-text-secondary">
          Already registered?{' '}
          <Link
            to="/login"
            className="text-brand-primary hover:text-brand-primary-light font-bold underline transition duration-150"
          >
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}
