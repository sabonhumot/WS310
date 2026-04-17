import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import InputError from '../components/common/InputError';

const InviteEmailPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGuestRejoinModal, setShowGuestRejoinModal] = useState(false);
    const [guestData, setGuestData] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const shareToken = sessionStorage.getItem('pendingShareToken');
        const inviteCode = sessionStorage.getItem('pendingInviteCode');
        if (!shareToken && !inviteCode) {
            navigate('/');
        }
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError('');

        if (!email.trim()) {
            setEmailError('Email address is required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await fetch(`${API_URL}/users/check-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to check email");
            }

            if (data.isRegistered) {
                toast.error("An account exists with this email. Please log in to join the bill.", { duration: 5000 });
                navigate('/login');
            } else if (data.isGuest) {
                setGuestData(data.guestData);
                setShowGuestRejoinModal(true);
            } else {
                sessionStorage.setItem('pendingGuestEmail', email);
                navigate('/invite');
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "An error occurred";
            setEmailError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-7 h-7 text-indigo-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Enter your email</h1>
                        <p className="text-gray-500 font-medium mt-2">We'll check if you already have an account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Mail size={16} />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className={`block w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50/50 font-bold text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                                        emailError
                                            ? 'border-red-500 focus:ring-red-500/20'
                                            : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-500'
                                    }`}
                                    placeholder="juan@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError('');
                                    }}
                                />
                            </div>
                            <InputError message={emailError} />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email.trim()}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {loading ? "Checking..." : "Continue"}
                            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-all">
                            <ArrowLeft size={16} />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Guest Rejoin Modal */}
            {showGuestRejoinModal && guestData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[400] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in scale-in-95 duration-300">
                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-6 relative">
                            <button
                                onClick={() => setShowGuestRejoinModal(false)}
                                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">Welcome Back!</h2>
                                    <p className="text-orange-200 text-xs font-medium mt-0.5">Rejoin as guest</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="bg-orange-50 rounded-xl p-4 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-black text-sm">
                                        {guestData.first_name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-black text-gray-900 text-sm">{guestData.first_name} {guestData.last_name}</p>
                                    <p className="text-xs font-medium text-gray-500">{email}</p>
                                </div>
                            </div>

                            <p className="text-gray-600 text-sm font-medium mb-6">
                                We found your previous guest session. Please confirm your nickname to continue.
                            </p>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                sessionStorage.setItem('pendingGuestEmail', email);
                                sessionStorage.setItem('pendingGuestNickname', guestData.nickname);
                                navigate('/invite');
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nickname</label>
                                    <input
                                        type="text"
                                        value={guestData.nickname}
                                        disabled
                                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-0 font-bold text-sm text-gray-500 cursor-not-allowed"
                                        placeholder="Your nickname"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowGuestRejoinModal(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 text-sm"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InviteEmailPage;
