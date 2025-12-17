import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileAuthService } from './mobile-auth.service';

// Mock the parent-auth lib
const mockLoginParent = vi.fn();
const mockRegisterParent = vi.fn();

vi.mock('@/lib/auth/parent-auth', () => ({
    loginParent: (...args: any[]) => mockLoginParent(...args),
    registerParent: (...args: any[]) => mockRegisterParent(...args),
}));

describe('MobileAuthService', () => {
    let service: MobileAuthService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new MobileAuthService();
    });

    it('should login successfully if user exists', async () => {
        // Setup mock for successful login
        mockLoginParent.mockResolvedValue({
            success: true,
            parent: { id: '123', name: 'Existing User' }
        });

        const result = await service.authenticateWithMobile('9999999999');

        expect(result.success).toBe(true);
        expect(result.parent?.name).toBe('Existing User');
        expect(mockLoginParent).toHaveBeenCalled();

        // Verify credentials generation
        const calledEmail = mockLoginParent.mock.calls[0][0];
        expect(calledEmail).toContain('@pinmbo.local');
    });

    it('should register if login fails', async () => {
        // Setup mock: Login fails, Register succeeds
        mockLoginParent.mockResolvedValue({ success: false, error: 'User not found' });
        mockRegisterParent.mockResolvedValue({
            success: true,
            parent: { id: '456', name: 'Parent 9999' }
        });

        const result = await service.authenticateWithMobile('9999999999');

        expect(result.success).toBe(true);
        expect(result.isNewUser).toBe(true);
        expect(mockLoginParent).toHaveBeenCalled();
        expect(mockRegisterParent).toHaveBeenCalled();
    });

    it('should fail if both login and register fail', async () => {
        mockLoginParent.mockResolvedValue({ success: false });
        mockRegisterParent.mockResolvedValue({ success: false, error: 'Registration failed' });

        const result = await service.authenticateWithMobile('9999999999');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Registration failed');
    });
});
