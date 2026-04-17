import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import InputError from '../components/common/InputError';

const InvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [inviteCode, setInviteCode] = useState<string | null>(searchParams.get('code') || sessionStorage.getItem('pendingInviteCode'));
    const [shareToken, setShareToken] = useState<string | null>(searchParams.get('token') || sessionStorage.getItem('pendingShareToken'));
    const navigate = useNavigate();
    const { isLoggedIn, loginGuest } = useAuth();

    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [validCode, setValidCode] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    // Cleanup URL and store in session
    useEffect(() => {
        const urlCode = searchParams.get('code');
        const urlToken = searchParams.get('token');

        if (urlCode || urlToken) {
            if (urlCode) {
                setInviteCode(urlCode);
                sessionStorage.setItem('pendingInviteCode', urlCode);
            }
            if (urlToken) {
                setShareToken(urlToken);
                sessionStorage.setItem('pendingShareToken', urlToken);
            }
            // Clear URL immediately for security and aesthetics
            window.history.replaceState({}, '', '/invite');
        }
    }, [searchParams]);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        nickname: sessionStorage.getItem('pendingGuestNickname') || '',
        email: sessionStorage.getItem('pendingGuestEmail') || ''
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    useEffect(() => {
        if ((!inviteCode && !shareToken) || !formData.email) {
            setVerifying(false);
            if (!formData.email) {
                navigate('/invite-email');
            }
            return;
        }

        if (isLoggedIn) {
            navigate('/dashboard');
            return;
        }

        const verifyCode = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                const endpoint = shareToken && shareToken !== 'null' && shareToken !== 'undefined' ? `${API_URL}/bills/token/${shareToken}` : `${API_URL}/bills/invite/${inviteCode}`;
                const res = await fetch(endpoint);
                if (res.ok) {
                    setValidCode(true);
                } else {
                    setValidCode(false);
                    // Clear invalid session storage
                    sessionStorage.removeItem('pendingInviteCode');
                    sessionStorage.removeItem('pendingShareToken');
                }
            } catch (e) {
                setValidCode(false);
            } finally {
                setVerifying(false);
            }
        }

        verifyCode();
    }, [inviteCode, shareToken, isLoggedIn, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        // Basic front-end validation
        const errors: { [key: string]: string } = {};
        if (!formData.first_name.trim()) errors.first_name = 'First name is required';
        if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
        if (!sessionStorage.getItem('pendingGuestNickname') && !formData.nickname.trim()) errors.nickname = 'Nickname is required';
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:5001/api/bills/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invite_code: inviteCode,
                    share_token: shareToken,
                    ...formData
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.requiresLogin) {
                    toast.error(data.message);
                    navigate('/login');
                } else {
                    const errorMsg = data.message || 'Failed to join bill';
                    toast.error(errorMsg);

                    if (errorMsg.includes('Email')) setFieldErrors(prev => ({ ...prev, email: errorMsg }));
                    else if (errorMsg.includes('Nickname')) setFieldErrors(prev => ({ ...prev, nickname: errorMsg }));
                    else setFieldErrors(prev => ({ ...prev, general: errorMsg }));
                }
                return;
            }

            if (data.isRegistered) {
                toast.success(data.message || "Successfully joined!");
                navigate(`/bills?billId=${data.billId}`);
                return;
            }

            // Save guest session (6 hours)
            const expiry = new Date().getTime() + 6 * 60 * 60 * 1000;
            const guestData = { ...data.guestUser, expiry };
            loginGuest(guestData);

            toast.success('Successfully joined the bill!');
            navigate(`/bills?billId=${data.billId}`);

        } catch (error: any) {
            const errorMsg = error.message || "An error occurred";
            toast.error(errorMsg);
            setFieldErrors(prev => ({ ...prev, general: errorMsg }));
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

    if ((!inviteCode && !shareToken) || !validCode) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Invalid Invite Code</h2>
                    <p className="text-gray-500 font-bold mb-8">This invitation might be invalid or the code is incorrect.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-black transition-all uppercase tracking-widest text-xs"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Join Bill</h1>
                    <p className="text-gray-500 font-bold">You've been invited to join a bill. Please provide your details below to continue.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => handleInputChange('first_name', e.target.value)}
                                className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-bold text-sm ${fieldErrors.first_name ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500'}`}
                                placeholder="Juan"
                            />
                            <InputError message={fieldErrors.first_name} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => handleInputChange('last_name', e.target.value)}
                                className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-bold text-sm ${fieldErrors.last_name ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500'}`}
                                placeholder="Dela Cruz"
                            />
                            <InputError message={fieldErrors.last_name} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nickname</label>
                        <input
                            type="text"
                            value={formData.nickname}
                            onChange={(e) => handleInputChange('nickname', e.target.value)}
                            disabled={!!sessionStorage.getItem('pendingGuestNickname')}
                            className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-bold text-sm ${fieldErrors.nickname ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500'} ${sessionStorage.getItem('pendingGuestNickname') ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            placeholder="Juanita"
                        />
                        <InputError message={fieldErrors.nickname} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-0 font-bold text-sm text-gray-500 cursor-not-allowed"
                            placeholder="juan@example.com"
                        />
                        <InputError message={fieldErrors.email} />
                    </div>

                    {fieldErrors.general && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-xs text-red-600 font-bold text-center">{fieldErrors.general}</p>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-black transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-70"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Join Bill"
                            )}
                        </button>
                    </div>

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
