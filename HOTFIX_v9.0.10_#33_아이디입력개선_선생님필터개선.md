# HOTFIX v9.0.10 #33: 아이디 입력 개선 & 선생님 필터 개선

## 📋 변경 사항

### 1. 아이디 입력창 영문 입력 모드 자동 전환

**적용 위치:** 로그인 화면 아이디 입력창

**개선 내용:**
- 입력창 포커스 시 자동으로 영문 입력 모드로 전환
- IME(한글 입력) 비활성화
- 모바일에서도 영문 키보드 우선 표시

**구현:**
```html
<input type="text" id="username" placeholder="아이디"
       oninput="this.value = this.value.replace(/[^a-zA-Z0-9]/g, '')"
       onpaste="setTimeout(() => this.value = this.value.replace(/[^a-zA-Z0-9]/g, ''), 0)"
       onfocus="this.setAttribute('inputmode', 'latin'); this.style.imeMode='disabled';"
       style="ime-mode: disabled;"
       inputmode="latin">
```

**속성 설명:**
- `ime-mode: disabled`: IME(한글 입력) 비활성화
- `inputmode="latin"`: 모바일에서 영문 키보드 표시
- `onfocus`: 포커스 시 속성 재설정

### 2. 회원 관리 페이지 선생님 필터 개선

**적용 위치:** 회원 관리 > 학생 관리 페이지 상단 드롭다운

#### AS-IS (기존 로직)
```javascript
// role이 있고 퇴사하지 않은 모든 선생님 표시 (관리자, 부관리자 포함)
const activeTeachers = teachers.filter(t => {
    const hasRole = t.role && (
        t.role === '관리자' || t.role === 'admin' || 
        t.role === '부관리자' || t.role === 'sub-admin' || 
        t.role === '선생님' || t.role === 'teacher'
    );
    const notResigned = !t.status || (t.status !== '퇴사' && t.status !== '퇴직');
    return hasRole && notResigned;
});
```

#### TO-BE (개선된 로직)
```javascript
// status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
const activeTeachers = teachers.filter(t => {
    const status = t.status || '재직';
    return status === '재직' || status === '재직중';
});
```

**개선 효과:**
- ✅ 재직 중인 모든 선생님 표시 (관리자, 부관리자 포함)
- ✅ 퇴직/퇴사한 선생님 제외
- ✅ 간단하고 명확한 로직

### 3. 학생 추가/수정 시 담당 선생님 드롭다운 개선

**적용 위치:**
- 학생 추가 폼 (인라인 폼)
- 학생 수정 모달

#### AS-IS (기존 로직)
```javascript
// 모든 선생님 표시 (관리자, 부관리자, 퇴직자 포함)
const teachers = teachersResult.data || [];
```

#### TO-BE (개선된 로직)
```javascript
// 재직 중인 일반 선생님만 표시 (관리자/부관리자 제외)
const teachers = allTeachers.filter(t => {
    const status = t.status || '재직';
    const isActive = status === '재직' || status === '재직중';
    const isTeacher = t.role === 'teacher' || t.role === '선생님' || !t.role;
    return isActive && isTeacher;
});
```

**필터링 규칙:**
- ✅ status가 '재직' 또는 '재직중'
- ✅ role이 'teacher' 또는 '선생님' (관리자/부관리자 제외)
- ✅ role이 없으면 일반 선생님으로 간주
- ❌ 퇴직/퇴사한 선생님 제외
- ❌ 관리자/부관리자 제외

**개선 효과:**
- 담당 선생님으로 실제 수업을 담당하는 선생님만 표시
- 관리자/부관리자는 관리 업무만 담당하므로 제외
- 명확한 역할 분리

## 💻 구현 세부사항

### 아이디 입력 IME 비활성화

**브라우저별 대응:**
```html
<!-- PC 브라우저 -->
<input style="ime-mode: disabled;">  <!-- Chrome, Firefox, IE -->

<!-- 모바일 브라우저 -->
<input inputmode="latin">  <!-- iOS Safari, Android Chrome -->

<!-- 포커스 시 재설정 -->
<input onfocus="this.setAttribute('inputmode', 'latin'); this.style.imeMode='disabled';">
```

**동작 원리:**
1. 입력창 클릭 (포커스)
2. `onfocus` 이벤트 발생
3. `inputmode` 속성을 `latin`으로 설정
4. `ime-mode` 스타일을 `disabled`로 설정
5. 영문 키보드 표시 (한글 입력 차단)

### 선생님 필터링 로직

**재직 여부 판단:**
```javascript
const status = t.status || '재직';  // status가 없으면 기본값 '재직'
const isActive = status === '재직' || status === '재직중';
```

**역할 판단 (담당 선생님 드롭다운용):**
```javascript
const isTeacher = t.role === 'teacher' || t.role === '선생님' || !t.role;
// role이 없으면 일반 선생님으로 간주
// 관리자('admin', '관리자'), 부관리자('sub-admin', '부관리자')는 제외됨
```

## 📝 수정 파일

### 필수 파일 (2개)
1. **index.html** - 아이디 입력 개선 & 캐시 버스팅
2. **js/members.js** - 선생님 필터 로직 개선 (`?t=1737276900`)

### 선택 파일 (1개)
3. **HOTFIX_v9.0.10_#33_아이디입력개선_선생님필터개선.md** - 문서

## 🚀 배포 방법

### Git 명령어
```bash
git add index.html js/members.js HOTFIX_v9.0.10_#33_아이디입력개선_선생님필터개선.md
git commit -m "v9.0.10 HOTFIX #33: 아이디 입력 개선 & 선생님 필터 개선"
git push origin main
```

## ✅ 배포 후 확인 사항

### 1. 아이디 입력 테스트

#### PC 브라우저 테스트
1. **로그인 페이지** 이동
2. **아이디 입력창 클릭**
3. **확인 사항**:
   - ✅ 자동으로 영문 입력 모드로 전환
   - ✅ 한글 입력 시도 시 입력 안 됨
   - ✅ 영어/숫자만 입력 가능

#### 모바일 브라우저 테스트
1. **모바일에서 로그인 페이지** 접속
2. **아이디 입력창 터치**
3. **확인 사항**:
   - ✅ 영문 키보드 표시 (한글 키보드 X)
   - ✅ 영어/숫자만 입력 가능

### 2. 회원 관리 페이지 선생님 필터 테스트

#### 관리자 계정으로 테스트
1. **로그인**: 관리자 계정
2. **회원 관리 > 학생 관리** 이동
3. **선생님 필터 드롭다운 확인**:
   - ✅ "전체 선생님" 옵션
   - ✅ 재직 중인 모든 선생님 표시 (관리자, 부관리자 포함)
   - ❌ 퇴직/퇴사한 선생님 미표시

4. **필터 동작 확인**:
   - 특정 선생님 선택
   - ✅ 해당 선생님 담당 학생만 표시
   - "전체 선생님" 선택
   - ✅ 모든 학생 표시

### 3. 학생 추가 시 담당 선생님 드롭다운 테스트

#### 학생 추가 폼 (인라인)
1. **학생 추가** 버튼 클릭
2. **담당 선생님 드롭다운 확인**:
   - ✅ "담당 선생님 선택" 옵션
   - ✅ 재직 중인 일반 선생님만 표시 (예: 설하령, 권미정)
   - ❌ 관리자/부관리자 미표시
   - ❌ 퇴직/퇴사한 선생님 미표시

#### 학생 수정 모달
1. **학생 카드**에서 수정 버튼 클릭
2. **담당 선생님 드롭다운 확인**:
   - ✅ "선택하세요" 옵션
   - ✅ 재직 중인 일반 선생님만 표시
   - ❌ 관리자/부관리자 미표시
   - ❌ 퇴직/퇴사한 선생님 미표시

### 4. 통합 시나리오 테스트

#### 시나리오 1: 신규 학생 등록
1. 관리자 로그인
2. 학생 관리 > 학생 추가
3. 담당 선생님 선택 → 일반 선생님만 표시됨
4. 학생 정보 입력 후 저장
5. 선생님 필터에서 해당 선생님 선택
6. 방금 등록한 학생이 표시됨

#### 시나리오 2: 담당 선생님 변경
1. 학생 카드 클릭 → 수정
2. 담당 선생님 변경 (일반 선생님 중 선택)
3. 저장 후 필터로 확인
4. 변경된 선생님 필터에 학생 표시됨

## 📌 참고 사항

### IME(Input Method Editor)
- **정의**: 한글, 일본어, 중국어 등 복잡한 문자 입력을 위한 시스템
- **비활성화 이유**: 아이디는 영어/숫자만 입력하므로 IME 불필요
- **브라우저 지원**:
  - `ime-mode`: Chrome, Firefox, IE (deprecated but works)
  - `inputmode`: 모바일 브라우저 표준

### 선생님 역할 구분
- **관리자/부관리자**: 시스템 관리 및 전체 데이터 접근
- **일반 선생님**: 수업 담당 및 담당 학생 관리
- **담당 선생님 지정**: 실제 수업을 담당하는 선생님만 선택 가능

### 재직 여부 판단 기준
- `status === '재직'`: 현재 재직 중
- `status === '재직중'`: 한글 표기 지원
- `status === null` 또는 `undefined`: 기본값 '재직'으로 간주
- 그 외 ('퇴직', '퇴사' 등): 재직 아님

---
작성일: 2026-01-19
작성자: AI Assistant
관련 이슈: 사용자 경험 개선, 데이터 정확성 향상
버전: v9.0.10 HOTFIX #33
