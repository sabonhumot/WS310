import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Receipt, Users, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const InvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const inviteCode = searchParams.get('code');
    const navigate = useNavigate();
    const { isLoggedIn } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [validCode, setValidCode] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: ''
    });

    useEffect(() => {
        if (!inviteCode) {
            setVerifying(false);
            return;
        }

        if (isLoggedIn) {
            navigate('/dashboard');
            return;
        }

        const verifyCode = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                const res = await fetch(`${API_URL}/bills/invite/${inviteCode}`);
                if (res.ok) {
                    setValidCode(true);
                } else {
                    setValidCode(false);
                }
            } catch (e) {
                setValidCode(false);
            } finally {
                setVerifying(false);
            }
        }

        verifyCode();
    }, [inviteCode, isLoggedIn, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5001/api/bills/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invite_code: inviteCode,
                    ...formData
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.requiresLogin) {
                    toast.error(data.message);
                    navigate('/login');
                } else {
                    throw new Error(data.message || 'Failed to join bill');
                }
                return;
            }

            if (data.isRegistered) {
                toast.success(data.message || "Successfully joined! Please log in.");
                navigate('/login');
                return;
            }

            // Save guest session (6 hours)
            const expiry = new Date().getTime() + 6 * 60 * 60 * 1000;
            const guestData = { ...data.guestUser, expiry };
            localStorage.setItem('guestSession', JSON.stringify(guestData));
            
            // Allow them to navigate as guest later
            // We'll redirect to a guest view or dashboard where they can see the bill
            toast.success('Successfully joined the bill!');
            navigate(`/bills`); // Or a specific guest view

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!inviteCode || !validCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full glass-card p-8 text-center space-y-4">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto" />
                    <h2 className="text-2xl font-black text-gray-900">Invalid Invite Link</h2>
                    <p className="text-gray-500 font-medium">This invitation link appears to be invalid or has expired.</p>
                    <button onClick={() => navigate('/')} className="primary-button w-full mt-4">
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            <div className="max-w-md w-full glass-card p-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-8">
                    <div className="mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 flex items-center justify-center rounded-2xl shadow-lg shadow-indigo-200 mb-6 transform -rotate-6">
                        <Users className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">You've been invited!</h2>
                    <p className="text-gray-500 font-medium mt-2">Join the bill to view details and settle up.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">First Name</label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all"
                                placeholder="Juan"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Last Name</label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all"
                                placeholder="Dela Cruz"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all"
                            placeholder="juan@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="primary-button w-full flex items-center justify-center gap-2 group mt-6 py-4"
                    >
                        {loading ? 'Joining...' : 'Join as Guest'}
                        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                    
                    <p className="text-center text-xs text-gray-400 font-medium mt-4">
                        Guest access lasts for 6 hours. You can upgrade to a full account later.
                    </p>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm font-bold text-gray-500">Already have an account?</p>
                        <button 
                            type="button"
                            onClick={() => navigate('/login')}
                            className="text-indigo-600 font-black hover:text-indigo-700 uppercase tracking-widest text-xs mt-2"
                        >
                            Log In Here
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvitePage;
