import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Trash2,
    RotateCcw,
    PlusCircle,
    History,
    Users,
    Settings,
    Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Bill {
    id: number;
    bill_name: string;
    invite_code: string;
    created_by: number;
    created_at: string;
    archived_at: string;
}

const ArchivePage: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [archivedBills, setArchivedBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchArchivedBills = async () => {
        if (!user) return;
        try {
            const response = await fetch(`http://localhost:5001/api/bills/${user.id}/archived`);
            const data = await response.json();
            setArchivedBills(data.bills || []);
        } catch (error) {
            console.error('Error fetching archived bills:', error);
            toast.error('Failed to load archived bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArchivedBills();
    }, [user]);

    const handleDeleteBill = async (billId: number) => {
        if (confirm('Are you sure you want to permanently delete this bill?')) {
            try {
                await fetch(`http://localhost:5001/api/bills/${billId}`, {
                    method: 'DELETE'
                });
                toast.success('Bill deleted successfully');
                fetchArchivedBills();
            } catch (error) {
                console.error('Error deleting bill:', error);
                toast.error('Failed to delete bill');
            }
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex gap-8">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:flex flex-col w-64 space-y-2">
                <nav className="space-y-1">
                    <a href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/dashboard' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </a>
                    <a href="/bills" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/bills' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <PlusCircle className="w-5 h-5" />
                        Bills
                    </a>
                    <a href="/activity" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/activity' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <History className="w-5 h-5" />
                        Activity
                    </a>
                    <a href="/groups" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/groups' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Users className="w-5 h-5" />
                        Groups
                    </a>
                    <a href="/archive" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/archive' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Bell className="w-5 h-5" />
                        Archive
                    </a>
                    <a href="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/settings' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
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
                <header>
                    <h1 className="text-3xl font-black text-gray-900">Archived Bills</h1>
                    <p className="text-gray-500 font-medium">View and manage your archived bills</p>
                </header>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin">
                            <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                        </div>
                    </div>
                ) : archivedBills.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500 text-lg">No archived bills yet. Archive bills to see them here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {archivedBills.map(bill => (
                            <div key={bill.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">{bill.bill_name}</h3>
                                        <p className="text-gray-600 text-sm mt-1">
                                            Archived on {new Date(bill.archived_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toast.success('Restore coming soon')}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                            title="Restore"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteBill(bill.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-xs text-gray-600">Invite Code</p>
                                    <p className="text-lg font-semibold text-gray-900">{bill.invite_code}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ArchivePage;
