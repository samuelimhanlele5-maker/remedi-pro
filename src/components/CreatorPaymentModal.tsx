import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { CreatorAccessStatus, BankPaymentDetails } from '../types.ts';
import {
  X,
  CreditCard,
  Building,
  CheckCircle,
  AlertTriangle,
  Copy,
  Clock,
  Send,
  MessageCircle,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface CreatorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSubmitted?: () => void;
}

export const CreatorPaymentModal: React.FC<CreatorPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSubmitted,
}) => {
  const { user } = useAuth();
  const [accessStatus, setAccessStatus] = useState<CreatorAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Form State for "I Have Paid"
  const [showPayForm, setShowPayForm] = useState(false);
  const [amount, setAmount] = useState<number>(5000);
  const [senderName, setSenderName] = useState(user?.fullName || '');
  const [senderBank, setSenderBank] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getCreatorAccessStatus();
      setAccessStatus(res);
      setAmount(res.accessFeeAmount || 5000);
      if (res.pendingRequest) {
        setSubmittedSuccess(true);
      } else {
        setSubmittedSuccess(false);
      }
    } catch (e: any) {
      console.error('Failed to load creator access status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'code' | 'account') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!senderName.trim() || !referenceNumber.trim()) {
      setErrorMsg('Please enter both your sender name and the payment reference / narration.');
      return;
    }

    try {
      setSubmitting(true);
      await api.submitCreatorPayment({
        amount: Number(amount) || 5000,
        senderName: senderName.trim(),
        senderBank: senderBank.trim(),
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        receiptUrl: receiptUrl.trim() || undefined,
      });

      setSubmittedSuccess(true);
      setShowPayForm(false);
      if (onPaymentSubmitted) onPaymentSubmitted();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit payment confirmation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const bank: BankPaymentDetails = accessStatus?.bankDetails || {
    bankName: 'Zenith Bank',
    accountName: 'Remedi Pro Educational Services',
    accountNumber: '1018923456',
    instructions: 'Transfer the access fee to the bank account provided. Enter your Creator Code as narration.',
    whatsappNumber: '+234 812 345 6789',
  };

  const creatorCode = user?.creatorCode || accessStatus?.creatorCode || 'REM-CREATOR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Creator Access Activation</h2>
              <p className="text-xs text-slate-300">
                Manual Bank Transfer • Direct Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading payment instructions...</p>
            </div>
          ) : submittedSuccess ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-950">
                Payment Verification Pending
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                Your payment submission has been received! The platform administrator will verify your bank transfer manually and activate your creator account.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Creator Code: <strong>{creatorCode}</strong>
              </div>
              {bank.whatsappNumber && (
                <div className="pt-3">
                  <a
                    href={`https://wa.me/${bank.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello%20Remedi%20Pro%20Admin,%20I%20have%20transferred%20the%20creator%20access%20fee%20for%20creator%20code%20${encodeURIComponent(creatorCode)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Receipt on WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          ) : showPayForm ? (
            /* Step 2: "I Have Paid" Submission Form */
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Payment Confirmation Details
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPayForm(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  ← Back to Bank Details
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Amount Transferred ({accessStatus?.currency || 'NGN'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sender Account Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Name on your bank account"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sender Bank (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GTBank, Kuda, Access Bank"
                    value={senderBank}
                    onChange={(e) => setSenderBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Transfer Reference / Narration <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${creatorCode} or session ID`}
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Additional Notes / Receipt Link (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Paste transaction receipt link or transfer note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Payment for Verification'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Step 1: Manual Bank Transfer Instructions */
            <div className="space-y-5">
              {/* Creator Code Reminder */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
                    Your Unique Creator Code
                  </span>
                  <span className="text-sm font-black font-mono text-blue-950">
                    {creatorCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(creatorCode, 'code')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Instructions Banner */}
              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-800 mb-1">
                  How to Activate Creator Access:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Transfer the access fee ({accessStatus?.currency || 'NGN'} {(accessStatus?.accessFeeAmount || 5000).toLocaleString()}) to the bank details below.</li>
                  <li><strong>Important:</strong> Enter your creator code <code>{creatorCode}</code> as the transfer narration.</li>
                  <li>Click <strong>&quot;I Have Paid&quot;</strong> and submit your transaction details for admin manual approval.</li>
                </ol>
              </div>

              {/* Bank Transfer Box */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Bank Transfer Instructions
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {accessStatus?.currency || 'NGN'} {(accessStatus?.accessFeeAmount || 5000).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Bank Name</span>
                    <span className="font-bold text-white text-sm">{bank.bankName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Account Name</span>
                    <span className="font-bold text-white text-sm">{bank.accountName}</span>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Account Number</span>
                      <span className="font-extrabold text-white font-mono text-base tracking-wider">
                        {bank.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(bank.accountNumber, 'account')}
                      className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {bank.instructions && (
                  <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800">
                    Note: {bank.instructions}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {bank.whatsappNumber && (
                  <a
                    href={`https://wa.me/${bank.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello%20Remedi%20Pro%20Admin,%20I%20am%20making%20a%20payment%20for%20creator%20access.%20My%20code%20is%20${encodeURIComponent(creatorCode)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp Support</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowPayForm(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>I Have Paid</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
