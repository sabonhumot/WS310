import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ArrowUpRight, ArrowDownLeft, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const GroupsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchGroups = async () => {
            if (!user) return;
            try {
                const response = await fetch(`http://localhost:5001/api/groups/${user.id}`);
                const data = await response.json();
                setGroups(data.groups || []);
            } catch (error) {
                console.error('Error fetching groups:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroups();
    }, [user]);

    const filteredGroups = groups.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h1 className="text-3xl font-black text-gray-900">Groups</h1>
                    <p className="text-gray-500 font-medium">Manage your shared expenses with communities</p>
                </div>
                <button 
                    onClick={() => navigate('/bills')}
                    className="premium-button py-3 px-6 rounded-xl flex items-center gap-2 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    New Group
                </button>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text"
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all shadow-sm"
                />
            </div>

            {filteredGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.map((group) => (
                        <div 
                            key={group.id} 
                            onClick={() => navigate('/bills')}
                            className="glass-card p-6 hover:shadow-2xl hover:-translate-y-1 transition-all group cursor-pointer border-t-4 border-t-transparent hover:border-t-indigo-500"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className={`p-2 rounded-lg ${group.netBalance > 0 ? 'bg-green-50 text-green-600' : group.netBalance < 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                                    {group.netBalance > 0 ? <ArrowUpRight size={16} /> : group.netBalance < 0 ? <ArrowDownLeft size={16} /> : <Users size={16} />}
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{group.name}</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{group.members} Members involved</p>
                            
                            <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Balance</span>
                                <span className={`font-black text-sm ${group.netBalance > 0 ? 'text-green-600' : group.netBalance < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {group.balance}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-20 text-center border-dashed border-2">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-900 font-black text-xl mb-2">
                        {searchTerm ? 'No groups found' : 'No groups yet'}
                    </p>
                    <p className="text-gray-400 font-medium max-w-xs mx-auto mb-8">
                        {searchTerm ? 'Try a different search term or create a new group.' : 'Create a group to start splitting bills with your friends and roommates.'}
                    </p>
                    {!searchTerm && (
                        <button 
                            onClick={() => navigate('/bills')}
                            className="text-indigo-600 font-black hover:underline uppercase tracking-widest text-sm"
                        >
                            Create your first group
                        </button>
                    )}
                </div>
            )}
            
        </div>
    );
};

export default GroupsPage;
