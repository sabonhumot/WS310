import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { User, GuestUser, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load user from localStorage on mount
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('user');
            }
        }

        // Load guest user from localStorage
        const storedGuest = localStorage.getItem('guestSession');
        if (storedGuest) {
            try {
                const guest = JSON.parse(storedGuest);
                const now = new Date().getTime();
                
                // Clear if expired or if expiry is more than 24 hours in the future (invalid)
                if (!guest.expiry || now > guest.expiry || (guest.expiry - now) > 24 * 60 * 60 * 1000) {
                    localStorage.removeItem('guestSession');
                } else {
                    setGuestUser(guest);
                }
            } catch (error) {
                console.error('Failed to parse stored guest:', error);
                localStorage.removeItem('guestSession');
            }
        }

        setIsLoading(false);
    }, []);

    const logoutGuest = useCallback(() => {
        setGuestUser(null);
        localStorage.removeItem('guestSession');
    }, []);

    // Periodically check guest session expiry (every 30 seconds)
    useEffect(() => {
        if (!guestUser?.expiry) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            if (now > guestUser.expiry!) {
                logoutGuest();
                toast.error('Your guest session has expired. Please join again or create an account.', {
                    duration: 6000,
                    id: 'guest-session-expired'
                });
                // Redirect to home — use window.location since we're outside router context
                window.location.href = '/';
            }
        }, 30000); // check every 30 seconds

        return () => clearInterval(interval);
    }, [guestUser, logoutGuest]);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        // Clear guest session if they log in as a real user
        logoutGuest();
    };

    const loginGuest = (guestData: GuestUser) => {
        setGuestUser(guestData);
        localStorage.setItem('guestSession', JSON.stringify(guestData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{
            user,
            guestUser,
            isLoading,
            login,
            logout,
            loginGuest,
            logoutGuest,
            isLoggedIn: !!user,
            isGuestLoggedIn: !!guestUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
