import React from 'react';

interface InputErrorProps {
    message?: string;
    className?: string;
}

const InputError: React.FC<InputErrorProps> = ({ message, className = "" }) => {
    if (!message) return null;

    return (
        <p className={`mt-1 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 ${className}`}>
            {message}
        </p>
    );
};

export default InputError;
