import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { LiveParticipant } from '../types.ts';
import { X, Users, RefreshCw, Radio } from 'lucide-react';

interface LiveParticipantsModalProps {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
}

export const LiveParticipantsModal: React.FC<LiveParticipantsModalProps> = ({
  quizId,
  quizTitle,
  onClose,
}) => {
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchParticipants = async () => {
    try {
      const res = await api.getLiveParticipants(quizId);
      setParticipants(res.participants || []);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('Error fetching live participants:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    // Auto-poll every 5 seconds for real-time live monitoring
    const interval = setInterval(fetchParticipants, 5000);
    return () => clearInterval(interval);
  }, [quizId]);

  const count = participants.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Radio className="w-5 h-5 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Live Participants</h2>
              <p className="text-xs text-slate-400 truncate max-w-md">{quizTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchParticipants}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {count === 0 ? (
            /* Requirement 16: If nobody is currently taking the quiz, clearly display: No live participants */
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No live participants</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No students are currently taking this quiz session. As participants start, their live progress will stream here automatically.
              </p>
            </div>
          ) : (
            /* Requirement 16: If people are taking the quiz, display: "N people are currently taking this quiz" */
            <div>
              <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-sm font-bold text-slate-900">
                  {count === 1 ? '1 person is currently taking this quiz' : `${count} people are currently taking this quiz`}
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  Updated {lastRefreshed.toLocaleTimeString()}
                </span>
              </div>

              <div className="space-y-3">
                {participants.map((p) => {
                  const subjectStr = p.selectedSubjects && p.selectedSubjects.length > 0
                    ? p.selectedSubjects.join(' + ')
                    : 'All Subjects';

                  const percentage = p.totalQuestions > 0
                    ? Math.round((p.currentQuestion / p.totalQuestions) * 100)
                    : 0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2.5 transition-all hover:border-blue-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {p.name}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {subjectStr}
                          </p>
                        </div>

                        {/* Current Question Progress as required: "Question 24/50" */}
                        <div className="text-right">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 tabular-nums">
                            {p.progress || `Question ${p.currentQuestion}/${p.totalQuestions}`}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Started: {new Date(p.startedAt).toLocaleTimeString()}</span>
                        <span>{p.email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">Live monitoring auto-refreshes every 5s</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
