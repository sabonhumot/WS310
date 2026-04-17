import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    PlusCircle,
    Copy,
    Edit2,
    Eye,
    Trash2,
    Archive,
    X,
    RefreshCcw,
    UserPlus,
    Search,
    Plus,
    MoreVertical,
    Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Bill, InvolvedPerson, GuestData } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmationModal from '../components/common/ConfirmationModal';

const BillsPage: React.FC = () => {
    const { user, guestUser, logoutGuest, isLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [hasOpenedUrlBill, setHasOpenedUrlBill] = useState(false);
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);


    // Guest Upgrade State
    const [showGuestUpgradeModal, setShowGuestUpgradeModal] = useState(false);
    const [guestUpgradeForm, setGuestUpgradeForm] = useState({
        password: '',
        confirmPassword: ''
    });
    const [isUpgradingGuest, setIsUpgradingGuest] = useState(false);

    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [newBillName, setNewBillName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isJoiningCode, setIsJoiningCode] = useState(false);
    const [billSearchQuery, setBillSearchQuery] = useState('');
    const [openDropdownMenuId, setOpenDropdownMenuId] = useState<number | null>(null);


    // Involved Persons Logic
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedSearchPerson, setSelectedSearchPerson] = useState<any | null>(null);
    const [involvedPersons, setInvolvedPersons] = useState<InvolvedPerson[]>([]);
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestData, setGuestData] = useState<GuestData>({
        firstName: '',
        lastName: '',
        nickname: '',
        email: ''
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
        // Allow empty query to fetch all default users
        try {
            const excludeParam = user ? `&exclude=${user.id}` : '';
            const response = await fetch(`http://localhost:5001/api/users/search?q=${query}${excludeParam}`);
            if (!response.ok) {
                const errText = await response.text();
                toast.error(errText.includes('<!DOCTYPE') ? 'Server error - search endpoint failed' : (errText || 'Search failed'));
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
            if (query.trim() && !(data.users || []).length) {
              setSearchResults([]);
              return;
            }
            const allUsers = data.users || [];
            if (query.trim() && allUsers.length === 0) {
                setSearchResults([]);
                return;
            }
            setSearchResults(allUsers.filter((u: any) => 
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
        if (!person) return;

        // Front-end limit checker for standard users creating a new bill (Creator + 2 Others = 3 total)
        if (user && user.user_type_id === 1 && involvedPersons.length >= 3) {
            toast.error('Standard users can have a maximum of 3 members total per bill.');
            return;
        }

        const isGuest = person.is_guest === 1;
        if (involvedPersons.some(p => (isGuest ? p.id === person.id && p.is_guest : p.user_id === person.id && !p.is_guest))) {
            toast.error('Person already added');
            return;
        }


        setInvolvedPersons([...involvedPersons, {
            id: person.id,
            nickname: person.nickname,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            is_guest: isGuest,
            user_id: isGuest ? null : person.id,
            guest_user_id: isGuest ? person.id : null
        }]);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedSearchPerson(null);
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

        if (user && user.user_type_id === 1 && involvedPersons.length >= 3) {
            toast.error('Standard users can have a maximum of 3 members total per bill.');
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

    const handleViewBill = (bill: Bill) => {
        navigate(`/bills/${bill.id}`);
    };

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Invite code copied!');
    };

    const handleArchiveBill = (billId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Archive Bill',
            message: 'Are you sure you want to archive this bill? You can still view it in the activity section but won\'t be able to add new expenses.',
            confirmVariant: 'primary',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5001/api/bills/${billId}/archive`, {
                        method: 'PATCH'
                    });
                    if (response.ok) {
                        toast.success('Bill archived');
                        fetchBills();
                    }
                } catch (error) {
                    toast.error('Failed to archive bill');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteBill = (billId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Bill',
            message: 'Are you sure you want to delete this bill? This action cannot be undone.',
            confirmText: 'Delete',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5001/api/bills/${billId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        toast.success('Bill deleted successfully');
                        fetchBills();
                    }
                } catch (error) {
                    console.error('Error deleting bill:', error);
                    toast.error('Failed to delete bill');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
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
            const response = await fetch('http://localhost:5001/api/bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    created_by: user.id,
                    bill_name: newBillName,
                    invite_code: inviteCode,
                    involved_persons: involvedPersons
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create bill');
            }

            toast.success('Bill created successfully');
            setNewBillName('');
            setShowAddModal(false);
            fetchBills();
        } catch (error) {
            console.error('Error creating bill:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create bill');
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
            const response = await fetch(`http://localhost:5001/api/guest/upgrade`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guest_id: guestUser?.id,
                    password: guestUpgradeForm.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Failed to upgrade guest account");
                setIsUpgradingGuest(false);
                return;
            }

            toast.success("Account upgrade started. Check your email to verify before logging in.");
            setShowGuestUpgradeModal(false);
            setIsUpgradingGuest(false);

        } catch (error: any) {
            toast.error(error.message || "Internal server error");
            setIsUpgradingGuest(false);
        }
    };



    const isGuestLoggedIn = !!guestUser;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">
                        Bills & Expenses
                    </h1>
                    <p className="text-sm font-bold text-gray-500 mt-1 flex items-center gap-2">
                        Manage your shared expenses and settlements
                    </p>
                </div>
                {!isGuestLoggedIn && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                                <Search size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search bills..."
                                value={billSearchQuery}
                                onChange={(e) => setBillSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Invite Code"
                                maxLength={6}
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                className="w-28 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold shadow-sm text-center uppercase tracking-widest placeholder:tracking-normal placeholder:font-medium"
                            />
                            <button
                                onClick={handleJoinByCode}
                                disabled={isJoiningCode || joinCode.length !== 6}
                                className="px-4 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                title="Join with code"
                            >
                                {isJoiningCode ? <RefreshCcw size={16} className="animate-spin" /> : <Plus size={20} />}
                                <span className="sm:hidden lg:inline text-sm">Join</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="primary-button group flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            New Bill
                        </button>
                    </div>
                )}
                {isGuestLoggedIn && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                                <Search size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search bills..."
                                value={billSearchQuery}
                                onChange={(e) => setBillSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Invite Code"
                                maxLength={6}
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                className="w-28 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold shadow-sm text-center uppercase tracking-widest placeholder:tracking-normal placeholder:font-medium"
                            />
                            <button
                                onClick={handleJoinByCode}
                                disabled={isJoiningCode || joinCode.length !== 6}
                                className="px-4 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                title="Join with code"
                            >
                                {isJoiningCode ? <RefreshCcw size={16} className="animate-spin" /> : <Plus size={20} />}
                                <span className="sm:hidden lg:inline text-sm">Join</span>
                            </button>
                        </div>
                    </div>
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
                <div className="space-y-4">
                    {bills.filter(b => (b.bill_name || '').toLowerCase().includes(billSearchQuery.toLowerCase())).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bills.filter(b => (b.bill_name || '').toLowerCase().includes(billSearchQuery.toLowerCase())).map((bill: any) => {
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
                                                    copyInviteCode(bill.invite_code);
                                                }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors">
                                                    <Share2 size={16} className="text-indigo-400" /> Copy Invite Code
                                                </button>
                                                {bill.created_by === user?.id && (
                                                    <>
                                                         <button onClick={(e) => { e.stopPropagation(); setOpenDropdownMenuId(null); setEditingBill(bill); setNewBillName(bill.bill_name); setShowEditModal(true); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors">
                                                            <Edit2 size={16} className="text-indigo-400" /> Edit
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownMenuId(null); handleArchiveBill(bill.id); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2.5 transition-colors">
                                                            <Archive size={16} className="text-orange-400" /> Archive
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownMenuId(null); handleDeleteBill(bill.id); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 transition-colors border-t border-gray-50 mt-1.5 pt-1.5">
                                                            <Trash2 size={16} className="text-red-400" /> Delete
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
                                                onClick={(e) => { e.stopPropagation(); copyInviteCode(bill.invite_code); }}
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
                ) : (
                    <div className="glass-card p-12 text-center text-gray-400 font-bold italic">
                        No bills match your search.
                    </div>
                )}
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
                                            onFocus={() => handleSearchUsers(searchQuery)}
                                            onClick={() => handleSearchUsers('')}
                                            onBlur={() => setTimeout(() => setSearchResults([]), 250)}
                                            onChange={(e) => handleSearchUsers(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-1">
                                                {searchResults.map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={(e) => { e.preventDefault(); setSelectedSearchPerson(u); setSearchQuery(u.nickname || u.first_name); setSearchResults([]); }}
                                                        className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                                            {(u.nickname || u.first_name || "U")[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{u.nickname || u.first_name}</p>
                                                            <p className="text-[10px] text-gray-400">
                                                                {u.is_guest === 1 ? <span className="text-orange-500 font-bold uppercase tracking-wide">Guest User</span> : `@${u.username}`}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchQuery.trim() && searchResults.length === 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 p-4 text-center">
                                                <p className="text-sm text-gray-500 font-medium">No nickname matched</p>
                                            </div>
                                        )}
                                        <div className="flex gap-2 w-full mt-2">
                                            <button
                                                onClick={(e) => { e.preventDefault(); if (selectedSearchPerson) addPersonToBill(selectedSearchPerson); }}
                                                disabled={!selectedSearchPerson}
                                                className="w-full py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                                            >
                                                Add Selected Person
                                            </button>
                                        </div>
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
