import React from 'react';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center animate-in fade-in duration-300 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 scale-in-95 animate-in duration-300">
                <h2 className="text-2xl font-black text-gray-900 mb-2 font-jakarta">Confirm Logout</h2>
                <p className="text-gray-500 font-medium mb-8">Are you sure you want to log out of your account?</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
