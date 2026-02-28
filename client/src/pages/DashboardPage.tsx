import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, Receipt } from 'lucide-react';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();

    // In a real app, we'd clear auth tokens here
    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50/30 pt-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Home className="text-indigo-600" size={32} />
                            Dashboard
                        </h1>
                        <p className="text-gray-500 mt-2">Welcome to your BillSplit dashboard!</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                    >
                        <LogOut size={18} />
                        Log out
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Placeholder Cards */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <Receipt size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Total Bills</h3>
                        <p className="text-3xl font-extrabold text-indigo-600 mt-2">0</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <span className="text-xl font-bold">$</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">You Owe</h3>
                        <p className="text-3xl font-extrabold text-green-600 mt-2">$0.00</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
                            <span className="text-xl font-bold">$</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">You Are Owed</h3>
                        <p className="text-3xl font-extrabold text-orange-600 mt-2">$0.00</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
