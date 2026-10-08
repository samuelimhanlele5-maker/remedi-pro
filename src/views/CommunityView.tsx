import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Users,
  MessageSquare,
  Sparkles,
  ThumbsUp,
  Share2,
  Send,
  HelpCircle,
} from 'lucide-react';

interface Thread {
  id: string;
  author: string;
  role: string;
  title: string;
  content: string;
  subject: string;
  likes: number;
  replies: number;
  timeAgo: string;
}

const INITIAL_THREADS: Thread[] = [
  {
    id: 't_1',
    author: 'Dr. Evelyn Clark',
    role: 'Creator',
    title: 'Top 5 High-Yield Concepts in Mitochondrial Chemiosmosis',
    content: 'When solving ATP stoichiometry questions, remember to differentiate between cytoplasmic NADH (glycerol-3-phosphate vs malate-aspartate shuttle) and matrix NADH. In eukaryotic models, this determines whether you count 2.5 or 1.5 ATP equivalents per NADH.',
    subject: 'Biology',
    likes: 18,
    replies: 5,
    timeAgo: '2 hours ago',
  },
  {
    id: 't_2',
    author: 'David Adeleke',
    role: 'Student',
    title: 'How to manage time on multi-subject UTME mock (400 score scale)?',
    content: 'I noticed that allocating 40% of time to English passages and dividing the rest equally between Biology and Chemistry gave me the best pacing. What strategies do you use?',
    subject: 'General Study',
    likes: 12,
    replies: 7,
    timeAgo: '4 hours ago',
  },
  {
    id: 't_3',
    author: 'Samuel Osemu',
    role: 'Admin & Educator',
    title: 'Le Chatelier Principle: Common traps with solid reagents and inert gases',
    content: 'Keep in mind: Adding a pure solid or liquid does NOT shift equilibrium. Adding an inert gas at constant volume also produces no shift because partial pressures of reactants remain unchanged!',
    subject: 'Chemistry',
    likes: 24,
    replies: 9,
    timeAgo: 'Yesterday',
  }
];

export const CommunityView: React.FC = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSubject, setNewSubject] = useState('Biology');
  const [showCompose, setShowCompose] = useState(false);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const thread: Thread = {
      id: `t_${Date.now()}`,
      author: user?.fullName || 'Scholar',
      role: user?.role === 'creator' ? 'Creator' : 'Student',
      title: newTitle.trim(),
      content: newContent.trim(),
      subject: newSubject,
      likes: 1,
      replies: 0,
      timeAgo: 'Just now',
    };

    setThreads([thread, ...threads]);
    setNewTitle('');
    setNewContent('');
    setShowCompose(false);
  };

  const handleLike = (id: string) => {
    setThreads(
      threads.map((t) => (t.id === id ? { ...t, likes: t.likes + 1 } : t))
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
            Collaborative Learning
          </span>
          <h1 className="text-xl font-extrabold text-slate-900">Remedi Community</h1>
          <p className="text-xs text-slate-500 mt-1">
            Discuss challenging exam questions, study strategies, and subject masterclasses with peers
          </p>
        </div>

        <button
          onClick={() => setShowCompose(!showCompose)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{showCompose ? 'Close Form' : 'Start Discussion'}</span>
        </button>
      </div>

      {/* Compose box */}
      {showCompose && (
        <form
          onSubmit={handlePost}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900">Share Study Question or Insight</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                placeholder="Topic or question title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Physics">Physics</option>
                <option value="English">English</option>
                <option value="General Study">General Study</option>
              </select>
            </div>
          </div>

          <textarea
            rows={3}
            required
            placeholder="Elaborate on the question, solution approach, or concept..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs"
            >
              Post Topic
            </button>
          </div>
        </form>
      )}

      {/* Threads List */}
      <div className="space-y-4">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600/10 text-blue-700 font-bold flex items-center justify-center text-xs">
                  {thread.author.charAt(0)}
                </div>
                <div>
                  <span className="font-bold text-slate-900">{thread.author}</span>
                  <span className="text-[10px] text-slate-400 block">{thread.role}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {thread.subject}
                </span>
                <span className="text-[11px] text-slate-400">{thread.timeAgo}</span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 leading-snug">{thread.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">{thread.content}</p>

            <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <button
                onClick={() => handleLike(thread.id)}
                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{thread.likes} Upvotes</span>
              </button>
              <span className="flex items-center gap-1.5 font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{thread.replies} Replies</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
