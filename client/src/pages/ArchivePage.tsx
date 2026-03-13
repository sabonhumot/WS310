import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, RotateCcw, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

import type { Bill } from '../types';

const ArchivePage: React.FC = () => {
    const { user } = useAuth();
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

    const handleRestoreBill = async (billId: number) => {
        try {
            await fetch(`http://localhost:5001/api/bills/${billId}/restore`, {
                method: 'PUT'
            });
            toast.success('Bill restored successfully');
            fetchArchivedBills();
        } catch (error) {
            console.error('Error restoring bill:', error);
            toast.error('Failed to restore bill');
        }
    };

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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header>
                <h1 className="text-3xl font-black text-gray-900">Archive</h1>
                <p className="text-gray-500 font-medium mt-2">View and manage your archived bill splits</p>
            </header>

            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin">
                        <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                    </div>
                </div>
            ) : archivedBills.length === 0 ? (
                <div className="glass-card p-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bell className="w-8 h-8" />
                    </div>
                    <p className="text-gray-900 text-xl font-bold mb-2">Archive is empty</p>
                    <p className="text-gray-500 max-w-xs mx-auto">Bills you archive will appear here for safekeeping or future restoration.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {archivedBills.map((bill: Bill) => (
                        <div key={bill.id} className="glass-card p-6 opacity-80 hover:opacity-100 transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{bill.bill_name}</h3>
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                        Archived {bill.archived_at ? new Date(bill.archived_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestoreBill(bill.id)}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                        title="Restore"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBill(bill.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Permanently"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invite Code</p>
                                <p className="text-lg font-black text-gray-900 tracking-widest">{bill.invite_code}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ArchivePage;
