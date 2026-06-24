/**
 * Mock Auth Flow Utility
 * Simulates API network delay and manages user session/registration state in localStorage.
 * Wireframe verification code: "123456"
 */
export const mockAuth = {
  delay: (ms = 800) => new Promise((resolve) => setTimeout(resolve, ms)),

  isOnboarded: () => {
    return localStorage.getItem('hasOnboarded') === 'true';
  },

  setOnboarded: () => {
    localStorage.setItem('hasOnboarded', 'true');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  isLoggedIn: () => {
    return localStorage.getItem('isLoggedIn') === 'true';
  },

  isProfileSetup: () => {
    const user = mockAuth.getCurrentUser();
    return user ? Boolean(user.profileSetupCompleted) : false;
  },

  requestOtp: async (mobile) => {
    await mockAuth.delay(1000);
    if (!/^\d{10}$/.test(mobile)) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }
    // Temporarily store target mobile for verification matching
    localStorage.setItem('tempMobile', mobile);
    console.log(`[Mock Auth] OTP "123456" sent to ${mobile}`);
    return { success: true, message: 'OTP sent successfully' };
  },

  verifyOtp: async (otp) => {
    await mockAuth.delay(1200);
    if (otp !== '123456') {
      throw new Error('Invalid OTP. Please enter 123456 to verify.');
    }
    const mobile = localStorage.getItem('tempMobile');
    
    // Check if user is already registered in local storage database
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const existingUser = registeredUsers.find((u) => u.mobile === mobile);
    
    if (existingUser) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', JSON.stringify(existingUser));
      return { success: true, userExists: true, user: existingUser };
    } else {
      // User is new, must proceed to registration
      return { success: true, userExists: false, tempMobile: mobile };
    }
  },

  register: async ({ name, email, mobile, termsAccepted }) => {
    await mockAuth.delay(1000);
    if (!name || name.trim().length < 2) {
      throw new Error('Please enter a valid name (at least 2 characters)');
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    if (!termsAccepted) {
      throw new Error('You must accept the Terms and Conditions');
    }

    const newUser = {
      mobile,
      name,
      email,
      profileSetupCompleted: false,
      emergencyContacts: []
    };

    // Save in our mock local database
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    // Prevent duplicate entries
    const cleanList = registeredUsers.filter((u) => u.mobile !== mobile);
    cleanList.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(cleanList));

    // Auto log in the user
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify(newUser));

    return { success: true, user: newUser };
  },

  setupProfile: async ({ photoUrl, gender, institutionName, emergencyContacts }) => {
    await mockAuth.delay(1200);
    
    const user = mockAuth.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user session found');
    }

    if (!emergencyContacts || emergencyContacts.length === 0 || !emergencyContacts[0]?.name || !emergencyContacts[0]?.phone) {
      throw new Error('At least one emergency contact is mandatory');
    }

    user.photoUrl = photoUrl || '';
    user.gender = gender || 'prefer_not_to_say';
    user.institutionName = institutionName || '';
    user.emergencyContacts = emergencyContacts;
    user.profileSetupCompleted = true;

    // Update in our mock database
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const updatedUsers = registeredUsers.map((u) => u.mobile === user.mobile ? user : u);
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));

    // Update current session
    localStorage.setItem('currentUser', JSON.stringify(user));

    return { success: true, user };
  },

  logout: () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('tempMobile');
  }
};
