import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { 
  getMyProfile, 
  updateMyProfile, 
  addVehicle, 
  updateVehicle, 
  deleteVehicle 
} from '../api/profile';
import InputField from '../components/InputField';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import RatingDisplay from '../components/RatingDisplay';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

export default function ProfileScreen() {
  const navigate = useNavigate();

  // Core States
  const [currentUser, setCurrentUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [toastText, setToastText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editable Profile Fields
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [instError, setInstError] = useState('');

  // Vehicle Management Form States
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null); // id of vehicle editing
  const [vehName, setVehName] = useState('');
  const [vehPlate, setVehPlate] = useState('');
  const [vehType, setVehType] = useState('two_wheeler');
  const [vehNameError, setVehNameError] = useState('');
  const [vehPlateError, setVehPlateError] = useState('');

  // Dev Toolbar States
  const [simulateSaveError, setSimulateSaveError] = useState(false);
  const [forceLoading, setForceLoading] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getMyProfile();
      if (res && res.data) {
        const u = res.data;
        const profileUser = {
          name: u.profile?.full_name || 'User',
          mobile: u.phone_number,
          email: u.email,
          institutionName: u.profile?.institution_name || 'None',
          institutionDomain: u.profile?.institution_domain || '',
          photoUrl: u.profile?.photo_url || '',
          gender: u.profile?.gender || '',
          bio: u.profile?.bio || '',
          badges: u.badges,
          account_status: u.account_status,
          aggregates: u.aggregates
        };
        setCurrentUser(profileUser);
        setEditName(profileUser.name);
        setEditEmail(profileUser.email || '');
        setEditInstitution(profileUser.institutionName || '');
        
        // Map vehicles
        const mappedVehicles = (u.vehicles || []).map(v => ({
          id: v.vehicle_id,
          name: `${v.make} ${v.model}`,
          plate: v.registration_number,
          type: v.vehicle_type,
          color: v.color
        }));
        setVehicles(mappedVehicles);
      }
    } catch (err) {
      console.error('Error fetching own profile:', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.resolve();
      fetchProfileData();
    };
    init();
  }, []);

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  };

  // Profile Save Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setNameError('');
    setEmailError('');
    setInstError('');

    let isValid = true;
    if (editName.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    }
    if (!editEmail.trim() || !/\S+@\S+\.\S+/.test(editEmail)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    if (editInstitution.trim().length < 3) {
      setInstError('Institution name must be at least 3 characters');
      isValid = false;
    }

    if (!isValid) return;

    if (simulateSaveError) {
      setNameError('Sync error: Failed to update profile details on the server database.');
      return;
    }

    try {
      setError('');
      const payload = {
        full_name: editName.trim(),
        email: editEmail.trim(),
        institution_name: editInstitution.trim(),
        photo_url: currentUser.photoUrl,
        gender: currentUser.gender,
        bio: currentUser.bio
      };

      const res = await updateMyProfile(payload);
      if (res && res.status === 'success') {
        const authUser = useAuthStore.getState().user;
        const updatedAuthUser = {
          ...authUser,
          name: editName.trim(),
          email: editEmail.trim(),
          institutionName: editInstitution.trim()
        };
        useAuthStore.setState({ user: updatedAuthUser });
        localStorage.setItem('user', JSON.stringify(updatedAuthUser));

        triggerToast('Profile updated successfully.');
        setIsEditingInfo(false);
        fetchProfileData();
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile details.');
    }
  };

  // Vehicles Management Handlers
  const validateVehicleForm = () => {
    let isValid = true;
    setVehNameError('');
    setVehPlateError('');

    if (vehName.trim().length < 3) {
      setVehNameError('Vehicle model must be at least 3 characters');
      isValid = false;
    }
    if (vehPlate.trim().length < 5) {
      setVehPlateError('Please enter a valid plate number (min 5 characters)');
      isValid = false;
    }
    return isValid;
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!validateVehicleForm()) return;

    try {
      setError('');
      const nameParts = vehName.trim().split(' ');
      const make = nameParts[0] || 'Unknown';
      const model = nameParts.slice(1).join(' ') || 'Unknown';
      const color = 'Black';

      await addVehicle({
        vehicle_type: vehType,
        make,
        model,
        registration_number: vehPlate.trim().toUpperCase(),
        color,
        is_active: true
      });

      setVehName('');
      setVehPlate('');
      setVehType('two_wheeler');
      setShowVehicleForm(false);
      triggerToast('Vehicle added successfully.');
      fetchProfileData();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err.response?.data?.message || 'Failed to add vehicle.');
    }
  };

  const handleStartEditVehicle = (veh) => {
    setEditingVehicleId(veh.id);
    setVehName(veh.name);
    setVehPlate(veh.plate);
    setVehType(veh.type);
    setVehNameError('');
    setVehPlateError('');
  };

  const handleSaveEditVehicle = async (e) => {
    e.preventDefault();
    if (!validateVehicleForm()) return;

    try {
      setError('');
      const nameParts = vehName.trim().split(' ');
      const make = nameParts[0] || 'Unknown';
      const model = nameParts.slice(1).join(' ') || 'Unknown';
      const color = 'Black';

      await updateVehicle(editingVehicleId, {
        make,
        model,
        registration_number: vehPlate.trim().toUpperCase(),
        color,
        is_active: true
      });

      setEditingVehicleId(null);
      setVehName('');
      setVehPlate('');
      setVehType('two_wheeler');
      triggerToast('Vehicle details updated.');
      fetchProfileData();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      setError(err.response?.data?.message || 'Failed to update vehicle details.');
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (window.confirm('Are you sure you want to remove this vehicle?')) {
      try {
        setError('');
        await deleteVehicle(id);
        triggerToast('Vehicle removed.');
        fetchProfileData();
      } catch (err) {
        console.error('Error deleting vehicle:', err);
        setError(err.response?.data?.message || 'Failed to delete vehicle.');
      }
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 text-left">
        <NavigationBar className="relative z-10" />
        <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6">
          <SkeletonLoader variant="avatar-row" count={1} />
          <SkeletonLoader variant="card" count={2} />
        </main>
      </div>
    );
  }

  if (!currentUser) return null;

  const isScreenLoading = loading || forceLoading;

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 text-left">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-880 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs font-semibold z-30">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setForceLoading(!forceLoading)} 
            className={`px-2 py-1 rounded transition cursor-pointer ${forceLoading ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-650 text-slate-200'}`}
          >
            {forceLoading ? 'Disable Skeletons' : 'Simulate Skeletons'}
          </button>
          <button 
            onClick={() => setSimulateSaveError(!simulateSaveError)} 
            className={`px-2 py-1 rounded transition cursor-pointer ${simulateSaveError ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-650 text-slate-200'}`}
          >
            {simulateSaveError ? 'Save Error: ON' : 'Simulate Save Error'}
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {toastText && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastText}
        </div>
      )}

      {/* Screen Header */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
            >
              <span>🡐</span> Back
            </button>
            <span className="text-slate-600">|</span>
            <h2 className="text-sm font-bold text-slate-200">My Account Profile</h2>
          </div>
          <Badge variant="success">Verified Profile</Badge>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6">
        
        {error && <ErrorBanner message={error} />}

        {isScreenLoading ? (
          <div className="space-y-6">
            <SkeletonLoader variant="avatar-row" count={1} />
            <SkeletonLoader variant="card" count={2} />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. HEADER SUMMARY CARD */}
            <Card className="p-5 border-slate-800 bg-gradient-to-br from-slate-900/60 to-indigo-950/5">
              <div className="flex items-center gap-4">
                <Avatar 
                  name={currentUser.name} 
                  src={currentUser.photoUrl} 
                  size="lg" 
                  className="border-2 border-indigo-500/20"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-slate-200 truncate">{currentUser.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <RatingDisplay rating={currentUser.aggregates?.rating || 0} size="sm" />
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-[10px] text-brand-text-secondary font-bold uppercase tracking-wide">
                      ⭐ {currentUser.aggregates?.rating || 0} ({currentUser.aggregates?.completedRidesCount || 0} rides)
                    </span>
                  </div>
                  <p className="text-xs text-brand-text-muted mt-1.5 font-mono">📱 +91 {currentUser.mobile}</p>
                </div>
              </div>
            </Card>

            {/* 2. VERIFICATION BADGES CHECKLIST */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Trust Credentials Status</h3>
              <Card className="p-4 border-slate-800 grid grid-cols-2 gap-3 text-xs bg-slate-900/10">
                <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-xl border border-slate-850">
                  <span className="text-slate-400">📱 Mobile OTP</span>
                  <Badge variant={currentUser.badges?.mobile_verified ? "success" : "danger"}>
                    {currentUser.badges?.mobile_verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-xl border border-slate-850">
                  <span className="text-slate-400">📧 Student Email</span>
                  <Badge variant={currentUser.badges?.email_verified ? "success" : "danger"}>
                    {currentUser.badges?.email_verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-xl border border-slate-850">
                  <span className="text-slate-400">🆔 Institutional ID</span>
                  <Badge variant={currentUser.badges?.institution_verified ? "success" : "danger"}>
                    {currentUser.badges?.institution_verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-xl border border-slate-850">
                  <span className="text-slate-400">🎓 Active Status</span>
                  <Badge variant={currentUser.account_status === "active" ? "success" : "danger"}>
                    {currentUser.account_status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </Card>
            </div>

            {/* 3. PROFILE FIELDS INLINE EDITING */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Profile Details</h3>
                {!isEditingInfo && (
                  <button 
                    onClick={() => setIsEditingInfo(true)}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Edit Info
                  </button>
                )}
              </div>

              <Card className="p-4 border-slate-800">
                {isEditingInfo ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
                    <InputField 
                      label="Full Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      error={nameError}
                    />
                    <InputField 
                      label="University Email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      error={emailError}
                    />
                    <InputField 
                      label="Campus / Company"
                      value={editInstitution}
                      onChange={(e) => setEditInstitution(e.target.value)}
                      error={instError}
                    />
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1 py-2 text-xs">Save Changes</Button>
                      <Button 
                        onClick={() => {
                          setIsEditingInfo(false);
                          setEditName(currentUser.name);
                          setEditEmail(currentUser.email || '');
                          setEditInstitution(currentUser.institutionName || '');
                        }} 
                        variant="secondary" 
                        className="px-4 py-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Full Name</span>
                      <span className="font-bold text-slate-200">{currentUser.name}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850 pt-3">
                      <span className="text-slate-500 font-medium">Student Email</span>
                      <span className="font-bold text-slate-200">{currentUser.email || 'None'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850 pt-3">
                      <span className="text-slate-500 font-medium">Campus</span>
                      <span className="font-bold text-slate-200">{currentUser.institutionName || 'None'}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* 4. VEHICLES CRUD LIST */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">My Registered Vehicles</h3>
                {!showVehicleForm && editingVehicleId === null && (
                  <button 
                    onClick={() => { setShowVehicleForm(true); setVehName(''); setVehPlate(''); setVehType('two_wheeler'); }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    + Add Vehicle
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {vehicles.map((v) => (
                  <Card key={v.id} className="p-4 border-slate-850 bg-slate-900/10">
                    {editingVehicleId === v.id ? (
                      /* Edit Vehicle Inline Form */
                      <form onSubmit={handleSaveEditVehicle} className="space-y-3 text-left">
                        <InputField 
                          label="Vehicle Model/Name"
                          value={vehName}
                          onChange={(e) => setVehName(e.target.value)}
                          error={vehNameError}
                          placeholder="e.g. Honda Activa 6G"
                        />
                        <InputField 
                          label="Registration Plate Number"
                          value={vehPlate}
                          onChange={(e) => setVehPlate(e.target.value)}
                          error={vehPlateError}
                          placeholder="e.g. MH12AB1234"
                        />
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Vehicle Type</label>
                          <select 
                            value={vehType} 
                            onChange={(e) => setVehType(e.target.value)}
                            className="px-4 py-2.5 bg-brand-bg-card border border-slate-850 rounded-xl text-xs md:text-sm"
                          >
                            <option value="two_wheeler">🏍️ Two-Wheeler</option>
                            <option value="car">🚗 Four-Wheeler (Car)</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button type="submit" className="flex-1 py-2 text-xs">Save</Button>
                          <Button onClick={() => setEditingVehicleId(null)} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      /* Read Vehicle View */
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{v.type === 'car' ? '🚗' : '🏍️'}</span>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-200">{v.name}</h4>
                            <span className="inline-block px-2 py-0.5 mt-0.5 rounded bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400 tracking-wider">
                              {v.plate}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleStartEditVehicle(v)}
                            className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="text-rose-400 hover:text-rose-350 font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Add Vehicle Form */}
              {showVehicleForm && (
                <Card className="p-4 border-indigo-500/25 bg-slate-900/50">
                  <form onSubmit={handleAddVehicle} className="space-y-3 text-left">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase">New Vehicle Registration</h4>
                    <InputField 
                      label="Vehicle Model/Name"
                      placeholder="e.g. Maruti Suzuki Swift"
                      value={vehName}
                      onChange={(e) => setVehName(e.target.value)}
                      error={vehNameError}
                    />
                    <InputField 
                      label="Registration Plate Number"
                      placeholder="e.g. DL3CAN5678"
                      value={vehPlate}
                      onChange={(e) => setVehPlate(e.target.value)}
                      error={vehPlateError}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Vehicle Type</label>
                      <select 
                        value={vehType} 
                        onChange={(e) => setVehType(e.target.value)}
                        className="px-4 py-3 bg-brand-bg-card border border-slate-850 rounded-xl text-xs md:text-sm text-brand-text-primary outline-none"
                      >
                        <option value="two_wheeler">🏍️ Two-Wheeler (Scooter/Bike)</option>
                        <option value="car">🚗 Four-Wheeler (Car)</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1 py-2 text-xs">Add Vehicle</Button>
                      <Button onClick={() => setShowVehicleForm(false)} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>

            {/* 5. NAVIGATION LINKS MENU */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Account Actions Hub</h3>
              <Card className="p-1 border-slate-850 divide-y divide-slate-850/80">
                <Link to="/ride-history" className="flex justify-between items-center p-3.5 hover:bg-slate-900/20 text-xs font-semibold text-slate-300 transition duration-150">
                  <span>📅 Commute History Logs</span>
                  <span className="text-slate-500">➔</span>
                </Link>
                <Link to="/savings" className="flex justify-between items-center p-3.5 hover:bg-slate-900/20 text-xs font-semibold text-slate-300 transition duration-150">
                  <span>🌱 Ecological & Cash Impact</span>
                  <span className="text-slate-500">➔</span>
                </Link>
                <Link to="/safety-center" className="flex justify-between items-center p-3.5 hover:bg-slate-900/20 text-xs font-semibold text-slate-300 transition duration-150">
                  <span>🛡️ Safety Center Settings</span>
                  <span className="text-slate-500">➔</span>
                </Link>
                <Link to="/settings" className="flex justify-between items-center p-3.5 hover:bg-slate-900/20 text-xs font-semibold text-slate-300 transition duration-150">
                  <span>⚙️ Account Settings Preferences</span>
                  <span className="text-slate-500">➔</span>
                </Link>
              </Card>
            </div>

          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
