import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Quiz } from '../types.ts';
import { LiveParticipantsModal } from './LiveParticipantsModal.tsx';
import { LeaderboardModal } from './LeaderboardModal.tsx';
import {
  FileQuestion,
  Search,
  PlusCircle,
  Radio,
  Trophy,
  Edit,
  Trash2,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';

interface MyQuizzesViewProps {
  onNavigate: (tab: string, meta?: any) => void;
  onTakeQuiz: (quizIdOrCode: string) => void;
}

export const MyQuizzesView: React.FC<MyQuizzesViewProps> = ({ onNavigate, onTakeQuiz }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirmQuiz, setDeleteConfirmQuiz] = useState<Quiz | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeLiveModalQuiz, setActiveLiveModalQuiz] = useState<Quiz | null>(null);
  const [activeLeaderboardQuiz, setActiveLeaderboardQuiz] = useState<Quiz | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isCreatorOrAdmin = user?.role === 'creator' || user?.role === 'admin';

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.getQuizzes();
      setQuizzes(res.quizzes || []);
    } catch (e) {
      console.error('Error fetching quizzes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyQuizLink = (quiz: Quiz) => {
    const origin = window.location.origin;
    const fullUrl = `${origin}?quiz=${encodeURIComponent(quiz.shareCode)}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(quiz.id);
    showToast(`Share link copied: ${quiz.shareCode}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmQuiz) return;
    const targetId = deleteConfirmQuiz.id;
    const targetTitle = deleteConfirmQuiz.title;

    try {
      setDeletingId(targetId);
      const res = await api.deleteQuiz(targetId);

      if (res.success) {
        setQuizzes((prev) => prev.filter((q) => q.id !== targetId));
        showToast(`Quiz "${targetTitle}" deleted.`);
      }
    } catch (err: any) {
      console.error('Failed to delete quiz:', err);
      try {
        await api.getQuiz(targetId);
        showToast(`Failed to delete quiz.`);
      } catch (checkErr: any) {
        if (checkErr.status === 404) {
          setQuizzes((prev) => prev.filter((q) => q.id !== targetId));
          showToast(`Quiz verified removed.`);
        }
      }
    } finally {
      setDeletingId(null);
      setDeleteConfirmQuiz(null);
    }
  };

  const filtered = quizzes.filter((q) => {
    const term = search.toLowerCase();
    const titleMatch = q.title.toLowerCase().includes(term);
    const codeMatch = q.shareCode.toLowerCase().includes(term);
    const subMatch = q.subjects.some((s) => s.toLowerCase().includes(term));
    return titleMatch || codeMatch || subMatch;
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Quiz Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, administer, and launch CBT examinations across multiple subjects
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCreatorOrAdmin && (
            <button
              onClick={() => onNavigate('create-quiz')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, subject, or quiz code (e.g. REM-UTME-400)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetchQuizzes}
          className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid of Quizzes */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">
          Loading examinations...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center p-8">
          <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Quizzes Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? 'No results matched your search query.' : 'There are currently no quizzes registered.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((quiz) => {
            const hasPassages = quiz.questions?.some((q) => Boolean(q.passage));
            const hasDiagrams = quiz.questions?.some((q) => Boolean(q.diagram));

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                {/* Top card info */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: share code & duration */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {quiz.shareCode}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quiz.durationMinutes ? `${quiz.durationMinutes} mins` : 'Untimed'}</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {quiz.description || 'Comprehensive multi-subject computer-based testing exam.'}
                    </p>

                    {/* Subject tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {quiz.subjects.map((sub) => {
                        const isCompulsory = quiz.compulsorySubjects?.includes(sub);
                        return (
                          <span
                            key={sub}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              isCompulsory
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sub} {isCompulsory && '★'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Participants</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {quiz.participantCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Avg Score</span>
                      <span className="font-bold text-blue-700 tabular-nums">
                        {quiz.avgScore ? `${quiz.avgScore}%` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Score Scale</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        /{quiz.scoreScale}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Take exam button */}
                  <button
                    onClick={() => onTakeQuiz(quiz.id)}
                    className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-center"
                  >
                    Take Exam
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Live participants */}
                    <button
                      onClick={() => setActiveLiveModalQuiz(quiz)}
                      className="p-1.5 text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-white transition-colors"
                      title="Live Participants"
                    >
                      <Radio className="w-4 h-4" />
                    </button>

                    {/* Leaderboard */}
                    <button
                      onClick={() => setActiveLeaderboardQuiz(quiz)}
                      className="p-1.5 text-slate-600 hover:text-amber-600 rounded-lg hover:bg-white transition-colors"
                      title="Leaderboard"
                    >
                      <Trophy className="w-4 h-4" />
                    </button>

                    {/* Copy Shareable Link */}
                    <button
                      onClick={() => copyQuizLink(quiz)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                      title="Copy Shareable Quiz Link"
                    >
                      {copiedCode === quiz.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit */}
                    {isCreatorOrAdmin && (
                      <button
                        onClick={() => onNavigate('create-quiz', { editQuizId: quiz.id })}
                        className="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                        title="Edit Quiz"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete with verification */}
                    {isCreatorOrAdmin && (
                      <button
                        onClick={() => setDeleteConfirmQuiz(quiz)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Quiz Permanently?</h3>
                <p className="text-xs text-slate-500">Purging frontend and backend records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              Confirm deletion of <strong>"{deleteConfirmQuiz.title}"</strong>. This completely deletes all questions, live sessions, and participant attempts from the server database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmQuiz(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={deletingId !== null}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5"
                disabled={deletingId !== null}
              >
                {deletingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deletingId ? 'Deleting...' : 'Delete Quiz'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Participants Modal */}
      {activeLiveModalQuiz && (
        <LiveParticipantsModal
          quizId={activeLiveModalQuiz.id}
          quizTitle={activeLiveModalQuiz.title}
          onClose={() => setActiveLiveModalQuiz(null)}
        />
      )}

      {/* Leaderboard Modal */}
      {activeLeaderboardQuiz && (
        <LeaderboardModal
          quizId={activeLeaderboardQuiz.id}
          quizTitle={activeLeaderboardQuiz.title}
          isCreatorOrAdmin={isCreatorOrAdmin}
          onClose={() => setActiveLeaderboardQuiz(null)}
        />
      )}
    </div>
  );
};
