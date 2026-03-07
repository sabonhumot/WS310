import React from 'react';
import { LayoutDashboard, History, Users, Settings, Plus } from 'lucide-react';

const GroupsPage: React.FC = () => {
    const groups = [
        { id: 1, name: 'Apartment Mates', members: 3, balance: '₱250 owed' },
        { id: 2, name: 'Weekend Trip', members: 5, balance: '₱1,200 owed' },
        { id: 3, name: 'Office Lunch', members: 4, balance: '₱180 to collect' },
    ];

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
                    <a href="/groups" className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-semibold">
                        <Users className="w-5 h-5" />
                        Groups
                    </a>
                    <a href="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                        <Settings className="w-5 h-5" />
                        Settings
                    </a>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Groups</h1>
                        <p className="text-gray-500 font-medium mt-2">Manage your shared expenses</p>
                    </div>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors">
                        <Plus className="w-5 h-5" />
                        New Group
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{group.name}</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">{group.members} members</span>
                                <span className="text-indigo-600 font-bold">{group.balance}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default GroupsPage;
