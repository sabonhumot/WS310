import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    User, Shield, Loader2, Crown, Star,
    CheckCircle2, Lock, Zap, Users, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const isPremium = (user_type_id: number) => user_type_id === 2;

const SettingsPage: React.FC = () => {
    const { user, login } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        nickname: '',
        username: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                nickname: user.nickname || '',
                username: user.username || '',
                email: user.email || ''
            });
        }
    }, [user, isEditing]);

    const handleSaveProfile = async () => {
        if (!user) return;

        if (!formData.first_name || !formData.last_name || !formData.nickname || !formData.username || !formData.email) {
            toast.error('All fields are required');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`http://localhost:5001/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Profile updated successfully');
                login(data.user);
                setIsEditing(false);
            } else {
                toast.error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Internal server error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmNewPassword) {
            toast.error('All fields are required');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        setIsChangingPassword(true);
        try {
            const response = await fetch(`http://localhost:5001/api/users/${user?.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Password updated successfully');
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
            } else {
                toast.error(data.message || 'Failed to update password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            toast.error('Internal server error');
        } finally {
            setIsChangingPassword(false);
        }
    };


    const premium = user ? isPremium(user.user_type_id) : false;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header>
                <h1 className="text-3xl font-black text-gray-900">Settings</h1>
                <p className="text-gray-500 font-medium mt-2">Manage your account and preferences</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LEFT: Profile Info */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Profile Section */}
                    <section className="glass-card overflow-hidden transition-all duration-300">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-black text-gray-900">Profile Information</h2>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Full Name (prominent display) */}
                            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0">
                                    <span className="text-white text-xl font-black">
                                        {(isEditing ? formData.first_name : user?.first_name)?.charAt(0).toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Profile Name</p>
                                    <p className="text-xl font-black text-indigo-700">
                                        {isEditing
                                            ? `${formData.first_name} ${formData.last_name}`
                                            : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Username</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                                        <input
                                            type="text"
                                            value={isEditing ? formData.username : (user?.username || '')}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                            disabled={!isEditing}
                                            className={`w-full pl-8 pr-4 py-3 bg-gray-50 border rounded-xl text-gray-900 font-bold transition-all ${isEditing ? 'border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' : 'border-transparent cursor-not-allowed'}`}
                                            placeholder="username"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={isEditing ? formData.email : (user?.email || '')}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 font-bold transition-all ${isEditing ? 'border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' : 'border-transparent cursor-not-allowed'}`}
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nickname</label>
                                    <input
                                        type="text"
                                        value={isEditing ? formData.nickname : (user?.nickname || '')}
                                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 font-bold transition-all ${isEditing ? 'border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' : 'border-transparent cursor-not-allowed'}`}
                                    />
                                </div>
                                <div className="invisible md:visible" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">First Name</label>
                                    <input
                                        type="text"
                                        value={isEditing ? formData.first_name : (user?.first_name || '')}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 font-bold transition-all ${isEditing ? 'border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' : 'border-transparent cursor-not-allowed'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        value={isEditing ? formData.last_name : (user?.last_name || '')}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 font-bold transition-all ${isEditing ? 'border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' : 'border-transparent cursor-not-allowed'}`}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                {isEditing ? (
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="px-8 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all text-xs shadow-lg shadow-indigo-200 flex items-center gap-2"
                                    >
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-3 bg-gray-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all text-xs"
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT SIDEBAR */}
                <div className="space-y-6">
                    {/* Account Type Card */}
                    <section className={`glass-card overflow-hidden ${premium
                        ? 'ring-2 ring-amber-400/60 shadow-lg shadow-amber-100'
                        : 'ring-1 ring-gray-100'
                        }`}>
                        {/* Header */}
                        <div className={`p-5 ${premium
                            ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400'
                            : 'bg-gradient-to-br from-slate-600 to-slate-700'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {premium
                                        ? <Crown className="w-5 h-5 text-amber-900" />
                                        : <Star className="w-5 h-5 text-slate-300" />
                                    }
                                    <span className={`text-xs font-black uppercase tracking-widest ${premium ? 'text-amber-900' : 'text-slate-300'}`}>
                                        Account Type
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3">
                                <p className={`text-2xl font-black ${premium ? 'text-amber-950' : 'text-white'}`}>
                                    {premium ? '✦ Premium' : 'Standard'}
                                </p>
                                <p className={`text-xs font-semibold mt-1 ${premium ? 'text-amber-800' : 'text-slate-400'}`}>
                                    {premium ? 'Full access — No limits' : 'Limited access — Upgrade to unlock more'}
                                </p>
                            </div>
                        </div>

                        {/* Feature List */}
                        <div className="p-5 space-y-3">
                            {[
                                {
                                    icon: FileText,
                                    label: 'Bills per month',
                                    value: premium ? 'Unlimited' : 'Up to 5 bills',
                                    premium: premium
                                },
                                {
                                    icon: Users,
                                    label: 'Users per bill',
                                    value: premium ? 'Unlimited' : 'Up to 3 people',
                                    premium: premium
                                },
                                {
                                    icon: User,
                                    label: 'Guest users',
                                    value: 'Supported',
                                    premium: null // both tiers
                                },
                                {
                                    icon: Zap,
                                    label: 'Priority features',
                                    value: premium ? 'Included' : 'Not available',
                                    premium: premium ? true : false
                                }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <item.icon className="w-4 h-4" />
                                        <span className="text-xs font-semibold">{item.label}</span>
                                    </div>
                                    <span className={`text-xs font-black ${item.premium === null
                                        ? 'text-green-600'
                                        : item.premium
                                            ? 'text-amber-600'
                                            : 'text-gray-400'
                                        }`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Upgrade CTA for Standard users */}
                        {!premium && (
                            <div className="px-5 pb-5">
                                <button className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-black text-xs uppercase tracking-widest rounded-xl hover:from-amber-300 hover:to-orange-300 transition-all shadow-md shadow-amber-100 flex items-center justify-center gap-2">
                                    <Crown className="w-4 h-4" />
                                    Upgrade to Premium
                                </button>
                            </div>
                        )}

                        {premium && (
                            <div className="px-5 pb-5">
                                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <p className="text-xs font-semibold text-amber-700">You're on the Premium plan. Enjoy all features!</p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Security */}
                    <section className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-gray-900">Security</h3>
                        </div>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full py-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all text-left px-4 flex justify-between items-center"
                        >
                            <span className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-gray-400" />
                                Change Password
                            </span>
                            <span className="text-indigo-600">→</span>
                        </button>
                    </section>

                </div>
            </div>


            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in scale-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Change Password</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Keep your account secure</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-900"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-900"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirmNewPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-900"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-50 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                                    }}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
