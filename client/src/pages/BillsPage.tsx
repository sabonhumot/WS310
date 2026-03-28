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
    Plus,
    MoreVertical,
    Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Bill, InvolvedPerson, Expense, GuestData } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmationModal from '../components/common/ConfirmationModal';

const BillsPage: React.FC = () => {
    const { user, guestUser, login, logoutGuest, isLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [hasOpenedUrlBill, setHasOpenedUrlBill] = useState(false);
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    // Guest Upgrade State
    const [showGuestUpgradeModal, setShowGuestUpgradeModal] = useState(false);
    const [guestUpgradeForm, setGuestUpgradeForm] = useState({
        password: '',
        confirmPassword: ''
    });
    const [isUpgradingGuest, setIsUpgradingGuest] = useState(false);

    const CACHE_KEY = "bills_page_data";
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [billDetails, setBillDetails] = useState<{ involvedPersons: InvolvedPerson[], expenses: Expense[], settlements: any[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'Persons' | 'Overview' | 'Payment'>('Overview');

    // Settlement Payment State
    const [showPayModal, setShowPayModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentTarget, setPaymentTarget] = useState<{ fromId: string | number, toId: string | number, fromName: string, toName: string, amount: number } | null>(null);
    const [openExpenseDropdown, setOpenExpenseDropdown] = useState<number | null>(null);

    // Edit Expense State
    const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
    const [newBillName, setNewBillName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isJoiningCode, setIsJoiningCode] = useState(false);
    const [showAddPersonToExpenseModal, setShowAddPersonToExpenseModal] = useState(false);
    const [openDropdownMenuId, setOpenDropdownMenuId] = useState<string | number | null>(null);

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

    // Confirmation Modal State
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

    useEffect(() => {
        if (isLoading) return;

        // Handle guest session expiry tracking
        let expiryInterval: any;
        if (guestUser?.expiry) {
            const checkExpiry = () => {
                const now = new Date().getTime();
                if (now > guestUser.expiry!) {
                    toast.error("Your guest session has expired. Please log in or join again.");
                    logoutGuest();
                    navigate('/');
                }
            };

            checkExpiry(); // Check immediately
            expiryInterval = setInterval(checkExpiry, 60000); // Check every minute
        }

        if (!user && !guestUser) {
            navigate('/login');
            return;
        }

        return () => {
            if (expiryInterval) {
                clearInterval(expiryInterval);
            }
        };
    }, [isLoading, guestUser, user, logoutGuest, navigate]);

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

    const resetPersonForm = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowGuestForm(false);
        setGuestData({
            firstName: '',
            lastName: '',
            nickname: '',
            email: ''
        });
    };

    const addPersonToBill = async (person: any) => {
        const isGuest = person.is_guest === 1;
        if (involvedPersons.some(p => (isGuest ? p.id === person.id && p.is_guest : p.user_id === person.id && !p.is_guest))) {
            toast.error('Person already added');
            return;
        }

        if (selectedBill) {
            try {
                const response = await fetch(`http://localhost:5001/api/bills/${selectedBill.id}/involved-persons`, {
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
                await response.json();

                // Refresh bill details
                handleViewBill(selectedBill);
                toast.success('Person added to bill');
                resetPersonForm();
                setShowAddPersonToExpenseModal(false);
                return;
            } catch (error: any) {
                toast.error(error.message);
                return;
            }
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

    const addGuestToBill = async () => {
        if (!guestData.firstName || !guestData.lastName || !guestData.nickname || !guestData.email) {
            toast.error('Please fill in all guest fields');
            return;
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestData.email)) {
            toast.error('Invalid email format');
            return;
        }

        if (selectedBill) {
            try {
                const response = await fetch(`http://localhost:5001/api/bills/${selectedBill.id}/involved-persons`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        guest_data: {
                            first_name: guestData.firstName,
                            last_name: guestData.lastName,
                            email: guestData.email,
                            nickname: guestData.nickname
                        },
                        created_by: user?.id
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to add guest');
                }

                // Refresh bill details
                handleViewBill(selectedBill);
                toast.success('Guest added to bill');
                resetPersonForm();
                setShowAddPersonToExpenseModal(false);
                return;
            } catch (error: any) {
                toast.error(error.message);
                return;
            }
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
        if (!user && !guestUser) return;
        try {
            if (user) {
                const response = await fetch(`http://localhost:5001/api/bills/${user.id}`);
                const data = await response.json();
                setBills(data.bills || []);
            } else if (guestUser) {
                const response = await fetch(`http://localhost:5001/api/guests/${guestUser.id}/bills`);
                const data = await response.json();
                setBills(data.bills || []);
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
            toast.error('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, [user, guestUser]);

    useEffect(() => {
        const urlBillId = searchParams.get('billId');
        if (urlBillId && !hasOpenedUrlBill && bills.length > 0) {
            const bill = bills.find(b => b.id.toString() === urlBillId);
            if (bill) {
                handleViewBill(bill);
                setHasOpenedUrlBill(true);
            }
        }
    }, [searchParams, bills, hasOpenedUrlBill]);

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
                involvedPersons: data.involvedPersons || [],
                expenses: data.expenses || [],
                settlements: data.settlements || []
            });
            // Also update the local involvedPersons for the expense modal
            setInvolvedPersons(data.involvedPersons);
            setNewExpense(prev => ({ ...prev, paidBy: user?.id || data.involvedPersons[0]?.id || '' }));
            setActiveTab('Overview'); // Reset view tab to default
            setShowViewModal(true);
        } catch (error) {
            console.error('Error fetching bill details:', error);
            toast.error('Failed to load bill details');
        }
    };

    const handleJoinByCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode || joinCode.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setIsJoiningCode(true);
        try {
            const response = await fetch('http://localhost:5001/api/bills/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invite_code: joinCode,
                    first_name: guestUser?.first_name,
                    last_name: guestUser?.last_name,
                    email: guestUser?.email,
                    nickname: guestUser?.nickname
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Failed to join bill");
            } else {
                toast.success("Successfully joined the bill!");
                setJoinCode('');
                fetchBills();
            }
        } catch (error) {
            toast.error("Connection error");
        } finally {
            setIsJoiningCode(false);
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
        setConfirmModal({
            isOpen: true,
            title: 'Delete Bill',
            message: 'Are you sure you want to delete this bill? This action cannot be undone.',
            confirmText: 'Delete',
            confirmVariant: 'danger',
            onConfirm: async () => {
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
        });
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

    const copyInviteLink = (token: string) => {
        const fullLink = `${window.location.origin}/invite?token=${token}`;
        navigator.clipboard.writeText(fullLink);
        toast.success("Invitation link copied to clipboard");
    };

    const handleGuestUpgrade = async (e: React.FormEvent) => {
        e.preventDefault();

        if (guestUpgradeForm.password !== guestUpgradeForm.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (guestUpgradeForm.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsUpgradingGuest(true);

        try {
            const response = await fetch(`http://localhost:5001/api/users/upgrade-guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guest_id: guestUser?.id,
                    first_name: guestUser?.first_name,
                    last_name: guestUser?.last_name,
                    email: guestUser?.email,
                    password: guestUpgradeForm.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Failed to upgrade guest account");
                setIsUpgradingGuest(false);
                return;
            }

            // Success! Upgrade the user session
            toast.success("Account created successfully! You are now a registered user.");
            setShowGuestUpgradeModal(false);

            // Re-login as the real user
            login(data.user);

        } catch (error: any) {
            toast.error(error.message || "Internal server error");
            setIsUpgradingGuest(false);
        }
    };

    // ============================
    // Deletion Handlers
    // ============================
    const handleDeletePerson = async (personId: string | number) => {
        if (!selectedBill) return;

        setConfirmModal({
            isOpen: true,
            title: 'Remove Member',
            message: 'Are you sure you want to remove this person from the bill?',
            confirmText: 'Remove',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5001/api/bills/${selectedBill.id}/persons/${personId}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();

                    if (!response.ok) {
                        toast.error(data.message || 'Failed to remove person');
                        return;
                    }

                    toast.success('Person removed successfully');
                    handleViewBill(selectedBill);
                } catch (error) {
                    console.error('Error removing person:', error);
                    toast.error('Failed to remove person');
                }
            }
        });
    };

    const handleDeleteExpense = async (expenseId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Expense',
            message: 'Are you sure you want to delete this expense? This action cannot be undone.',
            confirmText: 'Delete',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5001/api/expenses/${expenseId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        toast.error('Failed to delete expense');
                        return;
                    }

                    toast.success('Expense deleted successfully');
                    if (selectedBill) handleViewBill(selectedBill);
                } catch (error) {
                    console.error('Error deleting expense:', error);
                    toast.error('Failed to delete expense');
                }
            }
        });
    };

    // ============================
    // Settlement Calculation Logic
    // ============================
    const calculateDebts = () => {
        if (!billDetails) return [];

        const pairwiseBalances: Record<string, Record<string, number>> = {};

        billDetails.involvedPersons.forEach(p1 => {
            const id1 = String(p1.id);
            pairwiseBalances[id1] = {};
            billDetails.involvedPersons.forEach(p2 => {
                pairwiseBalances[id1][String(p2.id)] = 0;
            });
        });

        // 1. Process Expenses: Person who paid is owed money by whoever they split it with
        billDetails.expenses.forEach(exp => {
            const payerId = String(exp.paid_by_id);

            if (exp.splits) {
                exp.splits.forEach((split: any) => {
                    const splitUserId = split.guest_user_id ? `guest_${split.guest_user_id}` : String(split.user_id);
                    if (splitUserId === payerId) return; // You don't owe yourself

                    if (pairwiseBalances[splitUserId] && pairwiseBalances[splitUserId][payerId] !== undefined) {
                        pairwiseBalances[splitUserId][payerId] += Number(split.amount);
                    }
                });
            }
        });

        // 2. Process Settlements: Paying off a debt
        if (billDetails.settlements) {
            billDetails.settlements.forEach((settle: any) => {
                const payerId = String(settle.paid_by_id);
                const payeeId = String(settle.paid_to_id);

                if (pairwiseBalances[payerId] && pairwiseBalances[payerId][payeeId] !== undefined) {
                    pairwiseBalances[payerId][payeeId] -= Number(settle.amount);
                }
            });
        }

        // 3. Compute net debts between each unique pair
        const debts: any[] = [];
        const processedPairs = new Set<string>();

        billDetails.involvedPersons.forEach(p1 => {
            billDetails.involvedPersons.forEach(p2 => {
                const id1 = String(p1.id);
                const id2 = String(p2.id);
                if (id1 === id2) return;

                const pairKey = [id1, id2].sort().join('-');
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                const p1OwesP2 = pairwiseBalances[id1][id2] || 0;
                const p2OwesP1 = pairwiseBalances[id2][id1] || 0;

                const netAmount = p1OwesP2 - p2OwesP1;

                if (Math.abs(netAmount) > 0.01) {
                    const debtorId = netAmount > 0 ? id1 : id2;
                    const creditorId = netAmount > 0 ? id2 : id1;
                    const amount = Math.abs(netAmount);

                    const fromPerson = billDetails.involvedPersons.find(p => String(p.id) === debtorId);
                    const toPerson = billDetails.involvedPersons.find(p => String(p.id) === creditorId);

                    if (fromPerson && toPerson) {
                        debts.push({
                            fromId: fromPerson.id,
                            toId: toPerson.id,
                            fromName: fromPerson.nickname || fromPerson.first_name,
                            toName: toPerson.nickname || toPerson.first_name,
                            amount: amount
                        });
                    }
                }
            });
        });

        return debts.sort((a, b) => b.amount - a.amount);
    };

    // Recalculate anytime billDetails changes
    const computedDebts = React.useMemo(() => calculateDebts(), [billDetails]);

    const activityHistory = React.useMemo(() => {
        if (!billDetails) return [];

        const pairwiseBalances: Record<string, Record<string, number>> = {};
        billDetails.involvedPersons.forEach(p1 => {
            const id1 = String(p1.id);
            pairwiseBalances[id1] = {};
            billDetails.involvedPersons.forEach(p2 => {
                pairwiseBalances[id1][String(p2.id)] = 0;
            });
        });

        // Add expenses
        billDetails.expenses.forEach(exp => {
            const payerId = String(exp.paid_by_id);
            if (exp.splits) {
                exp.splits.forEach((split: any) => {
                    const splitUserId = split.guest_user_id ? `guest_${split.guest_user_id}` : String(split.user_id);
                    if (splitUserId === payerId) return; // Ignore self-splits
                    if (pairwiseBalances[splitUserId] && pairwiseBalances[splitUserId][payerId] !== undefined) {
                        pairwiseBalances[splitUserId][payerId] += Number(split.amount);
                    }
                });
            }
        });

        // Add settlements (offsets)
        if (billDetails.settlements) {
            billDetails.settlements.forEach((settle: any) => {
                const payerId = String(settle.paid_by_id);
                const payeeId = String(settle.paid_to_id);
                if (pairwiseBalances[payerId] && pairwiseBalances[payerId][payeeId] !== undefined) {
                    pairwiseBalances[payerId][payeeId] -= Number(settle.amount);
                }
            });
        }

        const activities: any[] = [];

        // 1. Map all expenses to debt transactions
        billDetails.expenses.forEach(exp => {
            const payerId = String(exp.paid_by_id);
            const payerName = billDetails.involvedPersons.find(p => String(p.id) === payerId)?.nickname || "Unknown";

            if (exp.splits) {
                exp.splits.forEach((split: any) => {
                    const splitUserId = split.guest_user_id ? `guest_${split.guest_user_id}` : String(split.user_id);
                    if (splitUserId === payerId) return;

                    const debtorName = billDetails.involvedPersons.find(p => String(p.id) === splitUserId)?.nickname || "Unknown";

                    const remainingDebt = (pairwiseBalances[splitUserId]?.[payerId] || 0) - (pairwiseBalances[payerId]?.[splitUserId] || 0);
                    const isSettled = remainingDebt <= 0.01;

                    activities.push({
                        id: `exp_${exp.id}_${splitUserId}`,
                        type: 'debt',
                        date: new Date(exp.created_at),
                        amount: Number(split.amount),
                        title: `${debtorName} owes ${payerName}`,
                        subtitle: `for ${exp.expense_name}`,
                        status: isSettled ? 'Settled' : 'Pending',
                        fromId: splitUserId,
                        toId: payerId,
                        fromName: debtorName,
                        toName: payerName
                    });
                });
            }
        });

        // 2. Map all settlements
        if (billDetails.settlements) {
            billDetails.settlements.forEach((settle: any) => {
                const payerId = String(settle.paid_by_id);
                const payeeId = String(settle.paid_to_id);
                const payerName = billDetails.involvedPersons.find(p => String(p.id) === payerId)?.nickname || "Unknown";
                const payeeName = billDetails.involvedPersons.find(p => String(p.id) === payeeId)?.nickname || "Unknown";

                activities.push({
                    id: `set_${settle.id}`,
                    type: 'settlement',
                    date: new Date(settle.created_at),
                    amount: Number(settle.amount),
                    title: `${payerName} paid ${payeeName}`,
                    subtitle: 'Manual settlement',
                    status: 'Completed',
                    fromId: payerId,
                    toId: payeeId,
                    fromName: payerName,
                    toName: payeeName
                });
            });
        }

        return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [billDetails]);

    // ============================
    // Payment & Editing Submissions
    // ============================
    const handleSettlePayment = async () => {
        if (!selectedBill || !paymentTarget || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (amount > paymentTarget.amount) {
            toast.error('You cannot pay more than what you owe');
            return;
        }

        try {
            await fetch(`http://localhost:5001/api/bills/${selectedBill.id}/settlements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paid_by_id: paymentTarget.fromId,
                    paid_to_id: paymentTarget.toId,
                    amount: parseFloat(paymentAmount)
                })
            });
            toast.success('Payment recorded successfully!');
            setShowPayModal(false);
            setPaymentAmount('');
            setPaymentTarget(null);
            // Refresh bill
            handleViewBill(selectedBill);
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment');
        }
    };

    const handleEditExpenseSubmit = async () => {
        if (!selectedBill || !editingExpenseId || !newExpense.name || !newExpense.amount) {
            toast.error('Please fill in all expense fields');
            return;
        }

        try {
            await fetch(`http://localhost:5001/api/expenses/${editingExpenseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expense_name: newExpense.name,
                    total_amount: parseFloat(newExpense.amount),
                    paid_by: newExpense.paidBy,
                    split_type: newExpense.splitType,
                    split_with: newExpense.splitType === 'equally'
                        ? involvedPersons.map(p => p.id)
                        : newExpense.splitWith
                })
            });
            toast.success('Expense updated successfully');
            setShowEditExpenseModal(false);
            setEditingExpenseId(null);
            setNewExpense({ name: '', amount: '', paidBy: user?.id || '', splitType: 'equally', splitWith: [] });
            handleViewBill(selectedBill);
        } catch (error) {
            console.error('Error updating expense:', error);
            toast.error('Failed to update expense');
        }
    };

    const isGuestLoggedIn = !!guestUser;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 p-6 rounded-2xl shadow-sm border border-gray-50/50 backdrop-blur-xl group">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300">
                        {isGuestLoggedIn ? "Guest Access" : "Bills & Expenses"}
                    </h1>
                    <p className="text-sm font-bold text-gray-500 mt-1 flex items-center gap-2">
                        {isGuestLoggedIn ? (
                            <>
                                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                Temporary session ({Math.round(Math.max(0, ((guestUser?.expiry || 0) - new Date().getTime()) / (1000 * 60 * 60)))} hours remaining)
                            </>
                        ) : (
                            <>
                                Manage your shared expenses and settlements
                            </>
                        )}
                    </p>
                </div>
                {!isGuestLoggedIn && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="primary-button group flex items-center gap-2"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        New Bill
                    </button>
                )}
                {isGuestLoggedIn && (
                    <button
                        onClick={() => navigate('/register')}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black uppercase tracking-widest rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all text-sm shadow-lg shadow-orange-200"
                    >
                        Upgrade Account
                    </button>
                )}
            </header>


            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin">
                        <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                    </div>
                </div>
            ) : bills.length === 0 ? (
                <div className="glass-card p-20 text-center animate-in fade-in zoom-in duration-500">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 hover:bg-indigo-600 hover:text-white hover:scale-110 transition-all cursor-pointer shadow-lg shadow-indigo-100 group"
                        title="Create your first bill"
                    >
                        <PlusCircle className="w-10 h-10 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <p className="text-gray-900 text-xl font-bold mb-2">No bills yet</p>
                    <p className="text-gray-500 max-w-xs mx-auto">Start by creating your first bill and invite your friends to split expenses.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bills.map((bill: any) => {
                        let namesStr = "";
                        try {
                            const names = JSON.parse(bill.involved_names || "[]");
                            namesStr = names.join(", ");
                        } catch (e) { }

                        let recentExpenses = [];
                        try {
                            recentExpenses = JSON.parse(bill.recent_expenses || "[]");
                        } catch (e) { }

                        return (
                            <div
                                key={bill.id}
                                onClick={() => handleViewBill(bill)}
                                onMouseLeave={() => setOpenDropdownMenuId(null)}
                                className="glass-card p-6 cursor-pointer relative overflow-visible group hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col h-full"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1 pr-4">
                                        <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                            {bill.bill_name}
                                        </h3>
                                        <p className="text-sm font-bold text-gray-400 mt-1 line-clamp-1">
                                            {namesStr}
                                        </p>
                                    </div>

                                    <div className="relative z-10">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOpenDropdownMenuId(openDropdownMenuId === bill.id ? null : bill.id) }}
                                            className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors"
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {openDropdownMenuId === bill.id && (
                                            <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                <button onClick={(e) => { e.stopPropagation(); setOpenDropdownMenuId(null); handleViewBill(bill); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors">
                                                    <Eye size={16} className="text-indigo-400" /> View
                                                </button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownMenuId(null);
                                                    copyInviteLink(bill.share_token);
                                                }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors">
                                                    <Share2 size={16} className="text-indigo-400" /> Copy Invite Link
                                                </button>
                                                {bill.created_by === user?.id && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownMenuId(null); setEditingBill(bill); setNewBillName(bill.bill_name); setShowEditModal(true); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors">
                                                            <Edit2 size={16} className="text-indigo-400" /> Edit
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownMenuId(null); handleArchiveBill(bill.id); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2.5 transition-colors">
                                                            <Archive size={16} className="text-orange-400" /> Archive
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto flex-1">
                                    {bill.expense_count === 0 ? (
                                        <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 group-hover:border-indigo-100 transition-all mt-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invite Code</p>
                                                <p className="text-xl font-black text-gray-900 tabular-nums tracking-wider">{bill.invite_code}</p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyInviteLink(bill.share_token); }}
                                                className="p-3 bg-white text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-all"
                                                title="Copy code"
                                            >
                                                <Copy size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 mt-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Recent Expenses</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total {bill.expense_count}</p>
                                            </div>
                                            {recentExpenses.length > 0 ? recentExpenses.map((exp: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center py-2 px-3 bg-white border border-gray-50 rounded-lg">
                                                    <span className="text-xs font-bold text-gray-700 line-clamp-1 flex-1 pr-2">{exp.name}</span>
                                                    <span className="text-xs font-black text-gray-900 tabular-nums whitespace-nowrap">₱{parseFloat(exp.amount).toFixed(2)}</span>
                                                </div>
                                            )) : (
                                                <p className="text-xs font-medium text-gray-400 italic">No recent expenses found</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <p className="text-[10px] font-bold text-gray-400 inline-flex items-center gap-1.5">
                                        {new Date(bill.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals ... same as before but styled better */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl scale-in-95 animate-in duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Create Bill</h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewBillName('');
                                    setInvolvedPersons([{
                                        id: user!.id,
                                        nickname: user!.nickname,
                                        first_name: user!.first_name,
                                        last_name: user!.last_name,
                                        email: user!.email,
                                        is_guest: false,
                                        user_id: user!.id
                                    }]);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setShowGuestForm(false);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
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
                                        <div className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                                            <Search size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search registered users..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearchUsers(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-1">
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
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewBillName('');
                                        setInvolvedPersons([{
                                            id: user!.id,
                                            nickname: user!.nickname,
                                            first_name: user!.first_name,
                                            last_name: user!.last_name,
                                            email: user!.email,
                                            is_guest: false,
                                            user_id: user!.id
                                        }]);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setShowGuestForm(false);
                                    }}
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
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setNewBillName('');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bill Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Weekend at Tagaytay"
                                        value={newBillName}
                                        onChange={(e) => setNewBillName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black text-xl text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setNewBillName('');
                                    }}
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
                    <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-2xl animate-in scale-in-95 duration-300 max-h-[90vh] flex flex-col">

                        <div className="flex justify-between items-start mb-6 shrink-0">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900">{selectedBill.bill_name}</h2>
                                <div className="mt-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-flex items-center gap-2">
                                    INVITE CODE: <span className="text-indigo-900 tracking-widest text-xs">{selectedBill.invite_code}</span>
                                    <button onClick={(e) => { e.preventDefault(); copyInviteLink(selectedBill.share_token); }} className="hover:text-indigo-800"><Copy size={12} /></button>
                                </div>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors mt-1">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="flex border-b border-gray-100 mb-6 shrink-0">
                            {(['Persons', 'Overview', 'Payment'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-t-lg'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2 space-y-2">
                            {activeTab === 'Persons' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100 border-dashed">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900">Involved Persons</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Manage group members here</p>
                                        </div>
                                        {selectedBill.created_by === user?.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (showAddPersonToExpenseModal) resetPersonForm();
                                                    setShowAddPersonToExpenseModal(!showAddPersonToExpenseModal);
                                                }}
                                                className="text-[10px] px-3 py-2 bg-indigo-50 font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                            >
                                                {showAddPersonToExpenseModal ? <><X size={12} /> Cancel</> : <><UserPlus size={12} /> Add Person</>}
                                            </button>
                                        )}
                                    </div>

                                    {showAddPersonToExpenseModal && (
                                        <div className="p-5 bg-white rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-50/50 space-y-4 animate-in slide-in-from-top-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">New Member Options</h4>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setShowGuestForm(!showGuestForm); }}
                                                    className="text-[10px] font-bold text-gray-500 underline hover:text-gray-800"
                                                >
                                                    {showGuestForm ? 'Use Search instead' : 'Manual Guest Form'}
                                                </button>
                                            </div>

                                            {showGuestForm ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input placeholder="First Name" className="px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg outline-indigo-500 font-bold text-gray-700" value={guestData.firstName} onChange={e => setGuestData({ ...guestData, firstName: e.target.value })} />
                                                        <input placeholder="Last Name" className="px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg outline-indigo-500 font-bold text-gray-700" value={guestData.lastName} onChange={e => setGuestData({ ...guestData, lastName: e.target.value })} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input placeholder="Nickname" className="px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg outline-indigo-500 font-bold text-gray-700" value={guestData.nickname} onChange={e => setGuestData({ ...guestData, nickname: e.target.value })} />
                                                        <input placeholder="Email" className="px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg outline-indigo-500 font-bold text-gray-700" value={guestData.email} onChange={e => setGuestData({ ...guestData, email: e.target.value })} />
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-2">
                                                        <button onClick={() => { resetPersonForm(); setShowAddPersonToExpenseModal(false); }} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all">Cancel</button>
                                                        <button onClick={addGuestToBill} className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">Add Guest</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-3.5 flex items-center text-gray-400 pointer-events-none">
                                                            <Search size={14} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Search registered users..."
                                                            value={searchQuery}
                                                            onChange={(e) => handleSearchUsers(e.target.value)}
                                                            className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 text-sm font-bold"
                                                        />
                                                        {searchResults.length > 0 && (
                                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-1">
                                                                {searchResults.map(u => (
                                                                    <button key={`${u.is_guest ? 'guest' : 'user'}_${u.id}`} onClick={(e) => { e.preventDefault(); addPersonToBill(u); }} className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg flex items-center gap-3 transition-colors">
                                                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                                                            {(u.nickname || u.first_name || "U")[0]}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-gray-900">{u.nickname || u.first_name}</p>
                                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                                                                                {u.is_guest === 1 ? <span className="text-orange-500">Guest User</span> : `@${u.username}`}
                                                                            </p>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-end pt-3">
                                                        <button onClick={() => { resetPersonForm(); setShowAddPersonToExpenseModal(false); }} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {billDetails.involvedPersons.map((person: InvolvedPerson) => (
                                            <div key={person.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-sm uppercase shadow-inner border border-white">
                                                        {(person.nickname || person.first_name || "U")[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">
                                                            {person.nickname || `${person.first_name} ${person.last_name}`}
                                                        </p>
                                                        {person.is_guest && <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Guest Active</span>}
                                                    </div>
                                                </div>

                                                {selectedBill.created_by === user?.id && person.id !== user?.id && (
                                                    <button
                                                        onClick={() => handleDeletePerson(person.id)}
                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Remove from bill"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Overview' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col min-h-[50vh]">
                                    <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100 border-dashed">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900">Expenses</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Track what the group bought</p>
                                        </div>
                                        {selectedBill.created_by === user?.id && (
                                            <button
                                                onClick={() => {
                                                    setNewExpense({ name: '', amount: '', paidBy: user?.id || '', splitType: 'equally', splitWith: billDetails.involvedPersons.map(p => p.id) });
                                                    setShowExpenseModal(true);
                                                }}
                                                className="px-4 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                                            >
                                                <Plus size={14} /> Add Expense
                                            </button>
                                        )}
                                    </div>

                                    {billDetails.expenses.length > 0 ? (
                                        <div className="space-y-3 flex-1">
                                            {billDetails.expenses.map((expense: Expense) => (
                                                <div key={expense.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="font-black text-gray-900 text-lg">{expense.expense_name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                                                                    Paid by {billDetails.involvedPersons.find(p => p.id === expense.paid_by_id)?.nickname || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="font-black text-indigo-600 text-2xl tabular-nums">₱{expense.total_amount.toLocaleString()}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100 overflow-x-auto">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap px-1">Split with:</span>
                                                        <div className="flex gap-1.5 flex-nowrap">
                                                            {expense.involved_person_ids.map(pid => {
                                                                const p = billDetails.involvedPersons.find(ip => ip.id === pid);
                                                                return (
                                                                    <div key={pid} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded shadow-sm border border-gray-50 whitespace-nowrap">
                                                                        <div className="w-3 h-3 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-[7px] uppercase">{p?.nickname?.[0] || '?'}</div>
                                                                        <span className="text-gray-700 text-[10px] font-bold">{p?.nickname || 'Unknown'}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {selectedBill.created_by === user?.id && (
                                                        <div className="absolute top-4 right-4">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenExpenseDropdown(openExpenseDropdown === expense.id ? null : expense.id);
                                                                }}
                                                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                                            >
                                                                <MoreVertical size={20} />
                                                            </button>

                                                            {openExpenseDropdown === expense.id && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-20"
                                                                        onClick={() => setOpenExpenseDropdown(null)}
                                                                    />
                                                                    <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
                                                                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                                                                        >
                                                                            <Edit2 size={14} /> Edit Expense
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setOpenExpenseDropdown(null);
                                                                                handleDeleteExpense(expense.id);
                                                                            }}
                                                                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                                        >
                                                                            <Trash2 size={14} /> Delete Expense
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                <DollarSign size={24} className="text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 font-bold text-lg">No expenses recorded yet</p>
                                            <p className="text-xs text-gray-400 font-medium mt-1">Add an expense to start splitting the bill</p>
                                        </div>
                                    )}

                                    {/* Big Total Cost Box at Bottom */}
                                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-xl p-5 shadow-sm mt-auto shrink-0 flex justify-between items-center">
                                        <div>
                                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Whole Bill</p>
                                            <h3 className="text-sm font-black text-indigo-900">Total Cost</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-indigo-600 tabular-nums tracking-tight">₱{billDetails.expenses.reduce((sum, e) => sum + e.total_amount, 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}                             {activeTab === 'Payment' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 min-h-[40vh] flex flex-col">
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 border-dashed flex justify-between items-center">
                                        <div>
                                            <h3 className="text-sm font-black text-indigo-900">Activity History</h3>
                                            <p className="text-[10px] text-indigo-600/80 font-bold uppercase tracking-widest mt-0.5">All debt transactions in this bill</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[40vh] pr-2">
                                        {activityHistory.length > 0 ? (
                                            activityHistory.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-indigo-100 transition-all ${item.type === 'settlement' ? 'bg-green-50/20 border-green-100' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${item.type === 'settlement' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                            {item.type === 'settlement' ? <DollarSign size={14} /> : (item.fromName[0])}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 leading-tight">{item.title}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{item.subtitle}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-black text-sm tracking-tight ${item.type === 'settlement' ? 'text-green-600' : 'text-gray-900'}`}>
                                                            {item.type === 'settlement' ? '+ ' : ''}₱{item.amount.toLocaleString()}
                                                        </p>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${item.status === 'Settled' || item.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                                <RefreshCcw size={24} className="text-gray-300 mb-3" />
                                                <p className="text-sm font-bold text-gray-400">No transactions recorded yet</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Net Summary and Settle Up Button */}
                                    <div className="mt-auto pt-6 border-t border-gray-100 space-y-4">
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Settlement Summary</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Bill:</span>
                                                    <span className="text-sm font-black text-indigo-900">₱{billDetails.expenses.reduce((sum, e) => sum + e.total_amount, 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            {computedDebts.some(d => String(d.fromId) === String(user?.id) || String(d.fromId) === `guest_${guestUser?.id}`) && (
                                                <button
                                                    onClick={() => {
                                                        const firstDebt = computedDebts.find(d => String(d.fromId) === String(user?.id) || String(d.fromId) === `guest_${guestUser?.id}`);
                                                        if (firstDebt) {
                                                            setPaymentTarget({ ...firstDebt });
                                                            setPaymentAmount(firstDebt.amount.toFixed(2));
                                                            setShowPayModal(true);
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2 mb-1"
                                                >
                                                    <DollarSign size={14} /> Settle Up
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {computedDebts.length > 0 ? (
                                                computedDebts.map((debt, index) => (
                                                    <div key={index} className="flex justify-between items-center text-xs p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900">{debt.fromName}</span>
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">owes</span>
                                                            <span className="font-bold text-gray-900">{debt.toName}</span>
                                                        </div>
                                                        <p className="font-black text-indigo-600">₱{debt.amount.toLocaleString()}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="space-y-4 pt-1">
                                                    <div className="text-center py-4 text-xs font-bold text-green-600 bg-green-50 rounded-xl border border-green-100">
                                                        Everyone is settled up!
                                                    </div>
                                                    {billDetails?.created_by === user?.id && (
                                                        <button
                                                            onClick={handleArchiveBill}
                                                            disabled={isArchiving}
                                                            className="w-full py-3 bg-red-50 text-red-600 font-black rounded-xl border border-red-100 hover:bg-red-100 transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            {isArchiving ? <RefreshCcw size={14} className="animate-spin" /> : <Archive size={14} />}
                                                            {isArchiving ? 'Archiving...' : 'Archive Completed Bill'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="w-full md:w-auto px-12 py-3.5 bg-gray-900 text-white text-sm font-bold tracking-wide rounded-xl hover:bg-gray-800 shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-2">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Expense Modal */}
            {showEditExpenseModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in scale-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Edit Expense</h2>
                            <button
                                onClick={() => {
                                    setShowEditExpenseModal(false);
                                    setNewExpense({
                                        name: '',
                                        amount: '',
                                        paidBy: user?.id || '',
                                        splitType: 'equally',
                                        splitWith: billDetails?.involvedPersons.map(p => p.id) || []
                                    });
                                    setEditingExpenseId(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
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
                                            <div className="mt-4 space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-100 overflow-y-auto max-h-32">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Select who is splitting this:</p>
                                                {involvedPersons.map(p => (
                                                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={newExpense.splitWith.includes(p.id)}
                                                            onChange={(e) => {
                                                                const newSplitWith = e.target.checked
                                                                    ? [...newExpense.splitWith, p.id]
                                                                    : newExpense.splitWith.filter(id => id !== p.id);
                                                                setNewExpense({ ...newExpense, splitWith: newSplitWith });
                                                            }}
                                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm font-bold text-gray-700">{p.nickname}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-gray-50">
                                <button
                                    onClick={() => {
                                        setShowEditExpenseModal(false);
                                        setNewExpense({
                                            name: '',
                                            amount: '',
                                            paidBy: user?.id || '',
                                            splitType: 'equally',
                                            splitWith: billDetails?.involvedPersons.map(p => p.id) || []
                                        });
                                        setEditingExpenseId(null);
                                    }}
                                    className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditExpenseSubmit}
                                    className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settle Payment Modal */}
            {showPayModal && paymentTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in scale-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Settle Up</h2>
                            <button
                                onClick={() => {
                                    setShowPayModal(false);
                                    setPaymentAmount('');
                                    setPaymentTarget(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-lg uppercase shadow-inner">{paymentTarget.fromName[0]}</div>
                                <div className="text-gray-400"><RefreshCcw size={16} /></div>
                                <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-black text-lg uppercase shadow-inner">{paymentTarget.toName[0]}</div>
                            </div>
                            <p className="text-sm font-bold text-gray-500 mb-1">{paymentTarget.fromName} paying</p>
                            <p className="text-lg font-black text-gray-900">{paymentTarget.toName}</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Amount to Pay</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">₱</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-black text-2xl text-center"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowPayModal(false);
                                        setPaymentAmount('');
                                        setPaymentTarget(null);
                                    }}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSettlePayment}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-sm"
                                >
                                    Confirm Payment
                                </button>
                            </div>
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
                            <button
                                onClick={() => {
                                    setShowExpenseModal(false);
                                    setNewExpense({
                                        name: '',
                                        amount: '',
                                        paidBy: user?.id || '',
                                        splitType: 'equally',
                                        splitWith: billDetails?.involvedPersons.map(p => p.id) || []
                                    });
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
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
                                    onClick={() => {
                                        setShowExpenseModal(false);
                                        setNewExpense({
                                            name: '',
                                            amount: '',
                                            paidBy: user?.id || '',
                                            splitType: 'equally',
                                            splitWith: billDetails?.involvedPersons.map(p => p.id) || []
                                        });
                                    }}
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

            {showGuestUpgradeModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in scale-in-95 duration-300">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserPlus size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">Upgrade to Full Account</h2>
                            <p className="text-sm font-bold text-gray-500 mt-2">Create a registered account to keep access to your bills forever and split expenses across multiple groups.</p>
                        </div>

                        <form onSubmit={handleGuestUpgrade} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={guestUpgradeForm.password}
                                    onChange={(e) => setGuestUpgradeForm({ ...guestUpgradeForm, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold"
                                    placeholder="••••••••"
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={guestUpgradeForm.password}
                                    onChange={(e) => setGuestUpgradeForm({ ...guestUpgradeForm, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold"
                                    placeholder="••••••••"
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    value={guestUpgradeForm.confirmPassword}
                                    onChange={(e) => setGuestUpgradeForm({ ...guestUpgradeForm, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-indigo-500 font-bold"
                                    placeholder="••••••••"
                                    minLength={8}
                                />
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-gray-50 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowGuestUpgradeModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                                >
                                    Later
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpgradingGuest}
                                    className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                                >
                                    {isUpgradingGuest && <RefreshCcw className="w-4 h-4 animate-spin" />}
                                    {isUpgradingGuest ? 'Upgrading...' : 'Upgrade Now'}
                                </button>
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

export default BillsPage;
