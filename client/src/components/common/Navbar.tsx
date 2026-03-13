import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Receipt, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import LogoutModal from './LogoutModal';

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const { isLoggedIn, logout, user } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(false);
        logout();
        toast.success("Logged out successfully!");
        navigate('/');
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-100 bg-white border-b border-gray-100 py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
                            <Receipt className="w-6 h-6 text-indigo-600" />
                            <span className="text-xl font-bold text-gray-900">
                                Bill<span className="italic">Split</span>
                            </span>
                        </Link>

                        <div className="flex items-center gap-4">
                            {isLoggedIn ? (
                                <>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900">{user?.nickname}</p>
                                        <p className="text-xs text-gray-500">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowLogoutModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                    >
                                        <LogOut size={18} />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        Log in
                                    </button>
                                    <button
                                        onClick={() => navigate('/register')}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        Sign up
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <LogoutModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
            />
        </>
    );
};

export default Navbar;

