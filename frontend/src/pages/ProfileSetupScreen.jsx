import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import InputField from '../components/InputField';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import ErrorBanner from '../components/ErrorBanner';
import Badge from '../components/Badge';
import { getMyProfile, updateMyProfile, addEmergencyContact } from '../api/profile';

export default function ProfileSetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 1 State: Photo & Gender
  const [photoPreview, setPhotoPreview] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [userName, setUserName] = useState('');

  // Step 2 State: Affiliation
  const [institutionName, setInstitutionName] = useState('');
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [emailValidationError, setEmailValidationError] = useState('');

  // Step 3 State: Emergency Contact (MANDATORY)
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPhoneError, setContactPhoneError] = useState('');
  const [contactNameError, setContactNameError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile();
        const profileData = res.data;
        if (profileData) {
          if (profileData.profile?.full_name) {
            setUserName(profileData.profile.full_name);
          }
          if (profileData.profile?.gender) {
            setGender(profileData.profile.gender);
          }
          if (profileData.profile?.institution_name) {
            setInstitutionName(profileData.profile.institution_name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };
    fetchProfile();
  }, []);

  // Handle local photo uploading preview
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Photo must be less than 2MB');
        return;
      }
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Navigations
  const handleNextStep = async () => {
    setSubmitError('');
    if (step === 1) {
      setLoading(true);
      try {
        await updateMyProfile({ full_name: userName, gender });
        setStep(2);
      } catch (err) {
        setSubmitError(err.response?.data?.message || 'Failed to update profile details.');
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      // Validate email format ONLY if they typed something
      if (institutionEmail) {
        const isValidEmail = /\S+@\S+\.\S+/.test(institutionEmail);
        if (!isValidEmail) {
          setEmailValidationError('Please enter a valid institutional email or leave blank.');
          return;
        }
      }
      setEmailValidationError('');
      setLoading(true);
      try {
        const data = {};
        if (institutionName) data.institution_name = institutionName;
        if (institutionEmail) {
          data.email = institutionEmail;
          data.institution_domain = institutionEmail.split('@')[1];
        }
        if (Object.keys(data).length > 0) {
          await updateMyProfile(data);
        }
        setStep(3);
      } catch (err) {
        setSubmitError(err.response?.data?.message || 'Failed to update institutional affiliation.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackStep = () => {
    setSubmitError('');
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  // Submit flow
  const handleFinishSetup = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setContactNameError('');
    setContactPhoneError('');

    // Step 3 validation (Emergency Contact is mandatory!)
    let isValid = true;
    if (!contactName || contactName.trim().length < 2) {
      setContactNameError('Emergency contact name is required (min 2 chars).');
      isValid = false;
    }
    if (!contactPhone || !/^\d{10}$/.test(contactPhone)) {
      setContactPhoneError('Please enter a valid 10-digit mobile number.');
      isValid = false;
    }

    if (!isValid) return;

    setLoading(true);

    try {
      await addEmergencyContact({
        contact_name: contactName,
        contact_phone: contactPhone
      });

      // Update local storage user profile completeness if needed
      const storedUserStr = localStorage.getItem('user');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        storedUser.profileSetupCompleted = true;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }

      // Setup complete -> route to dashboard homepage
      navigate('/home');
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to complete profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2">
          <Badge variant="info">Setup Wizard</Badge>
          <span className="text-xs font-bold text-brand-text-secondary">
            Step {step} of 3
          </span>
        </div>

        {submitError && (
          <ErrorBanner 
            message={submitError} 
            onRetry={step === 3 ? handleFinishSetup : undefined}
          />
        )}

        <Card className="p-8 border-slate-800/80 bg-brand-bg-card/90 shadow-xl min-h-[380px] flex flex-col justify-between">
          
          {/* STEP 1: PHOTO & GENDER */}
          {step === 1 && (
            <div className="space-y-6 text-left flex-1">
              <div>
                <h2 className="text-xl font-black text-brand-text-primary">Personalize Profile</h2>
                <p className="text-xs text-brand-text-secondary mt-1">Upload a clear face photo so your passengers/drivers can recognize you.</p>
              </div>

              {/* Avatar Uploader */}
              <div className="flex items-center gap-5">
                <Avatar 
                  src={photoPreview} 
                  name={userName} 
                  size="lg" 
                  className="shadow-brand-glow border-brand-primary/20"
                />
                <div className="space-y-2">
                  <label className="inline-block px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-text-secondary cursor-pointer transition select-none active:scale-95">
                    Choose Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[10px] text-brand-text-muted">JPG or PNG. Max 2MB.</p>
                  <p className="text-[10px] text-indigo-400 font-semibold mt-1">Note: Photo can be updated from your profile settings.</p>
                </div>
              </div>

              {/* Gender selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary select-none">Gender (Optional)</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Other', value: 'other' },
                    { label: 'Prefer Not to Say', value: 'prefer_not_to_say' }
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`
                        py-2.5 px-4 text-xs font-semibold rounded-xl border text-center transition select-none cursor-pointer active:scale-98
                        ${gender === g.value
                          ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-[0_0_8px_rgba(99,102,241,0.1)]'
                          : 'bg-slate-900/60 border-slate-850 text-brand-text-secondary hover:border-slate-750'
                        }
                      `}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INSTITUTIONAL AFFILIATION */}
          {step === 2 && (
            <div className="space-y-6 text-left flex-1">
              <div>
                <h2 className="text-xl font-black text-brand-text-primary">Verify Affiliation</h2>
                <p className="text-xs text-brand-text-secondary mt-1">Linking your college or workplace domain awards a trust badge to your profile.</p>
              </div>

              <InputField
                label="College / Workplace Name"
                placeholder="e.g. Stanford University or Tech IT Park"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
              />

              <InputField
                label="Institutional Email"
                type="email"
                placeholder="e.g. username@college.edu"
                value={institutionEmail}
                onChange={(e) => {
                  setInstitutionEmail(e.target.value);
                  setEmailValidationError('');
                }}
                error={emailValidationError}
                helperText="Enter a domain-linked email to trigger automated trust checks."
              />
            </div>
          )}

          {/* STEP 3: EMERGENCY CONTACT */}
          {step === 3 && (
            <div className="space-y-6 text-left flex-1">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl font-black text-brand-text-primary">Emergency Contact</h2>
                  <Badge variant="danger" className="text-[9px] h-5 px-2">Mandatory</Badge>
                </div>
                <p className="text-xs text-brand-text-secondary">Required for SOS activations and live route tracking logs.</p>
              </div>

              <InputField
                label="Contact Name"
                placeholder="e.g. Guardian Name / Parent / Friend"
                value={contactName}
                onChange={(e) => {
                  setContactName(e.target.value);
                  setContactNameError('');
                }}
                error={contactNameError}
              />

              <InputField
                label="Contact Mobile"
                type="tel"
                placeholder="10-digit number"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value.replace(/\D/g, '').substring(0, 10));
                  setContactPhoneError('');
                }}
                error={contactPhoneError}
                helperText="They will receive SMS alerts with tracking links if you trigger an SOS."
              />
            </div>
          )}

          {/* Wizard Buttons */}
          <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-slate-850 w-full">
            {step > 1 ? (
              <Button
                variant="secondary"
                onClick={handleBackStep}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
            ) : (
              <div className="flex-1" /> // spacer
            )}

            {step < 3 ? (
              <Button
                variant="primary"
                onClick={handleNextStep}
                disabled={loading}
                loading={loading}
                className="flex-1"
              >
                {step === 2 && !institutionName && !institutionEmail ? 'Skip' : 'Next'}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleFinishSetup}
                disabled={!contactName || contactPhone.length !== 10 || loading}
                loading={loading}
                className="flex-1"
              >
                Finish Setup
              </Button>
            )}
          </div>

        </Card>
      </div>
    </div>
  );
}
