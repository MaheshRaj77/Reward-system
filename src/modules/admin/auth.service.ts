export const AdminAuthService = {
    login: (password: string): boolean => {
        // In a real app, this should challenge a backend API.
        // Ideally, we'd use a server-side route handler for admin auth to keep the password safe.
        // For this client-side demo requirement:
        if (password === 'admin@pinmbo2025' || password === 'admin@1234') {
            if (typeof window !== 'undefined') {
                localStorage.setItem('pinmbo_admin_auth', 'true');
                // Set a cookie for middleware if we add it later
                document.cookie = "admin_auth=true; path=/";
            }
            return true;
        }
        return false;
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pinmbo_admin_auth');
            document.cookie = "admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        }
    },

    isAuthenticated: (): boolean => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('pinmbo_admin_auth') === 'true';
        }
        return false;
    }
};
