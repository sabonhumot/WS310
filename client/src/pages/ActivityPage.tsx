import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Search, Users, Receipt } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type TabType = 'All' | 'Expenses' | 'Settlements';

const ActivityPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('All');

    useEffect(() => {
        const fetchActivity = async () => {
            if (!user) return;
            try {
                const response = await fetch(`http://localhost:5001/api/activity/${user.id}`);
                const data = await response.json();
                setActivities(data.activities);
            } catch (error) {
                console.error('Error fetching activity:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [user]);

    const filteredActivities = activities.filter(activity => {
        const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             activity.bill_name.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        if (activeTab === 'Expenses') return activity.type === 'expense';
        if (activeTab === 'Settlements') {
            // Settlements are net debts (Pending) or actual payment events
            return activity.type === 'owe' || activity.type === 'lent' || activity.id.startsWith('settle_');
        }
        
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Activity History</h1>
                    <p className="text-gray-500 font-medium mt-1">Track all your bill splits and transactions</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search activity..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-all"
                        />
                    </div>
                </div>
            </header>

            <div className="space-y-6">
                <div className="flex gap-1 p-1 bg-gray-100/50 rounded-2xl w-fit">
                    {(['All', 'Expenses', 'Settlements'] as const).map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${
                                activeTab === tab 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Activity</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Bill</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredActivities.length > 0 ? (
                                    filteredActivities.map((item) => (
                                        <tr key={item.id} className="group hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => item.bill_id && navigate(`/bills/${item.bill_id}`)}>
                                            <td className="px-6 py-4 border-b border-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {item.date}
                                            </td>
                                            <td className="px-6 py-4 border-b border-gray-50/50">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    item.type === 'owe' ? 'bg-red-50 text-red-600' : 
                                                    item.type === 'lent' ? 'bg-green-50 text-green-600' :
                                                    item.type === 'expense' ? 'bg-indigo-50 text-indigo-600' :
                                                    'bg-gray-50 text-gray-600'
                                                }`}>
                                                    {item.type === 'owe' ? <ArrowDownLeft size={16} /> : 
                                                     item.type === 'lent' ? <ArrowUpRight size={16} /> : 
                                                     item.type === 'expense' ? <Receipt size={16} /> :
                                                     <Users size={16} />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-b border-gray-50/50">
                                                <div className="flex flex-col">
                                                    <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                                                    {item.subtitle && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.subtitle}</p>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-b border-gray-50/50">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{item.bill_name}</span>
                                            </td>
                                            <td className="px-6 py-4 border-b border-gray-50/50 text-right">
                                                <p className={`font-black tabular-nums ${item.type === 'owe' ? 'text-gray-900' : item.type === 'lent' ? 'text-green-600' : 'text-gray-900'}`}>
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
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold italic">
                                            {searchTerm ? 'No activities match your search.' : 'No activity history found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityPage;
