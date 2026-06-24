/**
 * OtpProvider (Scaffold & Mock Interface)
 * 
 * Provides abstraction for sending SMS OTPs.
 * Currently prints details to console.
 */
export class OtpProvider {
  /**
   * Dispatches a 6-digit OTP code to the target phone number.
   * 
   * @param {string} phoneNumber 
   * @param {string} otpCode 
   * @returns {Promise<boolean>}
   */
  static async sendOtp(phoneNumber, otpCode) {
    console.log(`\n==================================================`);
    console.log(`📨 [OtpProvider] SENDING SMS OTP TO: ${phoneNumber}`);
    console.log(`🔑 CODE: ${otpCode}`);
    console.log(`==================================================\n`);
    
    // Return true to simulate a successful SMS gateway request
    return true;
  }
}
