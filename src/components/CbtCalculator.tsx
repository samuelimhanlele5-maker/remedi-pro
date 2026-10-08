import React, { useState, useEffect } from 'react';
import { X, Delete, RotateCcw, Calculator as CalcIcon } from 'lucide-react';

interface CbtCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CbtCalculator: React.FC<CbtCalculatorProps> = ({ isOpen, onClose }) => {
  const [expression, setExpression] = useState('');
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleInput(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleOperator(e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key);
      } else if (e.key === '.') {
        handleDecimal();
      } else if (e.key === '(' || e.key === ')') {
        handleInput(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, expression, lastResult]);

  if (!isOpen) return null;

  const handleInput = (val: string) => {
    setError(false);
    // Prevent accidental leading duplicate zeros (e.g. "00")
    if (expression === '0' && val === '0') return;
    if (expression === '0' && val !== '.') {
      setExpression(val);
      return;
    }
    setExpression((prev) => prev + val);
  };

  const handleOperator = (op: string) => {
    setError(false);
    if (!expression) {
      if (lastResult !== null) {
        setExpression(lastResult + ' ' + op + ' ');
        return;
      }
      if (op === '-') {
        setExpression('-');
        return;
      }
      return;
    }

    const trimmed = expression.trimEnd();
    const lastChar = trimmed.slice(-1);
    if (['+', '-', '×', '÷'].includes(lastChar)) {
      setExpression(trimmed.slice(0, -1) + op + ' ');
    } else {
      setExpression(expression + ' ' + op + ' ');
    }
  };

  const handleDecimal = () => {
    setError(false);
    // Find current number block
    const parts = expression.split(/[\s+\-×÷()]+/);
    const currentPart = parts[parts.length - 1];
    if (currentPart.includes('.')) return;
    if (!currentPart) {
      setExpression((prev) => prev + '0.');
    } else {
      setExpression((prev) => prev + '.');
    }
  };

  const handleClear = () => {
    setExpression('');
    setError(false);
  };

  const handleBackspace = () => {
    setError(false);
    if (expression.endsWith(' ')) {
      setExpression((prev) => prev.slice(0, -3));
    } else {
      setExpression((prev) => prev.slice(0, -1));
    }
  };

  const handleCalculate = () => {
    if (!expression.trim()) return;

    try {
      // Sanitize expression for safe arithmetic evaluation
      const sanitized = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/[^0-9+\-*/().\s]/g, '');

      // Evaluate safely using Function constructor with restricted scope
      const res = new Function(`'use strict'; return (${sanitized});`)();

      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        // Round cleanly to max 8 decimal places if needed
        const formatted = String(Math.round(res * 100000000) / 100000000);
        setLastResult(formatted);
        setExpression(formatted);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  };

  const handleUseAns = () => {
    if (lastResult !== null) {
      setExpression((prev) => prev + lastResult);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-xs bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-850 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CalcIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold tracking-wide">CBT Calculator</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 text-right">
          <div className="text-[11px] font-mono text-slate-400 min-h-[16px] truncate">
            {lastResult !== null ? `Ans = ${lastResult}` : ''}
          </div>
          <div
            className={`text-2xl font-mono font-bold tracking-wider mt-1 truncate ${
              error ? 'text-rose-400 text-base' : 'text-white'
            }`}
          >
            {error ? 'Invalid Expression' : expression || '0'}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="p-3 grid grid-cols-4 gap-2 text-xs font-bold">
          {/* Row 1 */}
          <button
            onClick={handleClear}
            className="p-2.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded-xl transition-colors"
          >
            C
          </button>
          <button
            onClick={() => handleInput('(')}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
          >
            (
          </button>
          <button
            onClick={() => handleInput(')')}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
          >
            )
          </button>
          <button
            onClick={handleBackspace}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center justify-center"
          >
            <Delete className="w-4 h-4" />
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleInput('7')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            7
          </button>
          <button
            onClick={() => handleInput('8')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            8
          </button>
          <button
            onClick={() => handleInput('9')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            9
          </button>
          <button
            onClick={() => handleOperator('÷')}
            className="p-2.5 bg-blue-900/60 hover:bg-blue-900 text-blue-300 rounded-xl transition-colors text-sm"
          >
            ÷
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleInput('4')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            4
          </button>
          <button
            onClick={() => handleInput('5')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            5
          </button>
          <button
            onClick={() => handleInput('6')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            6
          </button>
          <button
            onClick={() => handleOperator('×')}
            className="p-2.5 bg-blue-900/60 hover:bg-blue-900 text-blue-300 rounded-xl transition-colors text-sm"
          >
            ×
          </button>

          {/* Row 4 */}
          <button
            onClick={() => handleInput('1')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            1
          </button>
          <button
            onClick={() => handleInput('2')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            2
          </button>
          <button
            onClick={() => handleInput('3')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            3
          </button>
          <button
            onClick={() => handleOperator('-')}
            className="p-2.5 bg-blue-900/60 hover:bg-blue-900 text-blue-300 rounded-xl transition-colors text-sm"
          >
            −
          </button>

          {/* Row 5 */}
          <button
            onClick={() => handleInput('0')}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            0
          </button>
          <button
            onClick={handleDecimal}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            .
          </button>
          <button
            onClick={handleUseAns}
            disabled={lastResult === null}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded-xl transition-colors text-[11px]"
          >
            Ans
          </button>
          <button
            onClick={() => handleOperator('+')}
            className="p-2.5 bg-blue-900/60 hover:bg-blue-900 text-blue-300 rounded-xl transition-colors text-sm"
          >
            +
          </button>

          {/* Row 6: Equal Button Full Width */}
          <button
            onClick={handleCalculate}
            className="col-span-4 p-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition-colors text-sm mt-1"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
