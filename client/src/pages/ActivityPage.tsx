import React from 'react';
import { LayoutDashboard, History, Users, Settings } from 'lucide-react';

const ActivityPage: React.FC = () => {
    const recentActivity = [
        { id: 1, title: 'Dinner at Ribshack', amount: '₱500.00', status: 'Pending', type: 'owe', date: 'Today' },
        { id: 2, title: 'Movie Night', amount: '₱250.00', status: 'Paid', type: 'lent', date: 'Yesterday' },
        { id: 3, title: 'Car Rental', amount: '₱1,200.00', status: 'Pending', type: 'lent', date: '2 days ago' },
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
                    <a href="/activity" className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-semibold">
                        <History className="w-5 h-5" />
                        Activity
                    </a>
                    <a href="/groups" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
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
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900">Activity History</h1>
                    <p className="text-gray-500 font-medium mt-2">Track all your bill splits and transactions</p>
                </header>

                <div className="space-y-3">
                    {recentActivity.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${item.type === 'owe' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {item.type === 'owe' ? '↓' : '↑'}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{item.title}</p>
                                    <p className="text-sm text-gray-400 font-medium">{item.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-black ${item.type === 'owe' ? 'text-gray-900' : 'text-green-600'}`}>
                                    {item.type === 'owe' ? '-' : '+'}{item.amount}
                                </p>
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ActivityPage;
