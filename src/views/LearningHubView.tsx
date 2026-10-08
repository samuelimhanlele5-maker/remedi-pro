import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { LearningHub, HubMaterial, HubMember, Quiz } from '../types.ts';
import {
  BookOpen,
  Plus,
  Users,
  FileText,
  FileQuestion,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Send,
  X,
  CheckCircle,
  Clock,
  Award,
} from 'lucide-react';

interface LearningHubViewProps {
  onNavigate: (tab: string, meta?: any) => void;
  onTakeQuiz: (quizId: string) => void;
}

export const LearningHubView: React.FC<LearningHubViewProps> = ({ onNavigate, onTakeQuiz }) => {
  const { user } = useAuth();
  const [hubs, setHubs] = useState<LearningHub[]>([]);
  const [selectedHub, setSelectedHub] = useState<
    (LearningHub & { members: HubMember[]; materials: HubMaterial[]; quizzes: Quiz[] }) | null
  >(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Hub Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSubject, setNewSubject] = useState('Life Sciences & Medical Prep');

  // Add Material Modal
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matType, setMatType] = useState<'note' | 'tutorial' | 'guide'>('note');
  const [matContent, setMatContent] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isCreatorOrAdmin = user?.role === 'creator' || user?.role === 'admin';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchHubs = async () => {
    try {
      setLoading(true);
      const res = await api.getHubs();
      setHubs(res.hubs || []);
      if (res.hubs && res.hubs.length > 0 && !selectedHub) {
        loadHubDetail(res.hubs[0].id);
      }
    } catch (e) {
      console.error('Error fetching hubs:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadHubDetail = async (id: string) => {
    try {
      const res = await api.getHub(id);
      setSelectedHub(res.hub);

      // If user is creator, load student member performance
      if (isCreatorOrAdmin) {
        const perf = await api.getHubPerformance(id);
        setPerformanceData(perf.performance || []);
      }
    } catch (e) {
      console.error('Error loading hub detail:', e);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.createHub({
        creatorId: user?.id || 'usr_creator_1',
        creatorName: user?.fullName || 'Educator',
        title: newTitle.trim(),
        description: newDesc.trim(),
        subject: newSubject.trim(),
      });

      showToast(`Learning Hub "${res.hub.title}" created.`);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchHubs();
      loadHubDetail(res.hub.id);
    } catch (e: any) {
      alert(e.message || 'Failed to create hub.');
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHub || !matTitle.trim() || !matContent.trim()) return;

    try {
      await api.addMaterial(selectedHub.id, {
        creatorId: user?.id || 'usr_creator_1',
        title: matTitle.trim(),
        description: matDesc.trim(),
        type: matType,
        content: matContent.trim(),
      });

      showToast('Educational material added to hub.');
      setMaterialModalOpen(false);
      setMatTitle('');
      setMatDesc('');
      setMatContent('');
      loadHubDetail(selectedHub.id);
    } catch (e: any) {
      alert(e.message || 'Failed to add material.');
    }
  };

  const handleJoinHub = async (hubId: string) => {
    if (!user) {
      alert('Please sign in or enter your credentials to join this hub.');
      return;
    }
    try {
      const res = await api.joinHub(hubId, {
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
      });
      showToast(res.message || 'Joined Learning Hub successfully!');
      loadHubDetail(hubId);
    } catch (e: any) {
      alert(e.message || 'Failed to join hub.');
    }
  };

  const isUserMember = selectedHub?.members.some(
    (m) => m.userEmail.toLowerCase() === user?.email?.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
            Knowledge Ecosystem
          </span>
          <h1 className="text-xl font-extrabold text-slate-900">Learning Hubs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access curated study notes, syllabus tutorials, linked CBT drills, and track cohort progress
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isCreatorOrAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Learning Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Hub layout: Hub Selector + Hub Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hub Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Available Hubs ({hubs.length})
          </h2>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              Loading learning hubs...
            </div>
          ) : hubs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No Learning Hubs created yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hubs.map((hub) => {
                const isSelected = selectedHub?.id === hub.id;
                return (
                  <button
                    key={hub.id}
                    onClick={() => loadHubDetail(hub.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isSelected ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {hub.subject}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}
                      />
                    </div>
                    <h3 className="font-bold text-sm mt-2 leading-snug">{hub.title}</h3>
                    <p
                      className={`text-xs mt-1 line-clamp-2 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {hub.description}
                    </p>

                    <div
                      className={`flex items-center gap-3 mt-3 pt-2 text-[11px] border-t ${
                        isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{hub.memberCount || 0} Members</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{hub.materialCount || 0} Materials</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Hub Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {selectedHub ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Hub Title Banner */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                    {selectedHub.subject}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                    {selectedHub.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {selectedHub.description}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Managed by {selectedHub.creatorName} · Created{' '}
                    {new Date(selectedHub.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isUserMember ? (
                    <button
                      onClick={() => handleJoinHub(selectedHub.id)}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors"
                    >
                      Join Hub
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Enrolled Member</span>
                    </span>
                  )}

                  {isCreatorOrAdmin && (
                    <button
                      onClick={() => setMaterialModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Material</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Materials Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Learning Materials & Study Guides ({selectedHub.materials?.length || 0})</span>
                  </h3>
                </div>

                {selectedHub.materials?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500">
                      No materials posted yet. The hub creator will publish study notes and syllabus breakdowns here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedHub.materials.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{mat.title}</span>
                          <span className="text-[10px] uppercase font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {mat.type}
                          </span>
                        </div>
                        {mat.description && (
                          <p className="text-xs text-slate-600">{mat.description}</p>
                        )}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 font-serif leading-relaxed whitespace-pre-wrap">
                          {mat.content}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Posted on {new Date(mat.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Creator Student Performance Analytics (Requirement 17) */}
              {isCreatorOrAdmin && performanceData.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>Student Member Performance Analytics</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="py-2.5 px-4">Student</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3 text-center">Quizzes Taken</th>
                          <th className="py-2.5 px-3 text-center">Avg Score</th>
                          <th className="py-2.5 px-4">Enrolled Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {performanceData.map((p) => (
                          <tr key={p.memberId} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-4 font-bold text-slate-800">{p.name}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{p.email}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700 tabular-nums">
                              {p.quizzesTaken}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-blue-700 tabular-nums">
                              {p.averageScore}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                              {new Date(p.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              Select a learning hub from the left to view materials and syllabus modules.
            </div>
          )}
        </div>
      </div>

      {/* Create Hub Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <form
            onSubmit={handleCreateHub}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Learning Hub</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hub Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. UTME Science & Medical Drill Hub"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Focus
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Life Sciences, Chemistry, Mathematics"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Detail what students will master inside this hub..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs"
              >
                Create Hub
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Material Modal */}
      {materialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <form
            onSubmit={handleAddMaterial}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Learning Material</h3>
              <button
                type="button"
                onClick={() => setMaterialModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Electron Transport Chain Synthesis"
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="note">Study Note</option>
                  <option value="tutorial">Step-by-Step Tutorial</option>
                  <option value="guide">Revision Guide</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Summary
                </label>
                <input
                  type="text"
                  placeholder="Key takeaway"
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Content / Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                required
                placeholder="Enter complete educational notes, formulas, rules, or guidelines..."
                value={matContent}
                onChange={(e) => setMatContent(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-serif"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMaterialModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs"
              >
                Publish Material
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
