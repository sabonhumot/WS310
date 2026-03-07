import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    PlusCircle,
    Copy,
    Edit2,
    Eye,
    Archive,
    Trash2,
    X,
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
}

interface InvolvedPerson {
    id: number;
    user_id?: number;
    guest_user_id?: number;
    nickname?: string;
    first_name?: string;
    last_name?: string;
    user_email?: string;
    guest_email?: string;
    guest_first_name?: string;
    guest_last_name?: string;
}

interface Expense {
    id: number;
    expense_name: string;
    total_amount: number;
    paid_by_user_id?: number;
    paid_by_guest_id?: number;
    created_at: string;
    nickname?: string;
    first_name?: string;
    last_name?: string;
    guest_first_name?: string;
    guest_last_name?: string;
    splits: any[];
}

const BillsPage: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [billDetails, setBillDetails] = useState<{ involvedPersons: InvolvedPerson[], expenses: Expense[] } | null>(null);
    const [newBillName, setNewBillName] = useState('');

    const fetchBills = async () => {
        if (!user) return;
        try {
            const response = await fetch(`http://localhost:5001/api/bills/${user.id}`);
            const data = await response.json();
            setBills(data.bills || []);
        } catch (error) {
            console.error('Error fetching bills:', error);
            toast.error('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, [user]);

    const handleCreateBill = async () => {
        if (!user || !newBillName.trim()) {
            toast.error('Bill name is required');
            return;
        }

        try {
            await fetch('http://localhost:5001/api/bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    created_by: user.id,
                    bill_name: newBillName
                })
            });
            toast.success('Bill created successfully');
            setNewBillName('');
            setShowAddModal(false);
            fetchBills();
        } catch (error) {
            console.error('Error creating bill:', error);
            toast.error('Failed to create bill');
        }
    };

    const handleViewBill = async (bill: Bill) => {
        try {
            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/details`);
            const data = await response.json();
            setSelectedBill(bill);
            setBillDetails({
                involvedPersons: data.involvedPersons,
                expenses: data.expenses
            });
            setShowViewModal(true);
        } catch (error) {
            console.error('Error fetching bill details:', error);
            toast.error('Failed to load bill details');
        }
    };

    const handleArchiveBill = async (billId: number) => {
        try {
            await fetch(`http://localhost:5001/api/bills/${billId}/archive`, {
                method: 'PUT'
            });
            toast.success('Bill archived successfully');
            fetchBills();
        } catch (error) {
            console.error('Error archiving bill:', error);
            toast.error('Failed to archive bill');
        }
    };

    const handleDeleteBill = async (billId: number) => {
        if (confirm('Are you sure you want to delete this bill?')) {
            try {
                await fetch(`http://localhost:5001/api/bills/${billId}`, {
                    method: 'DELETE'
                });
                toast.success('Bill deleted successfully');
                fetchBills();
            } catch (error) {
                console.error('Error deleting bill:', error);
                toast.error('Failed to delete bill');
            }
        }
    };

    const handleEditBill = async () => {
        if (!editingBill || !newBillName.trim()) {
            toast.error('Bill name is required');
            return;
        }

        try {
            await fetch(`http://localhost:5001/api/bills/${editingBill.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bill_name: newBillName })
            });
            toast.success('Bill updated successfully');
            setShowEditModal(false);
            setEditingBill(null);
            setNewBillName('');
            fetchBills();
        } catch (error) {
            console.error('Error updating bill:', error);
            toast.error('Failed to update bill');
        }
    };

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Invite code copied to clipboard');
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
                    <h1 className="text-3xl font-black text-gray-900">Bills</h1>
                 <p className="text-gray-500 font-medium">Manage and split your bills with ease</p>
                </header>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="premium-button py-3 px-6 rounded-xl flex items-center gap-2"
                >
                    <PlusCircle className="w-5 h-5" />
                    Create Bill
                </button>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin">
                            <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                        </div>
                    </div>
                ) : bills.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500 text-lg">No bills yet. Create your first bill!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {bills.map(bill => (
                            <div key={bill.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">{bill.bill_name}</h3>
                                        <p className="text-gray-600 text-sm mt-1">Created on {new Date(bill.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingBill(bill);
                                                setNewBillName(bill.bill_name);
                                                setShowEditModal(true);
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleViewBill(bill)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                            title="View"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleArchiveBill(bill.id)}
                                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                                            title="Archive"
                                        >
                                            <Archive size={18} />
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

                                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                    <div>
                                        <p className="text-xs text-gray-600">Invite Code</p>
                                        <p className="text-lg font-semibold text-gray-900">{bill.invite_code}</p>
                                    </div>
                                    <button
                                        onClick={() => copyInviteCode(bill.invite_code)}
                                        className="ml-auto p-2 bg-white hover:bg-gray-100 rounded-lg text-gray-600"
                                        title="Copy code"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Create New Bill</h2>
                            <button onClick={() => setShowAddModal(false)}>
                                <X size={24} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter bill name"
                            value={newBillName}
                            onChange={(e) => setNewBillName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBill}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Edit Bill</h2>
                            <button onClick={() => setShowEditModal(false)}>
                                <X size={24} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter bill name"
                            value={newBillName}
                            onChange={(e) => setNewBillName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditBill}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showViewModal && selectedBill && billDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">{selectedBill.bill_name}</h2>
                            <button onClick={() => setShowViewModal(false)}>
                                <X size={24} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900 mb-3">Involved Persons</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {billDetails.involvedPersons.map(person => (
                                    <div key={person.id} className="bg-gray-50 p-2 rounded">
                                        <p className="font-medium text-sm text-gray-900">
                                            {person.nickname || `${person.guest_first_name} ${person.guest_last_name}`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillsPage;
