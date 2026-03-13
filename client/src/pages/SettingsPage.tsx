import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Bell, Shield, Smartphone } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header>
                <h1 className="text-3xl font-black text-gray-900">Settings</h1>
                <p className="text-gray-500 font-medium mt-2">Personalize your split experience</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    {/* Profile Section */}
                    <section className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                             <User className="w-5 h-5 text-indigo-600" />
                             <h2 className="text-lg font-black text-gray-900">Profile Information</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nickname</label>
                                    <input type="text" value={user?.nickname || ''} disabled className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                    <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all cursor-not-allowed" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                                <input type="text" value={`${user?.first_name} ${user?.last_name}`} disabled className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all cursor-not-allowed" />
                            </div>
                            <div className="pt-4">
                                <button className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-sm">
                                    Edit Profile
                                </button>
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
                        <button className="w-full py-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all mb-3 text-left px-4 flex justify-between items-center">
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
        </div>
    );
};

export default SettingsPage;
