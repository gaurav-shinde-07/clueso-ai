
import React from 'react';
import { FileTerminal } from 'lucide-react';
import { logger } from '../../lib/logger';

interface HeaderProps {
    userEmail: string;
    onLogoClick: () => void;
}

export function Header({ userEmail, onLogoClick }: HeaderProps) {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 h-16 flex items-center px-6 justify-between shadow-sm">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">C</div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">Clueso.io Clone</span>
            </div>
            <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {userEmail}
            </div>
            <button onClick={() => logger.downloadLogs()} className="ml-4 p-2 text-gray-500 hover:text-indigo-600 transition-colors" title="Download System Logs">
                <FileTerminal className="w-5 h-5" />
            </button>
        </header>
    );
}
