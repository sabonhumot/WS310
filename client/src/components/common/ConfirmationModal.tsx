import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'danger' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirm', 
    confirmVariant = 'danger' 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[400] flex items-center justify-center animate-in fade-in duration-300 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm scale-in-95 animate-in duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${confirmVariant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <AlertCircle size={24} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 font-jakarta">{title}</h2>
                </div>
                
                <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-all shadow-lg ${
                            confirmVariant === 'danger' 
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-100' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
