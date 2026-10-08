import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { LeaderboardEntry } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Trophy, X, EyeOff, Medal, Award, CheckCircle } from 'lucide-react';

interface LeaderboardModalProps {
  quizId: string;
  quizTitle: string;
  isCreatorOrAdmin: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  quizId,
  quizTitle,
  isCreatorOrAdmin,
  onClose,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreScale, setScoreScale] = useState<number>(100);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.getLeaderboard(quizId);
      setLeaderboard(res.leaderboard || []);
      setScoreScale(res.scoreScale || 100);
      setEnabled(res.leaderboardEnabled);
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [quizId]);

  const handleHideParticipant = async (attemptId: string, studentName: string) => {
    try {
      await api.hideLeaderboardParticipant(quizId, attemptId);
      setStatusMessage(`${studentName} removed from visible leaderboard.`);
      setTimeout(() => setStatusMessage(null), 3000);
      // Refresh list
      fetchLeaderboard();
    } catch (e) {
      console.error('Failed to hide participant:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Quiz Leaderboard</h2>
              <p className="text-xs text-slate-400 truncate max-w-md">{quizTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {statusMessage && (
            <div className="mb-4 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {!enabled ? (
            <div className="py-12 text-center">
              <Award className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-slate-800">Leaderboard is Disabled</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                The creator has disabled the public leaderboard rankings for this assessment.
              </p>
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading verified participant rankings...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-slate-800">No Participants Ranked Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Completed quiz submissions will be automatically ranked here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="col-span-1">Rank</span>
                <span className="col-span-4">Student</span>
                <span className="col-span-4">Subjects</span>
                <span className="col-span-3 text-right">Score</span>
              </div>

              {leaderboard.map((entry) => {
                const isTop1 = entry.rank === 1;
                const isTop2 = entry.rank === 2;
                const isTop3 = entry.rank === 3;

                return (
                  <div
                    key={entry.attemptId}
                    className={`p-3.5 sm:px-4 rounded-xl border transition-all flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 sm:gap-0 ${
                      isTop1
                        ? 'bg-amber-50/70 border-amber-200 shadow-xs'
                        : isTop2
                        ? 'bg-slate-100/80 border-slate-200'
                        : isTop3
                        ? 'bg-amber-900/5 border-amber-800/10'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Rank */}
                    <div className="sm:col-span-1 flex items-center gap-2">
                      {isTop1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                          1
                        </span>
                      ) : isTop2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-400 text-white font-bold text-xs flex items-center justify-center">
                          2
                        </span>
                      ) : isTop3 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-bold text-xs flex items-center justify-center">
                          3
                        </span>
                      ) : (
                        <span className="w-6 h-6 font-semibold text-xs text-slate-500 flex items-center justify-center tabular-nums">
                          {entry.rank}.
                        </span>
                      )}
                    </div>

                    {/* Student Name */}
                    <div className="sm:col-span-4">
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {entry.student}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{entry.email}</p>
                    </div>

                    {/* Subjects */}
                    <div className="sm:col-span-4">
                      <p className="text-xs font-medium text-slate-700">
                        {entry.subjects || 'General'}
                      </p>
                    </div>

                    {/* Score & Action */}
                    <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      <span className="text-sm font-extrabold text-blue-700 tabular-nums">
                        {entry.score}
                      </span>

                      {/* Creator can remove from visible leaderboard without deleting underlying attempt */}
                      {isCreatorOrAdmin && (
                        <button
                          onClick={() => handleHideParticipant(entry.attemptId, entry.student)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                          title="Hide from visible leaderboard (does not delete score attempt)"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Ranked by proportional score & submission time · Score Scale: /{scoreScale}
          </span>
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
