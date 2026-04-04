import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Copy,
    Edit2,
    Archive,
    Trash2,
    X,
    RefreshCcw,
    UserPlus,
    Search,
    DollarSign,
    Plus,
    MoreVertical,
    Receipt,
    ChevronLeft,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Bill, InvolvedPerson, Expense, GuestData } from '../types';
import ConfirmationModal from '../components/common/ConfirmationModal';

const BillDetailPage: React.FC = () => {
    const { billId } = useParams<{ billId: string }>();
    const { user, guestUser, isLoading } = useAuth();
    const navigate = useNavigate();


    const [bill, setBill] = useState<Bill | null>(null);
    const [billDetails, setBillDetails] = useState<{ involvedPersons: InvolvedPerson[], expenses: Expense[], settlements: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Persons' | 'Overview' | 'Payment'>('Overview');


    // Modals
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
    const [showAddPersonToExpenseModal, setShowAddPersonToExpenseModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showEditBillModal, setShowEditBillModal] = useState(false);

    // Form States
    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        paidBy: '' as string | number,
        splitType: 'equally' as 'equally' | 'custom',
        splitWith: [] as (string | number)[]
    });
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentTarget, setPaymentTarget] = useState<{ fromId: string | number, toId: string | number, fromName: string, toName: string, amount: number } | null>(null);
    const [newBillName, setNewBillName] = useState('');
    const [openExpenseDropdown, setOpenExpenseDropdown] = useState<number | null>(null);

    // Search / Add Member
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedSearchPerson, setSelectedSearchPerson] = useState<any | null>(null);
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestData, setGuestData] = useState<GuestData>({
        firstName: '',
        lastName: '',
        nickname: '',
        email: ''
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        confirmVariant?: 'danger' | 'primary';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });


    useEffect(() => {
        if (billId) {
            fetchBillDetails();
        }
    }, [billId]);

    const fetchBillDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5001/api/bills/${billId}/details`);
            if (!response.ok) throw new Error('Failed to fetch bill details');
            const data = await response.json();
            
            // The API returns { bill, involvedPersons, expenses, settlements }
            setBill(data.bill);
            setBillDetails({
                involvedPersons: data.involvedPersons,
                expenses: data.expenses,
                settlements: data.settlements
            });
            setNewBillName(data.bill.bill_name);
        } catch (error) {
            console.error('Error fetching bill details:', error);
            toast.error('Failed to load bill details');
            navigate('/bills');
        } finally {
            setLoading(false);
        }
    };

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Invite code copied to clipboard!');
    };

    const resetPersonForm = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedSearchPerson(null);
        setShowGuestForm(false);
        setGuestData({
            firstName: '',
            lastName: '',
            nickname: '',
            email: ''
        });
    };

    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        try {
            const excludeParam = user ? `&exclude=${user.id}` : '';
            const response = await fetch(`http://localhost:5001/api/users/search?q=${query}${excludeParam}`);
            const data = await response.json();
            setSearchResults(data.users || []);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const addPersonToBill = async (person: any) => {
        if (!person || !bill) return;

        const isGuest = person.is_guest === 1;
        if (billDetails?.involvedPersons.some(p => (isGuest ? p.id === person.id && p.is_guest : p.user_id === person.id && !p.is_guest))) {
            toast.error('Person already added');
            return;
        }

        // Standard user limit check: Max 3 members total (including creator)
        // Note: we check the creator's user type, not necessarily the current user adding the member
        // (though usually only the creator can add members in this UI)
        if (bill.created_by_user_type_id === 1 && (billDetails?.involvedPersons.length || 0) >= 3) {
            toast.error('Standard accounts can have a maximum of 3 members total per bill.');
            return;
        }


        try {
            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/involved-persons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [isGuest ? 'guest_user_id' : 'user_id']: person.id,
                    created_by: user?.id
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add person');
            }
            
            toast.success('Person added to bill');
            fetchBillDetails();
            resetPersonForm();
            setShowAddPersonToExpenseModal(false);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const addGuestToBill = async () => {
        if (!guestData.firstName || !guestData.lastName || !guestData.nickname || !guestData.email || !bill) {
            toast.error('Please fill in all guest fields');
            return;
        }

        // Standard user limit check: Max 3 members total
        if (bill.created_by_user_type_id === 1 && (billDetails?.involvedPersons.length || 0) >= 3) {
            toast.error('Standard accounts can have a maximum of 3 members total per bill.');
            return;
        }


        try {
            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/involved-persons/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...guestData, created_by: user?.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add guest');
            }

            toast.success('Guest added to bill');
            fetchBillDetails();
            resetPersonForm();
            setShowAddPersonToExpenseModal(false);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeletePerson = (personId: number | string) => {

        setConfirmModal({
            isOpen: true,
            title: 'Remove Member',
            message: 'Are you sure you want to remove this person from the bill? This may affect existing expenses.',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5001/api/bills/${billId}/involved-persons/${personId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        toast.success('Member removed');
                        fetchBillDetails();
                    }
                } catch (error) {
                    toast.error('Failed to remove member');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.name || !newExpense.amount || !newExpense.paidBy || !bill) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newExpense,
                    amount: parseFloat(newExpense.amount),
                    bill_id: bill.id,
                    created_by: user?.id
                })
            });

            if (response.ok) {
                toast.success('Expense added');
                setShowExpenseModal(false);
                fetchBillDetails();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Failed to add expense');
            }
        } catch (error) {
            toast.error('Failed to add expense');
        }
    };

    const handleEditExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.name || !newExpense.amount || !newExpense.paidBy || !editingExpenseId || !bill) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/expenses/${editingExpenseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newExpense.name,
                    amount: parseFloat(newExpense.amount),
                    paidBy: newExpense.paidBy,
                    splitType: newExpense.splitType,
                    splitWith: newExpense.splitWith
                })
            });

            if (response.ok) {
                toast.success('Expense updated');
                setShowEditExpenseModal(false);
                setEditingExpenseId(null);
                fetchBillDetails();
            } else {
                toast.error('Failed to update expense');
            }
        } catch (error) {
            toast.error('Failed to update expense');
        }
    };

    const handleDeleteExpense = (expenseId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Expense',
            message: 'Are you sure you want to delete this expense? This cannot be undone.',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5001/api/bills/${billId}/expenses/${expenseId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        toast.success('Expense deleted');
                        fetchBillDetails();
                    }
                } catch (error) {
                    toast.error('Failed to delete expense');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleArchiveBill = async () => {
        if (!bill) return;
        setConfirmModal({
            isOpen: true,
            title: 'Archive Bill',
            message: 'This will move the bill to the archive. All participants will no longer be able to add expenses.',
            confirmVariant: 'primary',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/archive`, {

                        method: 'PATCH'
                    });
                    if (response.ok) {
                        toast.success('Bill archived');
                        navigate('/bills');
                    }
                } catch (error) {
                    toast.error('Failed to archive bill');
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }

            }
        });
    };

    const handleSettlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentTarget || !paymentAmount || !bill) return;

        try {
            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/settlements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromId: paymentTarget.fromId,
                    toId: paymentTarget.toId,
                    amount: parseFloat(paymentAmount),
                    settled_by: user?.id || guestUser?.id
                })
            });

            if (response.ok) {
                toast.success('Payment settled successfully');
                setShowPayModal(false);
                fetchBillDetails();
            } else {
                toast.error('Failed to settle payment');
            }
        } catch (error) {
            toast.error('Failed to settle payment');
        }
    };

    const handleEditBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBillName || !bill) return;

        try {
            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bill_name: newBillName })
            });

            if (response.ok) {
                toast.success('Bill name updated');
                setShowEditBillModal(false);
                fetchBillDetails();
            } else {
                toast.error('Failed to update bill');
            }
        } catch (error) {
            toast.error('Failed to update bill');
        }
    };

    const activityHistory = useMemo(() => {
        if (!billDetails) return [];
        const items: any[] = [];

        billDetails.expenses.forEach(exp => {
            const payer = billDetails.involvedPersons.find(p => p.id === exp.paid_by_id);
            items.push({
                id: `exp-${exp.id}`,
                type: 'expense',
                title: exp.expense_name,
                subtitle: `Paid by ${payer?.nickname || 'Unknown'}`,
                amount: exp.total_amount,
                status: 'Completed',
                fromName: payer?.nickname || 'Unknown',
                date: new Date(exp.created_at)
            });
        });

        billDetails.settlements.forEach(set => {
            const from = billDetails.involvedPersons.find(p => p.id === set.from_person_id);
            const to = billDetails.involvedPersons.find(p => p.id === set.to_person_id);
            items.push({
                id: `set-${set.id}`,
                type: 'settlement',
                title: `${from?.nickname} paid ${to?.nickname}`,
                subtitle: 'Debt Settlement',
                amount: set.amount,
                status: 'Settled',
                fromName: from?.nickname || 'Unknown',
                date: new Date(set.created_at)
            });
        });

        return items.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [billDetails]);

    const computedDebts = useMemo(() => {
        if (!billDetails) return [];
        const balances: { [key: string]: number } = {};
        
        billDetails.involvedPersons.forEach(p => balances[p.id] = 0);
        
        billDetails.expenses.forEach(exp => {
            const splitCount = exp.involved_person_ids.length;
            if (splitCount === 0) return;
            const amountPerPerson = exp.total_amount / splitCount;
            
            balances[exp.paid_by_id] += exp.total_amount;
            exp.involved_person_ids.forEach(pid => {
                balances[pid] -= amountPerPerson;
            });
        });
        
        billDetails.settlements.forEach(set => {
            balances[set.from_person_id] += set.amount;
            balances[set.to_person_id] -= set.amount;
        });

        const debtors = billDetails.involvedPersons
            .map(p => ({ id: p.id, name: p.nickname || p.first_name, balance: balances[p.id] }))
            .filter(p => p.balance < -0.01)
            .sort((a, b) => a.balance - b.balance);

        const creditors = billDetails.involvedPersons
            .map(p => ({ id: p.id, name: p.nickname || p.first_name, balance: balances[p.id] }))
            .filter(p => p.balance > 0.01)
            .sort((a, b) => b.balance - a.balance);

        const result: any[] = [];
        let debtorIdx = 0;
        let creditorIdx = 0;

        const dCopy = debtors.map(d => ({ ...d, balance: Math.abs(d.balance) }));
        const cCopy = creditors.map(c => ({ ...c, balance: c.balance }));

        while (debtorIdx < dCopy.length && creditorIdx < cCopy.length) {
            const amount = Math.min(dCopy[debtorIdx].balance, cCopy[creditorIdx].balance);
            result.push({
                fromId: dCopy[debtorIdx].id,
                fromName: dCopy[debtorIdx].name,
                toId: cCopy[creditorIdx].id,
                toName: cCopy[creditorIdx].name,
                amount: amount
            });

            dCopy[debtorIdx].balance -= amount;
            cCopy[creditorIdx].balance -= amount;

            if (dCopy[debtorIdx].balance < 0.01) debtorIdx++;
            if (cCopy[creditorIdx].balance < 0.01) creditorIdx++;
        }

        return result;
    }, [billDetails]);

    if (loading || isLoading) {
        return (
            <div className="text-center py-20">
                <div className="inline-block animate-spin">
                    <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                </div>
            </div>
        );
    }

    if (!bill || !billDetails) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">Bill not found</p>
                <button onClick={() => navigate('/bills')} className="mt-4 text-indigo-600 font-bold">Back to Bills</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
            {/* Page Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/bills')}
                        className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
                            {bill.bill_name}
                            {bill.created_by === user?.id && (
                                <button 
                                    onClick={() => setShowEditBillModal(true)}
                                    className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </h1>
                        <div className="mt-2 flex flex-wrap gap-3">
                            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-flex items-center gap-2">
                                INVITE CODE: <span className="text-indigo-900 tracking-widest text-xs">{bill.invite_code}</span>
                                <button onClick={() => copyInviteCode(bill.invite_code)} className="hover:text-indigo-800"><Copy size={12} /></button>
                            </div>
                            <div className="text-[10px] font-black text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-flex items-center gap-2">
                                CREATED: {new Date(bill.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {bill.created_by === user?.id && (
                        <button 
                            onClick={handleArchiveBill}
                            className="flex-1 md:flex-none px-6 py-3 bg-white border border-red-100 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Archive size={16} /> Archive
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            setNewExpense({ name: '', amount: '', paidBy: user?.id || '', splitType: 'equally', splitWith: billDetails.involvedPersons.map(p => p.id) });
                            setShowExpenseModal(true);
                        }}
                        className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Add Expense
                    </button>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tabs Sidebar (Desktop) / Header (Mobile) */}
                <div className="lg:col-span-3">
                    <div className="flex gap-1 p-1 bg-gray-100/50 rounded-2xl w-fit">
                        {(['Overview', 'Persons', 'Payment'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-8 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Left Side: Dynamic Tab Content */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'Overview' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                            {billDetails.expenses.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {billDetails.expenses.map((expense: Expense) => (
                                        <div key={expense.id} className="glass-card p-6 group transition-all duration-300 relative overflow-visible">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-black text-gray-900 text-xl flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                                            <Receipt size={20} />
                                                        </div>
                                                        {expense.expense_name}
                                                    </h3>
                                                    <p className="text-xs font-bold text-gray-400 mt-2 ml-13 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                        Paid by {billDetails.involvedPersons.find(p => p.id === expense.paid_by_id)?.nickname || 'Unknown'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-gray-900 text-3xl tabular-nums tracking-tighter">₱{expense.total_amount.toLocaleString()}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{new Date(expense.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-50">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shared With</span>
                                                <div className="flex -space-x-2">
                                                    {expense.involved_person_ids.map(pid => {
                                                        const p = billDetails.involvedPersons.find(ip => ip.id === pid);
                                                        return (
                                                            <div 
                                                                key={pid} 
                                                                className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center font-black text-[10px] text-indigo-600 uppercase"
                                                                title={p?.nickname || 'Unknown'}
                                                            >
                                                                {p?.nickname?.[0] || '?'}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenExpenseDropdown(openExpenseDropdown === expense.id ? null : expense.id);
                                                    }}
                                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 bg-white shadow-sm border border-gray-100"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>

                                                {openExpenseDropdown === expense.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 py-2 animate-in fade-in zoom-in-95 duration-200">
                                                        <button
                                                            onClick={() => {
                                                                setOpenExpenseDropdown(null);
                                                                setNewExpense({
                                                                    name: expense.expense_name,
                                                                    amount: expense.total_amount.toString(),
                                                                    paidBy: expense.paid_by_id,
                                                                    splitType: expense.split_type,
                                                                    splitWith: expense.involved_person_ids
                                                                });
                                                                setEditingExpenseId(expense.id);
                                                                setShowEditExpenseModal(true);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-xs font-black text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                        >
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setOpenExpenseDropdown(null);
                                                                handleDeleteExpense(expense.id);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-xs font-black text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                        >
                                                            <Trash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-60">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                        <Receipt size={32} className="text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 mb-2">No expenses yet</h3>
                                    <p className="text-sm font-bold text-gray-400 max-w-xs">Start by adding your first expense to the bill.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Persons' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 text-center">
                             <div className="flex justify-between items-center px-2">
                                <div className="text-left">
                                    <h2 className="text-2xl font-black text-gray-900">Bill Members</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manage who's splitting this bill</p>
                                </div>
                                {bill.created_by === user?.id && (
                                    <button 
                                        onClick={() => setShowAddPersonToExpenseModal(!showAddPersonToExpenseModal)}
                                        className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        <UserPlus size={16} /> Add Member
                                    </button>
                                )}
                             </div>

                             {showAddPersonToExpenseModal && (
                                <div className="glass-card p-8 bg-white border-2 border-indigo-100 shadow-2xl shadow-indigo-100/50 space-y-6 text-left">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">New Member Options</h3>
                                        <button 
                                            onClick={() => setShowGuestForm(!showGuestForm)}
                                            className="text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-2"
                                        >
                                            {showGuestForm ? <><Search size={12} /> Search Users</> : <><UserPlus size={12} /> Manual Guest</>}
                                        </button>
                                    </div>

                                    {showGuestForm ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <input placeholder="First Name" className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold" value={guestData.firstName} onChange={e => setGuestData({ ...guestData, firstName: e.target.value })} />
                                            <input placeholder="Last Name" className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold" value={guestData.lastName} onChange={e => setGuestData({ ...guestData, lastName: e.target.value })} />
                                            <input placeholder="Nickname" className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold" value={guestData.nickname} onChange={e => setGuestData({ ...guestData, nickname: e.target.value })} />
                                            <input placeholder="Email" className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold" value={guestData.email} onChange={e => setGuestData({ ...guestData, email: e.target.value })} />
                                            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                                                <button onClick={() => setShowAddPersonToExpenseModal(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 text-sm">Cancel</button>
                                                <button onClick={addGuestToBill} className="px-8 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">Add Guest</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input 
                                                    type="text"
                                                    placeholder="Search registered users..."
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearchUsers(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-indigo-500 font-bold"
                                                />
                                            </div>
                                            {searchResults.length > 0 && (
                                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                                                    {searchResults.map(u => (
                                                        <button 
                                                            key={u.id} 
                                                            onClick={() => setSelectedSearchPerson(u)}
                                                            className={`p-4 rounded-xl flex items-center justify-between border-2 transition-all ${selectedSearchPerson?.id === u.id ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-indigo-600 text-xs">{u.nickname?.[0] || u.first_name?.[0]}</div>
                                                                <div className="text-left">
                                                                    <p className="text-sm font-black text-gray-900">{u.nickname || u.first_name}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">@{u.username}</p>
                                                                </div>
                                                            </div>
                                                            {selectedSearchPerson?.id === u.id && <Check size={16} className="text-indigo-600" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-50">
                                                <button onClick={() => setShowAddPersonToExpenseModal(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 text-sm">Cancel</button>
                                                <button 
                                                    onClick={() => addPersonToBill(selectedSearchPerson)} 
                                                    disabled={!selectedSearchPerson}
                                                    className="px-10 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50"
                                                >
                                                    Add Member
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                             )}

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {billDetails.involvedPersons.map((person) => (
                                    <div key={person.id} className="glass-card p-6 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-white shadow-inner flex items-center justify-center text-xl font-black text-indigo-700 uppercase">
                                                {person.nickname?.[0] || person.first_name?.[0]}
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{person.nickname || person.first_name}</h4>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                                    {person.is_guest ? <span className="text-orange-500">Guest User</span> : 'Member'}
                                                </p>
                                            </div>
                                        </div>
                                        {bill.created_by === user?.id && person.id !== user?.id && (
                                            <button 
                                                onClick={() => handleDeletePerson(person.id)}
                                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {activeTab === 'Payment' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                            <div className="flex justify-between items-center px-2">
                                <div className="text-left">
                                    <h2 className="text-2xl font-black text-gray-900">Activity History</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Transaction log for this bill</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {activityHistory.length > 0 ? (
                                    activityHistory.map((item) => (
                                        <div key={item.id} className={`glass-card p-6 flex justify-between items-center group transition-all ${item.type === 'settlement' ? 'bg-green-50/20 border-green-100' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner font-black text-sm uppercase ${item.type === 'settlement' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {item.type === 'settlement' ? <DollarSign size={20} /> : item.fromName[0]}
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="text-base font-black text-gray-900 uppercase tracking-tight">{item.title}</h4>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">{item.subtitle}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-2xl font-black tabular-nums tracking-tighter ${item.type === 'settlement' ? 'text-green-600' : 'text-gray-900'}`}>
                                                    {item.type === 'settlement' ? '+ ' : ''}₱{item.amount.toLocaleString()}
                                                </p>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg mt-2 inline-block ${item.status === 'Settled' || item.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-60">
                                        <RefreshCcw size={32} className="text-gray-300 mb-4" />
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No activities yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Settlement Summary (Sticky) */}
                <div className="space-y-6">
                    <div className="sticky top-8 space-y-6">
                        <div className="glass-card p-8 border-2 border-indigo-500 shadow-2xl shadow-indigo-100/50 relative overflow-hidden bg-white">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 -z-10"></div>
                            
                            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Summary</h3>
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-end">
                                    <p className="text-4xl font-black text-gray-900 tabular-nums">₱{billDetails.expenses.reduce((sum, e) => sum + e.total_amount, 0).toLocaleString()}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Total Bill</p>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-gray-100">
                                    {computedDebts.length > 0 ? (
                                        computedDebts.map((debt, index) => (
                                            <div key={index} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <span>From</span>
                                                    <span>To</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-gray-900 text-sm">{debt.fromName}</span>
                                                    <div className="h-[1px] flex-1 mx-3 bg-gradient-to-r from-transparent via-gray-200 to-transparent relative">
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-2">
                                                            <DollarSign size={10} className="text-indigo-400" />
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-gray-900 text-sm">{debt.toName}</span>
                                                </div>
                                                <p className="text-xl font-black text-indigo-600 tabular-nums mt-1 text-center">₱{debt.amount.toLocaleString()}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-6 text-center bg-green-50 rounded-2xl border border-green-100">
                                            <p className="text-xs font-black text-green-600 uppercase tracking-widest">Everything is Settled</p>
                                        </div>
                                    )}
                                </div>

                                {computedDebts.some(d => String(d.fromId) === String(user?.id) || String(d.fromId) === `guest_${guestUser?.id}`) && (
                                    <button 
                                        onClick={() => {
                                            const debt = computedDebts.find(d => String(d.fromId) === String(user?.id) || String(d.fromId) === `guest_${guestUser?.id}`);
                                            if (debt) {
                                                setPaymentTarget(debt);
                                                setPaymentAmount(debt.amount.toFixed(2));
                                                setShowPayModal(true);
                                            }
                                        }}
                                        className="w-full py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-100 shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-3"
                                    >
                                        <DollarSign size={16} /> Settle My Debt
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Invite Link Card */}
                        <div className="glass-card p-6 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0 shadow-xl shadow-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-3">Invite Friends</h4>
                            <p className="text-xs font-bold text-indigo-100 mb-4 leading-relaxed">Share this code with your friends to let them join this bill.</p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 font-black tracking-widest text-lg text-center">{bill.invite_code}</div>
                                <button 
                                    onClick={() => copyInviteCode(bill.invite_code)}
                                    className="p-3 bg-white text-indigo-600 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Add Expense</h2>
                            <button onClick={() => setShowExpenseModal(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">What was it for?</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Ribshack Dinner"
                                    required
                                    value={newExpense.name}
                                    onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black">₱</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            placeholder="0.00"
                                            required
                                            value={newExpense.amount}
                                            onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                            className="w-full pl-10 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all font-black text-xl tabular-nums"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Paid By</label>
                                    <select 
                                        className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 transition-all font-bold text-gray-900 appearance-none"
                                        value={newExpense.paidBy}
                                        onChange={e => setNewExpense({ ...newExpense, paidBy: e.target.value })}
                                    >
                                        <option value="">Select Person</option>
                                        {billDetails.involvedPersons.map(p => (
                                            <option key={p.id} value={p.id}>{p.nickname || p.first_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Split With</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {billDetails.involvedPersons.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                const current = [...newExpense.splitWith];
                                                if (current.includes(p.id)) {
                                                    setNewExpense({ ...newExpense, splitWith: current.filter(id => id !== p.id) });
                                                } else {
                                                    setNewExpense({ ...newExpense, splitWith: [...current, p.id] });
                                                }
                                            }}
                                            className={`p-3 rounded-xl flex items-center justify-between border-2 transition-all ${newExpense.splitWith.includes(p.id) ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                        >
                                            <span className="text-xs font-bold text-gray-900">{p.nickname || p.first_name}</span>
                                            {newExpense.splitWith.includes(p.id) && <Check size={14} className="text-indigo-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all">Save Expense</button>
                        </form>
                    </div>
                </div>
            )}

            {showEditExpenseModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Edit Expense</h2>
                            <button onClick={() => setShowEditExpenseModal(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleEditExpenseSubmit} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Expense Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Ribshack Dinner"
                                    required
                                    value={newExpense.name}
                                    onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black">₱</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            placeholder="0.00"
                                            required
                                            value={newExpense.amount}
                                            onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                            className="w-full pl-10 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all font-black text-xl tabular-nums"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Paid By</label>
                                    <select 
                                        className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 transition-all font-bold text-gray-900 appearance-none"
                                        value={newExpense.paidBy}
                                        onChange={e => setNewExpense({ ...newExpense, paidBy: e.target.value })}
                                    >
                                        <option value="">Select Person</option>
                                        {billDetails.involvedPersons.map(p => (
                                            <option key={p.id} value={p.id}>{p.nickname || p.first_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Split With</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {billDetails.involvedPersons.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                const current = [...newExpense.splitWith];
                                                if (current.includes(p.id)) {
                                                    setNewExpense({ ...newExpense, splitWith: current.filter(id => id !== p.id) });
                                                } else {
                                                    setNewExpense({ ...newExpense, splitWith: [...current, p.id] });
                                                }
                                            }}
                                            className={`p-3 rounded-xl flex items-center justify-between border-2 transition-all ${newExpense.splitWith.includes(p.id) ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                        >
                                            <span className="text-xs font-bold text-gray-900">{p.nickname || p.first_name}</span>
                                            {newExpense.splitWith.includes(p.id) && <Check size={14} className="text-indigo-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all">Update Expense</button>
                        </form>
                    </div>
                </div>
            )}

            {showPayModal && paymentTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <DollarSign size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Settle Debt</h2>
                            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">{paymentTarget.fromName} owes {paymentTarget.toName}</p>
                        </div>

                        <form onSubmit={handleSettlePayment} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 text-center">Amount to Settle</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black">₱</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        className="w-full px-12 py-6 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-green-100 focus:ring-4 focus:ring-green-500/5 transition-all font-black text-4xl text-center tabular-nums"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button className="w-full py-5 bg-green-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-green-700 shadow-2xl shadow-green-100 transition-all">Confirm Payment</button>
                                <button type="button" onClick={() => setShowPayModal(false)} className="w-full py-4 text-gray-400 font-bold hover:text-gray-900 transition-all">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditBillModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Edit Bill</h2>
                            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">Update bill details</p>
                        </div>

                        <form onSubmit={handleEditBill} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Bill Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newBillName}
                                    onChange={e => setNewBillName(e.target.value)}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 transition-all font-bold text-lg"
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all">Save Changes</button>
                                <button type="button" onClick={() => setShowEditBillModal(false)} className="w-full py-4 text-gray-400 font-bold hover:text-gray-900 transition-all">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmVariant={confirmModal.confirmVariant}
            />
        </div>
    );
};

export default BillDetailPage;
