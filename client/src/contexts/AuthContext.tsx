import React, { createContext, useContext, useState, useEffect } from 'react';
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
                if (guest.expiry && now > guest.expiry) {
                    // Session expired
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

    const logoutGuest = () => {
        setGuestUser(null);
        localStorage.removeItem('guestSession');
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
