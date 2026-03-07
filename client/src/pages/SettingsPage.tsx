import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, History, Users, Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex gap-8">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:flex flex-col w-64 space-y-2">
                <nav className="space-y-1">
                    <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </a>
                    <a href="/activity" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                        <History className="w-5 h-5" />
                        Activity
                    </a>
                    <a href="/groups" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                        <Users className="w-5 h-5" />
                        Groups
                    </a>
                    <a href="/settings" className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-semibold">
                        <Settings className="w-5 h-5" />
                        Settings
                    </a>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                <h1 className="text-3xl font-black text-gray-900 mb-8">Settings</h1>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                <input type="text" value={`${user?.first_name} ${user?.last_name}`} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input type="email" value={user?.email} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                                <input type="text" value={user?.username} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Preferences</h2>
                        <div className="space-y-4">
                            <label className="flex items-center">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" defaultChecked />
                                <span className="ml-3 text-gray-700">Email notifications for bill updates</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" defaultChecked />
                                <span className="ml-3 text-gray-700">Reminders for pending payments</span>
                            </label>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
