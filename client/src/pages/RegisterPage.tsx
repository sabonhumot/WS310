import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { RegisterData } from '../types';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const RegisterPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
    const [formData, setFormData] = useState<RegisterData>({
        firstName: '',
        lastName: '',
        nickname: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
    });

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};

        if (!formData.firstName.trim()) {
            errors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
            errors.lastName = 'Last name is required';
        }
        if (!formData.nickname.trim()) {
            errors.nickname = 'Nickname is required';
        }
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email';
        }
        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        }
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (!formData.password.match(/[A-Z]/)) {
            errors.password = 'Password must contain at least one uppercase letter';
        } else if (!formData.password.match(/[0-9]/)) {
            errors.password = 'Password must contain at least one number';
        } else if (!formData.password.match(/[^A-Za-z0-9]/)) {
            errors.password = 'Password must contain at least one special character';
        }
        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("http://localhost:5001/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle server-side field errors
                if (data.message.includes('Email')) {
                    setFieldErrors(prev => ({ ...prev, email: data.message }));
                } else if (data.message.includes('Username')) {
                    setFieldErrors(prev => ({ ...prev, username: data.message }));
                } else if (data.message.includes('Nickname')) {
                    setFieldErrors(prev => ({ ...prev, nickname: data.message }));
                }
                return;
            }

            toast.success("Registration successful! Please check your email to verify your account.");
            setFormData({
                firstName: '',
                lastName: '',
                nickname: '',
                email: '',
                username: '',
                password: '',
                confirmPassword: '',
            });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "An error occurred";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (fieldErrors[field]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <div className="min-h-[calc(100vh-73px)] flex items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50/30">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create account</h2>
                        <p className="text-gray-500 mt-2">Join us to start splitting bills easily</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="firstName">
                                    First Name
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        id="firstName"
                                        type="text"
                                        className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all sm:text-sm ${
                                            fieldErrors.firstName ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                        }`}
                                        placeholder="First Name"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    />
                                </div>
                                {fieldErrors.firstName && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.firstName}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="lastName">
                                    Last Name
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        id="lastName"
                                        type="text"
                                        className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all sm:text-sm ${
                                            fieldErrors.lastName ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                        }`}
                                        placeholder="Last Name"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    />
                                </div>
                                {fieldErrors.lastName && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.lastName}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="nickname">
                                Nickname
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    id="nickname"
                                    type="text"
                                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all sm:text-sm ${
                                        fieldErrors.nickname ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                    }`}
                                    placeholder="Nickname"
                                    value={formData.nickname}
                                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                                />
                            </div>
                            {fieldErrors.nickname && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.nickname}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                                Email
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all sm:text-sm ${
                                        fieldErrors.email ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                    }`}
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="username">
                                Username
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all sm:text-sm ${
                                        fieldErrors.username ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                    }`}
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                />
                            </div>
                            {fieldErrors.username && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.username}</p>
                            )}
                        </div>


                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={`block w-full pl-10 pr-10 py-3 border rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all sm:text-sm ${
                                        fieldErrors.password ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                    }`}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="confirmPassword">
                                Confirm Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className={`block w-full pl-10 pr-10 py-3 border rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all sm:text-sm ${
                                        fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                    }`}
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                />
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.confirmPassword}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? 'Creating account...' : (
                                <>
                                    Create Account
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        <p className="text-center text-gray-600 text-sm font-medium mt-6">
                            Already have an account?{' '}
                            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;

