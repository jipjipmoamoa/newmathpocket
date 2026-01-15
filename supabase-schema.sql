-- 매쓰포켓 학원 관리 시스템 데이터베이스 스키마

-- 1. 학생 테이블 (students)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    school TEXT,
    grade TEXT,
    phone TEXT,
    parent_phone TEXT,
    address TEXT,
    school_type TEXT CHECK (school_type IN ('초등', '중등', '고등')),
    status TEXT CHECK (status IN ('재원', '휴원', '퇴원')) DEFAULT '재원',
    enrollment_date BIGINT,
    withdrawal_date BIGINT,
    schedule JSONB,
    tuition_amount NUMERIC,
    tuition_day INTEGER,
    notes TEXT,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- 2. 선생님 테이블 (teachers)
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    subjects TEXT,
    subject TEXT,
    status TEXT CHECK (status IN ('재직', '퇴사')) DEFAULT '재직',
    hire_date BIGINT,
    resignation_date BIGINT,
    work_hours TEXT,
    notes TEXT,
    memo TEXT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK (role IN ('teacher', 'subadmin')) DEFAULT 'teacher',
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- 3. 출석 테이블 (attendance)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    date DATE NOT NULL,
    check_in_time TEXT,
    expected_out_time TEXT,
    check_out_time TEXT,
    status TEXT CHECK (status IN ('출석', '결석', '지각', '조퇴', '보강')) DEFAULT '출석',
    notes TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- 4. 수업료 테이블 (tuition)
CREATE TABLE IF NOT EXISTS tuition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    due_date BIGINT,
    payment_date BIGINT,
    payment_method TEXT,
    status TEXT CHECK (status IN ('미납', '완납', '부분납')) DEFAULT '미납',
    notes TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- 5. 커리큘럼 테이블 (curriculum)
CREATE TABLE IF NOT EXISTS curriculum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    textbook TEXT,
    current_page INTEGER,
    total_pages INTEGER,
    progress NUMERIC,
    start_date BIGINT,
    notes TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_school_type ON students(school_type);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers(role);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_year_month ON tuition(year, month);
CREATE INDEX IF NOT EXISTS idx_tuition_student_id ON tuition(student_id);

-- Row Level Security (RLS) 비활성화 (공개 접근 허용)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE tuition DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum DISABLE ROW LEVEL SECURITY;

-- 테이블 생성 완료
