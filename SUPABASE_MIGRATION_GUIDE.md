# Supabase 데이터베이스 마이그레이션 가이드

## 🎯 목적
v9.0.5에서 선생님 로그인 인증 기능을 구현하기 위해 teachers 테이블에 컬럼을 추가합니다.

---

## 📋 추가되는 컬럼

### teachers 테이블
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|---------|------|
| `username` | TEXT | UNIQUE | 로그인 아이디 (고유값) |
| `password` | TEXT | - | 로그인 비밀번호 |
| `role` | TEXT | CHECK (teacher, subadmin) | 역할: 선생님 또는 부관리자 |
| `work_hours` | TEXT | - | 근무시간 (예: 월~금 14:00-18:00) |
| `subject` | TEXT | - | 담당 과목 |
| `memo` | TEXT | - | 메모 |

### students 테이블
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|---------|------|
| `teacher_id` | UUID | REFERENCES teachers(id) | 담당 선생님 ID |

---

## 🚀 마이그레이션 실행 방법

### 방법 1: Supabase 대시보드 (추천)

#### 1단계: Supabase 대시보드 접속
1. [Supabase 대시보드](https://app.supabase.com) 접속
2. 프로젝트 선택: **MATHPOCKET**

#### 2단계: SQL Editor 실행
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New Query** 버튼 클릭

#### 3단계: SQL 실행
1. `supabase-migration-teachers-auth.sql` 파일의 내용을 복사
2. SQL Editor에 붙여넣기
3. **Run** 버튼 클릭 (또는 `Ctrl + Enter`)

#### 4단계: 실행 결과 확인
성공 메시지가 표시되면 완료입니다:
```
Success. No rows returned
```

#### 5단계: 테이블 구조 확인
1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. **teachers** 테이블 선택
3. 새 컬럼들이 추가되었는지 확인:
   - ✅ username
   - ✅ password
   - ✅ role
   - ✅ work_hours
   - ✅ subject
   - ✅ memo

4. **students** 테이블 선택
5. 새 컬럼이 추가되었는지 확인:
   - ✅ teacher_id

---

### 방법 2: psql 명령줄 도구

```bash
# Supabase 데이터베이스 연결
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# SQL 파일 실행
\i supabase-migration-teachers-auth.sql

# 테이블 구조 확인
\d teachers
\d students
```

---

## ✅ 마이그레이션 완료 후 테스트

### 1. 선생님 등록 테스트
1. 관리자로 로그인
2. **회원 관리** → **선생님 관리**
3. 새 선생님 등록 시도:
   - 이름: 권미정
   - 역할: 선생님
   - 전화번호: 010-1234-5678
   - 아이디: kwonmj
   - 비밀번호: 1234
4. **등록** 버튼 클릭
5. 페이지 새로고침 (`F5`)
6. ✅ 권미정 선생님이 목록에 남아있는지 확인

### 2. 선생님 로그인 테스트
1. 로그아웃
2. 선생님 계정으로 로그인:
   - 아이디: kwonmj
   - 비밀번호: 1234
3. ✅ 로그인 성공 확인
4. ✅ 선생님용 메뉴만 표시되는지 확인

### 3. 담당학생 매핑 테스트
1. 관리자로 로그인
2. **회원 관리** → **학생 관리**
3. 학생 선택 후 수정
4. **담당 선생님** 선택 (예: 권미정)
5. 저장
6. 선생님 계정으로 로그인
7. ✅ 담당 학생이 모든 페이지에 표시되는지 확인

---

## 🔍 문제 해결

### 오류 1: "column already exists"
**원인**: 컬럼이 이미 존재함  
**해결**: 정상입니다. `IF NOT EXISTS`로 인해 안전하게 무시됨

### 오류 2: "permission denied"
**원인**: 권한 부족  
**해결**: Supabase 프로젝트 소유자 계정으로 로그인

### 오류 3: "relation does not exist"
**원인**: teachers 또는 students 테이블이 없음  
**해결**: 먼저 `supabase-schema.sql`을 실행하여 기본 테이블 생성

---

## 📊 마이그레이션 전후 비교

### Before (마이그레이션 전)
```sql
-- teachers 테이블
id, name, phone, email, subjects, status, hire_date, resignation_date, notes, created_at, updated_at

-- students 테이블
id, name, school, grade, phone, parent_phone, address, school_type, status, enrollment_date, withdrawal_date, schedule, tuition_amount, tuition_day, notes, created_at, updated_at
```

### After (마이그레이션 후)
```sql
-- teachers 테이블 ✅ 추가된 컬럼
id, name, phone, email, subjects, subject, status, hire_date, resignation_date, work_hours, notes, memo, username, password, role, created_at, updated_at

-- students 테이블 ✅ 추가된 컬럼
id, name, school, grade, phone, parent_phone, address, school_type, status, enrollment_date, withdrawal_date, schedule, tuition_amount, tuition_day, notes, teacher_id, created_at, updated_at
```

---

## 🎉 완료

마이그레이션이 성공적으로 완료되었습니다!

이제 다음 작업을 진행할 수 있습니다:
1. ✅ 선생님 등록 시 username, password, role 저장
2. ✅ 선생님 로그인 기능 작동
3. ✅ 학생-선생님 매핑 (teacher_id)
4. ✅ 선생님별 담당학생 필터링

---

## 📝 주의사항

⚠️ **보안 경고**: 현재 비밀번호를 **평문**으로 저장하고 있습니다. 이는 프로토타입용이며, 프로덕션 환경에서는 반드시 비밀번호를 해시화(bcrypt, Argon2 등)해야 합니다.

**프로덕션 배포 전 필수 작업**:
1. 비밀번호 해시화 구현
2. HTTPS 적용
3. 인증 토큰 (JWT) 도입
4. Rate limiting 설정
