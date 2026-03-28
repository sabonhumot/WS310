import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Filter, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ActivityPage: React.FC = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredActivities = activities.filter(activity => 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <button className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest ring-4 ring-indigo-50 whitespace-nowrap">All</button>
                    <button className="px-4 py-1.5 bg-white text-gray-500 rounded-full text-xs font-black uppercase tracking-widest border border-gray-100 hover:bg-gray-50 cursor-pointer whitespace-nowrap">Expenses</button>
                    <button className="px-4 py-1.5 bg-white text-gray-500 rounded-full text-xs font-black uppercase tracking-widest border border-gray-100 hover:bg-gray-50 cursor-pointer whitespace-nowrap">Settlements</button>
                </div>

                <div className="space-y-3">
                    {filteredActivities.length > 0 ? (
                        filteredActivities.map((item) => (
                            <div key={item.id} className="glass-card p-4 flex items-center justify-between hover:scale-[1.01] transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500 group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl transition-colors ${item.type === 'owe' ? 'bg-red-50 text-red-600 group-hover:bg-red-100' : 'bg-green-50 text-green-600 group-hover:bg-green-100'}`}>
                                        {item.type === 'owe' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{item.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{item.bill_name}</p>
                                            <span className="text-gray-300">•</span>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.date}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-lg ${item.type === 'owe' ? 'text-gray-900' : 'text-green-600'}`}>
                                        {item.amount}
                                    </p>
                                    <div className="flex items-center justify-end gap-1.5 mt-1">
                                        <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${item.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="glass-card p-12 text-center text-gray-400 font-bold italic">
                            {searchTerm ? 'No activities match your search.' : 'No activity history found.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityPage;
