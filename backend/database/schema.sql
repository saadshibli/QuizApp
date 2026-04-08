-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'teacher', 'student')) NOT NULL,
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(30) DEFAULT 'none' CHECK (theme IN (
    'none','light','dark','colorful','space','arctic','biology','ocean','retro','sunset','forest','galaxy','candy','minimal','neon',
    'chemistry','cyberpunk','english','geography','history','jungle','maths','midnight','physics','sea','sunlight','underwater','volcano'
  )),
  advance_mode VARCHAR(10) DEFAULT 'auto' CHECK (advance_mode IN ('auto', 'manual')),
  advance_seconds INTEGER DEFAULT 5 CHECK (advance_seconds >= 3 AND advance_seconds <= 60),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  time_limit INTEGER DEFAULT 30 CHECK (time_limit >= 1 AND time_limit <= 300),
  points INTEGER DEFAULT 100 CHECK (points >= 1 AND points <= 2000),
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Options table
CREATE TABLE IF NOT EXISTS options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  session_code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'Lobby' CHECK (status IN ('Lobby', 'Active', 'Completed')),
  current_question INTEGER REFERENCES questions(id),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(50),
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, user_id)
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  response_time INTEGER NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, participant_id)
);

-- Alter constraints for existing databases (safe after tables exist)
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'teacher', 'student'));

ALTER TABLE IF EXISTS quizzes DROP CONSTRAINT IF EXISTS quizzes_theme_check;
ALTER TABLE IF EXISTS quizzes ADD CONSTRAINT quizzes_theme_check CHECK (theme IN (
  'none','light','dark','colorful','space','arctic','biology','ocean','retro','sunset','forest','galaxy','candy','minimal','neon',
  'chemistry','cyberpunk','english','geography','history','jungle','maths','midnight','physics','sea','sunlight','underwater','volcano'
));

ALTER TABLE IF EXISTS questions DROP CONSTRAINT IF EXISTS questions_time_limit_check;
ALTER TABLE IF EXISTS questions DROP CONSTRAINT IF EXISTS questions_points_check;
ALTER TABLE IF EXISTS questions ADD CONSTRAINT questions_time_limit_check CHECK (time_limit >= 1 AND time_limit <= 300);
ALTER TABLE IF EXISTS questions ADD CONSTRAINT questions_points_check CHECK (points >= 1 AND points <= 2000);

ALTER TABLE IF EXISTS participants DROP CONSTRAINT IF EXISTS participants_session_id_user_id_nickname_key;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_quiz_id ON sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_session_id ON leaderboard(session_id);

-- Add advance_mode columns to existing quizzes tables
ALTER TABLE IF EXISTS quizzes ADD COLUMN IF NOT EXISTS advance_mode VARCHAR(10) DEFAULT 'auto';
ALTER TABLE IF EXISTS quizzes ADD COLUMN IF NOT EXISTS advance_seconds INTEGER DEFAULT 5;