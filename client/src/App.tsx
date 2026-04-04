import React from "react";
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/common/Navbar.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import VerifyPage from './pages/VerifyPage.tsx';
import ActivityPage from './pages/ActivityPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import BillsPage from './pages/BillsPage.tsx';
import BillDetailPage from './pages/BillDetailPage.tsx';
import ArchivePage from './pages/ArchivePage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import InvitePage from './pages/InvitePage.tsx';
import InviteEmailPage from './pages/InviteEmailPage.tsx';
import DashboardLayout from './components/common/DashboardLayout.tsx';
import { Users, Check, CheckCircle2, ArrowRight } from 'lucide-react';

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [inviteCode, setInviteCode] = React.useState('');

    const [isChecking, setIsChecking] = React.useState(false);

    const handleJoinCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = inviteCode.trim();
        if (!code) return;

        setIsChecking(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await fetch(`${API_URL}/bills/invite/${code}`);

            if (response.ok) {
                const data = await response.json();
                if (data.share_token) {
                    sessionStorage.setItem('pendingShareToken', data.share_token);
                }
                sessionStorage.setItem('pendingInviteCode', code);
                navigate(`/invite-email`);
            } else {
                toast.error("Invalid invitation code. Please try again.");
            }
        } catch (error) {
            toast.error("Error verifying code. Please check your connection.");
        } finally {
            setIsChecking(false);
        }
    };
    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                            Split the <span className="gradient-text">Bill</span> <br />
                            Without the <span className="text-gray-400">Stress</span>
                        </h1>
                        <p className="text-lg text-gray-500 max-w-lg leading-relaxed">
                            The simplest way to divide expenses among friends, colleagues, or roommates.
                            No complex spreadsheets, just fair and fast splitting for everyone involved.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <div className="flex items-center gap-2 text-gray-600 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Easy to use
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Accurate results
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 pb-2">
                            <p className="text-sm font-bold text-gray-900 mb-3">Have an invite code?</p>
                            <form onSubmit={handleJoinCode} className="flex gap-2 max-w-md">
                                <input
                                    type="text"
                                    placeholder="Enter invite code"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-bold"
                                />
                                <button
                                    type="submit"
                                    disabled={!inviteCode.trim() || isChecking}
                                    className="px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                                >
                                    {isChecking ? 'Checking...' : 'Join'}
                                    {!isChecking && <ArrowRight size={16} />}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl -z-10"></div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-400/10 rounded-full blur-3xl -z-10"></div>

                        <div className="glass-card p-10 space-y-8 overflow-hidden relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bill</p>
                                    <h3 className="text-2xl font-bold text-gray-900">Dinner at Ribshack</h3>
                                </div>
                                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                                    <Check className="w-4 h-4" />
                                    Paid
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end pb-4 border-b border-gray-50">
                                    <p className="text-gray-500 font-medium flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Total Participants
                                    </p>
                                    <p className="text-xl font-bold text-gray-900">3 People</p>
                                </div>
                                <div className="flex justify-between items-end pb-4 border-b border-gray-50">
                                    <p className="text-gray-500 font-medium">Bill Total</p>
                                    <p className="text-2xl font-black text-gray-900">
                                        <span className="peso-sign mr-1">₱</span>1,500.00
                                    </p>
                                </div>
                            </div>

                            <div className="bg-indigo-500 p-6 rounded-2xl text-white shadow-xl shadow-indigo-200">
                                <p className="text-indigo-100 text-sm font-semibold mb-1">Each Person Pays</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold opacity-80">₱</span>
                                    <span className="text-5xl font-black tabular-nums">500.00</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                                    <div className="flex justify-between text-xs opacity-70">
                                        <span>Host (Rodeliza)</span>
                                        <span>₱500.00</span>
                                    </div>
                                    <div className="flex justify-between text-xs opacity-70">
                                        <span>Rasheed</span>
                                        <span>₱500.00</span>
                                    </div>
                                    <div className="flex justify-between text-xs opacity-70">
                                        <span>Arl</span>
                                        <span>₱500.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const PublicRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
    const { isLoggedIn, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return !isLoggedIn ? element : <Navigate to="/dashboard" replace />;
};

const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
    const { isLoggedIn, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return isLoggedIn ? element : <Navigate to="/login" replace />;
};

const GuestRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
    const { isLoggedIn, isGuestLoggedIn, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (isLoggedIn || isGuestLoggedIn) ? element : <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
    const { isGuestLoggedIn } = useAuth();
    const shouldHideNavbar = isGuestLoggedIn;

    return (
        <div className="min-h-screen">
            <Toaster position="top-right" />
            <Routes>
                <Route path="/" element={<PublicRoute element={<Landing />} />} />
                <Route path="/login" element={<PublicRoute element={<>{!shouldHideNavbar && <Navbar />}<LoginPage /></>} />} />
                <Route path="/register" element={<PublicRoute element={<>{!shouldHideNavbar && <Navbar />}<RegisterPage /></>} />} />
                <Route path="/verify" element={<PublicRoute element={<>{!shouldHideNavbar && <Navbar />}<VerifyPage /></>} />} />
                <Route path="/forgot-password" element={<PublicRoute element={<>{!shouldHideNavbar && <Navbar />}<ForgotPasswordPage /></>} />} />
                <Route path="/reset-password" element={<PublicRoute element={<>{!shouldHideNavbar && <Navbar />}<ResetPasswordPage /></>} />} />
                <Route path="/invite-email" element={<>{!shouldHideNavbar && <Navbar />}<InviteEmailPage /></>} />
                <Route path="/invite" element={<>{!shouldHideNavbar && <Navbar />}<InvitePage /></>} />

                {/* Protected Routes with DashboardLayout */}
                <Route element={<ProtectedRoute element={<DashboardLayout />} />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    <Route path="/activity" element={<ActivityPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Guest-Allowed Routes with DashboardLayout */}
                <Route element={<GuestRoute element={<DashboardLayout />} />}>
                    <Route path="/bills" element={<BillsPage />} />
                    <Route path="/bills/:billId" element={<BillDetailPage />} />
                </Route>
            </Routes>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
