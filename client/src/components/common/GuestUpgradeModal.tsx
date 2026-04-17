import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import InputError from './InputError';

interface GuestUpgradeModalProps {
    onClose: () => void;
}

const GuestUpgradeModal: React.FC<GuestUpgradeModalProps> = ({ onClose }) => {
    const { guestUser } = useAuth();
    const [formData, setFormData] = useState({
        first_name: guestUser?.first_name || '',
        last_name: guestUser?.last_name || '',
        nickname: guestUser?.nickname || '',
        email: guestUser?.email || '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!guestUser) return null;

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};

        if (!formData.first_name.trim()) {
            newErrors.first_name = 'First name is required';
        }
        if (!formData.last_name.trim()) {
            newErrors.last_name = 'Last name is required';
        }
        if (!formData.nickname.trim()) {
            newErrors.nickname = 'Nickname is required';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await fetch(`${API_URL}/users/upgrade-guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_id: guestUser.id,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    nickname: formData.nickname,
                    email: formData.email,
                    username: formData.username,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.message?.toLowerCase().includes('username')) {
                    setErrors({ username: data.message });
                } else if (data.message?.toLowerCase().includes('email')) {
                    setErrors({ general: data.message });
                } else {
                    setErrors({ general: data.message || 'Failed to create account' });
                }
                return;
            }

            setSuccess(true);
            toast.success('Account created! Check your email to verify before logging in.', { duration: 4000 });
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            setErrors({ general: 'An error occurred. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[400] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in scale-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Create Your Account</h2>
                            <p className="text-indigo-200 text-xs font-medium mt-0.5">Keep your bill history forever</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Pre-filled guest info display */}
                    <div className="bg-indigo-50 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-black text-sm">
                                {guestUser.first_name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="font-black text-gray-900 text-sm">{guestUser.first_name} {guestUser.last_name}</p>
                            <p className="text-xs font-medium text-gray-500">{guestUser.email}</p>
                        </div>
                        <div className="ml-auto">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100 px-2 py-1 rounded-lg">Pre-filled</span>
                        </div>
                    </div>

                    {success ? (
                        <div className="text-center py-6 animate-in fade-in duration-500">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-xl font-black text-gray-900">Account Created!</p>
                            <p className="text-gray-500 text-sm font-medium mt-1">Logging you in...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={e => handleChange('first_name', e.target.value)}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 font-bold text-sm transition-all ${errors.first_name ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                                        placeholder="Juan"
                                    />
                                    <InputError message={errors.first_name} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={e => handleChange('last_name', e.target.value)}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 font-bold text-sm transition-all ${errors.last_name ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                                        placeholder="Dela Cruz"
                                    />
                                    <InputError message={errors.last_name} />
                                </div>
                            </div>

                            {/* Nickname */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nickname</label>
                                <input
                                    type="text"
                                    value={formData.nickname}
                                    onChange={e => handleChange('nickname', e.target.value)}
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 font-bold text-sm transition-all ${errors.nickname ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                                    placeholder="Juanita"
                                />
                                <InputError message={errors.nickname} />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 font-bold text-sm transition-all ${errors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                                    placeholder="juan@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Username</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">@</span>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={e => handleChange('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                        className={`w-full pl-8 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 font-bold text-sm transition-all ${errors.username ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                                        placeholder="choose_a_username"
                                    />
                                </div>
                                <InputError message={errors.username} />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={e => handleChange('password', e.target.value)}
                                        className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 font-medium text-sm transition-all ${errors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={e => handleChange('confirmPassword', e.target.value)}
                                        className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 font-medium text-sm transition-all ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <InputError message={errors.confirmPassword} />
                            </div>

                            {errors.general && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-xs text-red-600 font-bold text-center">{errors.general}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                                >
                                    Maybe Later
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isLoading ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuestUpgradeModal;
