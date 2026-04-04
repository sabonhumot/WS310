import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const InviteEmailPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
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
        
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await fetch(`${API_URL}/users/check-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to check email");
            }

            if (data.isRegistered) {
                toast.error("An account exists with this email. Please log in to join the bill.", { duration: 5000 });
                navigate('/login');
            } else {
                sessionStorage.setItem('pendingGuestEmail', email);
                navigate('/invite');
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "An error occurred";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-73px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/30">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Enter your email</h2>
                        <p className="text-gray-500 mt-2">We need to check if you already have an account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all sm:text-sm"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email.trim()}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Checking..." : "Continue"}
                            {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
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
        </div>
    );
};

export default InviteEmailPage;
