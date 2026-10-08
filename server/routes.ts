import { Router, Request, Response } from 'express';
import {
  dbManager,
  User,
  Quiz,
  Question,
  QuizAttempt,
  LiveSession,
  LearningHub,
  HubMember,
  HubMaterial,
  Follow,
  TutorialLink,
  MemberAssessmentRecord,
  AuditLog,
  PaymentRequest,
  SystemSettings,
  generateCreatorCode,
} from './db.ts';

export const apiRouter = Router();

// Helper to generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Helper to clean numeric inputs safely
export function parseNullableInt(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseInt(String(val).trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

// Helper to extract authenticated user from x-user-id header
export function getAuthUser(req: Request): User | null {
  const userId = (req.headers['x-user-id'] as string) || '';
  if (!userId) return null;
  const db = dbManager.getData();
  return db.users.find((u) => u.id === userId) || null;
}

// Middleware: Enforce admin role strictly on backend (Requirement 10)
export function requireAdmin(req: Request, res: Response, next: () => void) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please log in as an administrator.' });
  }
  if (user.role !== 'admin' || user.disabled) {
    return res.status(403).json({ error: 'Access forbidden: Administrator privileges required.' });
  }
  next();
}

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = dbManager.getData();

  const existing = db.users.find((u) => u.email === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const assignedRole = role === 'admin' && cleanEmail === 'samuelosemu5@gmail.com' 
    ? 'admin' 
    : (role === 'creator' ? 'creator' : 'student');

  const isCreatorOrAdmin = assignedRole === 'creator' || assignedRole === 'admin';
  const existingCodes = db.users.map((u) => u.creatorCode).filter(Boolean) as string[];
  const creatorCode = isCreatorOrAdmin ? generateCreatorCode(existingCodes) : undefined;
  const accessStatus = isCreatorOrAdmin ? 'active' : undefined;
  const accessStartedAt = isCreatorOrAdmin ? new Date().toISOString() : undefined;
  const accessExpiresAt = isCreatorOrAdmin
    ? new Date(Date.now() + 3600 * 1000 * 24 * (assignedRole === 'admin' ? 365 : 30)).toISOString()
    : undefined;

  const newUser: User = {
    id: generateId('usr'),
    email: cleanEmail,
    password: password.trim(),
    fullName: fullName.trim(),
    role: assignedRole,
    disabled: false,
    creatorCode,
    accessStatus,
    accessStartedAt,
    accessExpiresAt,
    accessDurationDays: isCreatorOrAdmin ? 30 : undefined,
    createdAt: new Date().toISOString(),
  };

  dbManager.update((state) => {
    state.users.push(newUser);
    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'USER_REGISTER',
      details: `User ${newUser.fullName} (${newUser.email}) registered as ${newUser.role}${creatorCode ? ` with code ${creatorCode}` : ''}.`,
      actor: newUser.email,
      timestamp: new Date().toISOString(),
    });
  });

  const { password: _, ...userSafe } = newUser;
  return res.status(201).json({ user: userSafe, token: `token_${newUser.id}` });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = dbManager.getData();
  const user = db.users.find((u) => u.email === cleanEmail);

  if (!user || user.password !== password.trim()) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.disabled) {
    return res.status(403).json({ error: 'This account has been disabled by platform administration.' });
  }

  const { password: _, ...userSafe } = user;
  return res.json({ user: userSafe, token: `token_${user.id}` });
});

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = dbManager.getData();
  const user = db.users.find((u) => u.email === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'No user account found with that email address.' });
  }

  dbManager.update((state) => {
    const target = state.users.find((u) => u.email === cleanEmail);
    if (target) {
      target.password = newPassword.trim();
    }
    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'PASSWORD_RESET',
      details: `Password reset for user ${cleanEmail}.`,
      actor: cleanEmail,
      timestamp: new Date().toISOString(),
    });
  });

  return res.json({ message: 'Password has been successfully updated.' });
});

apiRouter.put('/users/:id/profile', (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullName, bio, role } = req.body;
  const db = dbManager.getData();
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  dbManager.update((state) => {
    const target = state.users.find((u) => u.id === id);
    if (target) {
      if (fullName) target.fullName = fullName.trim();
      if (bio !== undefined) target.bio = bio.trim();
      if (role && (role === 'student' || role === 'creator')) {
        target.role = role;
        if (role === 'creator') {
          if (!target.creatorCode) {
            const existingCodes = state.users.map((u) => u.creatorCode).filter(Boolean) as string[];
            target.creatorCode = generateCreatorCode(existingCodes);
          }
          if (!target.accessStatus) {
            target.accessStatus = 'active';
            target.accessStartedAt = new Date().toISOString();
            target.accessExpiresAt = new Date(Date.now() + 3600 * 1000 * 24 * 30).toISOString();
            target.accessDurationDays = 30;
          }
        }
      }
    }
  });

  const updated = dbManager.getData().users.find((u) => u.id === id);
  const { password: _, ...userSafe } = updated!;
  return res.json({ user: userSafe });
});

// Admin list users
apiRouter.get('/users', requireAdmin, (req: Request, res: Response) => {
  const db = dbManager.getData();
  const list = db.users.map(({ password, ...u }) => u);
  return res.json({ users: list });
});

// Admin toggle disable user
apiRouter.put('/users/:id/toggle-disabled', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  let status = false;

  dbManager.update((state) => {
    const target = state.users.find((u) => u.id === id);
    if (target) {
      target.disabled = !target.disabled;
      status = target.disabled;
      state.auditLogs.unshift({
        id: generateId('log'),
        action: 'USER_STATUS_CHANGE',
        details: `User ${target.email} was ${target.disabled ? 'disabled' : 'enabled'}.`,
        actor: 'Admin',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return res.json({ id, disabled: status });
});

// ==========================================
// 2. QUIZZES & QUESTIONS
// ==========================================

// Get all quizzes (optional filter by creatorId or creatorOnly)
apiRouter.get('/quizzes', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const creatorId = req.query.creatorId as string;
  const creatorOnly = req.query.creatorOnly === 'true';
  const db = dbManager.getData();

  let list = db.quizzes;
  if (creatorId) {
    list = list.filter((q) => q.creatorId === creatorId);
  } else if (creatorOnly && authUser) {
    list = list.filter((q) => q.creatorId === authUser.id);
  }

  // Calculate summary metrics for creator dashboard
  const enriched = list.map((quiz) => {
    const attempts = db.attempts.filter((a) => a.quizId === quiz.id);
    const participantCount = attempts.length;
    const avgScore = participantCount > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.finalScore / a.scoreScale) * 100, 0) / participantCount)
      : 0;

    const questionCount = db.questions.filter((q) => q.quizId === quiz.id).length;

    return {
      ...quiz,
      participantCount,
      avgScore, // percentage
      questionCount,
    };
  });

  return res.json({ quizzes: enriched });
});

// Requirement 1 & 13: Creator Dashboard Statistics — STRICT CREATOR OWNERSHIP
apiRouter.get('/creator/stats', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetCreatorId = (req.query.creatorId as string) || authUser?.id;

  if (!targetCreatorId) {
    return res.status(401).json({ error: 'Creator authentication required.' });
  }

  const db = dbManager.getData();
  const creator = db.users.find((u) => u.id === targetCreatorId);
  if (!creator) {
    return res.status(404).json({ error: 'Creator account not found.' });
  }

  // Filter STRICTLY by this creator
  const creatorQuizzes = db.quizzes.filter((q) => q.creatorId === targetCreatorId);
  const quizIds = creatorQuizzes.map((q) => q.id);
  const creatorAttempts = db.attempts.filter((a) => quizIds.includes(a.quizId));

  const totalQuizzes = creatorQuizzes.length;
  const totalParticipants = creatorAttempts.length;

  const totalScorePct = creatorAttempts.reduce((sum, a) => {
    return sum + (a.scoreScale > 0 ? (a.finalScore / a.scoreScale) * 100 : 0);
  }, 0);
  const averageScore = totalParticipants > 0 ? Math.round(totalScorePct / totalParticipants) : 0;

  const creatorHubs = db.learningHubs.filter((h) => h.creatorId === targetCreatorId);
  const hubIds = creatorHubs.map((h) => h.id);
  const totalHubMembers = db.hubMembers.filter((m) => hubIds.includes(m.hubId)).length;

  const followerCount = (db.follows || []).filter((f) => f.creatorId === targetCreatorId).length;

  return res.json({
    stats: {
      creatorId: targetCreatorId,
      creatorName: creator.fullName,
      totalQuizzes,
      totalParticipants,
      averageScore,
      learningHubCount: creatorHubs.length,
      totalHubMembers,
      followerCount,
    },
  });
});

// Get single quiz by id or shareCode
apiRouter.get('/quizzes/:idOrCode', (req: Request, res: Response) => {
  const { idOrCode } = req.params;
  const db = dbManager.getData();

  const quiz = db.quizzes.find((q) => q.id === idOrCode || q.shareCode.toUpperCase() === idOrCode.toUpperCase());
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  const questions = db.questions
    .filter((q) => q.quizId === quiz.id)
    .sort((a, b) => a.order - b.order);

  const attempts = db.attempts.filter((a) => a.quizId === quiz.id);
  const participantCount = attempts.length;
  const avgScore = participantCount > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.finalScore / a.scoreScale) * 100, 0) / participantCount)
    : 0;

  return res.json({
    quiz: {
      ...quiz,
      participantCount,
      avgScore,
      questions,
    },
  });
});

// Create quiz
apiRouter.post('/quizzes', (req: Request, res: Response) => {
  const {
    creatorId,
    creatorName,
    title,
    description,
    coverImage,
    subjects,
    compulsorySubjects,
    optionalSubjects,
    requiredOptionalCount,
    durationMinutes,
    scoreScale,
    accessType,
    leaderboardEnabled,
    questions,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Quiz title is required.' });
  }

  // Access check when payment system is enabled (Requirement 3 & 6)
  const accessCheck = dbManager.checkCreatorAccess(creatorId);
  if (!accessCheck.canCreateQuiz) {
    return res.status(403).json({
      error: accessCheck.message || 'Active creator subscription required to create new quizzes.',
      status: accessCheck.status,
      paymentRequired: true,
    });
  }

  const cleanSubjects: string[] = Array.isArray(subjects) ? subjects.filter(Boolean) : ['General Knowledge'];
  const cleanCompulsory: string[] = Array.isArray(compulsorySubjects) ? compulsorySubjects.filter(Boolean) : [];
  const cleanOptional: string[] = Array.isArray(optionalSubjects) ? optionalSubjects.filter(Boolean) : [];

  const quizId = generateId('quiz');
  const codeSuffix = Math.floor(1000 + Math.random() * 9000);
  const shareCode = `REM-${cleanSubjects[0]?.substring(0, 4).toUpperCase() || 'EXAM'}-${codeSuffix}`;

  const numScale = Number(scoreScale);
  const validScale = !isNaN(numScale) && numScale > 0 ? numScale : 100;

  const parsedDuration = parseNullableInt(durationMinutes);

  const newQuiz: Quiz = {
    id: quizId,
    creatorId: creatorId || 'usr_creator_1',
    creatorName: creatorName || 'Creator',
    title: title.trim(),
    description: description ? description.trim() : '',
    coverImage: coverImage || '',
    subjects: cleanSubjects,
    compulsorySubjects: cleanCompulsory,
    optionalSubjects: cleanOptional,
    requiredOptionalCount: parseNullableInt(requiredOptionalCount) ?? (cleanOptional.length > 0 ? 1 : 0),
    durationMinutes: parsedDuration,
    scoreScale: validScale,
    accessType: accessType === 'private' ? 'private' : 'public',
    shareCode,
    leaderboardEnabled: leaderboardEnabled !== false,
    calculatorEnabled: Boolean(req.body.calculatorEnabled),
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const formattedQuestions: Question[] = [];
  if (Array.isArray(questions) && questions.length > 0) {
    questions.forEach((q: any, idx: number) => {
      if (q.question && q.question.trim()) {
        formattedQuestions.push({
          id: generateId('q'),
          quizId,
          subject: q.subject?.trim() || cleanSubjects[0] || 'General',
          passage: q.passage ? q.passage.trim() : undefined,
          question: q.question.trim(),
          diagram: q.diagram ? q.diagram.trim() : undefined,
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['A', 'B', 'C', 'D'],
          answer: q.answer ? String(q.answer).trim() : (q.options ? q.options[0] : 'A'),
          marks: 1,
          order: idx + 1,
        });
      }
    });
  }

  dbManager.update((state) => {
    state.quizzes.unshift(newQuiz);
    state.questions.push(...formattedQuestions);
    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'QUIZ_CREATE',
      details: `Quiz "${newQuiz.title}" created with ${formattedQuestions.length} questions. Code: ${newQuiz.shareCode}`,
      actor: newQuiz.creatorName,
      timestamp: new Date().toISOString(),
    });
  });

  return res.status(201).json({ quiz: newQuiz, questions: formattedQuestions });
});

// Update quiz
apiRouter.put('/quizzes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    coverImage,
    subjects,
    compulsorySubjects,
    optionalSubjects,
    requiredOptionalCount,
    durationMinutes,
    scoreScale,
    accessType,
    leaderboardEnabled,
    questions,
  } = req.body;

  const db = dbManager.getData();
  const quiz = db.quizzes.find((q) => q.id === id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  const numScale = Number(scoreScale);
  const validScale = scoreScale !== undefined && !isNaN(numScale) && numScale > 0
    ? numScale
    : quiz.scoreScale;

  dbManager.update((state) => {
    const target = state.quizzes.find((q) => q.id === id);
    if (target) {
      if (title) target.title = title.trim();
      if (description !== undefined) target.description = description.trim();
      if (coverImage !== undefined) target.coverImage = coverImage;
      if (Array.isArray(subjects)) target.subjects = subjects.filter(Boolean);
      if (Array.isArray(compulsorySubjects)) target.compulsorySubjects = compulsorySubjects.filter(Boolean);
      if (Array.isArray(optionalSubjects)) target.optionalSubjects = optionalSubjects.filter(Boolean);
      if (requiredOptionalCount !== undefined) {
        target.requiredOptionalCount = parseNullableInt(requiredOptionalCount) ?? 0;
      }
      if (durationMinutes !== undefined) {
        target.durationMinutes = parseNullableInt(durationMinutes);
      }
      target.scoreScale = validScale;
      if (accessType) target.accessType = accessType;
      if (leaderboardEnabled !== undefined) target.leaderboardEnabled = Boolean(leaderboardEnabled);
      if (req.body.calculatorEnabled !== undefined) target.calculatorEnabled = Boolean(req.body.calculatorEnabled);
      target.updatedAt = new Date().toISOString();
    }

    // If questions were provided, replace or update
    if (Array.isArray(questions)) {
      state.questions = state.questions.filter((q) => q.quizId !== id);
      const newQuestions: Question[] = questions.map((q: any, idx: number) => ({
        id: q.id && q.id.startsWith('q_') ? q.id : generateId('q'),
        quizId: id,
        subject: q.subject?.trim() || (target?.subjects[0] || 'General'),
        passage: q.passage ? q.passage.trim() : undefined,
        question: q.question.trim(),
        diagram: q.diagram ? q.diagram.trim() : undefined,
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['A', 'B', 'C', 'D'],
        answer: q.answer ? String(q.answer).trim() : (q.options ? q.options[0] : 'A'),
        marks: 1,
        order: idx + 1,
      }));
      state.questions.push(...newQuestions);
    }

    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'QUIZ_UPDATE',
      details: `Quiz "${quiz.title}" (${id}) updated.`,
      actor: quiz.creatorName,
      timestamp: new Date().toISOString(),
    });
  });

  const updatedQuiz = dbManager.getData().quizzes.find((q) => q.id === id);
  const updatedQuestions = dbManager.getData().questions.filter((q) => q.quizId === id);
  return res.json({ quiz: updatedQuiz, questions: updatedQuestions });
});

// Delete quiz (CASCADE: delete quiz, questions, attempts, live sessions, links)
apiRouter.delete('/quizzes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getData();

  const quiz = db.quizzes.find((q) => q.id === id);
  if (!quiz) {
    // If not found in DB, return 404 with verification flag
    return res.status(404).json({ error: 'Quiz not found or already deleted.', verifiedDeleted: true });
  }

  const quizTitle = quiz.title;

  dbManager.update((state) => {
    // 1. Delete quiz
    state.quizzes = state.quizzes.filter((q) => q.id !== id);
    // 2. Delete questions
    state.questions = state.questions.filter((q) => q.quizId !== id);
    // 3. Delete attempts
    state.attempts = state.attempts.filter((a) => a.quizId !== id);
    // 4. Delete live sessions
    state.liveSessions = state.liveSessions.filter((s) => s.quizId !== id);
    // 5. Unlink from any hub materials
    state.hubMaterials = state.hubMaterials.filter((m) => m.quizId !== id);

    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'QUIZ_DELETE',
      details: `Quiz "${quizTitle}" (${id}) and all cascading records (questions, attempts, live sessions) permanently deleted.`,
      actor: 'System/Creator',
      timestamp: new Date().toISOString(),
    });
  });

  // Verify deletion
  const verifyDb = dbManager.getData();
  const stillExists = verifyDb.quizzes.some((q) => q.id === id);

  return res.json({
    success: true,
    message: `Quiz "${quizTitle}" has been completely removed from the database and all dependent records.`,
    deletedId: id,
    verifiedDeleted: !stillExists,
  });
});

// ==========================================
// 3. CBT SESSIONS & ATTEMPTS
// ==========================================

// Check access / prior attempt
apiRouter.post('/cbt/check-access', (req: Request, res: Response) => {
  const { quizId, email } = req.body;
  if (!quizId || !email) {
    return res.status(400).json({ error: 'quizId and email are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = dbManager.getData();

  const quiz = db.quizzes.find((q) => q.id === quizId || q.shareCode.toUpperCase() === quizId.toUpperCase());
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz does not exist.' });
  }

  // Check one-attempt rule
  const priorAttempt = db.attempts.find(
    (a) => a.quizId === quiz.id && a.participantEmail.toLowerCase() === cleanEmail
  );

  return res.json({
    canAttempt: !priorAttempt,
    priorAttempt: priorAttempt || null,
    quiz,
  });
});

// Start live CBT session
apiRouter.post('/cbt/start-session', (req: Request, res: Response) => {
  const { quizId, participantName, participantEmail, selectedSubjects } = req.body;
  if (!quizId || !participantName || !participantEmail) {
    return res.status(400).json({ error: 'quizId, participantName, and participantEmail are required.' });
  }

  const cleanEmail = participantEmail.trim().toLowerCase();
  const db = dbManager.getData();

  const quiz = db.quizzes.find((q) => q.id === quizId || q.shareCode.toUpperCase() === quizId.toUpperCase());
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  // Get total question count for chosen subjects
  const chosen = Array.isArray(selectedSubjects) && selectedSubjects.length > 0
    ? selectedSubjects
    : quiz.subjects;

  const relevantQuestions = db.questions.filter(
    (q) => q.quizId === quiz.id && chosen.includes(q.subject)
  );

  const sessionId = generateId('sess');
  const session: LiveSession = {
    id: sessionId,
    quizId: quiz.id,
    participantName: participantName.trim(),
    participantEmail: cleanEmail,
    selectedSubjects: chosen,
    currentQuestionIndex: 1,
    totalQuestions: relevantQuestions.length,
    startedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    status: 'active',
  };

  dbManager.update((state) => {
    // Remove stale sessions for this participant on this quiz
    state.liveSessions = state.liveSessions.filter(
      (s) => !(s.quizId === quiz.id && s.participantEmail.toLowerCase() === cleanEmail)
    );
    state.liveSessions.push(session);
  });

  return res.json({ session });
});

// CBT Heartbeat
apiRouter.post('/cbt/heartbeat', (req: Request, res: Response) => {
  const { quizId, participantEmail, currentQuestionIndex } = req.body;
  if (!quizId || !participantEmail) {
    return res.status(400).json({ error: 'Missing parameters.' });
  }

  const cleanEmail = participantEmail.trim().toLowerCase();

  dbManager.update((state) => {
    const session = state.liveSessions.find(
      (s) => s.quizId === quizId && s.participantEmail.toLowerCase() === cleanEmail && s.status === 'active'
    );
    if (session) {
      session.lastHeartbeat = new Date().toISOString();
      if (currentQuestionIndex !== undefined) {
        session.currentQuestionIndex = currentQuestionIndex;
      }
    }
  });

  return res.json({ ok: true });
});

// Submit CBT Attempt
apiRouter.post('/cbt/submit', (req: Request, res: Response) => {
  const {
    quizId,
    participantName,
    participantEmail,
    userId,
    selectedSubjects,
    answers,
    timeUsedSeconds,
    startedAt,
  } = req.body;

  if (!quizId || !participantName || !participantEmail || !answers) {
    return res.status(400).json({ error: 'Incomplete submission data.' });
  }

  const cleanEmail = participantEmail.trim().toLowerCase();
  const db = dbManager.getData();

  const quiz = db.quizzes.find((q) => q.id === quizId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  // Check one-attempt rule again
  const existingAttempt = db.attempts.find(
    (a) => a.quizId === quiz.id && a.participantEmail.toLowerCase() === cleanEmail
  );
  if (existingAttempt) {
    return res.status(409).json({
      error: 'You have already submitted an attempt for this quiz.',
      attempt: existingAttempt,
    });
  }

  const chosenSubjects = Array.isArray(selectedSubjects) && selectedSubjects.length > 0
    ? selectedSubjects
    : quiz.subjects;

  // Filter questions for the student's selected subjects
  const relevantQuestions = db.questions.filter(
    (q) => q.quizId === quiz.id && chosenSubjects.includes(q.subject)
  );

  let totalCorrect = 0;
  let totalQuestions = relevantQuestions.length;

  const subjectScores: Record<string, { total: number; correct: number; percentage: number; scaledScore: number }> = {};

  // Initialize subjects
  chosenSubjects.forEach((sub: string) => {
    subjectScores[sub] = { total: 0, correct: 0, percentage: 0, scaledScore: 0 };
  });

  relevantQuestions.forEach((q) => {
    const studentAnswer = answers[q.id];
    const isCorrect = studentAnswer !== undefined &&
      String(studentAnswer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();

    const sub = q.subject || 'General';
    if (!subjectScores[sub]) {
      subjectScores[sub] = { total: 0, correct: 0, percentage: 0, scaledScore: 0 };
    }

    subjectScores[sub].total += 1;
    if (isCorrect) {
      subjectScores[sub].correct += 1;
      totalCorrect += 1;
    }
  });

  // Calculate subject percentages & proportional scaled scores
  // Scale breakdown per subject if scale is e.g. 400 across 4 subjects
  const subjectCount = Object.keys(subjectScores).length || 1;
  const scalePerSubject = quiz.scoreScale / subjectCount;

  Object.keys(subjectScores).forEach((sub) => {
    const s = subjectScores[sub];
    s.percentage = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    s.scaledScore = Math.round((s.percentage / 100) * scalePerSubject);
  });

  // Proportional final score based on overall percentage
  const overallPercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;
  const finalScore = Math.round(overallPercentage * quiz.scoreScale);
  const formattedScore = `${finalScore}/${quiz.scoreScale}`;

  const attemptId = generateId('att');
  const attemptRecord: QuizAttempt = {
    id: attemptId,
    quizId: quiz.id,
    participantName: participantName.trim(),
    participantEmail: cleanEmail,
    userId: userId || undefined,
    selectedSubjects: chosenSubjects,
    answers,
    subjectScores,
    totalQuestions,
    correctCount: totalCorrect,
    wrongCount: totalQuestions - totalCorrect,
    finalScore,
    scoreScale: quiz.scoreScale,
    formattedScore,
    timeUsedSeconds: Number(timeUsedSeconds) || 0,
    startedAt: startedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    hiddenFromLeaderboard: false,
  };

  dbManager.update((state) => {
    state.attempts.push(attemptRecord);
    // Mark live session as completed
    const session = state.liveSessions.find(
      (s) => s.quizId === quiz.id && s.participantEmail.toLowerCase() === cleanEmail
    );
    if (session) {
      session.status = 'completed';
    }

    // Requirement 6: Record assessment into Learning Hub membership history
    const memberHubs = state.hubMembers.filter(
      (m) => m.userEmail.toLowerCase() === cleanEmail || (userId && m.userId === userId)
    );

    memberHubs.forEach((m) => {
      const hub = state.learningHubs.find((h) => h.id === m.hubId);
      // Attach if quiz is explicitly linked to hub, or belongs to the hub creator
      const isHubQuiz =
        hub?.assessmentQuizIds?.includes(quiz.id) ||
        hub?.creatorId === quiz.creatorId ||
        quiz.creatorId === 'usr_creator_1';

      if (isHubQuiz) {
        if (!m.completedAssessments) m.completedAssessments = [];
        // Avoid duplicate attempt entry for same quiz attempt
        if (!m.completedAssessments.some((rec) => rec.id === attemptId)) {
          const simplifiedSubScores: Record<string, { total: number; correct: number; percentage: number }> = {};
          Object.entries(subjectScores).forEach(([sub, sc]) => {
            simplifiedSubScores[sub] = {
              total: sc.total,
              correct: sc.correct,
              percentage: sc.percentage,
            };
          });

          m.completedAssessments.unshift({
            id: attemptId,
            quizId: quiz.id,
            quizTitle: quiz.title,
            subjectScores: simplifiedSubScores,
            finalScore,
            scoreScale: quiz.scoreScale,
            percentage: Math.round(overallPercentage * 100),
            completedAt: attemptRecord.completedAt,
          });
        }
      }
    });

    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'QUIZ_SUBMITTED',
      details: `${participantName} completed "${quiz.title}" with score ${formattedScore}.`,
      actor: cleanEmail,
      timestamp: new Date().toISOString(),
    });
  });

  return res.status(201).json({ attempt: attemptRecord });
});

// Get attempt details
apiRouter.get('/cbt/attempt/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getData();

  const attempt = db.attempts.find((a) => a.id === id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt record not found.' });
  }

  const quiz = db.quizzes.find((q) => q.id === attempt.quizId);
  const questions = db.questions.filter((q) => q.quizId === attempt.quizId);

  return res.json({ attempt, quiz, questions });
});

// Creator/Admin Reset participant attempt
apiRouter.post('/cbt/reset-attempt', (req: Request, res: Response) => {
  const { attemptId, quizId, participantEmail } = req.body;
  const db = dbManager.getData();

  dbManager.update((state) => {
    if (attemptId) {
      state.attempts = state.attempts.filter((a) => a.id !== attemptId);
    } else if (quizId && participantEmail) {
      state.attempts = state.attempts.filter(
        (a) => !(a.quizId === quizId && a.participantEmail.toLowerCase() === participantEmail.trim().toLowerCase())
      );
    }

    // Also remove from live sessions so they can start fresh
    if (quizId && participantEmail) {
      state.liveSessions = state.liveSessions.filter(
        (s) => !(s.quizId === quizId && s.participantEmail.toLowerCase() === participantEmail.trim().toLowerCase())
      );
    }

    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'ATTEMPT_RESET',
      details: `Attempt reset for ${participantEmail || attemptId}.`,
      actor: 'Creator/Admin',
      timestamp: new Date().toISOString(),
    });
  });

  return res.json({ success: true, message: 'Attempt reset successfully. Participant may retake the quiz.' });
});

// ==========================================
// 4. LIVE PARTICIPANTS
// ==========================================

apiRouter.get('/quizzes/:id/live-participants', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getData();

  // Active within last 45 seconds
  const cutoff = Date.now() - 45 * 1000;
  const activeSessions = db.liveSessions.filter((s) => {
    if (s.quizId !== id) return false;
    if (s.status !== 'active') return false;
    const heartbeatTime = new Date(s.lastHeartbeat).getTime();
    return heartbeatTime >= cutoff;
  });

  return res.json({
    count: activeSessions.length,
    participants: activeSessions.map((s) => ({
      id: s.id,
      name: s.participantName,
      email: s.participantEmail,
      selectedSubjects: s.selectedSubjects,
      currentQuestion: s.currentQuestionIndex,
      totalQuestions: s.totalQuestions,
      progress: `Question ${s.currentQuestionIndex}/${s.totalQuestions}`,
      startedAt: s.startedAt,
      status: s.status,
    })),
  });
});

// ==========================================
// 5. LEADERBOARD
// ==========================================

apiRouter.get('/quizzes/:id/leaderboard', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getData();

  const quiz = db.quizzes.find((q) => q.id === id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  // Filter visible attempts for this quiz
  const visibleAttempts = db.attempts
    .filter((a) => a.quizId === id && !a.hiddenFromLeaderboard)
    .sort((a, b) => {
      // Sort by final score descending, then by time used ascending
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return a.timeUsedSeconds - b.timeUsedSeconds;
    });

  const ranked = visibleAttempts.map((att, idx) => ({
    rank: idx + 1,
    attemptId: att.id,
    student: att.participantName,
    email: att.participantEmail,
    subjects: att.selectedSubjects.join(', '),
    score: att.formattedScore,
    numericScore: att.finalScore,
    scale: att.scoreScale,
    timeUsedSeconds: att.timeUsedSeconds,
    completedAt: att.completedAt,
  }));

  return res.json({
    quizTitle: quiz.title,
    leaderboardEnabled: quiz.leaderboardEnabled,
    scoreScale: quiz.scoreScale,
    leaderboard: ranked,
  });
});

// Hide participant from leaderboard without deleting attempt
apiRouter.put('/quizzes/:id/leaderboard/hide-participant', (req: Request, res: Response) => {
  const { attemptId } = req.body;
  if (!attemptId) {
    return res.status(400).json({ error: 'attemptId is required.' });
  }

  dbManager.update((state) => {
    const attempt = state.attempts.find((a) => a.id === attemptId);
    if (attempt) {
      attempt.hiddenFromLeaderboard = true;
      state.auditLogs.unshift({
        id: generateId('log'),
        action: 'LEADERBOARD_HIDE',
        details: `Participant ${attempt.participantName} hidden from leaderboard on quiz ${attempt.quizId}.`,
        actor: 'Creator',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return res.json({ success: true });
});

// ==========================================
// 6. LEARNING HUBS & MATERIALS
// ==========================================

// Get all hubs
apiRouter.get('/hubs', (req: Request, res: Response) => {
  const db = dbManager.getData();
  const hubs = db.learningHubs.map((hub) => {
    const memberCount = db.hubMembers.filter((m) => m.hubId === hub.id).length;
    const materialCount = db.hubMaterials.filter((m) => m.hubId === hub.id).length;
    return {
      ...hub,
      memberCount,
      materialCount,
    };
  });

  return res.json({ hubs });
});

// Get single hub
apiRouter.get('/hubs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getData();

  const hub = db.learningHubs.find((h) => h.id === id);
  if (!hub) {
    return res.status(404).json({ error: 'Hub not found.' });
  }

  const members = db.hubMembers.filter((m) => m.hubId === id);
  const materials = db.hubMaterials
    .filter((m) => m.hubId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Link quizzes associated with this creator or materials
  const creatorQuizzes = db.quizzes.filter((q) => q.creatorId === hub.creatorId);

  return res.json({
    hub: {
      ...hub,
      memberCount: members.length,
      members,
      materials,
      quizzes: creatorQuizzes,
    },
  });
});

// Create hub
apiRouter.post('/hubs', (req: Request, res: Response) => {
  const { creatorId, creatorName, title, description, subject, coverColor, isPublic } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Hub title is required.' });
  }

  // Access check when payment system is enabled (Requirement 3 & 6)
  const accessCheck = dbManager.checkCreatorAccess(creatorId);
  if (!accessCheck.canCreateHub) {
    return res.status(403).json({
      error: accessCheck.message || 'Active creator subscription required to create new learning hubs.',
      status: accessCheck.status,
      paymentRequired: true,
    });
  }

  const hubId = generateId('hub');
  const newHub: LearningHub = {
    id: hubId,
    creatorId: creatorId || 'usr_creator_1',
    creatorName: creatorName || 'Creator',
    title: title.trim(),
    description: description ? description.trim() : '',
    subject: subject ? subject.trim() : 'General Sciences',
    coverColor: coverColor || 'navy',
    isPublic: isPublic !== false,
    createdAt: new Date().toISOString(),
  };

  dbManager.update((state) => {
    state.learningHubs.unshift(newHub);
    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'HUB_CREATE',
      details: `Learning Hub "${newHub.title}" created.`,
      actor: newHub.creatorName,
      timestamp: new Date().toISOString(),
    });
  });

  return res.status(201).json({ hub: newHub });
});

// Join hub
apiRouter.post('/hubs/:id/join', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName, userEmail } = req.body;

  if (!userName || !userEmail) {
    return res.status(400).json({ error: 'Name and email are required to join.' });
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  const db = dbManager.getData();

  const hub = db.learningHubs.find((h) => h.id === id);
  if (!hub) {
    return res.status(404).json({ error: 'Hub not found.' });
  }

  const alreadyJoined = db.hubMembers.find(
    (m) => m.hubId === id && m.userEmail.toLowerCase() === cleanEmail
  );

  if (alreadyJoined) {
    return res.json({ success: true, message: 'You are already a member of this hub.' });
  }

  const member: HubMember = {
    id: generateId('hm'),
    hubId: id,
    userId: userId || generateId('usr'),
    userName: userName.trim(),
    userEmail: cleanEmail,
    joinedAt: new Date().toISOString(),
  };

  dbManager.update((state) => {
    state.hubMembers.push(member);
  });

  return res.status(201).json({ success: true, member });
});

// Add material to hub
apiRouter.post('/hubs/:id/materials', (req: Request, res: Response) => {
  const { id } = req.params;
  const { creatorId, title, description, type, content, quizId } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const material: HubMaterial = {
    id: generateId('mat'),
    hubId: id,
    creatorId: creatorId || 'usr_creator_1',
    title: title.trim(),
    description: description ? description.trim() : '',
    type: type || 'note',
    content: content.trim(),
    quizId: quizId || undefined,
    createdAt: new Date().toISOString(),
  };

  dbManager.update((state) => {
    state.hubMaterials.unshift(material);
  });

  return res.status(201).json({ material });
});

// Hub student performance analytics
apiRouter.get('/hubs/:id/performance', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getData();

  const members = db.hubMembers.filter((m) => m.hubId === id);
  const hub = db.learningHubs.find((h) => h.id === id);

  const studentEmails = members.map((m) => m.userEmail.toLowerCase());
  const memberAttempts = db.attempts.filter((a) => studentEmails.includes(a.participantEmail.toLowerCase()));

  const performance = members.map((m) => {
    const attempts = memberAttempts.filter((a) => a.participantEmail.toLowerCase() === m.userEmail.toLowerCase());
    const count = attempts.length;
    const avgScore = count > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.finalScore / a.scoreScale) * 100, 0) / count)
      : null;

    return {
      memberId: m.id,
      name: m.userName,
      email: m.userEmail,
      joinedAt: m.joinedAt,
      quizzesTaken: count,
      averageScore: avgScore !== null ? `${avgScore}%` : 'No attempts',
      latestAttempt: attempts[attempts.length - 1] || null,
    };
  });

  return res.json({ hubTitle: hub?.title, performance });
});

// ==========================================
// 7. RESULTS & ANALYTICS (STUDENT PERFORMANCE)
// ==========================================

apiRouter.get('/analytics/student/:email', (req: Request, res: Response) => {
  const { email } = req.params;
  const cleanEmail = email.trim().toLowerCase();
  const db = dbManager.getData();

  const studentAttempts = db.attempts
    .filter((a) => a.participantEmail.toLowerCase() === cleanEmail)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  const totalAttempts = studentAttempts.length;

  // Track subject performance
  const subjectAggregates: Record<string, { totalQ: number; correctQ: number }> = {};
  studentAttempts.forEach((att) => {
    Object.entries(att.subjectScores).forEach(([sub, scoreObj]) => {
      if (!subjectAggregates[sub]) {
        subjectAggregates[sub] = { totalQ: 0, correctQ: 0 };
      }
      subjectAggregates[sub].totalQ += scoreObj.total;
      subjectAggregates[sub].correctQ += scoreObj.correct;
    });
  });

  const subjectPerformance = Object.entries(subjectAggregates).map(([subject, data]) => {
    const percentage = data.totalQ > 0 ? Math.round((data.correctQ / data.totalQ) * 100) : 0;
    return {
      subject,
      totalQuestions: data.totalQ,
      correctQuestions: data.correctQ,
      accuracyPercentage: percentage,
    };
  });

  // Calculate weak areas and strong areas ONLY if sufficient data exists
  // If fewer than 2 attempts or fewer than 6 questions answered overall, return "Not enough data yet"
  const hasEnoughData = totalAttempts >= 2 && Object.values(subjectAggregates).some((d) => d.totalQ >= 4);

  let strongAreas: string[] | null = null;
  let weakAreas: string[] | null = null;
  let strongMessage = 'Not enough data yet';
  let weakMessage = 'Not enough data yet';

  if (hasEnoughData) {
    const sorted = [...subjectPerformance].sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    const strong = sorted.filter((s) => s.accuracyPercentage >= 75);
    const weak = sorted.filter((s) => s.accuracyPercentage < 65);

    if (strong.length > 0) {
      strongAreas = strong.map((s) => `${s.subject} (${s.accuracyPercentage}% accuracy)`);
      strongMessage = `${strong.length} mastery subjects identified`;
    }
    if (weak.length > 0) {
      weakAreas = weak.map((s) => `${s.subject} (${s.accuracyPercentage}% accuracy - needs reinforcement)`);
      weakMessage = `${weak.length} focus subjects requiring review`;
    } else {
      weakMessage = 'Consistent performance across attempted subjects';
    }
  }

  // Improvement over time
  const timeline = studentAttempts.map((att) => ({
    date: att.completedAt.split('T')[0],
    quizTitle: db.quizzes.find((q) => q.id === att.quizId)?.title || 'Quiz',
    score: att.finalScore,
    scale: att.scoreScale,
    percentage: Math.round((att.finalScore / att.scoreScale) * 100),
  }));

  return res.json({
    studentEmail: cleanEmail,
    totalAttempts,
    subjectPerformance,
    hasEnoughData,
    strongAreas,
    strongMessage,
    weakAreas,
    weakMessage,
    timeline,
    recentAttempts: studentAttempts.slice(-5).reverse(),
  });
});

// ==========================================
// 8. ADMIN PLATFORM OVERVIEW & GOVERNANCE
// ==========================================

apiRouter.get('/admin/stats', requireAdmin, (req: Request, res: Response) => {
  const db = dbManager.getData();

  const totalUsers = db.users.length;
  const totalCreators = db.users.filter((u) => u.role === 'creator').length;
  const activeCreators = db.users.filter(
    (u) => u.role === 'creator' && (u.accessStatus === 'active' || (!u.accessExpiresAt && !u.disabled))
  ).length;
  const expiredCreators = db.users.filter(
    (u) => u.role === 'creator' && u.accessStatus === 'expired'
  ).length;
  const totalQuizzes = db.quizzes.length;
  const totalAttempts = db.attempts.length;
  const activeQuizzes = db.quizzes.filter((q) => q.isPublished).length;
  const totalHubs = db.learningHubs.length;
  const pendingPaymentRequests = (db.paymentRequests || []).filter((r) => r.status === 'pending').length;

  return res.json({
    totalUsers,
    totalCreators,
    activeCreators,
    expiredCreators,
    totalQuizzes,
    totalParticipants: totalAttempts,
    activeQuizzes,
    totalHubs,
    pendingPaymentRequests,
    auditLogs: db.auditLogs.slice(0, 25),
  });
});

// Admin System Settings (Master Switch: Payment ON / OFF, Bank Details, Trial rules)
apiRouter.get('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const db = dbManager.getData();
  return res.json({ settings: db.systemSettings });
});

apiRouter.put('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  const updates = req.body;

  dbManager.update((state) => {
    state.systemSettings = {
      ...state.systemSettings,
      ...updates,
      bankDetails: {
        ...state.systemSettings.bankDetails,
        ...(updates.bankDetails || {}),
      },
    };

    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'SETTINGS_UPDATE',
      details: `Payment system master switch set to ${state.systemSettings.paymentSystemEnabled ? 'ON' : 'OFF'}. Free trial: ${state.systemSettings.freeTrialEnabled ? 'ON' : 'OFF'}.`,
      actor: admin?.email || 'Admin',
      timestamp: new Date().toISOString(),
    });
  });

  const updated = dbManager.getData().systemSettings;
  return res.json({ settings: updated });
});

// Admin Search and List Creators (by unique creator code or keyword)
apiRouter.get('/admin/creators', requireAdmin, (req: Request, res: Response) => {
  const db = dbManager.getData();
  const searchCode = (req.query.code as string || '').trim().toUpperCase();
  const searchKeyword = (req.query.search as string || '').trim().toLowerCase();

  let creators = db.users.filter((u) => u.role === 'creator' || u.role === 'admin');

  if (searchCode) {
    creators = creators.filter((u) => u.creatorCode && u.creatorCode.toUpperCase().includes(searchCode));
  } else if (searchKeyword) {
    creators = creators.filter(
      (u) =>
        u.fullName.toLowerCase().includes(searchKeyword) ||
        u.email.toLowerCase().includes(searchKeyword) ||
        (u.creatorCode && u.creatorCode.toLowerCase().includes(searchKeyword))
    );
  }

  // Enrich with creator metrics
  const summaries = creators.map((c) => {
    const creatorQuizzes = db.quizzes.filter((q) => q.creatorId === c.id);
    const quizIds = creatorQuizzes.map((q) => q.id);
    const participantCount = db.attempts.filter((a) => quizIds.includes(a.quizId)).length;
    const hubCount = db.learningHubs.filter((h) => h.creatorId === c.id).length;
    const pendingReqs = (db.paymentRequests || []).filter((r) => r.creatorId === c.id && r.status === 'pending');
    const allReqs = (db.paymentRequests || []).filter((r) => r.creatorId === c.id);
    const latestReq = allReqs[allReqs.length - 1] || null;

    return {
      id: c.id,
      email: c.email,
      fullName: c.fullName,
      creatorCode: c.creatorCode || 'N/A',
      role: c.role,
      createdAt: c.createdAt,
      disabled: Boolean(c.disabled),
      accessStatus: c.accessStatus || 'active',
      trialStartedAt: c.trialStartedAt,
      trialExpiresAt: c.trialExpiresAt,
      accessStartedAt: c.accessStartedAt,
      accessExpiresAt: c.accessExpiresAt,
      accessDurationDays: c.accessDurationDays,
      quizzesCount: creatorQuizzes.length,
      totalParticipants: participantCount,
      learningHubCount: hubCount,
      pendingRequestsCount: pendingReqs.length,
      latestPaymentRequest: latestReq,
    };
  });

  return res.json({ creators: summaries });
});

// Admin Get Single Creator Details
apiRouter.get('/admin/creators/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getData();

  const creator = db.users.find(
    (u) => u.id === id || (u.creatorCode && u.creatorCode.toUpperCase() === id.toUpperCase())
  );

  if (!creator) {
    return res.status(404).json({ error: 'Creator account not found.' });
  }

  const creatorQuizzes = db.quizzes.filter((q) => q.creatorId === creator.id);
  const quizIds = creatorQuizzes.map((q) => q.id);
  const quizAttempts = db.attempts.filter((a) => quizIds.includes(a.quizId));
  const creatorHubs = db.learningHubs.filter((h) => h.creatorId === creator.id);
  const creatorRequests = (db.paymentRequests || []).filter((r) => r.creatorId === creator.id);

  const enrichedQuizzes = creatorQuizzes.map((q) => {
    const qAttempts = db.attempts.filter((a) => a.quizId === q.id);
    const qCount = db.questions.filter((item) => item.quizId === q.id).length;
    return {
      ...q,
      participantCount: qAttempts.length,
      questionCount: qCount,
    };
  });

  return res.json({
    creator: {
      id: creator.id,
      email: creator.email,
      fullName: creator.fullName,
      creatorCode: creator.creatorCode || 'N/A',
      role: creator.role,
      createdAt: creator.createdAt,
      disabled: Boolean(creator.disabled),
      accessStatus: creator.accessStatus || 'active',
      trialStartedAt: creator.trialStartedAt,
      trialExpiresAt: creator.trialExpiresAt,
      accessStartedAt: creator.accessStartedAt,
      accessExpiresAt: creator.accessExpiresAt,
      accessDurationDays: creator.accessDurationDays,
      quizzesCount: creatorQuizzes.length,
      totalParticipants: quizAttempts.length,
      learningHubCount: creatorHubs.length,
    },
    quizzes: enrichedQuizzes,
    hubs: creatorHubs,
    paymentRequests: creatorRequests,
    recentAttempts: quizAttempts.slice(-10).reverse(),
  });
});

// Admin Manually Activate Creator
apiRouter.post('/admin/creators/:id/activate', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { durationDays, notes } = req.body;
  const admin = getAuthUser(req);
  const db = dbManager.getData();

  const days = parseInt(String(durationDays || 30), 10);
  const safeDays = isNaN(days) || days <= 0 ? 30 : days;

  let targetCreator: User | undefined;

  dbManager.update((state) => {
    targetCreator = state.users.find(
      (u) => u.id === id || (u.creatorCode && u.creatorCode.toUpperCase() === id.toUpperCase())
    );

    if (targetCreator) {
      targetCreator.accessStatus = 'active';
      targetCreator.accessStartedAt = new Date().toISOString();
      targetCreator.accessExpiresAt = new Date(Date.now() + safeDays * 86400000).toISOString();
      targetCreator.accessDurationDays = safeDays;
      targetCreator.lastPaymentVerifiedAt = new Date().toISOString();

      state.auditLogs.unshift({
        id: generateId('log'),
        action: 'CREATOR_ACTIVATE',
        details: `Creator ${targetCreator.fullName} (${targetCreator.creatorCode}) activated for ${safeDays} days.${notes ? ` Note: ${notes}` : ''}`,
        actor: admin?.email || 'Admin',
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!targetCreator) {
    return res.status(404).json({ error: 'Creator account not found.' });
  }

  const { password: _, ...safe } = targetCreator;
  return res.json({ creator: safe, message: `Creator activated for ${safeDays} days.` });
});

// Admin Set or Change Custom Expiry Date
apiRouter.post('/admin/creators/:id/set-expiry', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { expiresAt } = req.body;
  const admin = getAuthUser(req);

  if (!expiresAt) {
    return res.status(400).json({ error: 'Expiry date is required.' });
  }

  const targetDate = new Date(expiresAt);
  if (isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format.' });
  }

  let targetCreator: User | undefined;

  dbManager.update((state) => {
    targetCreator = state.users.find(
      (u) => u.id === id || (u.creatorCode && u.creatorCode.toUpperCase() === id.toUpperCase())
    );

    if (targetCreator) {
      targetCreator.accessExpiresAt = targetDate.toISOString();
      targetCreator.accessStatus = targetDate.getTime() > Date.now() ? 'active' : 'expired';

      state.auditLogs.unshift({
        id: generateId('log'),
        action: 'CREATOR_EXPIRY_CHANGE',
        details: `Creator ${targetCreator.fullName} (${targetCreator.creatorCode}) expiry date updated to ${targetDate.toLocaleDateString()}. Status: ${targetCreator.accessStatus}.`,
        actor: admin?.email || 'Admin',
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!targetCreator) {
    return res.status(404).json({ error: 'Creator account not found.' });
  }

  const { password: _, ...safe } = targetCreator;
  return res.json({ creator: safe, message: `Expiry date updated to ${targetDate.toLocaleDateString()}.` });
});

// Admin Toggle Creator Access (Enable / Disable)
apiRouter.put('/admin/creators/:id/toggle-access', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const admin = getAuthUser(req);
  let targetCreator: User | undefined;

  dbManager.update((state) => {
    targetCreator = state.users.find(
      (u) => u.id === id || (u.creatorCode && u.creatorCode.toUpperCase() === id.toUpperCase())
    );

    if (targetCreator) {
      if (targetCreator.accessStatus === 'disabled') {
        targetCreator.accessStatus = 'active';
        if (!targetCreator.accessExpiresAt || new Date(targetCreator.accessExpiresAt).getTime() < Date.now()) {
          targetCreator.accessExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
        }
      } else {
        targetCreator.accessStatus = 'disabled';
      }

      state.auditLogs.unshift({
        id: generateId('log'),
        action: 'CREATOR_ACCESS_TOGGLE',
        details: `Creator ${targetCreator.fullName} (${targetCreator.creatorCode}) access status toggled to ${targetCreator.accessStatus}.`,
        actor: admin?.email || 'Admin',
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!targetCreator) {
    return res.status(404).json({ error: 'Creator account not found.' });
  }

  const { password: _, ...safe } = targetCreator;
  return res.json({ creator: safe });
});

// ==========================================
// 9. PAYMENT REQUESTS (MANUAL BANK TRANSFERS)
// ==========================================

// Admin list all payment requests
apiRouter.get('/admin/payment-requests', requireAdmin, (req: Request, res: Response) => {
  const db = dbManager.getData();
  const statusFilter = req.query.status as string;

  let list = db.paymentRequests || [];
  if (statusFilter) {
    list = list.filter((r) => r.status === statusFilter);
  }

  const sorted = [...list].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  return res.json({ requests: sorted });
});

// Admin Verify and Activate Payment Request
apiRouter.post('/admin/payment-requests/:id/verify', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { durationDays } = req.body;
  const admin = getAuthUser(req);
  const db = dbManager.getData();

  const days = parseInt(String(durationDays || db.systemSettings.paidAccessDurationDays || 30), 10);
  const safeDays = isNaN(days) || days <= 0 ? 30 : days;

  let matchedRequest: PaymentRequest | undefined;
  let matchedCreator: User | undefined;

  dbManager.update((state) => {
    matchedRequest = (state.paymentRequests || []).find((r) => r.id === id);

    if (matchedRequest) {
      matchedRequest.status = 'verified';
      matchedRequest.verifiedAt = new Date().toISOString();
      matchedRequest.verifiedBy = admin?.email || 'Admin';
      matchedRequest.durationGrantedDays = safeDays;

      matchedCreator = state.users.find((u) => u.id === matchedRequest?.creatorId);
      if (matchedCreator) {
        matchedCreator.accessStatus = 'active';
        matchedCreator.accessStartedAt = new Date().toISOString();
        matchedCreator.accessExpiresAt = new Date(Date.now() + safeDays * 86400000).toISOString();
        matchedCreator.accessDurationDays = safeDays;
        matchedCreator.lastPaymentVerifiedAt = new Date().toISOString();
      }

      state.auditLogs.unshift({
        id: generateId('log'),
        action: 'PAYMENT_VERIFY',
        details: `Payment request ${matchedRequest.id} for ${matchedRequest.creatorName} verified. Account activated for ${safeDays} days.`,
        actor: admin?.email || 'Admin',
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!matchedRequest) {
    return res.status(404).json({ error: 'Payment request not found.' });
  }

  return res.json({
    request: matchedRequest,
    creator: matchedCreator,
    message: `Payment verified. Creator account activated for ${safeDays} days.`,
  });
});

// Admin Reject Payment Request
apiRouter.post('/admin/payment-requests/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const admin = getAuthUser(req);

  let matchedRequest: PaymentRequest | undefined;

  dbManager.update((state) => {
    matchedRequest = (state.paymentRequests || []).find((r) => r.id === id);

    if (matchedRequest) {
      matchedRequest.status = 'rejected';
      matchedRequest.rejectionReason = reason ? String(reason).trim() : 'Payment reference could not be verified.';

      state.auditLogs.unshift({
        id: generateId('log'),
        action: 'PAYMENT_REJECT',
        details: `Payment request ${matchedRequest.id} rejected. Reason: ${matchedRequest.rejectionReason}`,
        actor: admin?.email || 'Admin',
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!matchedRequest) {
    return res.status(404).json({ error: 'Payment request not found.' });
  }

  return res.json({ request: matchedRequest, message: 'Payment request rejected.' });
});

// Admin Delete Payment Request
apiRouter.delete('/admin/payment-requests/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;

  dbManager.update((state) => {
    state.paymentRequests = (state.paymentRequests || []).filter((r) => r.id !== id);
  });

  return res.json({ success: true });
});

// ==========================================
// 10. CREATOR ACCESS & "I HAVE PAID" WORKFLOW
// ==========================================

// Creator Get Current Access Status
apiRouter.get('/creator/access-status', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const db = dbManager.getData();
  const settings = db.systemSettings;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const access = dbManager.checkCreatorAccess(user.id);
  const userPendingReq = (db.paymentRequests || []).find(
    (r) => r.creatorId === user.id && r.status === 'pending'
  );

  return res.json({
    paymentSystemEnabled: settings.paymentSystemEnabled,
    userRole: user.role,
    creatorCode: user.creatorCode,
    accessStatus: user.accessStatus || 'active',
    accessExpiresAt: user.accessExpiresAt || null,
    trialExpiresAt: user.trialExpiresAt || null,
    canCreateQuiz: access.canCreateQuiz,
    canCreateHub: access.canCreateHub,
    accessFeeAmount: settings.accessFeeAmount,
    currency: settings.currency,
    bankDetails: settings.bankDetails,
    pendingRequest: userPendingReq || null,
  });
});

// Creator Submit Payment Request ("I Have Paid")
apiRouter.post('/creator/payment-request', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required to submit payment.' });
  }

  const { amount, senderName, senderBank, referenceNumber, notes, receiptUrl } = req.body;

  if (!senderName || !referenceNumber) {
    return res.status(400).json({ error: 'Sender name and payment reference / narration are required.' });
  }

  const db = dbManager.getData();
  const settings = db.systemSettings;

  const newRequest: PaymentRequest = {
    id: generateId('pay_req'),
    creatorId: user.id,
    creatorName: user.fullName,
    creatorEmail: user.email,
    creatorCode: user.creatorCode || 'N/A',
    amount: Number(amount) || settings.accessFeeAmount || 5000,
    currency: settings.currency || 'NGN',
    paymentMethod: 'manual_transfer',
    senderName: String(senderName).trim(),
    senderBank: senderBank ? String(senderBank).trim() : undefined,
    referenceNumber: String(referenceNumber).trim(),
    notes: notes ? String(notes).trim() : undefined,
    receiptUrl: receiptUrl ? String(receiptUrl).trim() : undefined,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  dbManager.update((state) => {
    if (!state.paymentRequests) state.paymentRequests = [];
    state.paymentRequests.unshift(newRequest);

    state.auditLogs.unshift({
      id: generateId('log'),
      action: 'PAYMENT_SUBMITTED',
      details: `Creator ${user.fullName} (${user.creatorCode}) submitted payment request ${newRequest.id} for ${newRequest.amount} ${newRequest.currency}.`,
      actor: user.email,
      timestamp: new Date().toISOString(),
    });
  });

  return res.status(201).json({
    request: newRequest,
    message: 'Payment confirmation submitted successfully. Awaiting administrator manual verification.',
  });
});

