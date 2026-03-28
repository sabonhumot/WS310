import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Menu } from 'lucide-react';

const DashboardLayout: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Custom Navbar for Dashboard with Mobile Toggle */}
            <div className="fixed top-0 left-0 right-0 z-100">
                <Navbar />
            </div>

            {/* Mobile Menu Toggle (Visible for everyone on mobile) */}
            <button 
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-130 hover:bg-indigo-700 active:scale-95 transition-all"
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className="max-w-7xl mx-auto flex gap-0 lg:gap-8 px-0 sm:px-6 lg:px-8 mt-24">
                <Sidebar 
                    isCollapsed={isCollapsed} 
                    setIsCollapsed={setIsCollapsed}
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                />
                
                <main className={`flex-1 transition-all duration-300 px-4 sm:px-0 pb-12`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
