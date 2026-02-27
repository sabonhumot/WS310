// import { Routes, Route } from 'react-router-dom';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';

const Navbar: React.FC = () => {
    const navigate = useNavigate();

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    
                    <Link to="/" className="flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-indigo-600" />
                        <span className="text-xl font-bold text-gray-900">
                            BillSplit
                        </span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Sign up
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

