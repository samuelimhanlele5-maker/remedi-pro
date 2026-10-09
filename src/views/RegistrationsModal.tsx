import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Quiz, Registration } from '../types.ts';
import { X, Copy, Check, MessageCircle, Ban } from 'lucide-react';

interface RegistrationsModalProps {
  quiz: Quiz;
  onClose: () => void;
}

// WhatsApp needs the international format. Numbers starting with 0 are treated as Nigerian (+234).
function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? '234' + digits.slice(1) : digits;
}

export const RegistrationsModal: React.FC<RegistrationsModalProps> = ({ quiz, onClose }) => {
  const [list, setList] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const link = `${window.location.origin}/?register=${quiz.shareCode}`;

  const load = async () => {
    try {
      const res = await api.listRegistrations(quiz.id);
      setList(res.registrations);
    } catch (e: any) {
      setError(e.message || 'Could not load registrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [quiz.id]);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.addRegistration(quiz.id, { name, email, phone });
      setName('');
      setEmail('');
      setPhone('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not add student.');
    }
  };

  const cancel = async (r: Registration) => {
    if (!window.confirm(`Cancel the code for ${r.name}?`)) return;
    try {
      await api.cancelRegistration(quiz.id, r.id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not cancel.');
    }
  };

  const statusOf = (r: Registration) => (r.status === 'cancelled' ? 'Cancelled' : r.attemptId ? 'Used' : 'Active');
  const inputCls =
    'px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 w-full';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-start justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Registrations</h2>
            <p className="text-[11px] text-slate-500">{quiz.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-[11px] font-bold text-blue-900 mb-1">Registration link (send this to students)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] break-all text-blue-800">{link}</code>
              <button
                onClick={() => copy('link', link)}
                className="p-2 bg-white rounded-lg border border-blue-100 text-blue-700"
              >
                {copiedKey === 'link' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input className={inputCls} placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputCls} placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inputCls} placeholder="Phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="submit" className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg">
              Add student
            </button>
          </form>

          <div>
            <p className="text-[11px] font-bold text-slate-700 mb-2">
              {loading ? 'Loading...' : `${list.length} registered`}
            </p>
            <div className="space-y-2">
              {list.map((r) => (
                <div key={r.id} className="p-3 border border-slate-200 rounded-xl text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{r.name}</p>
                      <p className="text-slate-500 truncate">{r.email}</p>
                      <p className="text-slate-500">{r.phone}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        statusOf(r) === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : statusOf(r) === 'Used'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {statusOf(r)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="font-extrabold tracking-widest text-blue-700">{r.code}</code>
                    <button onClick={() => copy(r.id, r.code)} className="p-1.5 text-slate-500 hover:text-blue-600" title="Copy code">
                      {copiedKey === r.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={`https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(
                        `Hello ${r.name}, your exam code for "${quiz.title}" is ${r.code}. It works only once.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-500 hover:text-emerald-600"
                      title="Send on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    {r.status === 'active' && !r.attemptId && (
                      <button onClick={() => cancel(r)} className="p-1.5 text-slate-500 hover:text-rose-600 ml-auto" title="Cancel code">
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
