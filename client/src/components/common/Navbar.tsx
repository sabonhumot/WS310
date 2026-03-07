import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Receipt, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const LogoutModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h2>
                <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

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
            <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 py-4">
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

