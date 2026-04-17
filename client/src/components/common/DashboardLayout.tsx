import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import StickyGuestBanner from './StickyGuestBanner';
import { Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GuestUpgradeModal from './GuestUpgradeModal';

const DashboardLayout: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { isGuestLoggedIn } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Navbar */}
            <div className="fixed top-0 left-0 right-0 z-[100]">
                <Navbar />
            </div>

            {/* Sticky Guest Banner (TODO Step 8) */}
            {isGuestLoggedIn && (
                <StickyGuestBanner />
            )}

            {/* Mobile Menu Toggle */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[130] hover:bg-indigo-700 active:scale-95 transition-all"
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

                <main className="flex-1 transition-all duration-300 px-4 sm:px-0 pb-12">
                    <Outlet />
                </main>
            </div>

            {showUpgradeModal && (
                <GuestUpgradeModal onClose={() => setShowUpgradeModal(false)} />
            )}
        </div>
    );
};

export default DashboardLayout;

