import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    PlusCircle,
    Copy,
    Edit2,
    Eye,
    Archive,
    Trash2,
    X,
    RefreshCcw,
    UserPlus,
    Search,
    DollarSign,
    User
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Bill, InvolvedPerson, Expense, GuestData } from '../types';

const BillsPage: React.FC = () => {
    const { user } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [billDetails, setBillDetails] = useState<{ involvedPersons: InvolvedPerson[], expenses: Expense[] } | null>(null);
    const [newBillName, setNewBillName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    
    // Involved Persons Logic
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [involvedPersons, setInvolvedPersons] = useState<InvolvedPerson[]>([]);
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestData, setGuestData] = useState<GuestData>({
        firstName: '',
        lastName: '',
        nickname: '',
        email: ''
    });

    // Expenses Logic
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        paidBy: '' as string | number,
        splitType: 'equally' as 'equally' | 'custom',
        splitWith: [] as (string | number)[]
    });

    const generateInviteCode = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setInviteCode(code);
    };

    useEffect(() => {
        if (showAddModal) {
            generateInviteCode();
            // Add self as involved person by default
            if (user) {
                setInvolvedPersons([{
                    id: user.id,
                    nickname: user.nickname,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    is_guest: false,
                    user_id: user.id
                }]);
            }
        }
    }, [showAddModal, user]);

    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await fetch(`http://localhost:5001/api/users/search?q=${query}`);
            const data = await response.json();
            setSearchResults(data.users || []);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const addPersonToBill = (person: any) => {
        if (involvedPersons.some(p => p.user_id === person.id)) {
            toast.error('Person already added');
            return;
        }
        setInvolvedPersons([...involvedPersons, {
            id: person.id,
            nickname: person.nickname,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            is_guest: false,
            user_id: person.id
        }]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const addGuestToBill = () => {
        if (!guestData.firstName || !guestData.lastName || !guestData.nickname || !guestData.email) {
            toast.error('Please fill in all guest fields');
            return;
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestData.email)) {
            toast.error('Invalid email format');
            return;
        }

        const guestId = `guest_${Date.now()}`;
        setInvolvedPersons([...involvedPersons, {
            id: guestId,
            nickname: guestData.nickname,
            first_name: guestData.firstName,
            last_name: guestData.lastName,
            email: guestData.email,
            is_guest: true
        }]);
        setGuestData({ firstName: '', lastName: '', nickname: '', email: '' });
        setShowGuestForm(false);
    };

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
                    bill_name: newBillName,
                    invite_code: inviteCode,
                    involved_persons: involvedPersons
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

    const handleEditBill = async () => {
        if (!editingBill || !newBillName.trim()) {
            toast.error('Bill name is required');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/api/bills/${editingBill.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bill_name: newBillName
                })
            });

            if (response.ok) {
                toast.success('Bill updated successfully');
                setShowEditModal(false);
                setEditingBill(null);
                setNewBillName('');
                fetchBills();
            } else {
                toast.error('Failed to update bill');
            }
        } catch (error) {
            console.error('Error updating bill:', error);
            toast.error('Failed to update bill');
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
            // Also update the local involvedPersons for the expense modal
            setInvolvedPersons(data.involvedPersons);
            setNewExpense(prev => ({ ...prev, paidBy: user?.id || data.involvedPersons[0]?.id || '' }));
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

    const handleAddExpense = async () => {
        if (!selectedBill || !newExpense.name || !newExpense.amount) {
            toast.error('Please fill in all expense fields');
            return;
        }

        try {
            await fetch(`http://localhost:5001/api/bills/${selectedBill.id}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expense_name: newExpense.name,
                    total_amount: parseFloat(newExpense.amount),
                    paid_by_id: newExpense.paidBy,
                    split_type: newExpense.splitType,
                    involved_person_ids: newExpense.splitType === 'equally' 
                        ? involvedPersons.map(p => p.id) 
                        : newExpense.splitWith
                })
            });
            toast.success('Expense added successfully');
            setShowExpenseModal(false);
            setNewExpense({ name: '', amount: '', paidBy: user?.id || '', splitType: 'equally', splitWith: [] });
            handleViewBill(selectedBill);
        } catch (error) {
            console.error('Error adding expense:', error);
            toast.error('Failed to add expense');
        }
    };

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Invite code copied to clipboard');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Bills</h1>
                    <p className="text-gray-500 font-medium">Manage and split your bills with ease</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="premium-button py-3 px-6 rounded-xl flex items-center gap-2 whitespace-nowrap"
                >
                    <PlusCircle className="w-5 h-5" />
                    Create Bill
                </button>
            </header>

            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin">
                        <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                    </div>
                </div>
            ) : bills.length === 0 ? (
                <div className="glass-card p-20 text-center">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <PlusCircle className="w-8 h-8" />
                    </div>
                    <p className="text-gray-900 text-xl font-bold mb-2">No bills yet</p>
                    <p className="text-gray-500 mb-8 max-w-xs mx-auto">Start by creating your first bill and invite your friends to split expenses.</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        Create your first bill
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bills.map((bill: Bill) => (
                        <div key={bill.id} className="glass-card p-6 hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{bill.bill_name}</h3>
                                    <p className="text-gray-400 text-sm font-medium mt-1 inline-flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Created {new Date(bill.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingBill(bill);
                                            setNewBillName(bill.bill_name);
                                            setShowEditModal(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Edit"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleViewBill(bill)}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                        title="View"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleArchiveBill(bill.id)}
                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                        title="Archive"
                                    >
                                        <Archive size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBill(bill.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 group-hover:border-indigo-100 transition-all">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invite Code</p>
                                    <p className="text-xl font-black text-gray-900 tabular-nums tracking-wider">{bill.invite_code}</p>
                                </div>
                                <button
                                    onClick={() => copyInviteCode(bill.invite_code)}
                                    className="p-3 bg-white text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 group-hover:border-indigo-100 transition-all"
                                    title="Copy code"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals ... same as before but styled better */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl scale-in-95 animate-in duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Create Bill</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-8">
                            {/* Bill Name Section */}
                            <section>
                                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Bill Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Weekend at Tagaytay"
                                    value={newBillName}
                                    onChange={(e) => setNewBillName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                />
                            </section>

                            {/* Invite Code Section */}
                            <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Invite Code</h3>
                                    <button 
                                        onClick={generateInviteCode}
                                        className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                                        title="Regenerate Code"
                                    >
                                        <RefreshCcw size={16} />
                                    </button>
                                </div>
                                <p className="text-3xl font-black text-gray-900 tracking-widest text-center">{inviteCode}</p>
                                <p className="text-[10px] text-gray-400 text-center mt-2 font-bold uppercase tracking-wide">Automatically generated for this bill</p>
                            </section>

                            {/* Add Persons Section */}
                            <section className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Involved Persons</h3>
                                    <button 
                                        onClick={() => setShowGuestForm(!showGuestForm)}
                                        className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                                    >
                                        <UserPlus size={14} />
                                        {showGuestForm ? 'Cancel Guest' : 'Add Guest'}
                                    </button>
                                </div>

                                {showGuestForm ? (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                placeholder="First Name" 
                                                className="px-3 py-2 text-sm bg-white border border-gray-100 rounded-lg outline-indigo-500" 
                                                value={guestData.firstName}
                                                onChange={e => setGuestData({ ...guestData, firstName: e.target.value })}
                                            />
                                            <input 
                                                placeholder="Last Name" 
                                                className="px-3 py-2 text-sm bg-white border border-gray-100 rounded-lg outline-indigo-500" 
                                                value={guestData.lastName}
                                                onChange={e => setGuestData({ ...guestData, lastName: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                placeholder="Nickname" 
                                                className="px-3 py-2 text-sm bg-white border border-gray-100 rounded-lg outline-indigo-500" 
                                                value={guestData.nickname}
                                                onChange={e => setGuestData({ ...guestData, nickname: e.target.value })}
                                            />
                                            <input 
                                                placeholder="Email" 
                                                className="px-3 py-2 text-sm bg-white border border-gray-100 rounded-lg outline-indigo-500" 
                                                value={guestData.email}
                                                onChange={e => setGuestData({ ...guestData, email: e.target.value })}
                                            />
                                        </div>
                                        <button 
                                            onClick={addGuestToBill}
                                            className="w-full py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all"
                                        >
                                            Add Guest User
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Search size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search registered users by username or email..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearchUsers(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto p-2 space-y-1">
                                                {searchResults.map(u => (
                                                    <button 
                                                        key={u.id}
                                                        onClick={() => addPersonToBill(u)}
                                                        className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                                            {u.nickname[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{u.nickname}</p>
                                                            <p className="text-[10px] text-gray-400">@{u.username}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {involvedPersons.map(p => (
                                        <div key={p.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                                            <div className="w-5 h-5 bg-white text-gray-600 rounded-full flex items-center justify-center font-bold text-[8px] uppercase border">
                                                {p.nickname ? p.nickname[0] : 'U'}
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">{p.nickname}</span>
                                            {p.user_id !== user?.id && (
                                                <button 
                                                    onClick={() => setInvolvedPersons(involvedPersons.filter(per => per.id !== p.id))}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="flex gap-3 pt-6 border-t border-gray-50">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateBill}
                                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    Create Bill
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in scale-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Edit Bill</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Bill Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter bill name"
                                    value={newBillName}
                                    onChange={(e) => setNewBillName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditBill}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    Update Bill
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showViewModal && selectedBill && billDetails && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-3xl shadow-2xl animate-in scale-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white pb-4 z-10 border-b border-gray-50 px-2">
                            <div>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Bill Details</p>
                                <h2 className="text-2xl font-black text-gray-900">{selectedBill.bill_name}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setShowExpenseModal(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all"
                                >
                                    <DollarSign size={14} />
                                    Add Expense
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-8">
                                <section>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Involved Persons</h3>
                                    <div className="space-y-2">
                                        {billDetails.involvedPersons.map((person: InvolvedPerson) => (
                                            <div key={person.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                                    {(person.nickname || person.first_name || "U")[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-xs">
                                                        {person.nickname || `${person.first_name} ${person.last_name}`}
                                                    </p>
                                                    {person.is_guest && <span className="text-[8px] font-black uppercase text-orange-500 bg-orange-50 px-1 rounded">Guest</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="lg:col-span-2 space-y-8">
                                <section>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex justify-between">
                                        Expenses
                                        <span>Total: ₱{billDetails.expenses.reduce((sum, e) => sum + e.total_amount, 0).toLocaleString()}</span>
                                    </h3>
                                    {billDetails.expenses.length > 0 ? (
                                        <div className="space-y-3">
                                            {billDetails.expenses.map((expense: Expense) => (
                                                <div key={expense.id} className="glass-card p-4 hover:border-indigo-200 transition-all">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-black text-gray-900">{expense.expense_name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                                Paid by {billDetails.involvedPersons.find(p => p.id === expense.paid_by_id)?.nickname || 'Unknown'}
                                                            </p>
                                                        </div>
                                                        <p className="font-black text-indigo-600 text-lg">₱{expense.total_amount.toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider mr-2">Split with:</span>
                                                        {expense.involved_person_ids.map(pid => {
                                                            const p = billDetails.involvedPersons.find(ip => ip.id === pid);
                                                            return (
                                                                <span key={pid} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[9px] font-bold rounded border border-gray-100">
                                                                    {p?.nickname || '??'}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center">
                                            <p className="text-gray-400 font-bold italic">No details</p>
                                            <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-2">Add an expense to get started</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-gray-50 flex justify-end">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in scale-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Add Expense</h2>
                            <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Expense Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Ribshack Dinner"
                                        value={newExpense.name}
                                        onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">₱</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={newExpense.amount}
                                            onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-black text-xl"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Paid By</label>
                                    <select 
                                        value={newExpense.paidBy}
                                        onChange={e => setNewExpense({ ...newExpense, paidBy: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold"
                                    >
                                        {involvedPersons.map(p => (
                                            <option key={p.id} value={p.id}>{p.nickname} {p.user_id === user?.id ? '(Host)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Split With</label>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setNewExpense({ ...newExpense, splitType: 'equally', splitWith: involvedPersons.map(p => p.id) })}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${newExpense.splitType === 'equally' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
                                            >
                                                Equally
                                            </button>
                                            <button 
                                                onClick={() => setNewExpense({ ...newExpense, splitType: 'custom' })}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${newExpense.splitType === 'custom' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
                                            >
                                                Custom
                                            </button>
                                        </div>
                                        
                                        {newExpense.splitType === 'custom' && (
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                                {involvedPersons.map(p => (
                                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                                                        <input 
                                                            type="checkbox"
                                                            checked={newExpense.splitWith.includes(p.id)}
                                                            onChange={e => {
                                                                const checked = e.target.checked;
                                                                setNewExpense(prev => ({
                                                                    ...prev,
                                                                    splitWith: checked 
                                                                        ? [...prev.splitWith, p.id]
                                                                        : prev.splitWith.filter(id => id !== p.id)
                                                                }));
                                                            }}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">{p.nickname}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-6 border-t border-gray-50">
                                <button
                                    onClick={() => setShowExpenseModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddExpense}
                                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    Add Expense
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillsPage;
