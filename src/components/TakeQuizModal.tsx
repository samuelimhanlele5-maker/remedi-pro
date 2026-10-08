import React, { useState } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface TakeQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterQuiz: (codeOrId: string) => void;
}

export const TakeQuizModal: React.FC<TakeQuizModalProps> = ({
  isOpen,
  onClose,
  onEnterQuiz,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a valid examination code.');
      return;
    }
    onEnterQuiz(code.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold">Enter Examination Code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Enter the share code provided by your educator or examination board (e.g.{' '}
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              REM-UTME-400
            </span>{' '}
            or{' '}
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              REM-CELL-100
            </span>
            ).
          </p>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quiz Code or Link
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. REM-UTME-400"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <span>Launch CBT Exam</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
