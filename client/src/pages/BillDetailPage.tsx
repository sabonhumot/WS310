import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Copy,
    Edit2,
    Archive,
    Trash2,
    X,
    UserPlus,
    Search,
    DollarSign,
    Plus,
    MoreVertical,
    Receipt,
    ChevronLeft,
    Check,
    Eye
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
    const isStandard = bill?.created_by_user_type_id === 1;
    const [activeTab, setActiveTab] = useState<'Persons' | 'Overview' | 'Payment'>('Overview');


    // Modals
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
    const [showAddPersonToExpenseModal, setShowAddPersonToExpenseModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showEditBillModal, setShowEditBillModal] = useState(false);
    const [showViewExpenseModal, setShowViewExpenseModal] = useState(false);
    const [showViewExpenseMenu, setShowViewExpenseMenu] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [selectedExpenseForPay, setSelectedExpenseForPay] = useState<number | null>(null);

    // Form States
    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        paidBy: [{ id: '' as string | number, amount: '' }],
        splitType: 'equally' as 'equally' | 'custom',
        splitWith: [] as (string | number)[]
    });
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
    const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
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

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText.includes('<!DOCTYPE') ? 'Server error - bill details endpoint' : (errText || 'Failed to load bill'));
            }
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
            if (!response.ok) {
                const errText = await response.text();
                toast.error(errText.includes('<!DOCTYPE') ? 'Server error - missing search endpoint?' : (errText || 'Search failed'));
                setSearchResults([]);
                return;
            }
            let data;
            try {
                data = await response.json();
            } catch (jsonErr) {
                toast.error('Invalid response from server');
                setSearchResults([]);
                return;
            }
            const users = data.users || [];
            if (query.trim() && users.length === 0) {
              setSearchResults([]);
              return;
            }
            setSearchResults(users.filter((u: any) => 
                (u.nickname || '').toLowerCase().startsWith(query.toLowerCase()) ||
                (u.first_name || '').toLowerCase().startsWith(query.toLowerCase()) ||
                u.username?.toLowerCase().startsWith(query.toLowerCase())
            ));
        } catch (error) {
            console.error('Error searching users:', error);
            toast.error('Search failed');
            setSearchResults([]);
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
                let errMsg = 'Failed to add person';
                try {
                    const errorData = await response.clone().json();
                    errMsg = errorData.message || errMsg;
                } catch {
                    try {
                        const errText = await response.clone().text();
                        errMsg = errText.includes('<!DOCTYPE') ? 'Server error - add person endpoint' : (errText || errMsg);
                    } catch {
                        errMsg = 'Failed to add person - server error';
                    }
                }
                throw new Error(errMsg);
            }
            
            toast.success('Person added to bill');
            fetchBillDetails();
            resetPersonForm();
            setShowAddPersonToExpenseModal(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to add person');
        }
    };

    const addGuestToBill = async () => {
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!guestData.firstName.trim()) errors.firstName = 'First name is required';
        if (!guestData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!guestData.nickname.trim()) errors.nickname = 'Nickname is required';
        if (!guestData.email.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(guestData.email)) errors.email = 'Invalid email format';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        // Standard user limit check: Max 3 members total
    if (bill!.created_by_user_type_id === 1 && (billDetails!.involvedPersons.length || 0) >= 3) {
            toast.error('Standard accounts can have a maximum of 3 members total per bill.');
            return;
        }


        try {
const response = await fetch(`http://localhost:5001/api/bills/${bill!.id}/involved-persons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    guest_data: {
                        first_name: guestData.firstName,
                        last_name: guestData.lastName,
                        nickname: guestData.nickname,
                        email: guestData.email
                    }, 
                    created_by: user?.id 
                })
            });

            if (!response.ok) {
                let errMsg = 'Failed to add guest';
                try {
                    const errorData = await response.clone().json();
                    errMsg = errorData.message || errMsg;
                } catch {
                    try {
                        const errText = await response.clone().text();
                        errMsg = errText.includes('<!DOCTYPE') ? 'Server error - guest add endpoint missing' : (errText || errMsg);
                    } catch {
                        errMsg = 'Failed to add guest - server error';
                    }
                }
                toast.error(errMsg);
                return;
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
        // Check if person has unsettled debts
        const hasUnsettledDebts = computedDebts.some(debt => debt.fromId === personId || debt.toId === personId);
        
        if (hasUnsettledDebts) {
            toast.error('Cannot remove member. This person has unsettled debts or is owed money.', {
                duration: 4000,
                icon: '⚠️'
            });
            return;
        }

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
                    } else {
                        const errorData = await response.json();
                        toast.error(errorData.message || 'Failed to remove member');
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
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!newExpense.name.trim()) errors.name = 'Expense name is required';
        
        let hasPayerError = false;
        newExpense.paidBy.forEach((p, idx) => {
            if (!p.id) {
                errors[`paidBy_${idx}_id`] = 'Please select a person';
                hasPayerError = true;
            }
            if (!p.amount || parseFloat(p.amount) <= 0) {
                errors[`paidBy_${idx}_amount`] = 'Amount must be greater than 0';
                hasPayerError = true;
            }
        });

        if (newExpense.splitType === 'custom' && newExpense.splitWith.length === 0) {
            errors.splitWith = 'Please select at least one person to split with';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        try {
            const formattedPaidBy = newExpense.paidBy.map(p => ({ id: p.id, amount: parseFloat(p.amount) || 0 }));

            const response = await fetch(`http://localhost:5001/api/bills/${bill.id}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expense_name: newExpense.name,
                    total_amount: parseFloat(newExpense.amount),
                    paid_by_ids: formattedPaidBy,
                    split_type: newExpense.splitType,
                    involved_person_ids: newExpense.splitType === 'equally' ? billDetails?.involvedPersons.map(p => p.id) : newExpense.splitWith
                })
            });

            if (response.ok) {
                toast.success('Expense added');
                setShowExpenseModal(false);
                fetchBillDetails();
            } else {
                let errMsg = 'Failed to add expense';
                try {
                    const data = await response.clone().json();
                    errMsg = data.message || errMsg;
                } catch {
                    try {
                        const errText = await response.clone().text();
                        errMsg = errText || errMsg;
                    } catch {
                        // ignore
                    }
                }
                toast.error(errMsg);
            }
        } catch (error) {
            toast.error('Failed to add expense');
        }
    };

    const handleEditExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!newExpense.name.trim()) errors.name = 'Expense name is required';
        
        newExpense.paidBy.forEach((p, idx) => {
            if (!p.id) errors[`paidBy_${idx}_id`] = 'Please select a person';
            if (!p.amount || parseFloat(p.amount) <= 0) errors[`paidBy_${idx}_amount`] = 'Amount must be greater than 0';
        });

        if (newExpense.splitType === 'custom' && newExpense.splitWith.length === 0) {
            errors.splitWith = 'Please select at least one person to split with';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        try {
            const formattedPaidBy = newExpense.paidBy.map(p => ({ id: p.id, amount: parseFloat(p.amount) || 0 }));

            const response = await fetch(`http://localhost:5001/api/expenses/${editingExpenseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expense_name: newExpense.name,
                    total_amount: parseFloat(newExpense.amount),
                    paid_by_ids: formattedPaidBy,
                    split_type: newExpense.splitType,
                    involved_person_ids: newExpense.splitType === 'equally' ? billDetails?.involvedPersons.map(p => p.id) : newExpense.splitWith
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
                    const response = await fetch(`http://localhost:5001/api/expenses/${expenseId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        toast.success('Expense deleted');
                        fetchBillDetails();
                    } else {
                        const errorData = await response.json();
                        toast.error(errorData.message || 'Failed to delete expense');
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
                    paid_by_id: paymentTarget.fromId,
                    paid_to_id: paymentTarget.toId,
                    amount: parseFloat(paymentAmount),
                    expense_id: selectedExpenseForPay
                })
            });

            if (response.ok) {
                toast.success('Payment settled successfully');
                setShowPayModal(false);
                setPaymentAmount('');
                setPaymentTarget(null);
                setSelectedExpenseForPay(null);
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
        setFieldErrors({});
        if (!newBillName.trim()) {
            setFieldErrors({ billName: 'Bill name is required' });
            return;
        }
        if (!bill) return;

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

    const myDebtId = useMemo(() => {
        if (!user && !guestUser) return null;
        return guestUser ? `guest_${guestUser.id}` : String(user?.id);
    }, [user, guestUser]);

    const perExpenseDebts = useMemo(() => {
        if (!billDetails) return [];
        
        const results: any[] = [];
        const pools: Record<string, number> = {};

        // 1. Build Settlement Pools (Total paid between pairs)
        billDetails.settlements.forEach(s => {
            const key = `${s.paid_by_id}_${s.paid_to_id}`;
            pools[key] = (pools[key] || 0) + Number(s.amount);
        });

        // 2. Sort expenses by date (oldest first) so settlements apply chronologically
        const sortedExpenses = [...billDetails.expenses].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        sortedExpenses.forEach(exp => {
            const expBalances: Record<string, number> = {};
            
            // Initialization, Payment addition, and Split subtraction logic (Same as before)
            exp.involved_person_ids.forEach(id => expBalances[String(id)] = 0);
            exp.paid_by_ids?.forEach(id => expBalances[String(id)] = 0);
            if (exp.paid_by_id) expBalances[String(exp.paid_by_id)] = 0;

            if (exp.payers && exp.payers.length > 0) {
                exp.payers.forEach(p => {
                    const pid = p.guest_user_id ? `guest_${p.guest_user_id}` : p.user_id;
                    if (expBalances[String(pid)] !== undefined) expBalances[String(pid)] += p.amount;
                });
            } else if (exp.paid_by_id) {
                expBalances[String(exp.paid_by_id)] += exp.total_amount;
            }

            if (exp.splits && exp.splits.length > 0 && exp.split_type === 'custom') {
                exp.splits.forEach(s => {
                    const sid = s.guest_user_id ? `guest_${s.guest_user_id}` : s.user_id;
                    if (expBalances[String(sid)] !== undefined) expBalances[String(sid)] -= s.amount;
                });
            } else {
                const splitCount = exp.involved_person_ids.length;
                if (splitCount > 0) {
                    const share = exp.total_amount / splitCount;
                    exp.involved_person_ids.forEach(id => expBalances[String(id)] -= share);
                }
            }

            // 4. Calculate minimal transfers for this receipt
            const debtors = Object.keys(expBalances)
                .map(id => ({ id, balance: expBalances[id] }))
                .filter(p => p.balance < -0.01)
                .sort((a, b) => a.balance - b.balance);

            const creditors = Object.keys(expBalances)
                .map(id => ({ id, balance: expBalances[id] }))
                .filter(p => p.balance > 0.01)
                .sort((a, b) => b.balance - a.balance);

            let dIdx = 0, cIdx = 0;
            const dCopy = debtors.map(d => ({ ...d, balance: Math.abs(d.balance) }));
            const cCopy = creditors.map(c => ({ ...c, balance: c.balance }));

            while (dIdx < dCopy.length && cIdx < cCopy.length) {
                const amount = Math.min(dCopy[dIdx].balance, cCopy[cIdx].balance);
                const debtorId = dCopy[dIdx].id;
                const creditorId = cCopy[cIdx].id;
                const amountOwed = Math.round(amount * 100) / 100;
                
                if (amountOwed > 0.01) {
                    // Check against the settlement pool instead of specific ID
                    const poolKey = `${debtorId}_${creditorId}`;
                    const availableInPool = pools[poolKey] || 0;
                    const settledForThis = Math.min(availableInPool, amountOwed);
                    
                    // Consume from pool
                    pools[poolKey] -= settledForThis;

                    const debtor = billDetails.involvedPersons.find(p => String(p.id) === String(debtorId));
                    const creditor = billDetails.involvedPersons.find(p => String(p.id) === String(creditorId));

                    results.push({
                        expenseId: exp.id,
                        expenseName: exp.expense_name,
                        fromId: debtorId,
                        toId: creditorId,
                        fromName: debtor?.nickname || debtor?.first_name || 'Someone',
                        toName: creditor?.nickname || creditor?.first_name || 'Someone',
                        amount: amountOwed,
                        settledAmount: Math.round(settledForThis * 100) / 100,
                        remainingAmount: Math.max(0, Math.round((amountOwed - settledForThis) * 100) / 100),
                        isSettled: (settledForThis + 0.01) >= amountOwed,
                        date: exp.created_at
                    });
                }

                dCopy[dIdx].balance -= amount;
                cCopy[cIdx].balance -= amount;
                if (dCopy[dIdx].balance <= 0.01) dIdx++;
                if (cCopy[cIdx].balance <= 0.01) cIdx++;
            }
        });

        // Finally, sort results back for display (usually by date)
        return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [billDetails]);

    const computedDebts = useMemo(() => {
        if (!billDetails) return [];
        const balances: Record<string, number> = {};
        
        // Initialize
        billDetails.involvedPersons.forEach(p => balances[String(p.id)] = 0);

        // Process Expenses
        billDetails.expenses.forEach(exp => {
            // Payer part
            if (exp.payers && exp.payers.length > 0) {
                exp.payers.forEach(p => {
                    const pid = p.guest_user_id ? `guest_${p.guest_user_id}` : p.user_id;
                    if (balances[String(pid)] !== undefined) {
                        balances[String(pid)] += Number(p.amount);
                    }
                });
            } else if (exp.paid_by_id) {
                if (balances[String(exp.paid_by_id)] !== undefined) {
                    balances[String(exp.paid_by_id)] += exp.total_amount;
                }
            }

            // Split part
            if (exp.splits && exp.splits.length > 0 && exp.split_type === 'custom') {
                exp.splits.forEach(s => {
                    const sid = s.guest_user_id ? `guest_${s.guest_user_id}` : s.user_id;
                    if (balances[String(sid)] !== undefined) {
                        balances[String(sid)] -= Number(s.amount);
                    }
                });
            } else {
                const splitCount = exp.involved_person_ids.length;
                if (splitCount > 0) {
                    const share = exp.total_amount / splitCount;
                    exp.involved_person_ids.forEach(pid => {
                        if (balances[String(pid)] !== undefined) {
                            balances[String(pid)] -= share;
                        }
                    });
                }
            }
        });
        
        // Process Settlements (Only if valid/not orphaned)
        billDetails.settlements.forEach(set => {
            // If settlement is tied to an expense, it must exist in our current expenses list
            if (set.expense_id && !billDetails.expenses.some(e => e.id === set.expense_id)) {
                return; // Ignore orphaned settlement
            }

            const fromId = String(set.paid_by_id);
            const toId = String(set.paid_to_id);
            if (balances[fromId] !== undefined) balances[fromId] += Number(set.amount);
            if (balances[toId] !== undefined) balances[toId] -= Number(set.amount);
        });

        const debtors = billDetails.involvedPersons
            .map(p => ({ id: p.id, name: p.nickname || p.first_name, balance: balances[String(p.id)] }))
            .filter(p => p.balance < -0.01)
            .sort((a, b) => a.balance - b.balance);

        const creditors = billDetails.involvedPersons
            .map(p => ({ id: p.id, name: p.nickname || p.first_name, balance: balances[String(p.id)] }))
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
                amount: Math.round(amount * 100) / 100
            });

            dCopy[debtorIdx].balance -= amount;
            cCopy[creditorIdx].balance -= amount;

            if (dCopy[debtorIdx].balance <= 0.01) debtorIdx++;
            if (cCopy[creditorIdx].balance <= 0.01) creditorIdx++;
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
                            setNewExpense({ name: '', amount: '', paidBy: [{ id: user?.id || '', amount: '' }], splitType: 'equally', splitWith: billDetails.involvedPersons.map(p => p.id) });
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
                                    {billDetails.expenses.map((expense: Expense) => {
                                        const openViewModal = () => {
                                            setViewingExpense(expense);
                                            setShowViewExpenseModal(true);
                                        };

                                        const openEditModal = () => {
                                            // Convert legacy single ID or new array of payers to proper format
                                            let initialPaidBy = [];
                                            if (expense.payers && expense.payers.length > 0) {
                                                initialPaidBy = expense.payers.map((p: any) => ({
                                                    id: p.guest_user_id ? `guest_${p.guest_user_id}` : p.user_id,
                                                    amount: p.amount ? p.amount.toString() : ''
                                                }));
                                            } else {
                                                initialPaidBy = [{ id: expense.paid_by_id, amount: expense.total_amount.toString() }];
                                            }

                                            setNewExpense({
                                                name: expense.expense_name,
                                                amount: expense.total_amount.toString(),
                                                paidBy: initialPaidBy,
                                                splitType: expense.split_type,
                                                splitWith: expense.involved_person_ids
                                            });
                                            setEditingExpenseId(expense.id);
                                            setShowEditExpenseModal(true);
                                        };

                                        return (
                                            <div 
                                                key={expense.id} 
                                                onClick={openViewModal}
                                                className="glass-card p-6 group transition-all duration-300 relative overflow-visible cursor-pointer hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50"
                                            >
                                                <div className="flex justify-between items-start mb-4 gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-black text-gray-900 text-xl flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                                                <Receipt size={20} />
                                                            </div>
                                                            <span className="truncate">{expense.expense_name}</span>
                                                        </h3>
                                                        <p className="text-xs font-bold text-gray-400 mt-2 ml-13 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                            Paid by {billDetails.involvedPersons.find(p => p.id === expense.paid_by_id)?.nickname || 'Unknown'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="text-right">
                                                            <p className="font-black text-gray-900 text-3xl tabular-nums tracking-tighter">₱{expense.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{new Date(expense.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="relative">
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
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenExpenseDropdown(null);
                                                                            openViewModal();
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 text-xs font-black text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                                    >
                                                                        <Eye size={14} /> View
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenExpenseDropdown(null);
                                                                            openEditModal();
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 text-xs font-black text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                                    >
                                                                        <Edit2 size={14} /> Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
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
                                            </div>
                                        )
                                    })}
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
                                        disabled={isStandard && (billDetails?.involvedPersons.length || 0) >= 3}
                                        className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-400"
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
                                            <div>
                                                <input 
                                                    placeholder="First Name" 
                                                    className={`w-full px-4 py-3 border rounded-xl outline-none font-bold transition-all ${fieldErrors.firstName ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-indigo-500'}`} 
                                                    value={guestData.firstName} 
                                                    onChange={e => {
                                                        setGuestData({ ...guestData, firstName: e.target.value });
                                                        if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' }));
                                                    }} 
                                                />
                                                {fieldErrors.firstName && <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.firstName}</p>}
                                            </div>
                                            <div>
                                                <input 
                                                    placeholder="Last Name" 
                                                    className={`w-full px-4 py-3 border rounded-xl outline-none font-bold transition-all ${fieldErrors.lastName ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-indigo-500'}`} 
                                                    value={guestData.lastName} 
                                                    onChange={e => {
                                                        setGuestData({ ...guestData, lastName: e.target.value });
                                                        if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: '' }));
                                                    }} 
                                                />
                                                {fieldErrors.lastName && <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.lastName}</p>}
                                            </div>
                                            <div>
                                                <input 
                                                    placeholder="Nickname" 
                                                    className={`w-full px-4 py-3 border rounded-xl outline-none font-bold transition-all ${fieldErrors.nickname ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-indigo-500'}`} 
                                                    value={guestData.nickname} 
                                                    onChange={e => {
                                                        setGuestData({ ...guestData, nickname: e.target.value });
                                                        if (fieldErrors.nickname) setFieldErrors(prev => ({ ...prev, nickname: '' }));
                                                    }} 
                                                />
                                                {fieldErrors.nickname && <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.nickname}</p>}
                                            </div>
                                            <div>
                                                <input 
                                                    placeholder="Email" 
                                                    className={`w-full px-4 py-3 border rounded-xl outline-none font-bold transition-all ${fieldErrors.email ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-indigo-500'}`} 
                                                    value={guestData.email} 
                                                    onChange={e => {
                                                        setGuestData({ ...guestData, email: e.target.value });
                                                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                                                    }} 
                                                />
                                                {fieldErrors.email && <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.email}</p>}
                                            </div>                                            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                                                <button onClick={() => {
                                                    resetPersonForm();
                                                    setShowAddPersonToExpenseModal(false);
                                                }} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 text-sm">Cancel</button>
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
                                                    onFocus={() => handleSearchUsers(searchQuery)}
                                                    onClick={() => handleSearchUsers('')}
                                                    onChange={(e) => handleSearchUsers(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-indigo-500 font-bold"
                                                />
                                            </div>
                                            {searchQuery.trim() && searchResults.length === 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 p-4 text-center">
                                                    <p className="text-sm text-gray-500 font-medium">No nickname matched</p>
                                                </div>
                                            )}
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
                                                <button onClick={() => {
                                                    resetPersonForm();
                                                    setShowAddPersonToExpenseModal(false);
                                                }} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 text-sm">Cancel</button>
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

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">                                 {billDetails.involvedPersons.map((person) => (
                                    <div key={person.id} className="glass-card p-4 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-white shadow-inner flex items-center justify-center text-sm font-black text-indigo-700 uppercase">
                                                {person.nickname?.[0] || person.first_name?.[0]}
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{person.nickname || person.first_name}</h4>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                                    {person.is_guest ? <span className="text-orange-500">Guest User</span> : 'Member'}
                                                </p>
                                            </div>
                                        </div>
                                        {bill.created_by === user?.id && person.id !== user?.id && (
                                            <button 
                                                onClick={() => handleDeletePerson(person.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {activeTab === 'Payment' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                                <div className="text-left">
                                    <h2 className="text-2xl font-black text-gray-900">Suggested Payments</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Granular breakdown of what each person owes per expense</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {perExpenseDebts.length > 0 ? (
                                    perExpenseDebts.map((debt, index) => (
                                        <div key={index} className={`glass-card p-6 border-l-4 transition-all ${debt.isSettled ? 'border-l-green-400 opacity-60' : 'border-l-indigo-600'}`}>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${debt.isSettled ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        <Receipt size={24} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="text-base font-black text-gray-900 uppercase tracking-tighter">{debt.expenseName}</h4>
                                                            {debt.isSettled ? (
                                                                <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase tracking-widest">Completed</span>
                                                            ) : (
                                                                <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Ongoing</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                                                            <span className="text-gray-900">{debt.fromName}</span> owes <span className="text-gray-900">{debt.toName}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8 justify-between md:justify-end">
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{debt.isSettled ? 'Total Paid' : 'Remaining To Pay'}</p>
                                                        <p className={`text-2xl font-black tabular-nums tracking-tighter ${debt.isSettled ? 'text-gray-400' : 'text-indigo-600'}`}>
                                                            ₱{(debt.isSettled ? debt.amount : debt.remainingAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                        {!debt.isSettled && debt.settledAmount > 0 && (
                                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total: ₱{debt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                        )}
                                                    </div>
                                                    
                                                    {!debt.isSettled && (
                                                        <button 
                                                            onClick={async () => {
                                                                setPaymentTarget(debt);
                                                                setPaymentAmount(debt.remainingAmount.toFixed(2));
                                                                setSelectedExpenseForPay(debt.expenseId);
                                                                setShowPayModal(true);
                                                            }}
                                                            className="px-3 py-2 bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-2"
                                                        >
                                                            <Check size={10} /> Settle Up
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-60">
                                        <Check size={32} className="text-green-400 mb-4" />
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No payments needed at this time</p>
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
                                    <p className="text-4xl font-black text-gray-900 tabular-nums">₱{billDetails.expenses.reduce((sum, e) => sum + e.total_amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Total Bill</p>
                                </div>

                             <div className="space-y-3 pt-6 border-t border-gray-100">
                                    {(computedDebts.filter(d => String(d.fromId) === myDebtId && d.amount > 0.01).length > 0) ? (
                                        computedDebts.filter(d => String(d.fromId) === myDebtId && d.amount > 0.01).map((debt, index) => (
                                            <div key={index} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <span>I Owe</span>
                                                    <span>To</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-indigo-600 text-sm">Me</span>
                                                    <div className="h-[1px] flex-1 mx-3 bg-gradient-to-r from-transparent via-gray-200 to-transparent relative">
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-2">
                                                            <DollarSign size={10} className="text-indigo-400" />
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-gray-900 text-sm">{debt.toName}</span>
                                                </div>
                                                <p className="text-xl font-black text-indigo-600 tabular-nums mt-1 text-center">₱{debt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-6 text-center bg-green-50 rounded-2xl border border-green-100">
                                            <p className="text-xs font-black text-green-600 uppercase tracking-widest">You are all settled!</p>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setShowSummaryModal(true)}
                                    className="w-full py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-100 shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-3"
                                >
                                    <Eye size={16} /> View Summary
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
                                    onChange={e => {
                                        setNewExpense({ ...newExpense, name: e.target.value });
                                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    className={`w-full px-6 py-4 border rounded-2xl transition-all font-bold text-lg ${
                                        fieldErrors.name ? 'bg-red-50 border-red-500 focus:ring-red-500/10' : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5'
                                    }`}
                                />
                                {fieldErrors.name && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.name}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Payer Details</label>
                                <div className="space-y-4">
                                    {newExpense.paidBy.map((payer, idx) => {
                                        const selectedPayerIds = newExpense.paidBy.map(p => String(p.id)).filter((id, i) => i !== idx && id !== '');
                                        const availablePersons = billDetails?.involvedPersons.filter(p => !selectedPayerIds.includes(String(p.id)));

                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex gap-2 items-center">
                                                    <div className="relative w-32 shrink-0">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs">₱</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={payer.amount}
                                                            onChange={e => {
                                                                const newPaidBy = [...newExpense.paidBy];
                                                                newPaidBy[idx].amount = e.target.value;
                                                                const total = newPaidBy.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
                                                                setNewExpense({ ...newExpense, paidBy: newPaidBy, amount: total > 0 ? total.toString() : newExpense.amount });
                                                                if (fieldErrors[`paidBy_${idx}_amount`]) setFieldErrors(prev => ({ ...prev, [`paidBy_${idx}_amount`]: '' }));
                                                            }}
                                                            className={`w-full pl-8 pr-4 py-4 border rounded-2xl transition-all font-black text-sm tabular-nums ${
                                                                fieldErrors[`paidBy_${idx}_amount`] ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100'
                                                            }`}
                                                        />
                                                    </div>

                                                    <select
                                                        className={`flex-1 px-4 py-4 border rounded-2xl transition-all font-bold text-gray-900 appearance-none text-sm ${
                                                            fieldErrors[`paidBy_${idx}_id`] ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100'
                                                        }`}
                                                        value={payer.id}
                                                        onChange={e => {
                                                            const newPaidBy = [...newExpense.paidBy];
                                                            newPaidBy[idx].id = e.target.value;
                                                            setNewExpense({ ...newExpense, paidBy: newPaidBy });
                                                            if (fieldErrors[`paidBy_${idx}_id`]) setFieldErrors(prev => ({ ...prev, [`paidBy_${idx}_id`]: '' }));
                                                        }}
                                                    >
                                                        <option value="">Select Person</option>
                                                        {availablePersons?.map(p => (
                                                            <option key={p.id} value={p.id}>{p.nickname || p.first_name}</option>
                                                        ))}
                                                    </select>

                                                    {idx === newExpense.paidBy.length - 1 && newExpense.paidBy.length < (isStandard ? 3 : (billDetails?.involvedPersons.length || 0)) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setNewExpense({ ...newExpense, paidBy: [...newExpense.paidBy, { id: '', amount: '' }] });
                                                            }}
                                                            className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all shrink-0"
                                                        >
                                                            <Plus size={20} />
                                                        </button>
                                                    ) : newExpense.paidBy.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newPaidBy = newExpense.paidBy.filter((_, i) => i !== idx);
                                                                const total = newPaidBy.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
                                                                setNewExpense({ ...newExpense, paidBy: newPaidBy, amount: total > 0 ? total.toString() : newExpense.amount });
                                                                setFieldErrors(prev => {
                                                                    const next = { ...prev };
                                                                    Object.keys(next).forEach(k => { if(k.startsWith('paidBy_')) delete next[k]; });
                                                                    return next;
                                                                });
                                                            }}
                                                            className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all shrink-0"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-12 h-12"></div>
                                                    )}
                                                </div>
                                                {(fieldErrors[`paidBy_${idx}_amount`] || fieldErrors[`paidBy_${idx}_id`]) && (
                                                    <p className="text-[10px] text-red-600 font-medium pl-1">
                                                        {fieldErrors[`paidBy_${idx}_amount`] || fieldErrors[`paidBy_${idx}_id`]}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Split Method</label>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button 
                                            type="button"
                                            onClick={() => setNewExpense({ ...newExpense, splitType: 'equally' })}
                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${newExpense.splitType === 'equally' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Equally
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setNewExpense({ ...newExpense, splitType: 'custom' })}
                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${newExpense.splitType === 'custom' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                {newExpense.splitType === 'equally' && (
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 mt-4">
                                        {billDetails.involvedPersons.map(p => {
                                            const activeCount = billDetails.involvedPersons.length;
                                            const totalAmt = parseFloat(newExpense.amount) || 0;
                                            const splitAmt = activeCount > 0 ? (totalAmt / activeCount).toFixed(2) : '0.00';
                                            return (
                                                <div
                                                    key={p.id}
                                                    className="p-3 rounded-xl flex items-center justify-between border-2 border-transparent bg-gray-50 opacity-80"
                                                >
                                                    <span className="text-sm font-bold text-gray-600">{p.nickname || p.first_name}</span>
                                                    <span className="text-xs font-black text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                                                        ₱{splitAmt}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {newExpense.splitType === 'custom' && (
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 mt-4">
                                        {billDetails.involvedPersons.map(p => {
                                            const isChecked = newExpense.splitWith.includes(p.id);
                                            const activeCount = newExpense.splitWith.length;
                                            const totalAmt = parseFloat(newExpense.amount) || 0;
                                            const splitAmt = activeCount > 0 ? (totalAmt / activeCount).toFixed(2) : '0.00';
                                            return (
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
                                                    className={`p-3 rounded-xl flex items-center justify-between border-2 transition-all ${isChecked ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                                >
                                                    <span className={`text-sm font-bold ${isChecked ? 'text-indigo-900' : 'text-gray-600'}`}>{p.nickname || p.first_name}</span>
                                                    {isChecked && (
                                                        <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                                                            ₱{splitAmt}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
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
                                    onChange={e => {
                                        setNewExpense({ ...newExpense, name: e.target.value });
                                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    className={`w-full px-6 py-4 border rounded-2xl transition-all font-bold text-lg ${
                                        fieldErrors.name ? 'bg-red-50 border-red-500 focus:ring-red-500/10' : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5'
                                    }`}
                                />
                                {fieldErrors.name && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.name}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Payer Details</label>
                                <div className="space-y-4">
                                                    {newExpense.paidBy.map((payer, idx) => {
                                                        // Unique Payer Selection Logic
                                                        const selectedPayerIds = newExpense.paidBy.map(p => String(p.id)).filter((id, i) => i !== idx && id !== '');
                                                        const availablePersons = billDetails?.involvedPersons.filter(p => !selectedPayerIds.includes(String(p.id)));

                                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex gap-2 items-center">
                                                    <div className="relative w-32 shrink-0">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs">₱</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={payer.amount}
                                                            onChange={e => {
                                                                const newPaidBy = [...newExpense.paidBy];
                                                                newPaidBy[idx].amount = e.target.value;
                                                                const total = newPaidBy.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
                                                                setNewExpense({ ...newExpense, paidBy: newPaidBy, amount: total > 0 ? total.toString() : newExpense.amount });
                                                                if (fieldErrors[`paidBy_${idx}_amount`]) setFieldErrors(prev => ({ ...prev, [`paidBy_${idx}_amount`]: '' }));
                                                            }}
                                                            className={`w-full pl-8 pr-4 py-4 border rounded-2xl transition-all font-black text-sm tabular-nums ${
                                                                fieldErrors[`paidBy_${idx}_amount`] ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100'
                                                            }`}
                                                        />
                                                    </div>

                                                    <select
                                                        className={`flex-1 px-4 py-4 border rounded-2xl transition-all font-bold text-gray-900 appearance-none text-sm ${
                                                            fieldErrors[`paidBy_${idx}_id`] ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100'
                                                        }`}
                                                        value={payer.id}
                                                        onChange={e => {
                                                            const newPaidBy = [...newExpense.paidBy];
                                                            newPaidBy[idx].id = e.target.value;
                                                            setNewExpense({ ...newExpense, paidBy: newPaidBy });
                                                            if (fieldErrors[`paidBy_${idx}_id`]) setFieldErrors(prev => ({ ...prev, [`paidBy_${idx}_id`]: '' }));
                                                        }}
                                                    >
                                                        <option value="">Select Person</option>
                                                        {availablePersons?.map(p => (
                                                            <option key={p.id} value={p.id}>{p.nickname || p.first_name}</option>
                                                        ))}
                                                    </select>

                                                    {idx === newExpense.paidBy.length - 1 && newExpense.paidBy.length < (isStandard ? 3 : (billDetails?.involvedPersons.length || 0)) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setNewExpense({ ...newExpense, paidBy: [...newExpense.paidBy, { id: '', amount: '' }] });
                                                            }}
                                                            className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all shrink-0"
                                                        >
                                                            <Plus size={20} />
                                                        </button>
                                                    ) : newExpense.paidBy.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newPaidBy = newExpense.paidBy.filter((_, i) => i !== idx);
                                                                const total = newPaidBy.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
                                                                setNewExpense({ ...newExpense, paidBy: newPaidBy, amount: total > 0 ? total.toString() : newExpense.amount });
                                                                setFieldErrors(prev => {
                                                                    const next = { ...prev };
                                                                    Object.keys(next).forEach(k => { if(k.startsWith('paidBy_')) delete next[k]; });
                                                                    return next;
                                                                });
                                                            }}
                                                            className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all shrink-0"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-12 h-12"></div>
                                                    )}
                                                </div>
                                                {(fieldErrors[`paidBy_${idx}_amount`] || fieldErrors[`paidBy_${idx}_id`]) && (
                                                    <p className="text-[10px] text-red-600 font-medium pl-1">
                                                        {fieldErrors[`paidBy_${idx}_amount`] || fieldErrors[`paidBy_${idx}_id`]}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Split Method</label>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button 
                                            type="button"
                                            onClick={() => setNewExpense({ ...newExpense, splitType: 'equally' })}
                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${newExpense.splitType === 'equally' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Equally
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setNewExpense({ ...newExpense, splitType: 'custom' })}
                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${newExpense.splitType === 'custom' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                {newExpense.splitType === 'equally' && (
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 mt-4">
                                        {billDetails.involvedPersons.map(p => {
                                            const activeCount = billDetails.involvedPersons.length;
                                            const totalAmt = parseFloat(newExpense.amount) || 0;
                                            const splitAmt = activeCount > 0 ? (totalAmt / activeCount).toFixed(2) : '0.00';
                                            return (
                                                <div
                                                    key={p.id}
                                                    className="p-3 rounded-xl flex items-center justify-between border-2 border-transparent bg-gray-50 opacity-80"
                                                >
                                                    <span className="text-sm font-bold text-gray-600">{p.nickname || p.first_name}</span>
                                                    <span className="text-xs font-black text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                                                        ₱{splitAmt}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {newExpense.splitType === 'custom' && (
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 mt-4">
                                        {billDetails.involvedPersons.map(p => {
                                            const isChecked = newExpense.splitWith.includes(p.id);
                                            const activeCount = newExpense.splitWith.length;
                                            const totalAmt = parseFloat(newExpense.amount) || 0;
                                            const splitAmt = activeCount > 0 ? (totalAmt / activeCount).toFixed(2) : '0.00';
                                            return (
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
                                                    className={`p-3 rounded-xl flex items-center justify-between border-2 transition-all ${isChecked ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                                >
                                                    <span className={`text-sm font-bold ${isChecked ? 'text-indigo-900' : 'text-gray-600'}`}>{p.nickname || p.first_name}</span>
                                                    {isChecked && (
                                                        <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                                                            ₱{splitAmt}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all">Update Expense</button>
                        </form>
                    </div>
                </div>
            )}

            {showViewExpenseModal && viewingExpense && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative">
                        <div className="absolute top-8 right-8 flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowViewExpenseMenu(!showViewExpenseMenu)}
                                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <MoreVertical size={20} />
                                </button>
                                {showViewExpenseMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 py-2 animate-in fade-in zoom-in-95 duration-200">
                                        <button
                                            onClick={() => {
                                                setShowViewExpenseMenu(false);
                                                setShowViewExpenseModal(false);
                                                // Trigger edit logic
                                                let initialPaidBy = [];
                                                if (viewingExpense.payers && viewingExpense.payers.length > 0) {
                                                    initialPaidBy = viewingExpense.payers.map((p: any) => ({
                                                        id: p.guest_user_id ? `guest_${p.guest_user_id}` : p.user_id,
                                                        amount: p.amount ? p.amount.toString() : ''
                                                    }));
                                                } else {
                                                    initialPaidBy = [{ id: viewingExpense.paid_by_id, amount: viewingExpense.total_amount.toString() }];
                                                }
                                                setNewExpense({
                                                    name: viewingExpense.expense_name,
                                                    amount: viewingExpense.total_amount.toString(),
                                                    paidBy: initialPaidBy,
                                                    splitType: viewingExpense.split_type,
                                                    splitWith: viewingExpense.involved_person_ids
                                                });
                                                setEditingExpenseId(viewingExpense.id);
                                                setShowEditExpenseModal(true);
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs font-black text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowViewExpenseMenu(false);
                                                setShowViewExpenseModal(false);
                                                handleDeleteExpense(viewingExpense.id);
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs font-black text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => {
                                    setShowViewExpenseModal(false);
                                    setShowViewExpenseMenu(false);
                                }} 
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-center mb-10 mt-4">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <Receipt size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{viewingExpense.expense_name}</h2>
                            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">{new Date(viewingExpense.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                        </div>

                        <div className="space-y-8">
                            <div className="text-center bg-gray-50 rounded-3xl p-8 border border-gray-100/50">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Amount</p>
                                <p className="text-5xl font-black text-gray-900 tabular-nums tracking-tighter">₱{viewingExpense.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payer Details</h4>
                                <div className="space-y-3">
                                    {viewingExpense.payers && viewingExpense.payers.length > 0 ? (
                                        viewingExpense.payers.map((p: any, idx) => {
                                            const person = billDetails.involvedPersons.find(ip => (p.guest_user_id ? ip.guest_user_id === p.guest_user_id : ip.user_id === p.user_id));
                                            return (
                                                <div key={idx} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                                    <span className="font-bold text-gray-900">{person?.nickname || 'Unknown'}</span>
                                                    <span className="font-black text-indigo-600 tabular-nums">₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                            <span className="font-bold text-gray-900">
                                                {billDetails.involvedPersons.find(p => p.id === viewingExpense.paid_by_id)?.nickname || 'Unknown'}
                                            </span>
                                            <span className="font-black text-indigo-600 tabular-nums">₱{viewingExpense.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Split Breakdown</h4>
                                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-widest">
                                        {viewingExpense.split_type}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {viewingExpense.involved_person_ids.map(pid => {
                                        const p = billDetails.involvedPersons.find(ip => ip.id === pid);
                                        const share = viewingExpense.total_amount / viewingExpense.involved_person_ids.length;
                                        return (
                                            <div key={pid} className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl border border-transparent">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 uppercase">
                                                        {p?.nickname?.[0] || '?'}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-600">{p?.nickname || 'Unknown'}</span>
                                                </div>
                                                <span className="text-xs font-black text-gray-400 tabular-nums">₱{share.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
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
                                    onChange={e => {
                                        setNewBillName(e.target.value);
                                        if (fieldErrors.billName) setFieldErrors(prev => ({ ...prev, billName: '' }));
                                    }}
                                    className={`w-full px-6 py-4 border rounded-2xl transition-all font-bold text-lg ${
                                        fieldErrors.billName ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100'
                                    }`}
                                />
                                {fieldErrors.billName && (
                                    <p className="mt-1 text-[10px] text-red-600 font-medium">{fieldErrors.billName}</p>
                                )}
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
            {/* Summary Modal */}
            {showSummaryModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[500] p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Bill Summary Statement</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{bill.bill_name} • {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => window.print()}
                                    className="px-6 py-3 bg-white border border-gray-200 text-gray-900 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 shadow-sm transition-all"
                                >
                                    Print Statement
                                </button>
                                <button onClick={() => setShowSummaryModal(false)} className="p-3 bg-gray-200/50 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-600 transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 print:p-0">
                            {/* Section 1: All Expenses */}
                            <section>
                                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <Receipt size={14} /> Expense Ledger
                                </h3>
                                <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid By</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billDetails.expenses.map((exp, idx) => {
                                                const payerNames = exp.payers 
                                                    ? exp.payers.map(pr => {
                                                        const p = billDetails.involvedPersons.find(ip => (pr.user_id ? ip.user_id === pr.user_id : ip.guest_user_id === pr.guest_user_id));
                                                        return p?.nickname || 'Someone';
                                                      }).join(', ')
                                                    : billDetails.involvedPersons.find(p => p.id === exp.paid_by_id)?.nickname || 'Someone';
                                                
                                                return (
                                                    <tr key={idx} className="border-b border-gray-50 group hover:bg-indigo-50/20 transition-all">
                                                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{new Date(exp.created_at).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 text-sm font-black text-gray-900">{exp.expense_name}</td>
                                                        <td className="px-6 py-4 text-xs font-black text-indigo-600">{payerNames}</td>
                                                        <td className="px-6 py-4 text-sm font-black text-gray-900 text-right tabular-nums">₱{exp.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-900 text-white">
                                                <td colSpan={3} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Total Expenditure</td>
                                                <td className="px-6 py-5 text-xl font-black text-right tabular-nums">
                                                    ₱{billDetails.expenses.reduce((sum, e) => sum + e.total_amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </section>

                            {/* Section 2: Contribution Breakdown */}
                            <section>
                                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <UserPlus size={14} /> Member Contributions
                                </h3>
                                <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Fair Share</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billDetails.involvedPersons.map((person, idx) => {
                                                const paid = billDetails.expenses.reduce((sum, exp) => {
                                                    if (exp.payers) {
                                                        const myPayerRecord = exp.payers.find(pr => (person.user_id ? pr.user_id === person.user_id : pr.guest_user_id === person.guest_user_id));
                                                        return sum + (myPayerRecord ? Number(myPayerRecord.amount) : 0);
                                                    } else {
                                                        return sum + (String(exp.paid_by_id) === String(person.id) ? Number(exp.total_amount) : 0);
                                                    }
                                                }, 0);

                                                const share = billDetails.expenses.reduce((sum, exp) => {
                                                    if (exp.involved_person_ids.includes(person.id)) {
                                                        if (exp.splits && exp.splits.length > 0 && exp.split_type === 'custom') {
                                                            const mySplit = exp.splits.find(s => (person.user_id ? s.user_id === person.user_id : s.guest_user_id === person.guest_user_id));
                                                            return sum + (mySplit ? Number(mySplit.amount) : 0);
                                                        } else {
                                                            return sum + (exp.total_amount / exp.involved_person_ids.length);
                                                        }
                                                    }
                                                    return sum;
                                                }, 0);

                                                const balance = paid - share;

                                                return (
                                                    <tr key={idx} className="border-b border-gray-50 group hover:bg-indigo-50/10 transition-all">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-[10px]">
                                                                    {(person.nickname || person.first_name || 'U').substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-gray-900">{person.nickname || person.first_name}</p>
                                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{person.is_guest ? 'Guest' : 'Member'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-sm font-black text-green-600 tabular-nums">
                                                            ₱{paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-sm font-black text-indigo-600 tabular-nums">
                                                            ₱{share.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${balance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {balance >= 0 ? 'To Receive' : 'To Pay'}
                                                            </span>
                                                        </td>
                                                        <td className={`px-6 py-4 text-right text-sm font-black tabular-nums ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                            ₱{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Section 3: Final Suggested Payments */}
                            <section>
                                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <DollarSign size={14} /> Settlement Plan
                                </h3>
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {computedDebts.filter(d => d.amount > 0.01).length > 0 ? (
                                        computedDebts.filter(d => d.amount > 0.01).map((debt, index) => (
                                            <div key={index} className="flex items-center justify-between p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
                                                <div className="flex items-center gap-6 flex-1">
                                                    <div className="text-center">
                                                        <p className="text-xs font-black text-gray-900 mb-1">{debt.fromName}</p>
                                                        <span className="text-[8px] font-black text-gray-400 uppercase px-2 py-0.5 bg-white rounded-full border border-gray-100">Debtor</span>
                                                    </div>
                                                    <div className="flex-1 h-[1px] bg-indigo-200 relative">
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full border border-indigo-100 shadow-sm">
                                                            <DollarSign size={14} className="text-indigo-600" />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-black text-gray-900 mb-1">{debt.toName}</p>
                                                        <span className="text-[8px] font-black text-gray-400 uppercase px-2 py-0.5 bg-white rounded-full border border-gray-100">Creditor</span>
                                                    </div>
                                                </div>
                                                <div className="ml-12 text-right">
                                                    <p className="text-2xl font-black text-indigo-600 tabular-nums">₱{debt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Recommended Transfer</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-green-50 rounded-[3rem] border-2 border-dashed border-green-200">
                                            <Check size={48} className="text-green-500 mx-auto mb-4" />
                                            <h4 className="text-xl font-black text-green-700 uppercase tracking-tighter">Perfectly Balanced</h4>
                                            <p className="text-sm font-bold text-green-600 uppercase tracking-widest mt-2">All debts have been cleared</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillDetailPage;
