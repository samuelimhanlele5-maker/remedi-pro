import fs from 'fs';
import path from 'path';
import pg from 'pg';
import type { PoolClient } from 'pg';

export type CreatorAccessState = 'active' | 'trial' | 'expired' | 'disabled';

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: 'student' | 'creator' | 'admin';
  avatarUrl?: string;
  bio?: string;
  disabled?: boolean;
  createdAt: string;
  creatorCode?: string;
  accessStatus?: CreatorAccessState;
  trialStartedAt?: string;
  trialExpiresAt?: string;
  accessStartedAt?: string;
  accessExpiresAt?: string;
  accessDurationDays?: number;
  lastPaymentVerifiedAt?: string;
}

export interface BankPaymentDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  whatsappNumber: string;
}

export interface SystemSettings {
  paymentSystemEnabled: boolean; // Master switch: ON / OFF
  freeTrialEnabled: boolean;
  trialDurationDays: number;
  paidAccessDurationDays: number;
  requirePaymentForQuizCreation: boolean;
  requirePaymentForHubCreation: boolean;
  accessFeeAmount: number;
  currency: string;
  paymentMethod: 'manual_transfer';
  bankDetails: BankPaymentDetails;
}

export interface PaymentRequest {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorCode: string;
  amount: number;
  currency: string;
  paymentMethod: 'manual_transfer';
  senderName: string;
  senderBank?: string;
  referenceNumber: string;
  notes?: string;
  receiptUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  requestedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  durationGrantedDays?: number;
}

export interface Question {
  id: string;
  quizId: string;
  subject: string;
  passage?: string;
  question: string;
  diagram?: string;
  options: string[];
  answer: string;
  marks?: number;
  order: number;
}

export interface Quiz {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  coverImage?: string;
  subjects: string[];
  compulsorySubjects: string[];
  optionalSubjects: string[];
  requiredOptionalCount: number;
  durationMinutes: number | null;
  scoreScale: number;
  accessType: 'public' | 'private';
  maxAttempts?: number; // public quizzes: attempts allowed per email (0 = unlimited)
  shareCode: string;
  leaderboardEnabled: boolean;
  calculatorEnabled?: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  participantName: string;
  participantEmail: string;
  userId?: string;
  selectedSubjects: string[];
  answers: Record<string, string>;
  subjectScores: Record<string, { total: number; correct: number; percentage: number; scaledScore: number }>;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  finalScore: number;
  scoreScale: number;
  formattedScore: string;
  timeUsedSeconds: number;
  startedAt: string;
  completedAt: string;
  hiddenFromLeaderboard?: boolean;
}

export interface LiveSession {
  id: string;
  quizId: string;
  participantName: string;
  participantEmail: string;
  selectedSubjects: string[];
  currentQuestionIndex: number;
  totalQuestions: number;
  startedAt: string;
  lastHeartbeat: string;
  status: 'active' | 'completed' | 'abandoned';
}

export type HubAccessType = 'free' | 'paid';
export type HubMembershipModel = 'free' | 'monthly' | 'yearly' | 'lifetime';

export interface TutorialLink {
  id: string;
  platform: 'youtube' | 'google_meet' | 'zoom' | 'other';
  title: string;
  url: string;
}

export interface MemberAssessmentRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  subjectScores?: Record<string, { total: number; correct: number; percentage: number }>;
  finalScore: number;
  scoreScale: number;
  percentage: number;
  completedAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followerName: string;
  followerEmail: string;
  creatorId: string;
  createdAt: string;
}

export interface LearningHub {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  title: string;
  description: string;
  subject: string;
  category?: 'study_group' | 'educational_community' | 'tutorial_coaching' | 'institution' | 'exam_prep' | 'general';
  coverColor?: string;
  isPublic: boolean;
  
  // Access and Pricing (Requirement 8)
  accessType?: HubAccessType;
  membershipModel?: HubMembershipModel;
  membershipFee?: number;
  currency?: string;
  paymentInstructions?: string;

  // Joining Requirements (Requirement 4)
  compulsorySubjects?: string[];
  optionalSubjects?: string[];
  requiredOptionalCount?: number;

  // External Online Tutorial Links (Requirement 10)
  tutorialLinks?: TutorialLink[];

  // Attached Assessment Quizzes (Requirement 6)
  assessmentQuizIds?: string[];

  createdAt: string;
  updatedAt?: string;
}

export interface HubMember {
  id: string;
  hubId: string;
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;

  // Selected subjects chosen by member upon joining (Requirement 4 & 5)
  selectedSubjects?: string[];

  // Membership & payment
  membershipType?: HubMembershipModel;
  isPaid?: boolean;

  // Member assessment records inside this hub (Requirement 5, 6, 7)
  completedAssessments?: MemberAssessmentRecord[];
  lastActiveAt?: string;
}

export interface HubMaterial {
  id: string;
  hubId: string;
  creatorId: string;
  title: string;
  description: string;
  type: 'note' | 'tutorial' | 'guide' | 'quiz_link';
  content: string;
  quizId?: string;
  isMemberOnly?: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  actor: string;
  timestamp: string;
}

export interface Registration {
  id: string;
  quizId: string;
  name: string;
  email: string;
  phone: string;
  code: string;
  status: 'active' | 'cancelled';
  createdAt: string;
  usedAt?: string;
  attemptId?: string;
}

export interface DatabaseSchema {
  registrations: Registration[];
  users: User[];
  quizzes: Quiz[];
  questions: Question[];
  attempts: QuizAttempt[];
  liveSessions: LiveSession[];
  learningHubs: LearningHub[];
  hubMembers: HubMember[];
  hubMaterials: HubMaterial[];
  follows: Follow[];
  auditLogs: AuditLog[];
  paymentRequests: PaymentRequest[];
  systemSettings: SystemSettings;
}

export function generateCreatorCode(existingCodes: string[] = []): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  do {
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `REM-${rand}`;
  } while (existingCodes.includes(code));
  return code;
}

// When DATABASE_URL is set (Vercel + Neon/Supabase Postgres) data lives in Postgres.
// When it is not set (local dev), the app falls back to data/remedi_db.json as before.
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pool = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL, max: 2 }) : null;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'remedi_db.json');

const INITIAL_DB: DatabaseSchema = {
  registrations: [],
  users: [
    {
      id: 'usr_admin',
      email: 'samuelosemu5@gmail.com',
      password: 'password123',
      fullName: 'Samuel Osemu',
      role: 'admin',
      bio: 'Remedi Pro Lead Platform Administrator and Medical Educator',
      disabled: false,
      creatorCode: 'REM-ADMIN1',
      accessStatus: 'active',
      accessStartedAt: new Date(Date.now() - 3600 * 1000 * 24 * 60).toISOString(),
      accessExpiresAt: new Date(Date.now() + 3600 * 1000 * 24 * 365).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr_creator_1',
      email: 'creator@remedipro.edu',
      password: 'password123',
      fullName: 'Dr. Evelyn Clark',
      role: 'creator',
      bio: 'Senior Examiner in Life Sciences & CBT Assessment Lead',
      disabled: false,
      creatorCode: 'REM-8K29X',
      accessStatus: 'active',
      accessStartedAt: new Date(Date.now() - 3600 * 1000 * 24 * 10).toISOString(),
      accessExpiresAt: new Date(Date.now() + 3600 * 1000 * 24 * 20).toISOString(),
      accessDurationDays: 30,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr_student_1',
      email: 'student@remedipro.edu',
      password: 'password123',
      fullName: 'David Adeleke',
      role: 'student',
      bio: 'Pre-Med Student preparing for University CBT Assessments',
      disabled: false,
      createdAt: new Date().toISOString(),
    },
  ],
  quizzes: [
    {
      id: 'quiz_utme_mock',
      creatorId: 'usr_creator_1',
      creatorName: 'Dr. Evelyn Clark',
      title: 'National Pre-Varsity CBT Assessment 2026',
      description: 'Comprehensive multi-subject readiness assessment covering Biology, Chemistry, and elective sciences with JAMB standard scoring.',
      subjects: ['Chemistry', 'Physics', 'Biology', 'English'],
      compulsorySubjects: ['Chemistry', 'Physics', 'Biology', 'English'],
      optionalSubjects: [],
      requiredOptionalCount: 0,
      durationMinutes: 30,
      scoreScale: 400,
      accessType: 'public',
      shareCode: 'REM-UTME-400',
      leaderboardEnabled: true,
      isPublished: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
    },
    {
      id: 'quiz_bio_foundations',
      creatorId: 'usr_creator_1',
      creatorName: 'Dr. Evelyn Clark',
      title: 'Cellular Physiology & Genetics Mastery',
      description: 'Core biological systems quiz focusing on ATP synthesis, membrane dynamics, and Mendelian inheritance.',
      subjects: ['Biology', 'Chemistry'],
      compulsorySubjects: ['Biology'],
      optionalSubjects: ['Chemistry'],
      requiredOptionalCount: 1,
      durationMinutes: 20,
      scoreScale: 100,
      accessType: 'public',
      shareCode: 'REM-CELL-100',
      leaderboardEnabled: true,
      isPublished: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
    }
  ],
  questions: [
    // Biology Compulsory Questions for quiz_utme_mock
    {
      id: 'q_bio_1',
      quizId: 'quiz_utme_mock',
      subject: 'Biology',
      question: 'Which organelle is primarily responsible for the generation of adenosine triphosphate (ATP) via oxidative phosphorylation?',
      options: ['Ribosome', 'Mitochondrion', 'Nucleolus', 'Endoplasmic Reticulum'],
      answer: 'Mitochondrion',
      marks: 1,
      order: 1,
    },
    {
      id: 'q_bio_2',
      quizId: 'quiz_utme_mock',
      subject: 'Biology',
      question: 'In human cellular respiration, what is the net yield of ATP molecules per molecule of glucose produced during glycolysis alone?',
      options: ['2 ATP', '4 ATP', '32 ATP', '36 ATP'],
      answer: '2 ATP',
      marks: 1,
      order: 2,
    },
    {
      id: 'q_bio_3',
      quizId: 'quiz_utme_mock',
      subject: 'Biology',
      diagram: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" fill="none"><rect width="320" height="180" rx="8" fill="%230F172A"/><circle cx="160" cy="90" r="50" stroke="%2338BDF8" stroke-width="4" fill="%231E293B"/><ellipse cx="160" cy="90" rx="25" ry="15" fill="%233B82F6"/><text x="160" y="94" fill="white" font-family="sans-serif" font-size="12" text-anchor="middle">Nucleus</text><line x1="80" y1="90" x2="110" y2="90" stroke="%2394A3B8" stroke-width="2"/><text x="65" y="93" fill="%23CBD5E1" font-family="sans-serif" font-size="11" text-anchor="end">Region X</text></svg>',
      question: 'Refer to the diagram above. Region X designates the outer barrier regulating ionic flux. Identify structure X.',
      options: ['Plasma membrane', 'Nuclear envelope', 'Cell wall', 'Tonoplast'],
      answer: 'Plasma membrane',
      marks: 1,
      order: 3,
    },
    // Chemistry Compulsory Questions for quiz_utme_mock
    {
      id: 'q_chem_1',
      quizId: 'quiz_utme_mock',
      subject: 'Chemistry',
      question: 'What is the oxidation state of Chromium in potassium dichromate (K2Cr2O7)?',
      options: ['+3', '+4', '+6', '+7'],
      answer: '+6',
      marks: 1,
      order: 4,
    },
    {
      id: 'q_chem_2',
      quizId: 'quiz_utme_mock',
      subject: 'Chemistry',
      question: 'According to Le Chatelier’s principle, increasing the total pressure of an equilibrium gaseous system shifts the reaction toward:',
      options: [
        'The side with fewer moles of gas',
        'The side with greater moles of gas',
        'The endothermic direction regardless of moles',
        'Neither side as equilibrium constant Kp stays constant'
      ],
      answer: 'The side with fewer moles of gas',
      marks: 1,
      order: 5,
    },
    // Physics Optional Questions for quiz_utme_mock
    {
      id: 'q_phy_1',
      quizId: 'quiz_utme_mock',
      subject: 'Physics',
      question: 'A projectile is launched with an initial velocity of 40 m/s at an angle of 30 degrees above the horizontal. Taking g = 10 m/s², what is the total time of flight?',
      options: ['2.0 seconds', '4.0 seconds', '6.0 seconds', '8.0 seconds'],
      answer: '4.0 seconds',
      marks: 1,
      order: 6,
    },
    {
      id: 'q_phy_2',
      quizId: 'quiz_utme_mock',
      subject: 'Physics',
      question: 'Which law of thermodynamics formally introduces the concept of entropy and dictates that spontaneous processes result in an increase in total entropy?',
      options: ['Zeroth Law', 'First Law', 'Second Law', 'Third Law'],
      answer: 'Second Law',
      marks: 1,
      order: 7,
    },
    // English Optional Questions for quiz_utme_mock (with comprehension passage)
    {
      id: 'q_eng_1',
      quizId: 'quiz_utme_mock',
      subject: 'English',
      passage: 'Scientific literacy requires not merely the memorization of taxonomic nomenclature, but rather an acute familiarity with empirical methodologies. When a researcher hypothesizes a causal relationship, systematic experimentation serves as the sole crucible of validation. Biases, whether cognitive or environmental, must be deliberately isolated through rigorous control groups.',
      question: 'According to the passage, what functions as the exclusive crucible of validation for a causal hypothesis?',
      options: [
        'Taxonomic classification',
        'Systematic experimentation',
        'Cognitive consensus among researchers',
        'Environmental sampling'
      ],
      answer: 'Systematic experimentation',
      marks: 1,
      order: 8,
    },
    {
      id: 'q_eng_2',
      quizId: 'quiz_utme_mock',
      subject: 'English',
      passage: 'Scientific literacy requires not merely the memorization of taxonomic nomenclature, but rather an acute familiarity with empirical methodologies. When a researcher hypothesizes a causal relationship, systematic experimentation serves as the sole crucible of validation. Biases, whether cognitive or environmental, must be deliberately isolated through rigorous control groups.',
      question: 'The word "crucible" as utilized in the passage most nearly denotes a:',
      options: ['Severe test or trial', 'Ceramic melting pot', 'Superficial observation', 'Theoretical guideline'],
      answer: 'Severe test or trial',
      marks: 1,
      order: 9,
    },
    // Questions for quiz_bio_foundations
    {
      id: 'q_bf_1',
      quizId: 'quiz_bio_foundations',
      subject: 'Biology',
      question: 'During which phase of meiosis does crossing over (homologous genetic recombination) occur?',
      options: ['Prophase I', 'Metaphase I', 'Anaphase II', 'Telophase I'],
      answer: 'Prophase I',
      marks: 1,
      order: 1,
    },
    {
      id: 'q_bf_2',
      quizId: 'quiz_bio_foundations',
      subject: 'Biology',
      question: 'What type of chemical bond links consecutive ribonucleotides along the backbone of an RNA strand?',
      options: ['Phosphodiester bond', 'Hydrogen bond', 'Disulfide bridge', 'Peptide bond'],
      answer: 'Phosphodiester bond',
      marks: 1,
      order: 2,
    },
    {
      id: 'q_bf_3',
      quizId: 'quiz_bio_foundations',
      subject: 'Chemistry',
      question: 'What is the pH of a 0.001 M aqueous solution of strong hydrochloric acid (HCl)?',
      options: ['1', '2', '3', '7'],
      answer: '3',
      marks: 1,
      order: 3,
    }
  ],
  attempts: [
    {
      id: 'att_sample_1',
      quizId: 'quiz_utme_mock',
      participantName: 'David Adeleke',
      participantEmail: 'student@remedipro.edu',
      userId: 'usr_student_1',
      selectedSubjects: ['Biology', 'Chemistry', 'English'],
      answers: {
        'q_bio_1': 'Mitochondrion',
        'q_bio_2': '2 ATP',
        'q_bio_3': 'Plasma membrane',
        'q_chem_1': '+6',
        'q_chem_2': 'The side with fewer moles of gas',
        'q_eng_1': 'Systematic experimentation',
        'q_eng_2': 'Severe test or trial'
      },
      subjectScores: {
        'Biology': { total: 3, correct: 3, percentage: 100, scaledScore: 171 },
        'Chemistry': { total: 2, correct: 2, percentage: 100, scaledScore: 114 },
        'English': { total: 2, correct: 2, percentage: 100, scaledScore: 115 }
      },
      totalQuestions: 7,
      correctCount: 7,
      wrongCount: 0,
      finalScore: 400,
      scoreScale: 400,
      formattedScore: '400/400',
      timeUsedSeconds: 840,
      startedAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
      completedAt: new Date(Date.now() - 3600 * 1000 * 20 + 840 * 1000).toISOString(),
      hiddenFromLeaderboard: false,
    },
    {
      id: 'att_sample_2',
      quizId: 'quiz_utme_mock',
      participantName: 'Samuel Osemu',
      participantEmail: 'samuelosemu5@gmail.com',
      userId: 'usr_admin',
      selectedSubjects: ['Biology', 'Chemistry', 'Physics'],
      answers: {
        'q_bio_1': 'Mitochondrion',
        'q_bio_2': '2 ATP',
        'q_bio_3': 'Plasma membrane',
        'q_chem_1': '+6',
        'q_chem_2': 'The side with greater moles of gas',
        'q_phy_1': '4.0 seconds',
        'q_phy_2': 'Second Law'
      },
      subjectScores: {
        'Biology': { total: 3, correct: 3, percentage: 100, scaledScore: 171 },
        'Chemistry': { total: 2, correct: 1, percentage: 50, scaledScore: 57 },
        'Physics': { total: 2, correct: 2, percentage: 100, scaledScore: 115 }
      },
      totalQuestions: 7,
      correctCount: 6,
      wrongCount: 1,
      finalScore: 343,
      scoreScale: 400,
      formattedScore: '343/400',
      timeUsedSeconds: 960,
      startedAt: new Date(Date.now() - 3600 * 1000 * 10).toISOString(),
      completedAt: new Date(Date.now() - 3600 * 1000 * 10 + 960 * 1000).toISOString(),
      hiddenFromLeaderboard: false,
    }
  ],
  liveSessions: [],
  learningHubs: [
    {
      id: 'hub_stem_apex',
      creatorId: 'usr_creator_1',
      creatorName: 'Dr. Evelyn Clark',
      title: 'Remedi Medical & Pre-Varsity Academy',
      description: 'Curated repository of syllabus-aligned notes, CBT drills, and revision modules for aspiring university scholars.',
      subject: 'Life & Physical Sciences',
      category: 'exam_prep',
      coverColor: 'navy',
      isPublic: true,
      accessType: 'free',
      membershipModel: 'free',
      compulsorySubjects: ['Biology', 'Chemistry'],
      optionalSubjects: ['Physics', 'Mathematics', 'English'],
      requiredOptionalCount: 1,
      tutorialLinks: [
        {
          id: 'tut_seed_1',
          platform: 'youtube',
          title: 'Oxidative Phosphorylation & ATP Synthase Video Lecture',
          url: 'https://youtube.com',
        },
        {
          id: 'tut_seed_2',
          platform: 'google_meet',
          title: 'Sunday Pre-Varsity CBT Interactive Clinical Seminar',
          url: 'https://meet.google.com',
        }
      ],
      assessmentQuizIds: ['quiz_utme_mock'],
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 7).toISOString(),
    }
  ],
  hubMembers: [
    {
      id: 'hm_1',
      hubId: 'hub_stem_apex',
      userId: 'usr_student_1',
      userName: 'David Adeleke',
      userEmail: 'student@remedipro.edu',
      joinedAt: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
      selectedSubjects: ['Biology', 'Chemistry', 'Physics'],
      membershipType: 'free',
      isPaid: true,
      completedAssessments: [
        {
          id: 'rec_seed_1',
          quizId: 'quiz_utme_mock',
          quizTitle: 'Comprehensive Pre-Varsity CBT Mock Examination',
          subjectScores: {
            'Biology': { total: 3, correct: 3, percentage: 100 },
            'Chemistry': { total: 2, correct: 1, percentage: 50 },
            'Physics': { total: 2, correct: 2, percentage: 100 },
          },
          finalScore: 343,
          scoreScale: 400,
          percentage: 86,
          completedAt: new Date(Date.now() - 3600 * 1000 * 10).toISOString(),
        }
      ]
    },
    {
      id: 'hm_2',
      hubId: 'hub_stem_apex',
      userId: 'usr_admin',
      userName: 'Samuel Osemu',
      userEmail: 'samuelosemu5@gmail.com',
      joinedAt: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
      selectedSubjects: ['Biology', 'Chemistry', 'English'],
      membershipType: 'free',
      isPaid: true,
      completedAssessments: []
    }
  ],
  hubMaterials: [
    {
      id: 'mat_1',
      hubId: 'hub_stem_apex',
      creatorId: 'usr_creator_1',
      title: 'Oxidative Phosphorylation & Chemiosmosis Summary',
      description: 'Step-by-step breakdown of the electron transport chain, proton gradients, and ATP synthase rotation.',
      type: 'note',
      content: 'The electron transport chain resides in the inner mitochondrial membrane. Complexes I, III, and IV pump protons into the intermembrane space, creating an electrochemical gradient (proton motive force). As protons flow down their gradient through FoF1-ATP synthase, mechanical energy drives ADP phosphorylation into ATP.',
      isMemberOnly: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
    },
    {
      id: 'mat_2',
      hubId: 'hub_stem_apex',
      creatorId: 'usr_creator_1',
      title: 'Redox Reactions & Oxidation States Drill',
      description: 'Rules for assigning oxidation numbers, balancing half-equations in acidic and basic solutions.',
      type: 'tutorial',
      content: 'Rule 1: Free elements have oxidation state 0. Rule 2: Monatomic ions match ionic charge. Rule 3: Oxygen is usually -2 (except peroxides where -1). Rule 4: Hydrogen is +1 with nonmetals, -1 with metals. Sum of oxidation states in neutral compounds is 0.',
      isMemberOnly: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString(),
    }
  ],
  follows: [
    {
      id: 'fol_1',
      followerId: 'usr_student_1',
      followerName: 'David Adeleke',
      followerEmail: 'student@remedipro.edu',
      creatorId: 'usr_creator_1',
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
    }
  ],
  auditLogs: [
    {
      id: 'log_init',
      action: 'SYSTEM_BOOT',
      details: 'Remedi Pro educational persistence database initialized.',
      actor: 'System',
      timestamp: new Date().toISOString(),
    }
  ],
  paymentRequests: [
    {
      id: 'req_sample_1',
      creatorId: 'usr_creator_1',
      creatorName: 'Dr. Evelyn Clark',
      creatorEmail: 'creator@remedipro.edu',
      creatorCode: 'REM-8K29X',
      amount: 5000,
      currency: 'NGN',
      paymentMethod: 'manual_transfer',
      senderName: 'Dr. Evelyn Clark',
      senderBank: 'GTBank',
      referenceNumber: 'TRF-9823412-REM8K',
      notes: 'Bank transfer for 30-day creator access renewal.',
      status: 'pending',
      requestedAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    }
  ],
  systemSettings: {
    paymentSystemEnabled: false, // Default: OFF (Remedi Pro runs completely free unless admin activates it)
    freeTrialEnabled: true,
    trialDurationDays: 14,
    paidAccessDurationDays: 30,
    requirePaymentForQuizCreation: true,
    requirePaymentForHubCreation: true,
    accessFeeAmount: 5000,
    currency: 'NGN',
    paymentMethod: 'manual_transfer',
    bankDetails: {
      bankName: 'Zenith Bank',
      accountName: 'Remedi Pro Educational Services',
      accountNumber: '1018923456',
      instructions: 'Transfer the access fee to the account above. Use your unique Creator Code as the payment narration or reference. After transfer, click "I Have Paid" and submit your reference for admin manual verification.',
      whatsappNumber: '+234 812 345 6789',
    },
  },
};

class DatabaseManager {
  private db: DatabaseSchema;

  public readonly usesPostgres = !!pool;
  private lock: Promise<void> = Promise.resolve();
  private tableReady = false;
  private session: {
    client: PoolClient;
    write: boolean;
    snapshot: string;
    releaseLock: () => void;
  } | null = null;

  constructor() {
    this.db = pool ? this.normalize({}) : this.load();
    this.ensureCreatorIntegrity();
  }

  // ---- Postgres request lifecycle (used by server/app.ts) ----
  // One request at a time per server instance; write requests also take a row lock
  // in the database so two instances can never overwrite each other's changes.
  public async beginRequest(write: boolean): Promise<void> {
    if (!pool) return;
    const prev = this.lock;
    let releaseLock!: () => void;
    this.lock = new Promise<void>((r) => (releaseLock = r));
    await prev;
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      if (!this.tableReady) {
        await client.query(
          'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())'
        );
        this.tableReady = true;
      }
      if (write) await client.query('BEGIN');
      const lockSql = write ? ' FOR UPDATE' : '';
      let res = await client.query('SELECT data FROM app_state WHERE id = 1' + lockSql);
      if (write && res.rowCount === 0) {
        await client.query('INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [
          JSON.stringify(this.normalize({})),
        ]);
        res = await client.query('SELECT data FROM app_state WHERE id = 1 FOR UPDATE');
      }
      this.db = this.normalize(res.rowCount ? res.rows[0].data : {});
      this.ensureCreatorIntegrity();
      this.session = { client, write, snapshot: JSON.stringify(this.db), releaseLock };
    } catch (err) {
      try {
        if (client && write) await client.query('ROLLBACK');
      } catch {}
      if (client) client.release();
      releaseLock();
      throw err;
    }
  }

  public async endRequest(commit: boolean): Promise<void> {
    const s = this.session;
    if (!s) return;
    this.session = null;
    try {
      if (s.write) {
        if (commit && JSON.stringify(this.db) !== s.snapshot) {
          await s.client.query('UPDATE app_state SET data = $1, updated_at = now() WHERE id = 1', [
            JSON.stringify(this.db),
          ]);
        }
        await s.client.query(commit ? 'COMMIT' : 'ROLLBACK');
      }
    } catch (err) {
      try {
        await s.client.query('ROLLBACK');
      } catch {}
      s.client.release();
      s.releaseLock();
      throw err;
    }
    s.client.release();
    s.releaseLock();
  }

  private normalize(parsed: any): DatabaseSchema {
    // Ensure all collections exist and enrich with new features
    const loadedHubs: LearningHub[] = (parsed.learningHubs || INITIAL_DB.learningHubs).map((h: any) => ({
      ...h,
      accessType: h.accessType || 'free',
      membershipModel: h.membershipModel || 'free',
      compulsorySubjects: h.compulsorySubjects || ['Biology', 'Chemistry'],
      optionalSubjects: h.optionalSubjects || ['Physics', 'Mathematics', 'English'],
      requiredOptionalCount: h.requiredOptionalCount ?? 1,
      tutorialLinks: h.tutorialLinks || [],
      assessmentQuizIds: h.assessmentQuizIds || (h.id === 'hub_stem_apex' ? ['quiz_utme_mock'] : []),
    }));

    const loadedMembers: HubMember[] = (parsed.hubMembers || INITIAL_DB.hubMembers).map((m: any) => ({
      ...m,
      selectedSubjects: m.selectedSubjects && m.selectedSubjects.length > 0 ? m.selectedSubjects : ['Biology', 'Chemistry', 'Physics'],
      membershipType: m.membershipType || 'free',
      completedAssessments: m.completedAssessments || [],
    }));

    const loadedUsers: User[] = (parsed.users || INITIAL_DB.users).map((u: any) => ({
      ...u,
      onlineTutorialLinks: u.onlineTutorialLinks || (u.id === 'usr_creator_1' ? [
        {
          id: 'ctut_1',
          platform: 'youtube',
          title: 'Dr. Evelyn Clark Official Science Channel',
          url: 'https://youtube.com',
        },
        {
          id: 'ctut_2',
          platform: 'zoom',
          title: 'Remedi Pro Science Masterclass Virtual Room',
          url: 'https://zoom.us',
        }
      ] : []),
    }));

    const schema: DatabaseSchema = {
      users: loadedUsers,
    registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
      quizzes: parsed.quizzes || INITIAL_DB.quizzes,
      questions: parsed.questions || INITIAL_DB.questions,
      attempts: parsed.attempts || INITIAL_DB.attempts,
      liveSessions: parsed.liveSessions || [],
      learningHubs: loadedHubs,
      hubMembers: loadedMembers,
      hubMaterials: (parsed.hubMaterials || INITIAL_DB.hubMaterials).map((mat: any) => ({
        ...mat,
        isMemberOnly: mat.isMemberOnly !== false,
      })),
      follows: parsed.follows || INITIAL_DB.follows || [],
      auditLogs: parsed.auditLogs || INITIAL_DB.auditLogs,
      paymentRequests: parsed.paymentRequests || INITIAL_DB.paymentRequests,
      systemSettings: {
        ...INITIAL_DB.systemSettings,
        ...(parsed.systemSettings || {}),
        bankDetails: {
          ...INITIAL_DB.systemSettings.bankDetails,
          ...(parsed.systemSettings?.bankDetails || {}),
        },
      },
    };
    return schema;
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return this.normalize(parsed);
      }
    } catch (err) {
      console.error('Failed to load database, using initial dataset:', err);
    }
    this.save(INITIAL_DB);
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }

  // Ensure every creator and admin has a unique creatorCode, accessStatus, and evaluates expiry
  public ensureCreatorIntegrity() {
    const existingCodes = this.db.users.map((u) => u.creatorCode).filter(Boolean) as string[];
    let changed = false;

    this.db.users.forEach((u) => {
      if (u.role === 'creator' || u.role === 'admin') {
        if (!u.creatorCode) {
          if (u.id === 'usr_creator_1') u.creatorCode = 'REM-8K29X';
          else if (u.id === 'usr_admin') u.creatorCode = 'REM-ADMIN1';
          else {
            u.creatorCode = generateCreatorCode(existingCodes);
            existingCodes.push(u.creatorCode);
          }
          changed = true;
        }

        if (!u.accessStatus) {
          u.accessStatus = 'active';
          u.accessStartedAt = u.createdAt;
          u.accessExpiresAt = new Date(Date.now() + 3600 * 1000 * 24 * 30).toISOString();
          changed = true;
        }

        // Automatic expiry check: if expiry date has passed, mark expired!
        if (u.role === 'creator' && u.accessExpiresAt) {
          const isExpired = new Date(u.accessExpiresAt).getTime() < Date.now();
          if (isExpired && u.accessStatus !== 'expired') {
            u.accessStatus = 'expired';
            changed = true;
          } else if (!isExpired && u.accessStatus === 'expired') {
            u.accessStatus = 'active';
            changed = true;
          }
        }
      }
    });

    if (changed) {
      this.save(this.db);
    }
  }

  private save(data: DatabaseSchema) {
    if (pool) return; // Postgres mode saves once at the end of each request
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public getData(): DatabaseSchema {
    this.ensureCreatorIntegrity();
    return this.db;
  }

  public update(mutator: (db: DatabaseSchema) => void): DatabaseSchema {
    mutator(this.db);
    this.ensureCreatorIntegrity();
    this.save(this.db);
    return this.db;
  }

  // Access check for creators
  public checkCreatorAccess(userId?: string): {
    paymentSystemEnabled: boolean;
    canCreateQuiz: boolean;
    canCreateHub: boolean;
    status: CreatorAccessState;
    message?: string;
  } {
    const settings = this.db.systemSettings;
    // If master switch is OFF, no creator is ever blocked!
    if (!settings.paymentSystemEnabled) {
      return {
        paymentSystemEnabled: false,
        canCreateQuiz: true,
        canCreateHub: true,
        status: 'active',
      };
    }

    if (!userId) {
      return {
        paymentSystemEnabled: true,
        canCreateQuiz: false,
        canCreateHub: false,
        status: 'expired',
        message: 'Authentication required.',
      };
    }

    const user = this.db.users.find((u) => u.id === userId);
    if (!user) {
      return {
        paymentSystemEnabled: true,
        canCreateQuiz: false,
        canCreateHub: false,
        status: 'expired',
        message: 'User account not found.',
      };
    }

    // Admins are exempt
    if (user.role === 'admin') {
      return {
        paymentSystemEnabled: true,
        canCreateQuiz: true,
        canCreateHub: true,
        status: 'active',
      };
    }

    // Students do not have creator permissions
    if (user.role === 'student') {
      return {
        paymentSystemEnabled: true,
        canCreateQuiz: false,
        canCreateHub: false,
        status: 'expired',
        message: 'Student accounts cannot create quizzes or learning hubs.',
      };
    }

    // Check expiry
    if (user.accessExpiresAt && new Date(user.accessExpiresAt).getTime() < Date.now()) {
      user.accessStatus = 'expired';
    }

    if (user.disabled) {
      return {
        paymentSystemEnabled: true,
        canCreateQuiz: false,
        canCreateHub: false,
        status: 'disabled',
        message: 'Your account has been disabled by platform administration.',
      };
    }

    if (user.accessStatus === 'expired') {
      return {
        paymentSystemEnabled: true,
        canCreateQuiz: !settings.requirePaymentForQuizCreation,
        canCreateHub: !settings.requirePaymentForHubCreation,
        status: 'expired',
        message: 'Creator access expired. Please activate or renew your subscription.',
      };
    }

    return {
      paymentSystemEnabled: true,
      canCreateQuiz: true,
      canCreateHub: true,
      status: user.accessStatus || 'active',
    };
  }
}

export const dbManager = new DatabaseManager();
