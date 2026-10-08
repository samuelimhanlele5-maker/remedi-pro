import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { StudentAnalytics } from '../types.ts';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  CheckCircle,
  HelpCircle,
  Search,
  BookOpen,
} from 'lucide-react';

interface AnalyticsViewProps {
  onTakeQuiz: (quizId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onTakeQuiz }) => {
  const { user } = useAuth();
  const [targetEmail, setTargetEmail] = useState(user?.email || 'student@remedipro.edu');
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async (email: string) => {
    try {
      setLoading(true);
      const res = await api.getStudentAnalytics(email.trim());
      setData(res);
    } catch (e) {
      console.error('Failed to load student analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetEmail) {
      fetchAnalytics(targetEmail);
    }
  }, [targetEmail]);

  const handleSearchEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetEmail.trim()) {
      fetchAnalytics(targetEmail.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
            Diagnostic Reporting
          </span>
          <h1 className="text-xl font-extrabold text-slate-900">Results & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-subject CBT assessment history, empirical accuracy, and longitudinal score calibration
          </p>
        </div>

        {/* Email switcher for creators / admin or looking up a student */}
        <form onSubmit={handleSearchEmail} className="flex items-center gap-2">
          <input
            type="email"
            placeholder="Lookup candidate email..."
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Lookup
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">
          Compiling student assessment telemetry...
        </div>
      ) : !data || data.totalAttempts === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center p-8 space-y-3">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">No Assessment Records Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No completed CBT submissions exist for <strong>{targetEmail}</strong>. Complete an examination to view your diagnostic breakdown.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Assessments Completed
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {data.totalAttempts}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Verified exam submissions</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Average Subject Mastery
              </span>
              <p className="text-2xl font-bold text-blue-700 mt-2 tabular-nums">
                {data.subjectPerformance.length > 0
                  ? `${Math.round(
                      data.subjectPerformance.reduce((acc, s) => acc + s.accuracyPercentage, 0) /
                        data.subjectPerformance.length
                    )}%`
                  : '—'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Across all examined topics</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Data Reliability State
              </span>
              <p className="text-sm font-bold text-slate-800 mt-2">
                {data.hasEnoughData ? 'Statistically Calibrated' : 'Gathering Data'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {data.hasEnoughData
                  ? 'High confidence telemetry'
                  : 'Requires ≥ 2 comprehensive exams'}
              </p>
            </div>
          </div>

          {/* Subject Performance Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Subject Performance & Question Accuracy</span>
            </h2>

            <div className="space-y-3">
              {data.subjectPerformance.map((sub) => (
                <div key={sub.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{sub.subject}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {sub.correctQuestions} / {sub.totalQuestions} ({sub.accuracyPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        sub.accuracyPercentage >= 75
                          ? 'bg-emerald-600'
                          : sub.accuracyPercentage >= 50
                          ? 'bg-blue-600'
                          : 'bg-amber-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, sub.accuracyPercentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strong Areas vs Weak Areas (Requirement 18: If not enough data, say "Not enough data yet"!) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Strong Areas Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Strong Areas</h3>
              </div>

              {!data.hasEnoughData ? (
                /* Requirement 18: Say "Not enough data yet" */
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                  Not enough data yet
                </div>
              ) : data.strongAreas && data.strongAreas.length > 0 ? (
                <div className="space-y-2">
                  {data.strongAreas.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-900"
                    >
                      ✓ {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  Balanced performance across attempted curricula.
                </div>
              )}
            </div>

            {/* Weak Areas Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Areas for Reinforcement</h3>
              </div>

              {!data.hasEnoughData ? (
                /* Requirement 18: Say "Not enough data yet" */
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                  Not enough data yet
                </div>
              ) : data.weakAreas && data.weakAreas.length > 0 ? (
                <div className="space-y-2">
                  {data.weakAreas.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900"
                    >
                      ▲ {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No pronounced deficit identified in tested topics.
                </div>
              )}
            </div>
          </div>

          {/* Longitudinal Progression Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Assessment History & Score Progression</span>
            </h2>

            <div className="divide-y divide-slate-100">
              {data.timeline.map((entry, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{entry.quizTitle}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{entry.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-blue-700 tabular-nums">
                      {entry.score}/{entry.scale}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {entry.percentage}% calibrated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
