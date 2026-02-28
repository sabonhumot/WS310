import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, Receipt } from 'lucide-react';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();

    // In a real app, we'd clear auth tokens here
    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50/30 pt-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Home className="text-indigo-600" size={32} />
                            Dashboard
                        </h1>
                        <p className="text-gray-500 mt-2">Welcome to your BillSplit dashboard!</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                    >
                        <LogOut size={18} />
                        Log out
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Placeholder Cards */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <Receipt size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Total Bills</h3>
                        <p className="text-3xl font-extrabold text-indigo-600 mt-2">0</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <span className="text-xl font-bold">$</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">You Owe</h3>
                        <p className="text-3xl font-extrabold text-green-600 mt-2">$0.00</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
                            <span className="text-xl font-bold">$</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">You Are Owed</h3>
                        <p className="text-3xl font-extrabold text-orange-600 mt-2">$0.00</p>
                    </div>
                </div>
            </div>
import {
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownLeft,
    Users,
    History,
    Bell,
    Settings,
    PlusCircle,
    ChevronRight,
    TrendingUp
} from 'lucide-react';

const DashboardPage: React.FC = () => {
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
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-semibold">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                        <History className="w-5 h-5" />
                        Activity
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                        <Users className="w-5 h-5" />
                        Groups
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                        <Settings className="w-5 h-5" />
                        Settings
                    </a>
                </nav>

                <div className="mt-auto p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white">
                    <p className="text-sm font-medium opacity-80 mb-2">Pro Feature</p>
                    <p className="text-sm font-bold mb-4">Export reports and sync with bank</p>
                    <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">
                        Upgrade Now
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 space-y-8">
                {/* Header */}
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Welcome back, Rodeliza!</h1>
                        <p className="text-gray-500 font-medium">Here's what's happening with your expenses.</p>
                    </div>
                    <button className="premium-button py-3 px-6 rounded-xl flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" />
                        New Split
                    </button>
                </header>

                {/* Stats Grid */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 border-l-4 border-l-green-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <ArrowUpRight className="w-6 h-6 text-green-600" />
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Overall Balance</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Owed to you</p>
                        <p className="text-3xl font-black text-gray-900 leading-none mt-1">
                            <span className="peso-sign mr-1">₱</span>1,450.00
                        </p>
                    </div>

                    <div className="glass-card p-6 border-l-4 border-l-red-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <ArrowDownLeft className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">You owe</p>
                        <p className="text-3xl font-black text-gray-900 leading-none mt-1">
                            <span className="peso-sign mr-1">₱</span>500.00
                        </p>
                    </div>

                    <div className="glass-card p-6 border-l-4 border-l-indigo-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Users className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Active Groups</p>
                        <p className="text-3xl font-black text-gray-900 leading-none mt-1">4</p>
                    </div>
                </section>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Activity Feed */}
                    <section className="xl:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                            <button className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
                                View all <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {recentActivity.map((item) => (
                                <div key={item.id} className="glass-card p-4 flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${item.type === 'owe' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {item.type === 'owe' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
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
                    </section>

                    {/* Quick Analytics / Right Sidebar */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
                        <div className="glass-card p-6 bg-white shrink-0">
                            <div className="flex items-center gap-2 mb-6 text-green-600">
                                <TrendingUp className="w-5 h-5" />
                                <span className="font-bold text-sm">Monthly Trends</span>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-400">
                                        <span>DINING</span>
                                        <span>65%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '65%' }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-400">
                                        <span>TRAVEL</span>
                                        <span>20%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '20%' }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-400">
                                        <span>OTHERS</span>
                                        <span>15%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-300 rounded-full" style={{ width: '15%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
