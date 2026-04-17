import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Users,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ owed_to_you: 0, you_owe: 0, active_bills: 0 });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const response = await fetch(`http://localhost:5001/api/dashboard/${user.id}`);
                const data = await response.json();
                setStats(data.stats);
                setRecentActivity(data.recentActivity);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Welcome back, {user?.nickname}!</h1>
                    <p className="text-gray-500 font-medium">Here's what's happening with your expenses.</p>
                </div>
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
                        <span className="peso-sign mr-1">₱</span>{stats.owed_to_you.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <span className="peso-sign mr-1">₱</span>{stats.you_owe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="glass-card p-6 border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Active Bills</p>
                    <p className="text-3xl font-black text-gray-900 leading-none mt-1">{stats.active_bills}</p>
                </div>
            </section>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Activity Feed */}
                <section className="xl:col-span-3 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                        <button
                            onClick={() => navigate('/activity')}
                            className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
                            View all <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Activity</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Bill</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100/50 text-right">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentActivity.length > 0 ? (
                                        recentActivity.map((item) => (
                                            <tr key={item.id} className="group hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => navigate(item.bill_id ? `/bills/${item.bill_id}` : '/bills')}>
                                                <td className="px-6 py-4 border-b border-gray-50/50">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                        item.type === 'owe' ? 'bg-red-50 text-red-600' : 
                                                        item.type === 'lent' ? 'bg-green-50 text-green-600' :
                                                        'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                        {item.type === 'owe' ? <ArrowDownLeft size={16} /> : 
                                                         item.type === 'lent' ? <ArrowUpRight size={16} /> : 
                                                         <Users size={16} />}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 border-b border-gray-50/50">
                                                    <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                                                </td>
                                                <td className="px-6 py-4 border-b border-gray-50/50">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{item.bill_name}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-gray-50/50 text-right">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.date}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-gray-50/50 text-right">
                                                    <p className={`font-black tabular-nums ${item.type === 'owe' ? 'text-gray-900' : 'text-green-600'}`}>
                                                        {item.amount}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 border-b border-gray-50/50 text-center">
                                                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                                                        item.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                                                No activity found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DashboardPage;
