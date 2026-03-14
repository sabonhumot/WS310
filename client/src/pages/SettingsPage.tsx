import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Bell, Shield, Smartphone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
        nickname: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                nickname: user.nickname || ''
            });
        }
    }, [user, isEditing]);

    const handleSaveProfile = async () => {
        if (!user) return;
        
        if (!formData.first_name || !formData.last_name || !formData.nickname) {
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
                login(data.user); // Update context and localStorage
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header>
                <h1 className="text-3xl font-black text-gray-900">Settings</h1>
                <p className="text-gray-500 font-medium mt-2">Personalize your split experience</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nickname</label>
                                    <input 
                                        type="text" 
                                        value={isEditing ? formData.nickname : (user?.nickname || '')} 
                                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                                        disabled={!isEditing} 
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 font-bold transition-all ${isEditing ? 'border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' : 'border-transparent cursor-not-allowed'}`} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={user?.email || ''} 
                                        disabled 
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-400 font-bold cursor-not-allowed" 
                                        title="Email address cannot be changed"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">First Name</label>
                                    <input 
                                        type="text" 
                                        value={isEditing ? formData.first_name : (user?.first_name || '')} 
                                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                        disabled={!isEditing} 
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 font-bold transition-all ${isEditing ? 'border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' : 'border-transparent cursor-not-allowed'}`} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Last Name</label>
                                    <input 
                                        type="text" 
                                        value={isEditing ? formData.last_name : (user?.last_name || '')} 
                                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
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

                    {/* Preferences Section */}
                    <section className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                             <Bell className="w-5 h-5 text-indigo-600" />
                             <h2 className="text-lg font-black text-gray-900">Preferences</h2>
                        </div>
                        <div className="p-8 space-y-4">
                            <label className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-gray-900">Email Notifications</p>
                                    <p className="text-xs text-gray-400">Receive updates about your bill splits</p>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </div>
                            </label>
                            <label className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-gray-900">Payment Reminders</p>
                                    <p className="text-xs text-gray-400">Get notified when someone owes you</p>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </div>
                            </label>
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-gray-900">Security</h3>
                        </div>
                        <button 
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full py-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all mb-3 text-left px-4 flex justify-between items-center"
                        >
                            Change Password
                            <span className="text-indigo-600">→</span>
                        </button>
                        <button className="w-full py-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all text-left px-4 flex justify-between items-center">
                            Two-Factor Auth
                            <span className="text-gray-300 text-[10px]">INACTIVE</span>
                        </button>
                    </section>

                    <section className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-gray-900">Mobile App</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-6 font-medium">Download our mobile app for better experience and instant push notifications.</p>
                        <button className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black transition-all hover:bg-gray-800">
                            Get the App
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
                                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
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
                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
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
                                    onChange={(e) => setPasswordData({...passwordData, confirmNewPassword: e.target.value})}
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
