-- 선생님 테이블에 로그인 인증 컬럼 추가
-- 실행 날짜: 2026-01-15

-- 1. username 컬럼 추가 (로그인 아이디)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. password 컬럼 추가 (로그인 비밀번호)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. role 컬럼 추가 (역할: teacher, subadmin)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('teacher', 'subadmin')) DEFAULT 'teacher';

-- 4. teacher_id 컬럼을 students 테이블에 추가 (담당 선생님 매핑)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;

-- 5. work_hours 컬럼 추가 (근무시간)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS work_hours TEXT;

-- 6. subject 컬럼 추가 (담당 과목)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- 7. memo 컬럼 추가 (메모)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS memo TEXT;

-- 8. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers(role);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);

-- 9. 기존 선생님 데이터에 role 기본값 설정
UPDATE teachers 
SET role = 'teacher' 
WHERE role IS NULL;

COMMENT ON COLUMN teachers.username IS '로그인 아이디 (고유값)';
COMMENT ON COLUMN teachers.password IS '로그인 비밀번호 (평문 저장 - 프로토타입용)';
COMMENT ON COLUMN teachers.role IS '역할: teacher(선생님) 또는 subadmin(부관리자)';
COMMENT ON COLUMN students.teacher_id IS '담당 선생님 ID (teachers 테이블 참조)';
