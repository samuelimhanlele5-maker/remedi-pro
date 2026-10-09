import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { Copy, Check, ArrowRight } from 'lucide-react';

interface RegisterForQuizViewProps {
  quizCode: string;
  onClose: () => void;
}

export const RegisterForQuizView: React.FC<RegisterForQuizViewProps> = ({ quizCode, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ code: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.registerForQuiz(quizCode, { name, email, phone });
      setResult({ code: res.registration.code, title: res.quiz.title });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const inputCls =
    'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white p-5">
          <p className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">Remedi Pro</p>
          <h1 className="text-lg font-bold mt-1">Exam Registration</h1>
        </div>

        {result ? (
          <div className="p-6 space-y-4 text-center">
            <p className="text-xs text-slate-600">
              You are registered for <strong>{result.title}</strong>. Your exam code is:
            </p>
            <div className="py-4 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-2xl font-extrabold tracking-widest text-blue-700">{result.code}</span>
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <p className="text-[11px] text-rose-600 font-semibold leading-relaxed">
              Save or screenshot this code now. It works only once, and you need it on exam day.
            </p>
            <button onClick={onClose} className="text-xs font-semibold text-blue-600 hover:underline">
              Go to home page
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email / Gmail</label>
              <input
                className={inputCls}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                className={inputCls}
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-xl flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Registering...' : 'Register and get my code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
