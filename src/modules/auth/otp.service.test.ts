import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OtpService } from './otp.service';

// Mock Twilio
const mockCreateVerification = vi.fn();
const mockCreateVerificationCheck = vi.fn();

vi.mock('twilio', () => {
    return {
        default: () => ({
            verify: {
                v2: {
                    services: () => ({
                        verifications: {
                            create: mockCreateVerification
                        },
                        verificationChecks: {
                            create: mockCreateVerificationCheck
                        }
                    })
                }
            }
        })
    };
});

describe('OtpService', () => {
    let service: OtpService;

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup env vars
        process.env.TWILIO_ACCOUNT_SID = 'test_sid';
        process.env.TWILIO_AUTH_TOKEN = 'test_token';
        process.env.TWILIO_VERIFY_SERVICE_ID = 'test_service_id';

        service = new OtpService();
    });

    it('should bypass Twilio for test number', async () => {
        const result = await service.sendOtp('9999999999');

        expect(result.success).toBe(true);
        expect(result.verificationId).toBe('test-verification-id');
        expect(mockCreateVerification).not.toHaveBeenCalled();
    });

    it('should verify correctly for test number and correct OTP', async () => {
        const result = await service.verifyOtp('9999999999', '123456');

        expect(result.success).toBe(true);
        expect(result.valid).toBe(true);
        expect(mockCreateVerificationCheck).not.toHaveBeenCalled();
    });

    it('should fail for test number and incorrect OTP', async () => {
        const result = await service.verifyOtp('9999999999', '000000');

        expect(result.success).toBe(false);
        expect(result.valid).toBe(false);
    });

    it('should call Twilio for real numbers', async () => {
        mockCreateVerification.mockResolvedValue({ sid: 'real_sid', status: 'pending' });

        const result = await service.sendOtp('9876543210');

        expect(result.success).toBe(true);
        expect(mockCreateVerification).toHaveBeenCalledWith({
            to: '+919876543210',
            channel: 'sms'
        });
    });

    it('should call Twilio for verification of real numbers', async () => {
        mockCreateVerificationCheck.mockResolvedValue({ status: 'approved' });

        const result = await service.verifyOtp('9876543210', '1234');

        expect(result.success).toBe(true);
        expect(result.valid).toBe(true);
        expect(mockCreateVerificationCheck).toHaveBeenCalledWith({
            to: '+919876543210',
            code: '1234'
        });
    });
});
