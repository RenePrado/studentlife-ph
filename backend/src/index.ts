import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
// Load env vars first — route modules import database.ts which reads
// process.env.DATABASE_URL at module-load time.
import './config/env';
import { SESSION_SECRET, FRONTEND_URL, PORT, NODE_ENV } from './config/env';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profiles';
import { subjectsRoutes } from './routes/subjects';
import { tasksRoutes } from './routes/tasks';
import { attendanceRoutes } from './routes/attendance';
import { expensesRoutes } from './routes/expenses';
import { eventsRoutes } from './routes/events';
import { flashcardsRoutes } from './routes/flashcards';
import { notesRoutes } from './routes/notes';
import { internshipsRoutes } from './routes/internships';
import { resumeExperienceRoutes } from './routes/resume-experience';
import { resumeProjectsRoutes } from './routes/resume-projects';
import { resumeSkillsRoutes } from './routes/resume-skills';
import { pomodoroSessionsRoutes } from './routes/pomodoro-sessions';
import { uploadRoutes } from './routes/upload';
import { apiLimiter } from './middleware/rate-limiter';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Global rate limit applied to all routes after this point.
// Auth-sensitive routes additionally use authLimiter (mounted in auth.ts).
app.use(apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static('src/uploads'));

// Routes
app.use('/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/internships', internshipsRoutes);
app.use('/api/resume-experience', resumeExperienceRoutes);
app.use('/api/resume-projects', resumeProjectsRoutes);
app.use('/api/resume-skills', resumeSkillsRoutes);
app.use('/api/pomodoro-sessions', pomodoroSessionsRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudentLife PH Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});