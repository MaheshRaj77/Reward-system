import 'dotenv/config';
import { emailOtpService } from '../src/modules/auth/email-otp.service';

async function testEmail() {
    console.log('Testing Email OTP Service with Gmail...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET');

    // Allow time for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test with user's real email
    const otp = await emailOtpService.sendOtp('maheshmsr777@gmail.com');
    console.log(`OTP Generated: ${otp}`);
    console.log('Check your Gmail inbox for the OTP email!');

    // Keep process alive briefly to ensure async logs come through
    await new Promise(resolve => setTimeout(resolve, 2000));
}

testEmail().catch(console.error);
