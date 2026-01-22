// 회원 관리 모듈

// 현재 선택된 학생 상태 필터
let currentStudentStatusFilter = '재원';
// 현재 선택된 탭
let currentStudentTab = 'info';
// 현재 선택된 담당선생님 필터 (학생관리)
let currentTeacherFilter = 'all';
// 현재 선택된 담당선생님 필터 (전체회원관리)
let currentAllMembersTeacherFilter = 'all';

// 학생 관리 페이지
async function showStudentsPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="page-container">
            <!-- 소카테고리 필터와 버튼 -->
            <div class="student-header-row">
                <div class="student-status-tabs">
                    <button class="status-tab active" data-status="재원" onclick="filterStudentsByStatus('재원')">
                        재원생
                    </button>
                    <button class="status-tab" data-status="휴원" onclick="filterStudentsByStatus('휴원')">
                        휴원생
                    </button>
                    <button class="status-tab" data-status="퇴원" onclick="filterStudentsByStatus('퇴원')">
                        퇴원생
                    </button>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    ${Auth.isAdmin() || Auth.isSubAdmin() ? `
                    <select id="teacherFilterSelect" class="form-select" style="width: 200px;" onchange="filterStudentsByTeacher()">
                        <option value="all">전체 선생님</option>
                    </select>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="upgradeAllStudents()" style="background-color: #17a2b8; border-color: #17a2b8;">
                        <i class="fas fa-arrow-up"></i> 승급
                    </button>
                    <button class="btn btn-primary" onclick="openStudentModal()">
                        <i class="fas fa-plus"></i> 학생 추가
                    </button>
                </div>
            </div>
            
            <!-- 2단 레이아웃 -->
            <div class="two-column-layout">
                <!-- 왼쪽: 학생 목록 (1단) -->
                <div class="student-list-column">
                    <div id="studentListContainer" class="student-list-items">
                        <div class="loading">로딩 중...</div>
                    </div>
                </div>
                
                <!-- 오른쪽: 학생 상세 정보 (4단) -->
                <div class="student-detail-column">
                    <div id="studentDetailContainer">
                        <div class="empty-state">
                            <i class="fas fa-user-graduate"></i>
                            <h3>학생을 선택하세요</h3>
                            <p>왼쪽 목록에서 학생을 클릭하면 상세 정보가 표시됩니다</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 학생 추가/수정 모달 -->
        <div class="modal" id="studentModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="studentModalTitle">학생 추가</h3>
                    <button class="modal-close" onclick="closeStudentModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="studentForm" onsubmit="saveStudent(event)">
                        <input type="hidden" id="studentId">
                        <div class="form-row">
                            <div class="form-group">
                                <label>이름 *</label>
                                <input type="text" id="studentName" required>
                            </div>
                            <div class="form-group">
                                <label>학교 *</label>
                                <input type="text" id="studentSchool" placeholder="예: 서울초등학교" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>학년 *</label>
                                <input type="text" id="studentGrade" placeholder="1~6 (초), 1~3 (중/고)" required>
                            </div>
                            <div class="form-group">
                                <label>상태 *</label>
                                <select id="studentStatus" required>
                                    <option value="재원">재원</option>
                                    <option value="휴원">휴원</option>
                                    <option value="퇴원">퇴원</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>담당 선생님</label>
                            <select id="studentTeacher">
                                <option value="">선택하세요</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>연락처</label>
                                <input type="tel" id="studentPhone" placeholder="010-0000-0000">
                            </div>
                            <div class="form-group">
                                <label>학부모 연락처 *</label>
                                <input type="tel" id="studentParentPhone" placeholder="010-0000-0000" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>주소</label>
                            <input type="text" id="studentAddress" placeholder="주소를 입력하세요">
                        </div>
                        <div class="form-group">
                            <label>등록일 *</label>
                            <input type="date" id="studentEnrollmentDate" required>
                        </div>
                        <div class="form-group">
                            <label>메모</label>
                            <textarea id="studentMemo" placeholder="특이사항이나 메모를 입력하세요"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeStudentModal()">취소</button>
                    <button class="btn btn-primary" onclick="document.getElementById('studentForm').requestSubmit()">저장</button>
                </div>
            </div>
        </div>
    `;
    
    // 관리자/부관리자인 경우 선생님 목록 로드
    if (Auth.isAdmin() || Auth.isSubAdmin()) {
        await loadTeachersForFilter();
    }
    
    loadStudents();
    updateButtonStates();
}

// 학생 목록 로드
let allStudents = [];
let selectedStudentId = null;

async function loadStudents() {
    try {
        console.log('[loadStudents] 학생 데이터 로드 시작...');
        const result = await API.getList('students', { limit: 1000 });
        console.log('[loadStudents] API 응답:', result);
        // Supabase는 배열을 직접 반환
        allStudents = Array.isArray(result) ? result : (result.data || []);
        console.log('[loadStudents] 로드된 학생 수:', allStudents.length);
        
        // 선생님 데이터도 함께 로드하여 캐싱
        try {
            const teachersResult = await API.getList('teachers', { limit: 1000 });
            window.allTeachersCache = Array.isArray(teachersResult) ? teachersResult : (teachersResult.data || []);
            console.log('[loadStudents] 선생님 데이터 캐싱 완료:', window.allTeachersCache.length);
        } catch (err) {
            console.warn('[loadStudents] 선생님 데이터 로드 실패:', err);
            window.allTeachersCache = [];
        }
        
        // 디버깅: 각 학생의 이름과 상태 출력
        allStudents.forEach(s => {
            console.log(`[학생 데이터] 이름: ${s.name}, 상태: ${s.status}, ID: ${s.id}`);
            
            // 데이터 손상 확인 및 복구 제안
            if (!s.name || !s.status) {
                console.error(`[데이터 손상 발견] ID: ${s.id} - 이름: ${s.name}, 상태: ${s.status}`);
                console.error(`[복구 필요] 전체 데이터:`, s);
            }
        });
        
        filterStudentsByStatus(currentStudentStatusFilter);
    } catch (error) {
        console.error('[loadStudents] 에러 발생:', error);
        const container = document.getElementById('studentListContainer');
        if (container) {
            container.innerHTML = '<div class="empty-state">데이터를 불러오는데 실패했습니다</div>';
        }
    }
}

// 상태별 학생 필터링
function filterStudentsByStatus(status) {
    console.log('[filterStudentsByStatus] 필터링 시작 - 상태:', status);
    console.log('[filterStudentsByStatus] 전체 학생 수:', allStudents.length);
    
    currentStudentStatusFilter = status;
    
    // 권한에 따라 학생 필터링 (Permissions 유틸리티 사용)
    let studentsToShow = Permissions.filterStudentsByTeacher(allStudents);
    console.log('[filterStudentsByStatus] 권한 필터링 후 학생 수:', studentsToShow.length);
    
    // 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
    if ((Auth.isAdmin() || Auth.isSubAdmin()) && currentTeacherFilter !== 'all') {
        studentsToShow = studentsToShow.filter(s => s.teacher_id === currentTeacherFilter);
        console.log('[filterStudentsByStatus] 선생님 필터링 후 학생 수:', studentsToShow.length);
    }
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.status-tab').forEach(tab => {
        if (tab.dataset.status === status) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 선택된 학생 초기화 (정보창 닫기)
    selectedStudentId = null;
    
    // 상태별 필터링 (undefined 체크 추가)
    const filteredStudents = studentsToShow.filter(s => {
        // 데이터 손상된 학생은 별도 처리
        if (!s.status || !s.name) {
            console.warn('[필터링 경고] 데이터 손상된 학생:', s.id);
            return false; // 일단 제외
        }
        return s.status === status;
    });
    console.log('[filterStudentsByStatus] 필터링된 학생 수:', filteredStudents.length);
    
    renderStudentList(filteredStudents);
    
    // 오른쪽 상세 정보창 초기화
    const detailContainer = document.getElementById('studentDetailContainer');
    if (detailContainer) {
        detailContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <h3>학생을 선택하세요</h3>
                <p>왼쪽 목록에서 학생을 클릭하면 상세 정보가 표시됩니다</p>
            </div>
        `;
    }
}

// 학생 목록 렌더링 (왼쪽 1단) - 이름, 학교 표시 + 아코디언
function renderStudentList(students) {
    console.log('[renderStudentList] 렌더링 시작 - 학생 수:', students.length);
    const container = document.getElementById('studentListContainer');
    
    if (!students || students.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>등록된 학생이 없습니다</p></div>';
        return;
    }
    
    // 학교급+학년별로 그룹화
    const grouped = {};
    students.forEach(student => {
        const schoolType = student.school_type || '미지정';
        const grade = student.grade || '미지정';
        
        // 학교급 이름 변환
        let schoolTypeName = '';
        if (schoolType === '초') schoolTypeName = '초등학교';
        else if (schoolType === '중') schoolTypeName = '중학교';
        else if (schoolType === '고') schoolTypeName = '고등학교';
        else schoolTypeName = schoolType;
        
        const key = `${schoolTypeName}_${grade}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                schoolType: schoolTypeName,
                grade: grade,
                students: []
            };
        }
        grouped[key].students.push(student);
    });
    
    // 학교급, 학년 순으로 정렬
    const sortedGroups = Object.values(grouped).sort((a, b) => {
        const schoolOrder = {'초등학교': 1, '중학교': 2, '고등학교': 3};
        const orderA = schoolOrder[a.schoolType] || 999;
        const orderB = schoolOrder[b.schoolType] || 999;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.grade.localeCompare(b.grade, 'ko');
    });
    
    // 아코디언 HTML 생성 (항상 열린 상태)
    container.innerHTML = sortedGroups.map((group, index) => {
        // 각 그룹 내 학생들을 이름순으로 정렬
        const sortedStudents = group.students.sort((a, b) => 
            a.name.localeCompare(b.name, 'ko')
        );
        
        return `
            <div class="accordion-group">
                <div class="accordion-header-simple">
                    <span class="group-title">${group.schoolType} ${group.grade}학년</span>
                    <span class="student-count-simple">(${sortedStudents.length}명)</span>
                </div>
                <div class="accordion-content-simple">
                    ${sortedStudents.map(student => {
                        const isComplete = isStudentInfoComplete(student);
                        const nameClass = isComplete ? 'student-name' : 'student-name incomplete';
                        
                        // 담당 선생님 색상 (관리자/부관리자만 표시)
                        let colorStyle = '';
                        if (Auth.isAdminOrSubAdmin()) {
                            const teacherColor = getTeacherColorClass(student.teacher_id);
                            colorStyle = teacherColor ? `style="background-color: ${teacherColor};"` : '';
                        }
                        
                        // 담당 선생님 이름 가져오기
                        let teacherName = '';
                        if (student.teacher_id && window.allTeachersCache) {
                            const teacher = window.allTeachersCache.find(t => t.id === student.teacher_id);
                            if (teacher) {
                                teacherName = ` (${teacher.name})`;
                            }
                        }
                        
                        return `
                        <div class="student-list-item ${selectedStudentId === student.id ? 'active' : ''}" ${colorStyle}
                             onclick="console.log('클릭됨:', '${student.id}'); showStudentDetail('${student.id}')">
                            <div class="student-info-inline">
                                <span class="${nameClass}">${student.name || 'undefined'}</span>
                                <span class="student-school-inline">${formatSchoolName(student.school)}${teacherName}</span>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// 아코디언 토글 함수 제거 (항상 열린 상태이므로 불필요)

// 학교명 짧게 표시 (예: "서울중학교" -> "서울")
function formatSchoolName(school) {
    if (!school) return '-';
    return school.replace('초등학교', '').replace('중학교', '').replace('고등학교', '');
}

// 학생 상세 정보 표시 (오른쪽 4단) - 5칸 탭 구조
async function showStudentDetail(studentId) {
    console.log('[showStudentDetail] 호출됨 - studentId:', studentId);
    selectedStudentId = studentId;
    const student = allStudents.find(s => s.id === studentId);
    
    console.log('[showStudentDetail] 학생 데이터:', student);
    
    if (!student) {
        console.error('[showStudentDetail] 학생을 찾을 수 없음');
        return;
    }
    
    // 선생님 목록 가져오기 (재직중인 선생님만)
    let teachers = [];
    try {
        const teachersResult = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(teachersResult) ? teachersResult : (teachersResult.data || []);
        teachers = allTeachers.filter(t => (t.status || '재직') === '재직');
        console.log('[showStudentDetail] 재직중인 선생님 수:', teachers.length);
        console.log('[showStudentDetail] 선생님 목록:', teachers.map(t => t.name));
    } catch (error) {
        console.error('[showStudentDetail] 선생님 정보 로드 실패:', error);
    }
    
    // 목록에서 활성화 표시
    document.querySelectorAll('.student-list-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event && event.target) {
        event.target.closest('.student-list-item')?.classList.add('active');
    }
    
    // 학년 옵션 생성
    const getGradeOptions = (schoolType) => {
        if (schoolType === '초') {
            return ['1', '2', '3', '4', '5', '6'];
        } else if (schoolType === '중' || schoolType === '고') {
            return ['1', '2', '3'];
        }
        return [];
    };
    
    const currentSchoolType = student.school_type || '초';
    const gradeOptions = getGradeOptions(currentSchoolType);
    
    const container = document.getElementById('studentDetailContainer');
    container.innerHTML = `
        <div class="student-detail-card">
            <div class="student-detail-header-new">
                <input type="text" id="studentName" class="student-name-input" value="${student.name}" onchange="updateStudentField('${student.id}', 'name', this.value)" placeholder="학생 이름">
                <div class="header-controls">
                    <div class="status-toggle" onclick="toggleStudentStatus('${student.id}')">
                        <span class="status-badge status-${student.status === '재원' ? 'active' : student.status === '휴원' ? 'paused' : 'inactive'}">
                            ${student.status || '재원'}
                        </span>
                    </div>
                    <select class="teacher-select" onchange="updateStudentTeacher('${student.id}', this.value)">
                        <option value="">담당 선생님 선택</option>
                        ${teachers.map(t => `
                            <option value="${t.id}" ${student.teacher_id === t.id ? 'selected' : ''}>
                                ${t.name}
                            </option>
                        `).join('')}
                    </select>
                    ${Auth.getRole() !== 'teacher' ? `
                    <button class="btn-danger-small" onclick="deleteStudentCompletely('${student.id}', '${student.name}')" style="margin-left: 0.5rem;">
                        삭제
                    </button>` : ''}
                </div>
            </div>
            
            <!-- 4칸 탭 -->
            <div class="detail-tabs">
                <button class="detail-tab ${currentStudentTab === 'info' ? 'active' : ''}" onclick="switchStudentTab('info', '${student.id}')">정보</button>
                <button class="detail-tab ${currentStudentTab === 'scores' ? 'active' : ''}" onclick="switchStudentTab('scores', '${student.id}')">시험점수</button>
                <button class="detail-tab ${currentStudentTab === 'books' ? 'active' : ''}" onclick="switchStudentTab('books', '${student.id}')">사용책</button>
                <button class="detail-tab ${currentStudentTab === 'consultation' ? 'active' : ''}" onclick="switchStudentTab('consultation', '${student.id}')">상담내용</button>
            </div>
            
            <div id="tabContent" class="tab-content">
                ${renderStudentTabContent(student, teachers, gradeOptions, currentSchoolType)}
            </div>
        </div>
    `;
    
    updateButtonStates();
}

// 새 학생 추가 폼 표시 (인라인)
async function showStudentForm(studentId = null) {
    selectedStudentId = null;
    
    // 선생님 목록 가져오기 (재직 중인 선생님만, 관리자/부관리자 제외)
    let teachers = [];
    try {
        const teachersResult = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(teachersResult) ? teachersResult : (teachersResult.data || []);
        
        // status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
        // role이 'teacher' 또는 '선생님'인 경우만 포함 (관리자/부관리자 제외)
        teachers = allTeachers.filter(t => {
            const status = t.status || '재직';
            const isActive = status === '재직' || status === '재직중';
            const isTeacher = t.role === 'teacher' || t.role === '선생님' || !t.role; // role이 없으면 일반 선생님으로 간주
            return isActive && isTeacher;
        });
        
        console.log('[showStudentForm] 재직중인 선생님(관리자 제외) 수:', teachers.length);
        console.log('[showStudentForm] 재직중인 선생님 목록:', teachers.map(t => `${t.name}(${t.role || '선생님'})`));
    } catch (error) {
        console.error('[showStudentForm] 선생님 정보 로드 실패:', error);
    }
    
    const container = document.getElementById('studentDetailContainer');
    container.innerHTML = `
        <div class="student-detail-card">
            <!-- 새 헤더: 이름 입력 + 상태 토글 + 담당 선생님 드롭다운 + 버튼 -->
            <div class="student-form-header">
                <div class="header-left">
                    <input type="text" id="newStudentName" placeholder="이름 *" 
                           class="student-name-input" required>
                    
                    <button type="button" class="status-toggle-btn" onclick="cycleStatus()" id="statusToggleBtn">
                        재원
                    </button>
                    <input type="hidden" id="newStudentStatus" value="재원">
                    
                    <select id="newStudentTeacher" class="teacher-select">
                        <option value="">담당 선생님 선택</option>
                        ${teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="header-controls">
                    <button class="btn btn-secondary" onclick="cancelStudentForm()" style="padding: 0.5rem 1rem;">
                        <i class="fas fa-times"></i> 취소
                    </button>
                    <button class="btn btn-primary" onclick="saveStudentFromForm()" style="padding: 0.5rem 1rem;">
                        <i class="fas fa-save"></i> 저장
                    </button>
                </div>
            </div>
            
            <div class="student-detail-body-new">
                <!-- 1행: 학교명, 구분, 학년, 진도 -->
                <div class="detail-row-compact">
                    <div class="detail-group-compact">
                        <label>학교명</label>
                        <input type="text" id="newStudentSchool" placeholder="학교명 (예: 서울초)">
                    </div>
                    <div class="detail-group-compact">
                        <label>구분</label>
                        <select id="newStudentSchoolType">
                            <option value="초">초</option>
                            <option value="중">중</option>
                            <option value="고">고</option>
                        </select>
                    </div>
                    <div class="detail-group-compact">
                        <label>학년</label>
                        <select id="newStudentGrade">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                        </select>
                    </div>
                    <div class="detail-group-compact">
                        <label>진도</label>
                        <select id="newStudentProgress">
                            <option value="현행">현행</option>
                            <option value="선행1">선행1</option>
                            <option value="선행2">선행2</option>
                        </select>
                    </div>
                </div>
                
                <!-- 2행: 연락처, 출결번호, 학부모 연락처 -->
                <div class="detail-row-compact">
                    <div class="detail-group-compact">
                        <label>연락처</label>
                        <input type="tel" id="newStudentPhone" placeholder="010-0000-0000">
                    </div>
                    <div class="detail-group-compact">
                        <label>출결번호</label>
                        <input type="text" id="newStudentAttendanceNumber" readonly class="readonly-field" 
                               placeholder="자동 생성" value="">
                    </div>
                    <div class="detail-group-compact">
                        <label>학부모 연락처</label>
                        <input type="tel" id="newStudentParentPhone" placeholder="010-0000-0000">
                    </div>
                    <div class="detail-group-compact" style="visibility: hidden;">
                        <label>-</label>
                        <input type="text" disabled>
                    </div>
                </div>
                
                <!-- 3행: 등록일, 퇴원일 -->
                <div class="detail-row-compact">
                    <div class="detail-group-compact">
                        <label>등록일</label>
                        <input type="date" id="newStudentEnrollmentDate" value="${Utils.today()}">
                    </div>
                    <div class="detail-group-compact">
                        <label>퇴원일</label>
                        <input type="date" id="newStudentWithdrawalDate">
                    </div>
                    <div class="detail-group-compact" style="visibility: hidden;">
                        <label>-</label>
                        <input type="text" disabled>
                    </div>
                    <div class="detail-group-compact" style="visibility: hidden;">
                        <label>-</label>
                        <input type="text" disabled>
                    </div>
                </div>
                
                <!-- 4행: 선행 개념, 선행 복습, 현행 심화 -->
                <div class="detail-row-compact">
                    <div class="detail-group-compact">
                        <label>선행 개념</label>
                        <input type="text" id="newStudentAdvancedConcept" placeholder="선행 개념">
                    </div>
                    <div class="detail-group-compact">
                        <label>선행 복습</label>
                        <input type="text" id="newStudentAdvancedReview" placeholder="선행 복습">
                    </div>
                    <div class="detail-group-compact">
                        <label>현행 심화</label>
                        <input type="text" id="newStudentCurrentDeep" placeholder="현행 심화">
                    </div>
                    <div class="detail-group-compact" style="visibility: hidden;">
                        <label>-</label>
                        <input type="text" disabled>
                    </div>
                </div>
                
                <!-- 스케줄 섹션 -->
                <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #E1E8ED;">
                    <h3 style="margin-bottom: 1rem; color: #333;">주간 스케줄</h3>
                    <table class="schedule-table">
                        <thead>
                            <tr>
                                <th>요일</th>
                                <th>수업</th>
                                <th>입실시간</th>
                                <th>퇴실시간</th>
                                <th>재실시간(분)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${['월요일', '화요일', '수요일', '목요일', '금요일', '토요일'].map((dayLabel, idx) => {
                                const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                const dayKey = dayKeys[idx];
                                return `
                                    <tr>
                                        <td class="day-label">${dayLabel}</td>
                                        <td class="checkbox-cell">
                                            <input type="checkbox" id="new-schedule-${dayKey}-enabled">
                                        </td>
                                        <td>
                                            <input type="text" class="time-input" id="new-schedule-${dayKey}-checkin" 
                                                   placeholder="14:00"
                                                   onchange="calculateNewScheduleCheckout('${dayKey}')">
                                        </td>
                                        <td>
                                            <input type="text" class="time-input" id="new-schedule-${dayKey}-checkout" readonly>
                                        </td>
                                        <td>
                                            <input type="number" id="new-schedule-${dayKey}-duration" 
                                                   value="90" min="30" max="300" step="10"
                                                   onchange="calculateNewScheduleCheckout('${dayKey}')">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    <div class="schedule-note">
                        <p><i class="fas fa-info-circle"></i> 재실시간은 기본 90분이며, 입실시간을 입력하면 자동으로 퇴실시간이 계산됩니다.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 학교 유형 변경 시 학년 옵션 업데이트
    document.getElementById('newStudentSchoolType').addEventListener('change', function() {
        const schoolType = this.value;
        const gradeSelect = document.getElementById('newStudentGrade');
        let options = '';
        
        if (schoolType === '초') {
            options = ['1', '2', '3', '4', '5', '6'].map(g => `<option value="${g}">${g}</option>`).join('');
        } else {
            options = ['1', '2', '3'].map(g => `<option value="${g}">${g}</option>`).join('');
        }
        
        gradeSelect.innerHTML = options;
    });
    
    // 연락처 입력 시 출결번호 자동 생성
    document.getElementById('newStudentPhone').addEventListener('input', function() {
        const phone = this.value.trim();
        if (phone) {
            const attendanceNumber = generateAttendanceNumber(phone);
            document.getElementById('newStudentAttendanceNumber').value = attendanceNumber;
        } else {
            document.getElementById('newStudentAttendanceNumber').value = '';
        }
    });
    
    updateButtonStates();
}

// 상태 순환 함수 (재원 → 휴원 → 퇴원 → 재원)
function cycleStatus() {
    const statusBtn = document.getElementById('statusToggleBtn');
    const statusInput = document.getElementById('newStudentStatus');
    const currentStatus = statusInput.value;
    
    let nextStatus;
    if (currentStatus === '재원') {
        nextStatus = '휴원';
    } else if (currentStatus === '휴원') {
        nextStatus = '퇴원';
    } else {
        nextStatus = '재원';
    }
    
    statusInput.value = nextStatus;
    statusBtn.textContent = nextStatus;
    
    // 상태에 따라 색상 변경
    statusBtn.className = 'status-toggle-btn';
    if (nextStatus === '재원') {
        statusBtn.classList.add('status-active');
    } else if (nextStatus === '휴원') {
        statusBtn.classList.add('status-inactive');
    } else {
        statusBtn.classList.add('status-withdrawn');
    }
}

// 새 학생 스케줄 퇴실시간 자동 계산
function calculateNewScheduleCheckout(dayKey) {
    const checkinInput = document.getElementById(`new-schedule-${dayKey}-checkin`);
    const checkoutInput = document.getElementById(`new-schedule-${dayKey}-checkout`);
    const durationInput = document.getElementById(`new-schedule-${dayKey}-duration`);
    
    let checkin = checkinInput.value;
    const duration = parseInt(durationInput.value) || 90;
    
    // 시간 형식 자동 변환 (1400 → 14:00)
    if (checkin) {
        checkin = formatTimeString(checkin);
        checkinInput.value = checkin; // 변환된 값을 입력 필드에 반영
    }
    
    if (checkin && /^\d{2}:\d{2}$/.test(checkin)) {
        const [hours, minutes] = checkin.split(':').map(Number);
        const checkinDate = new Date();
        checkinDate.setHours(hours, minutes, 0, 0);
        
        const checkoutDate = new Date(checkinDate.getTime() + duration * 60000);
        const checkoutHours = String(checkoutDate.getHours()).padStart(2, '0');
        const checkoutMinutes = String(checkoutDate.getMinutes()).padStart(2, '0');
        
        checkoutInput.value = `${checkoutHours}:${checkoutMinutes}`;
    } else {
        checkoutInput.value = '';
    }
}

// 탭 전환
function switchStudentTab(tab, studentId) {
    currentStudentTab = tab;
    showStudentDetail(studentId);
}

// 탭 컨텐츠 렌더링
function renderStudentTabContent(student, teachers, gradeOptions, currentSchoolType) {
    let content = '';
    
    if (currentStudentTab === 'info') {
        content = renderInfoTab(student, teachers, gradeOptions, currentSchoolType);
    } else if (currentStudentTab === 'scores') {
        content = renderScoresTab(student);
    } else if (currentStudentTab === 'books') {
        content = renderBooksTab(student);
    } else if (currentStudentTab === 'consultation') {
        content = renderConsultationTab(student);
    }
    
    console.log('[renderStudentTabContent] currentStudentTab:', currentStudentTab, 'content length:', content ? content.length : 0);
    
    return content;
}

// 정보 탭
function renderInfoTab(student, teachers, gradeOptions, currentSchoolType) {
    let scheduleHTML = '';
    try {
        scheduleHTML = renderScheduleSection(student);
    } catch (error) {
        console.error('[renderInfoTab] 스케줄 렌더링 오류:', error);
        scheduleHTML = '<div style="color: red;">스케줄 로드 실패</div>';
    }
    
    // 사용책 정보 파싱 및 최신 데이터 추출
    let bookConcept = '-';
    let bookReview = '-';
    let bookAdvanced = '-';
    
    try {
        let books = [];
        if (student.books && typeof student.books === 'string' && student.books.trim() !== '') {
            books = JSON.parse(student.books);
        } else if (Array.isArray(student.books)) {
            books = student.books;
        }
        
        if (books.length > 0) {
            // 최신순 정렬
            const sortedBooks = [...books].sort((a, b) => {
                return (b.date || '').localeCompare(a.date || '');
            });
            
            // 선행개념 찾기
            for (const book of sortedBooks) {
                if (book.concept && book.concept.trim() !== '' && book.concept.trim() !== '0') {
                    bookConcept = book.concept;
                    break;
                }
            }
            
            // 선행복습 찾기
            for (const book of sortedBooks) {
                if (book.review && book.review.trim() !== '' && book.review.trim() !== '0') {
                    bookReview = book.review;
                    break;
                }
            }
            
            // 현행심화 찾기
            for (const book of sortedBooks) {
                if (book.advanced && book.advanced.trim() !== '' && book.advanced.trim() !== '0') {
                    bookAdvanced = book.advanced;
                    break;
                }
            }
        }
    } catch (e) {
        console.error('[renderInfoTab] 사용책 파싱 오류:', e);
    }
    
    return `
        <div class="student-detail-body-new">
            <!-- 1행: 학교 정보 및 진도 -->
            <div class="detail-row-compact">
                <div class="detail-group-compact">
                    <label>학교명</label>
                    <input type="text" value="${student.school || ''}" 
                           onchange="updateStudentSchool('${student.id}', this.value)"
                           placeholder="학교명 (예: 서울중)">
                </div>
                <div class="detail-group-compact">
                    <label>구분</label>
                    <select onchange="updateStudentSchoolType('${student.id}', this.value)">
                        <option value="초" ${currentSchoolType === '초' ? 'selected' : ''}>초</option>
                        <option value="중" ${currentSchoolType === '중' ? 'selected' : ''}>중</option>
                        <option value="고" ${currentSchoolType === '고' ? 'selected' : ''}>고</option>
                    </select>
                </div>
                <div class="detail-group-compact">
                    <label>학년</label>
                    <select onchange="updateStudentField('${student.id}', 'grade', this.value)">
                        ${gradeOptions.map(g => `
                            <option value="${g}" ${student.grade === g ? 'selected' : ''}>${g}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="detail-group-compact">
                    <label>진도</label>
                    <select onchange="updateStudentField('${student.id}', 'progress', this.value)">
                        <option value="현행" ${student.progress === '현행' ? 'selected' : ''}>현행</option>
                        <option value="선행1" ${student.progress === '선행1' ? 'selected' : ''}>선행1</option>
                        <option value="선행2" ${student.progress === '선행2' ? 'selected' : ''}>선행2</option>
                    </select>
                </div>
            </div>
            
            <!-- 2행: 연락처 정보 및 담당선생님 -->
            <div class="detail-row-compact">
                <div class="detail-group-compact">
                    <label>연락처</label>
                    <input type="tel" value="${student.phone || ''}" 
                           onchange="updateStudentPhone('${student.id}', this.value)"
                           placeholder="010-0000-0000">
                </div>
                <div class="detail-group-compact">
                    <label>출결번호</label>
                    <input type="text" value="${student.attendance_number || '-'}" 
                           readonly class="readonly-field">
                </div>
                <div class="detail-group-compact">
                    <label>학부모 연락처</label>
                    <input type="tel" value="${student.parent_phone || ''}" 
                           onchange="updateStudentField('${student.id}', 'parent_phone', this.value)"
                           placeholder="010-0000-0000">
                </div>
                <div class="detail-group-compact" style="visibility: hidden;">
                    <label>-</label>
                    <input type="text" disabled>
                </div>
            </div>
            
            <!-- 3행: 날짜 정보 -->
            <div class="detail-row-compact">
                <div class="detail-group-compact">
                    <label>등록일</label>
                    <input type="text" value="${student.enrollment_date ? Utils.formatDate(student.enrollment_date) : '-'}" 
                           readonly class="readonly-field">
                </div>
                <div class="detail-group-compact">
                    <label>탈퇴일</label>
                    <input type="text" value="${student.withdrawal_date ? Utils.formatDate(student.withdrawal_date) : '-'}" 
                           readonly class="readonly-field">
                </div>
            </div>
            
            <!-- 4행: 사용 교재 표시 (최신 것만) -->
            <div class="books-display">
                <div class="book-item">
                    <label>선행개념</label>
                    <div class="book-value" id="book-concept-${student.id}">${bookConcept}</div>
                </div>
                <div class="book-item">
                    <label>선행복습</label>
                    <div class="book-value" id="book-review-${student.id}">${bookReview}</div>
                </div>
                <div class="book-item">
                    <label>현행심화</label>
                    <div class="book-value" id="book-advanced-${student.id}">${bookAdvanced}</div>
                </div>
            </div>
            
            <!-- 스케줄 섹션 -->
            ${scheduleHTML}
        </div>
    `;
}

// 스케줄 섹션 (정보 탭 내에 표시)
function renderScheduleSection(student) {
    console.log('[renderScheduleSection] 시작 - 학생:', student.name);
    console.log('[renderScheduleSection] 원본 schedule:', student.schedule);
    console.log('[renderScheduleSection] schedule 타입:', typeof student.schedule);
    
    // schedule이 문자열이면 JSON 파싱 (안전한 파싱 사용)
    let schedule = getStudentSchedule(student);
    console.log('[renderScheduleSection] 파싱된 schedule:', schedule);
    
    // 기본값 설정
    if (!schedule || Object.keys(schedule).length === 0) {
        console.log('[renderScheduleSection] 빈 스케줄 - 기본값 설정');
        schedule = {
            monday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            tuesday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            wednesday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            thursday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            friday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            saturday: { enabled: false, checkIn: '', checkOut: '', duration: 90 }
        };
    }
    
    // 각 요일별로 퇴실시간이 비어있으면 자동 계산
    Object.keys(schedule).forEach(dayKey => {
        const day = schedule[dayKey];
        if (day && day.checkIn && !day.checkOut) {
            day.checkOut = calculateCheckOutTime(day.checkIn, day.duration || 90);
        }
    });

    const days = [
        { key: 'monday', label: '월요일' },
        { key: 'tuesday', label: '화요일' },
        { key: 'wednesday', label: '수요일' },
        { key: 'thursday', label: '목요일' },
        { key: 'friday', label: '금요일' },
        { key: 'saturday', label: '토요일' }
    ];

    // 추가 행용 스케줄 데이터 가져오기
    const extraSchedule = schedule.extra || { dayKey: '', enabled: false, checkIn: '', checkOut: '', duration: 90 };

    return `
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #E1E8ED;">
            <h3 style="margin-bottom: 1rem; color: #333;">주간 스케줄</h3>
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>요일</th>
                        <th>수업</th>
                        <th>입실시간</th>
                        <th>퇴실시간</th>
                        <th>재실시간(분)</th>
                    </tr>
                </thead>
                <tbody>
                    ${days.map((day, index) => {
                        const daySchedule = schedule[day.key] || { enabled: false, checkIn: '', checkOut: '', duration: 90 };
                        return `
                            <tr>
                                <td class="day-label">${day.label}</td>
                                <td class="checkbox-cell">
                                    <input type="checkbox" 
                                        id="schedule-${day.key}-enabled"
                                        ${daySchedule.enabled ? 'checked' : ''}
                                        onchange="updateScheduleEnabled('${student.id}', '${day.key}', this.checked)">
                                </td>
                                <td>
                                    <input type="text" class="time-input"
                                        id="schedule-${day.key}-checkin"
                                        value="${daySchedule.checkIn || ''}"
                                        placeholder="14:00"
                                        oninput="updateScheduleCheckoutRealtime('${student.id}', '${day.key}')"
                                        onchange="updateScheduleCheckIn('${student.id}', '${day.key}', this.value)">
                                </td>
                                <td>
                                    <input type="text" class="time-input"
                                        id="schedule-${day.key}-checkout"
                                        value="${daySchedule.checkOut || ''}"
                                        readonly>
                                </td>
                                <td>
                                    <input type="number" 
                                        id="schedule-${day.key}-duration"
                                        value="${daySchedule.duration || 90}"
                                        min="30" max="300" step="10"
                                        oninput="updateScheduleCheckoutRealtime('${student.id}', '${day.key}')"
                                        onchange="updateScheduleDuration('${student.id}', '${day.key}', this.value)">
                                </td>
                            </tr>
                        `;
                    }).join('')}
                    <!-- 추가 수업 행 (요일 선택 가능) -->
                    <tr>
                        <td>
                            <select id="schedule-extra-day" class="time-input" 
                                    onchange="updateScheduleExtraDay('${student.id}', this.value)"
                                    style="width: 100%; padding: 0.5rem;">
                                <option value="">요일 선택</option>
                                <option value="monday" ${extraSchedule.dayKey === 'monday' ? 'selected' : ''}>월요일</option>
                                <option value="tuesday" ${extraSchedule.dayKey === 'tuesday' ? 'selected' : ''}>화요일</option>
                                <option value="wednesday" ${extraSchedule.dayKey === 'wednesday' ? 'selected' : ''}>수요일</option>
                                <option value="thursday" ${extraSchedule.dayKey === 'thursday' ? 'selected' : ''}>목요일</option>
                                <option value="friday" ${extraSchedule.dayKey === 'friday' ? 'selected' : ''}>금요일</option>
                                <option value="saturday" ${extraSchedule.dayKey === 'saturday' ? 'selected' : ''}>토요일</option>
                            </select>
                        </td>
                        <td class="checkbox-cell">
                            <input type="checkbox" 
                                id="schedule-extra-enabled"
                                ${extraSchedule.enabled ? 'checked' : ''}
                                onchange="updateScheduleExtraEnabled('${student.id}', this.checked)">
                        </td>
                        <td>
                            <input type="text" class="time-input"
                                id="schedule-extra-checkin"
                                value="${extraSchedule.checkIn || ''}"
                                placeholder="14:00"
                                oninput="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onkeyup="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onblur="updateScheduleExtraCheckIn('${student.id}', this.value)"
                                onchange="updateScheduleExtraCheckIn('${student.id}', this.value)">
                        </td>
                        <td>
                            <input type="text" class="time-input"
                                id="schedule-extra-checkout"
                                value="${extraSchedule.checkOut || ''}"
                                readonly>
                        </td>
                        <td>
                            <input type="number" 
                                id="schedule-extra-duration"
                                value="${extraSchedule.duration || 90}"
                                min="30" max="300" step="10"
                                oninput="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onkeyup="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onchange="updateScheduleExtraDuration('${student.id}', this.value)">
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="schedule-note">
                <p><i class="fas fa-info-circle"></i> 재실시간은 기본 90분이며, 입실시간을 입력하면 자동으로 퇴실시간이 계산됩니다.</p>
                <p><i class="fas fa-info-circle"></i> 같은 요일에 2번 수업이 있을 경우, 맨 아래 행에서 요일을 선택하여 등록하세요.</p>
            </div>
        </div>
    `;
}

// 스케줄 탭
function renderScheduleTab(student) {
    // 스케줄 데이터 가져오기 (JSON 파싱 포함)
    let schedule = getStudentSchedule(student);
    
    // 기본값 설정
    if (!schedule || Object.keys(schedule).length === 0) {
        schedule = {
            monday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            tuesday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            wednesday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            thursday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            friday: { enabled: false, checkIn: '', checkOut: '', duration: 90 },
            saturday: { enabled: false, checkIn: '', checkOut: '', duration: 90 }
        };
    }

    const days = [
        { key: 'monday', label: '월요일' },
        { key: 'tuesday', label: '화요일' },
        { key: 'wednesday', label: '수요일' },
        { key: 'thursday', label: '목요일' },
        { key: 'friday', label: '금요일' },
        { key: 'saturday', label: '토요일' }
    ];

    // 추가 행용 스케줄 데이터 가져오기
    const extraSchedule = schedule.extra || { dayKey: '', enabled: false, checkIn: '', checkOut: '', duration: 90 };

    return `
        <div class="tab-panel">
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>요일</th>
                        <th>수업</th>
                        <th>입실시간</th>
                        <th>퇴실시간</th>
                        <th>재실시간(분)</th>
                    </tr>
                </thead>
                <tbody>
                    ${days.map((day, index) => {
                        const daySchedule = schedule[day.key] || { enabled: false, checkIn: '', checkOut: '', duration: 90 };
                        return `
                            <tr>
                                <td class="day-label">${day.label}</td>
                                <td class="checkbox-cell">
                                    <input type="checkbox" 
                                        id="schedule-${day.key}-enabled"
                                        ${daySchedule.enabled ? 'checked' : ''}
                                        onchange="updateScheduleEnabled('${student.id}', '${day.key}', this.checked)">
                                </td>
                                <td>
                                    <input type="text" class="time-input"
                                        id="schedule-${day.key}-checkin"
                                        value="${daySchedule.checkIn || ''}"
                                        placeholder="14:00"
                                        oninput="updateScheduleCheckoutRealtime('${student.id}', '${day.key}')"
                                        onchange="updateScheduleCheckIn('${student.id}', '${day.key}', this.value)">
                                </td>
                                <td>
                                    <input type="text" class="time-input"
                                        id="schedule-${day.key}-checkout"
                                        value="${daySchedule.checkOut || ''}"
                                        readonly>
                                </td>
                                <td>
                                    <input type="number" 
                                        id="schedule-${day.key}-duration"
                                        value="${daySchedule.duration || 90}"
                                        min="30" max="300" step="10"
                                        oninput="updateScheduleCheckoutRealtime('${student.id}', '${day.key}')"
                                        onchange="updateScheduleDuration('${student.id}', '${day.key}', this.value)">
                                </td>
                            </tr>
                        `;
                    }).join('')}
                    <!-- 추가 수업 행 (요일 선택 가능) -->
                    <tr>
                        <td>
                            <select id="schedule-extra-day" class="time-input" 
                                    onchange="updateScheduleExtraDay('${student.id}', this.value)"
                                    style="width: 100%; padding: 0.5rem;">
                                <option value="">요일 선택</option>
                                <option value="monday" ${extraSchedule.dayKey === 'monday' ? 'selected' : ''}>월요일</option>
                                <option value="tuesday" ${extraSchedule.dayKey === 'tuesday' ? 'selected' : ''}>화요일</option>
                                <option value="wednesday" ${extraSchedule.dayKey === 'wednesday' ? 'selected' : ''}>수요일</option>
                                <option value="thursday" ${extraSchedule.dayKey === 'thursday' ? 'selected' : ''}>목요일</option>
                                <option value="friday" ${extraSchedule.dayKey === 'friday' ? 'selected' : ''}>금요일</option>
                                <option value="saturday" ${extraSchedule.dayKey === 'saturday' ? 'selected' : ''}>토요일</option>
                            </select>
                        </td>
                        <td class="checkbox-cell">
                            <input type="checkbox" 
                                id="schedule-extra-enabled"
                                ${extraSchedule.enabled ? 'checked' : ''}
                                onchange="updateScheduleExtraEnabled('${student.id}', this.checked)">
                        </td>
                        <td>
                            <input type="text" class="time-input"
                                id="schedule-extra-checkin"
                                value="${extraSchedule.checkIn || ''}"
                                placeholder="14:00"
                                oninput="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onkeyup="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onblur="updateScheduleExtraCheckIn('${student.id}', this.value)"
                                onchange="updateScheduleExtraCheckIn('${student.id}', this.value)">
                        </td>
                        <td>
                            <input type="text" class="time-input"
                                id="schedule-extra-checkout"
                                value="${extraSchedule.checkOut || ''}"
                                readonly>
                        </td>
                        <td>
                            <input type="number" 
                                id="schedule-extra-duration"
                                value="${extraSchedule.duration || 90}"
                                min="30" max="300" step="10"
                                oninput="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onkeyup="updateScheduleExtraCheckoutRealtime('${student.id}')"
                                onchange="updateScheduleExtraDuration('${student.id}', this.value)">
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="schedule-note">
                <p><i class="fas fa-info-circle"></i> 재실시간은 기본 90분이며, 입실시간을 입력하면 자동으로 퇴실시간이 계산됩니다.</p>
                <p><i class="fas fa-info-circle"></i> 같은 요일에 2번 수업이 있을 경우, 맨 아래 행에서 요일을 선택하여 등록하세요.</p>
            </div>
        </div>
    `;
}

// ===== 시험점수/사용책/상담내용 탭 함수는 js/tab-renderers-new.js에 있습니다 =====

// ========================================
// 날짜 변환 헬퍼 함수들
// ========================================

// 시험 날짜 변환 ("250116" → "2025.01.16")
// 시험 날짜 변환 ("250116" → "25.01.16", "2511" → "25.11")
function formatScoreDate(input) {
    if (!input) return '-';
    const str = String(input);
    if (str.length === 6) {
        // 250116 → 25.01.16
        return `${str.slice(0,2)}.${str.slice(2,4)}.${str.slice(4,6)}`;
    } else if (str.length === 4) {
        // 2511 → 25.11
        return `${str.slice(0,2)}.${str.slice(2,4)}`;
    }
    return input;
}

// 교재 날짜 변환 ("2511" → "25.11")
function formatBookDate(input) {
    if (!input) return '-';
    const str = String(input);
    if (str.length === 4) {
        // 2511 → 25.11
        return `${str.slice(0,2)}.${str.slice(2,4)}`;
    }
    return input;
}

// 상담 날짜 변환 ("251102" → "25.11.02", "2511" → "25.11")
function formatConsulDate(input) {
    if (!input) return '-';
    const str = String(input);
    if (str.length === 6) {
        // 251102 → 25.11.02
        return `${str.slice(0,2)}.${str.slice(2,4)}.${str.slice(4,6)}`;
    } else if (str.length === 4) {
        // 2511 → 25.11
        return `${str.slice(0,2)}.${str.slice(2,4)}`;
    }
    return input;
}

// 시험 종류 자동 변환
function parseExamType(input) {
    const typeMap = {
        '1중간': '1학기 중간고사',
        '1기말': '1학기 기말고사',
        '2중간': '2학기 중간고사',
        '2기말': '2학기 기말고사',
        '2고사': '2학기 고사',
        '학교': '학교 단원평가'
    };
    return typeMap[input] || input;
}

// 점수 클래스 반환 (색상)
function getScoreClass(score) {
    if (score >= 100) return 'score-perfect'; // 파란색
    if (score >= 90) return 'score-excellent'; // 초록색
    if (score <= 70) return 'score-poor'; // 빨간색
    return '';
}

// 상담자 토글 함수
function toggleConsulPerson(element) {
    const options = element.querySelectorAll('.person-option');
    const currentActive = element.querySelector('.person-option.active');
    const currentIndex = Array.from(options).indexOf(currentActive);
    const nextIndex = (currentIndex + 1) % options.length;
    
    options.forEach(opt => opt.classList.remove('active'));
    options[nextIndex].classList.add('active');
    element.dataset.value = options[nextIndex].dataset.value;
}

// ========================================
// CRUD 함수들
// ========================================

// 시험점수 추가
// 교재 추가 (이전 placeholder 함수 대체)
// 날짜 파싱 (년월 또는 년월일)
// "2025.11" → "2511"
// "2025.11.02" → "251102"
// "2511" → "2511"
function parseYearMonthDay(input) {
    if (!input) return '';
    
    // 이미 숫자만 있으면 그대로 반환
    if (/^\d+$/.test(input)) {
        return input;
    }
    
    // "2025.11.02" 형식 파싱
    const fullMatch = input.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (fullMatch) {
        const year = fullMatch[1].slice(2, 4);  // 2025 → 25
        const month = fullMatch[2].padStart(2, '0');  // 11 → 11, 1 → 01
        const day = fullMatch[3].padStart(2, '0');  // 2 → 02
        return year + month + day;  // 251102
    }
    
    // "2025.11" 형식 파싱
    const yearMonthMatch = input.match(/(\d{4})\.(\d{1,2})/);
    if (yearMonthMatch) {
        const year = yearMonthMatch[1].slice(2, 4);  // 2025 → 25
        const month = yearMonthMatch[2].padStart(2, '0');  // 11 → 11, 1 → 01
        return year + month;  // 2511
    }
    
    return input;
}

// 날짜 파싱 (년월)
// "2025.11" → "2511"
// "2511" → "2511"
function parseYearMonth(input) {
    if (!input) return '';
    
    // 이미 숫자만 있으면 그대로 반환
    if (/^\d+$/.test(input)) {
        return input;
    }
    
    // "2025.11" 형식 파싱
    const dotMatch = input.match(/(\d{4})\.(\d{1,2})/);
    if (dotMatch) {
        const year = dotMatch[1].slice(2, 4);  // 2025 → 25
        const month = dotMatch[2].padStart(2, '0');  // 11 → 11, 1 → 01
        return year + month;  // 2511
    }
    
    // "2025년 11월" 형식 파싱 (이전 버전 호환)
    const korMatch = input.match(/(\d{4})년\s*(\d{1,2})월/);
    if (korMatch) {
        const year = korMatch[1].slice(2, 4);  // 2025 → 25
        const month = korMatch[2].padStart(2, '0');  // 11 → 11, 1 → 01
        return year + month;  // 2511
    }
    
    return input;
}

async function addBook(studentId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const dateInput = document.getElementById(`new-book-date-${studentId}`).value.trim();
    const conceptInput = document.getElementById(`new-book-concept-${studentId}`).value.trim();
    const reviewInput = document.getElementById(`new-book-review-${studentId}`).value.trim();
    const advancedInput = document.getElementById(`new-book-advanced-${studentId}`).value.trim();
    
    if (!dateInput) {
        alert('날짜는 필수 입력 항목입니다');
        return;
    }
    
    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // books 파싱
        let books = [];
        try {
            if (typeof student.books === 'string') {
                books = JSON.parse(student.books);
            } else if (Array.isArray(student.books)) {
                books = student.books;
            }
        } catch (e) {
            books = [];
        }
        const newBook = {
            id: Date.now().toString(),
            date: parseYearMonth(dateInput),  // "2025년 11월" → "2511"
            concept: conceptInput === '0' ? '' : conceptInput,
            review: reviewInput === '0' ? '' : reviewInput,
            advanced: advancedInput === '0' ? '' : advancedInput
        };
        
        books.push(newBook);
        
        await API.update('students', studentId, { books: JSON.stringify(books) });
        student.books = books;
        
        // 입력 필드 초기화
        document.getElementById(`new-book-date-${studentId}`).value = '';
        document.getElementById(`new-book-concept-${studentId}`).value = '';
        document.getElementById(`new-book-review-${studentId}`).value = '';
        document.getElementById(`new-book-advanced-${studentId}`).value = '';
        
        showStudentDetail(studentId);
    } catch (error) {
        console.error('교재 추가 실패:', error);
        alert('등록에 실패했습니다');
    }
}

// 상담내용 추가
async function addConsultation(studentId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const dateInput = document.getElementById(`new-consul-date-${studentId}`).value.trim();
    const personSelect = document.getElementById(`new-consul-person-${studentId}`);
    const personValue = personSelect.value;
    const contentInput = document.getElementById(`new-consul-content-${studentId}`).value.trim();
    
    if (!dateInput || !contentInput) {
        alert('날짜와 상담 내용은 필수 입력 항목입니다');
        return;
    }
    
    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // consultations 파싱
        let consultations = [];
        try {
            if (typeof student.consultations === 'string') {
                consultations = JSON.parse(student.consultations);
            } else if (Array.isArray(student.consultations)) {
                consultations = student.consultations;
            }
        } catch (e) {
            consultations = [];
        }
        const newConsul = {
            id: Date.now().toString(),
            date: parseYearMonthDay(dateInput),  // "2025.11" → "2511" 또는 "2025.11.02" → "251102"
            person: personValue,
            content: contentInput
        };
        
        consultations.push(newConsul);
        
        await API.update('students', studentId, { consultations: JSON.stringify(consultations) });
        student.consultations = consultations;
        
        // 입력 필드 초기화
        document.getElementById(`new-consul-date-${studentId}`).value = '';
        document.getElementById(`new-consul-content-${studentId}`).value = '';
        personSelect.selectedIndex = 0; // 모로 초기화
        
        showStudentDetail(studentId);
    } catch (error) {
        console.error('상담 내용 추가 실패:', error);
        alert('등록에 실패했습니다');
    }
}

// 삭제 함수들
async function deleteScore(studentId, scoreId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    if (!confirm('삭제하시겠습니까?')) return;
    
    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // scores 파싱
        let scores = [];
        try {
            if (typeof student.scores === 'string') {
                scores = JSON.parse(student.scores);
            } else if (Array.isArray(student.scores)) {
                scores = student.scores;
            }
        } catch (e) {
            scores = [];
        }
        
        scores = scores.filter(s => s.id !== scoreId);
        await API.update('students', studentId, { scores: JSON.stringify(scores) });
        student.scores = scores;
        
        showStudentDetail(studentId);
    } catch (error) {
        console.error('시험점수 삭제 실패:', error);
        alert('삭제에 실패했습니다');
    }
}

async function deleteBook(studentId, bookId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    if (!confirm('삭제하시겠습니까?')) return;
    
    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // books 파싱
        let books = [];
        try {
            if (typeof student.books === 'string') {
                books = JSON.parse(student.books);
            } else if (Array.isArray(student.books)) {
                books = student.books;
            }
        } catch (e) {
            books = [];
        }
        
        books = books.filter(b => b.id !== bookId);
        await API.update('students', studentId, { books: JSON.stringify(books) });
        student.books = books;
        
        showStudentDetail(studentId);
    } catch (error) {
        console.error('교재 삭제 실패:', error);
        alert('삭제에 실패했습니다');
    }
}

async function deleteConsultation(studentId, consulId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    if (!confirm('삭제하시겠습니까?')) return;
    
    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // consultations 파싱
        let consultations = [];
        try {
            if (typeof student.consultations === 'string') {
                consultations = JSON.parse(student.consultations);
            } else if (Array.isArray(student.consultations)) {
                consultations = student.consultations;
            }
        } catch (e) {
            consultations = [];
        }
        
        consultations = consultations.filter(c => c.id !== consulId);
        await API.update('students', studentId, { consultations: JSON.stringify(consultations) });
        student.consultations = consultations;
        
        showStudentDetail(studentId);
    } catch (error) {
        console.error('상담 내용 삭제 실패:', error);
        alert('삭제에 실패했습니다');
    }
}

// ===== 수정 함수들은 js/tab-crud-new.js에 구현되어 있습니다 =====
// editScore(), editBook(), editConsultation()

// 교재 추가 함수 제거 (이미 위에서 구현함)

// 상태 토글 (재원 → 휴원 → 퇴원 → 재원)
async function toggleStudentStatus(studentId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    const statusOrder = ['재원', '휴원', '퇴원'];
    const currentIndex = statusOrder.indexOf(student.status || '재원');
    const nextStatus = statusOrder[(currentIndex + 1) % 3];
    
    try {
        const updateData = { status: nextStatus };
        
        // 휴원이나 퇴원으로 변경 시 탈퇴일 자동 설정
        if ((nextStatus === '휴원' || nextStatus === '퇴원') && !student.withdrawal_date) {
            updateData.withdrawal_date = new Date().getTime();
        }
        
        // 재원으로 복귀 시 탈퇴일 제거
        if (nextStatus === '재원') {
            updateData.withdrawal_date = null;
        }
        
        await API.update('students', studentId, updateData);
        
        // 로컬 데이터 즉시 업데이트 (폴더 이동 개념)
        student.status = nextStatus;
        if (updateData.withdrawal_date !== undefined) {
            student.withdrawal_date = updateData.withdrawal_date;
        }
        
        // 현재 필터 상태 업데이트
        filterStudentsByStatus(nextStatus);
        
        // 데이터 새로고침 (백그라운드에서)
        loadStudents();
        
        // 같은 학생 다시 표시
        showStudentDetail(studentId);
    } catch (error) {
        console.error('상태 변경 실패:', error);
        alert('상태 변경에 실패했습니다');
    }
}

// 담당 선생님 업데이트
async function updateStudentTeacher(studentId, teacherId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        await API.update('students', studentId, { teacher_id: teacherId });
        
        // 로컬 데이터 업데이트
        const student = allStudents.find(s => s.id === studentId);
        if (student) {
            student.teacher_id = teacherId;
        }
        
        alert('담당 선생님이 변경되었습니다');
    } catch (error) {
        console.error('담당 선생님 변경 실패:', error);
        alert('변경에 실패했습니다');
    }
}

// 학생 필드 업데이트
// 학교명 업데이트 (스마트 변환)
async function updateStudentSchool(studentId, inputSchool) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        let school = inputSchool.trim();
        let schoolType = null;
        
        // 현재 학생 정보 가져오기
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // 구분이 이미 설정되어 있는 경우
        const currentSchoolType = student.school_type;
        
        // 학교명에 초/중/고가 없고, 구분이 설정되어 있으면 자동 추가
        if (currentSchoolType && !school.includes('초') && !school.includes('중') && !school.includes('고')) {
            if (currentSchoolType === '초') {
                school = school + '초';
                schoolType = '초';
            } else if (currentSchoolType === '중') {
                school = school + '중';
                schoolType = '중';
            } else if (currentSchoolType === '고') {
                school = school + '고';
                schoolType = '고';
            }
        } else {
            // 학교명으로 구분 자동 인식
            if (school.includes('초등학교') || school.endsWith('초')) {
                schoolType = '초';
            } else if (school.includes('중학교') || school.endsWith('중')) {
                schoolType = '중';
            } else if (school.includes('고등학교') || school.endsWith('고')) {
                schoolType = '고';
            }
        }
        
        const updateData = { school: school };
        
        // 구분이 인식되면 함께 업데이트
        if (schoolType) {
            updateData.school_type = schoolType;
        }
        
        await API.update('students', studentId, updateData);
        
        // 로컬 데이터 업데이트
        if (student) {
            student.school = school;
            if (schoolType) {
                student.school_type = schoolType;
            }
        }
        
        // 화면 새로고침
        showStudentDetail(studentId);
    } catch (error) {
        console.error('학교명 업데이트 실패:', error);
        alert('업데이트에 실패했습니다');
    }
}

async function updateStudentField(studentId, field, value) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        const updateData = { [field]: value };
        
        // 학부모 연락처가 변경되고 학생 연락처가 비어있으면 출결번호 재생성
        if (field === 'parent_phone') {
            const student = allStudents.find(s => s.id === studentId);
            if (student && !student.phone) {
                updateData.attendance_number = generateAttendanceNumber(value);
            }
        }
        
        await API.update('students', studentId, updateData);
        
        // 로컬 데이터 업데이트
        const student = allStudents.find(s => s.id === studentId);
        if (student) {
            student[field] = value;
            if (updateData.attendance_number) {
                student.attendance_number = updateData.attendance_number;
            }
        }
        
        // 학부모 연락처 변경 시 화면 새로고침
        if (field === 'parent_phone') {
            showStudentDetail(studentId);
        }
    } catch (error) {
        console.error('필드 업데이트 실패:', error);
        alert('업데이트에 실패했습니다');
    }
}

// 학교 구분 업데이트 (학년 옵션도 함께 변경)
async function updateStudentSchoolType(studentId, schoolType) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        // 학교 구분 변경 시 학년을 1로 초기화
        await API.update('students', studentId, { 
            school_type: schoolType,
            grade: '1'
        });
        
        // 로컬 데이터 업데이트
        const student = allStudents.find(s => s.id === studentId);
        if (student) {
            student.school_type = schoolType;
            student.grade = '1';
        }
        
        // 화면 새로고침
        showStudentDetail(studentId);
    } catch (error) {
        console.error('학교 구분 변경 실패:', error);
        alert('변경에 실패했습니다');
    }
}

// 출결번호 생성 함수
function generateAttendanceNumber(phone) {
    if (!phone) return '';
    
    // 전화번호에서 숫자만 추출
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '';
    
    // 뒤 4자리
    let baseNumber = digits.slice(-4);
    
    // 중복 확인
    const existingNumbers = allStudents
        .filter(s => s.attendance_number && s.attendance_number.startsWith(baseNumber))
        .map(s => s.attendance_number);
    
    if (existingNumbers.length === 0) {
        return baseNumber;
    }
    
    // 중복이 있으면 순번 추가 (0부터 시작)
    let counter = 0;
    while (existingNumbers.includes(baseNumber + counter)) {
        counter++;
    }
    
    return baseNumber + counter;
}

// 연락처 업데이트 (출결번호 자동 생성)
async function updateStudentPhone(studentId, phone) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        // 학생 연락처가 비어있으면 학부모 연락처 사용
        const student = allStudents.find(s => s.id === studentId);
        const phoneForAttendance = phone || (student ? student.parent_phone : '');
        const attendanceNumber = generateAttendanceNumber(phoneForAttendance);
        
        await API.update('students', studentId, { 
            phone: phone,
            attendance_number: attendanceNumber
        });
        
        // 로컬 데이터 업데이트
        if (student) {
            student.phone = phone;
            student.attendance_number = attendanceNumber;
        }
        
        // 화면 새로고침
        showStudentDetail(studentId);
    } catch (error) {
        console.error('연락처 업데이트 실패:', error);
        alert('업데이트에 실패했습니다');
    }
}

// 학생 완전 삭제 (모든 관련 기록 포함)
async function deleteStudentCompletely(studentId, studentName) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const confirmMessage = `정말로 "${studentName}" 학생을 완전히 삭제하시겠습니까?\n\n이 작업은 다음 데이터를 모두 삭제합니다:\n- 학생 기본 정보\n- 출석 기록\n- 수강료 기록\n- 스케줄 정보\n- 메모 및 기타 모든 기록\n\n삭제된 데이터는 복구할 수 없습니다.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 최종 확인 - 비밀번호 입력
    const finalConfirm = prompt('삭제를 확정하려면 비밀번호를 입력하세요:', '');
    if (finalConfirm !== '123') {
        alert('비밀번호가 일치하지 않습니다. 삭제가 취소되었습니다.');
        return;
    }
    
    try {
        let totalDeleted = 0;
        
        // 1. 출석 기록 삭제
        try {
            console.log(`[삭제] ${studentName}의 출석 기록 삭제 중...`);
            const attendanceResult = await API.getList('attendance', { limit: 1000 });
            const attendanceRecords = (attendanceResult.data || []).filter(r => r.student_id === studentId);
            
            for (const record of attendanceRecords) {
                try {
                    await API.delete('attendance', record.id);
                    totalDeleted++;
                } catch (err) {
                    console.error(`출석 기록 삭제 실패 (ID: ${record.id}):`, err);
                }
            }
            console.log(`[삭제] ${attendanceRecords.length}건의 출석 기록 중 ${totalDeleted}건 삭제 완료`);
        } catch (error) {
            console.error('출석 기록 조회 실패:', error);
        }
        
        // 2. 수강료 기록 삭제
        try {
            console.log(`[삭제] ${studentName}의 수강료 기록 삭제 중...`);
            const tuitionResult = await API.getList('tuitions', { limit: 1000 });
            const tuitionRecords = (tuitionResult.data || []).filter(r => r.student_id === studentId);
            
            let tuitionDeleted = 0;
            for (const record of tuitionRecords) {
                try {
                    await API.delete('tuitions', record.id);
                    tuitionDeleted++;
                } catch (err) {
                    console.error(`수강료 기록 삭제 실패 (ID: ${record.id}):`, err);
                }
            }
            console.log(`[삭제] ${tuitionRecords.length}건의 수강료 기록 중 ${tuitionDeleted}건 삭제 완료`);
        } catch (error) {
            console.error('수강료 기록 조회 실패:', error);
        }
        
        // 3. 교재 기록 삭제
        try {
            console.log(`[삭제] ${studentName}의 교재 기록 삭제 중...`);
            const booksResult = await API.getList('student_books', { limit: 1000 });
            const booksRecords = (booksResult.data || []).filter(r => r.student_id === studentId);
            
            let booksDeleted = 0;
            for (const record of booksRecords) {
                try {
                    await API.delete('student_books', record.id);
                    booksDeleted++;
                } catch (err) {
                    console.error(`교재 기록 삭제 실패 (ID: ${record.id}):`, err);
                }
            }
            console.log(`[삭제] ${booksRecords.length}건의 교재 기록 중 ${booksDeleted}건 삭제 완료`);
        } catch (error) {
            console.error('교재 기록 조회 실패:', error);
        }
        
        // 4. 메모 기록 삭제
        try {
            console.log(`[삭제] ${studentName}의 메모 기록 삭제 중...`);
            const memosResult = await API.getList('student_memos', { limit: 1000 });
            const memosRecords = (memosResult.data || []).filter(r => r.student_id === studentId);
            
            let memosDeleted = 0;
            for (const record of memosRecords) {
                try {
                    await API.delete('student_memos', record.id);
                    memosDeleted++;
                } catch (err) {
                    console.error(`메모 기록 삭제 실패 (ID: ${record.id}):`, err);
                }
            }
            console.log(`[삭제] ${memosRecords.length}건의 메모 기록 중 ${memosDeleted}건 삭제 완료`);
        } catch (error) {
            console.error('메모 기록 조회 실패:', error);
        }
        
        // 5. 마지막으로 학생 정보 삭제
        console.log(`[삭제] ${studentName}의 학생 정보 삭제 중...`);
        await API.delete('students', studentId);
        console.log(`[삭제] 학생 정보 삭제 완료`);
        
        // 로컬 데이터에서도 제거
        const index = allStudents.findIndex(s => s.id === studentId);
        if (index !== -1) {
            allStudents.splice(index, 1);
        }
        
        alert(`"${studentName}" 학생의 모든 데이터가 완전히 삭제되었습니다.`);
        
        // 학생 목록 새로고침
        await loadStudents();
        
        // 상세보기 영역 초기화
        const container = document.getElementById('studentDetailContainer');
        if (container) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #7F8C8D;">학생을 선택하세요</p>';
        }
        
    } catch (error) {
        console.error('학생 삭제 실패:', error);
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

// 학생 모달 열기
async function openStudentModal(studentId = null) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    // 모달 대신 인라인 폼 표시
    if (!studentId) {
        // 새 학생 추가: 오른쪽 영역에 빈 폼 표시
        showStudentForm(null);
    } else {
        // 기존 학생 수정: 모달 사용
        const modal = document.getElementById('studentModal');
        const title = document.getElementById('studentModalTitle');
        
        // 선생님 목록 로드 (재직 중인 선생님만, 관리자/부관리자 제외)
        try {
            const teachersResult = await API.getList('teachers', { limit: 1000 });
            const allTeachers = Array.isArray(teachersResult) ? teachersResult : (teachersResult.data || []);
            
            // status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
            // role이 'teacher' 또는 '선생님'인 경우만 포함 (관리자/부관리자 제외)
            const teachers = allTeachers.filter(t => {
                const status = t.status || '재직';
                const isActive = status === '재직' || status === '재직중';
                const isTeacher = t.role === 'teacher' || t.role === '선생님' || !t.role; // role이 없으면 일반 선생님으로 간주
                return isActive && isTeacher;
            });
            
            console.log('[openStudentModal] 재직중인 선생님(관리자 제외) 수:', teachers.length);
            
            const teacherSelect = document.getElementById('studentTeacher');
            teacherSelect.innerHTML = '<option value="">선택하세요</option>' + 
                teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        } catch (error) {
            console.error('선생님 목록 로드 실패:', error);
        }
        
        title.textContent = '학생 수정';
        const student = allStudents.find(s => s.id === studentId);
        if (student) {
            document.getElementById('studentId').value = student.id;
            document.getElementById('studentName').value = student.name;
            document.getElementById('studentSchool').value = student.school || '';
            document.getElementById('studentGrade').value = student.grade;
            document.getElementById('studentStatus').value = student.status;
            document.getElementById('studentPhone').value = student.phone || '';
            document.getElementById('studentParentPhone').value = student.parent_phone;
            document.getElementById('studentAddress').value = student.address || '';
            document.getElementById('studentEnrollmentDate').value = Utils.formatDate(student.enrollment_date);
            document.getElementById('studentTeacher').value = student.teacher_id || '';
            document.getElementById('studentMemo').value = student.memo || '';
        }
        
        modal.classList.add('active');
    }
}

// 학생 모달 닫기
function closeStudentModal() {
    document.getElementById('studentModal').classList.remove('active');
    document.getElementById('studentForm').reset();
}

// 학생 편집
function editStudent(studentId) {
    openStudentModal(studentId);
}

// 학생 저장
async function saveStudent(event) {
    event.preventDefault();
    
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const id = document.getElementById('studentId').value;
    const phone = document.getElementById('studentPhone').value;
    
    const data = {
        name: document.getElementById('studentName').value,
        school: document.getElementById('studentSchool').value,
        grade: document.getElementById('studentGrade').value,
        phone: phone,
        parent_phone: document.getElementById('studentParentPhone').value,
        address: document.getElementById('studentAddress').value,
        enrollment_date: new Date(document.getElementById('studentEnrollmentDate').value).getTime(),
        status: document.getElementById('studentStatus').value || '재원',
        teacher_id: document.getElementById('studentTeacher').value,
        memo: document.getElementById('studentMemo').value,
        attendance_number: generateAttendanceNumber(phone),
        school_type: '초',
        progress: '현행'
    };
    
    try {
        if (id) {
            await API.update('students', id, data);
            alert('학생 정보가 수정되었습니다');
        } else {
            await API.create('students', data);
            alert('학생이 추가되었습니다');
        }
        
        closeStudentModal();
        loadStudents();
    } catch (error) {
        alert('저장에 실패했습니다');
    }
}

// 인라인 폼에서 학생 저장
async function saveStudentFromForm() {
    console.log('[saveStudentFromForm] 함수 시작');
    
    if (!Auth.isLoggedIn()) {
        console.log('[saveStudentFromForm] 로그인 안됨');
        alert('로그인이 필요합니다');
        return;
    }
    
    console.log('[saveStudentFromForm] 로그인 확인됨');
    const name = document.getElementById('newStudentName').value.trim();
    console.log('[saveStudentFromForm] 이름:', name);
    
    // 필수 항목: 이름만
    if (!name) {
        console.log('[saveStudentFromForm] 이름 없음');
        alert('이름을 입력해주세요');
        return;
    }
    
    console.log('[saveStudentFromForm] 이름 확인 통과');
    
    const school = document.getElementById('newStudentSchool').value.trim();
    const parentPhone = document.getElementById('newStudentParentPhone').value.trim();
    const phone = document.getElementById('newStudentPhone').value.trim();
    const withdrawalDateInput = document.getElementById('newStudentWithdrawalDate').value;
    
    // 스케줄 데이터 수집
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const schedule = {};
    
    dayKeys.forEach(dayKey => {
        const enabled = document.getElementById(`new-schedule-${dayKey}-enabled`).checked;
        const checkIn = document.getElementById(`new-schedule-${dayKey}-checkin`).value;
        const checkOut = document.getElementById(`new-schedule-${dayKey}-checkout`).value;
        const duration = parseInt(document.getElementById(`new-schedule-${dayKey}-duration`).value) || 90;
        
        schedule[dayKey] = {
            enabled: enabled,
            checkIn: checkIn,
            checkOut: checkOut,
            duration: duration
        };
    });
    
    const data = {
        name: name,
        school: school,
        school_type: document.getElementById('newStudentSchoolType').value,
        grade: document.getElementById('newStudentGrade').value,
        phone: phone,
        parent_phone: parentPhone,
        enrollment_date: new Date(document.getElementById('newStudentEnrollmentDate').value).getTime(),
        withdrawal_date: withdrawalDateInput ? new Date(withdrawalDateInput).getTime() : null,
        status: document.getElementById('newStudentStatus').value,
        teacher_id: document.getElementById('newStudentTeacher').value || null,
        progress: document.getElementById('newStudentProgress').value,
        attendance_number: generateAttendanceNumber(phone || parentPhone || name),
        advanced_concept: document.getElementById('newStudentAdvancedConcept').value.trim() === '0' ? '' : document.getElementById('newStudentAdvancedConcept').value.trim(),
        advanced_review: document.getElementById('newStudentAdvancedReview').value.trim() === '0' ? '' : document.getElementById('newStudentAdvancedReview').value.trim(),
        current_deep: document.getElementById('newStudentCurrentDeep').value.trim() === '0' ? '' : document.getElementById('newStudentCurrentDeep').value.trim(),
        schedule: JSON.stringify(schedule),
        schedule_updated_at: Date.now()  // 스케줄 등록 시간 기록
    };
    
    console.log('[saveStudentFromForm] 저장할 데이터:', data);
    
    try {
        console.log('[saveStudentFromForm] API.create 호출 시작');
        const newStudent = await API.create('students', data);
        console.log('[saveStudentFromForm] API.create 성공:', newStudent);
        alert('학생이 추가되었습니다');
        
        // 학생 목록 새로고침
        await loadStudents();
        
        // 새로 추가된 학생 선택하여 상세 정보 표시
        if (newStudent && newStudent.id) {
            showStudentDetail(newStudent.id);
        }
    } catch (error) {
        console.error('[saveStudentFromForm] 학생 추가 실패:', error);
        console.error('[saveStudentFromForm] 에러 상세:', error.message, error.stack);
        alert('저장에 실패했습니다: ' + error.message);
    }
}

// 학생 추가 폼 취소
function cancelStudentForm() {
    const container = document.getElementById('studentDetailContainer');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-user-graduate"></i>
            <h3>학생을 선택하세요</h3>
            <p>왼쪽 목록에서 학생을 클릭하면 상세 정보가 표시됩니다</p>
        </div>
    `;
}

// 학생 삭제
async function deleteStudent(studentId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        await API.delete('students', studentId);
        alert('학생이 삭제되었습니다');
        loadStudents();
        
        // 상세 정보 초기화
        document.getElementById('studentDetailContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <h3>학생을 선택하세요</h3>
                <p>왼쪽 목록에서 학생을 클릭하면 상세 정보가 표시됩니다</p>
            </div>
        `;
    } catch (error) {
        alert('삭제에 실패했습니다');
    }
}

// 선생님 관리 페이지
async function showTeachersPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="page-container">
            <!-- 선생님 표 (등록 행 포함) -->
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60px;">상태</th>
                            <th style="width: 120px;">이름</th>
                            <th style="width: 150px;">전화번호</th>
                            <th style="width: 150px;">근무시간</th>
                            <th style="width: 100px;">아이디</th>
                            <th style="width: 100px;">비밀번호</th>
                            <th style="width: 100px;">색상</th>
                            <th style="width: 125px;">관리</th>
                        </tr>
                    </thead>
                    <tbody id="teachersTableBody">
                        <!-- 등록 행 -->
                        <tr class="teacher-register-row">
                            <td></td>
                            <td><input type="text" id="newTeacherName" placeholder="이름" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
                            <td>
                                <select id="newTeacherRole" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                                    <option value="teacher">선생님</option>
                                    <option value="subadmin">부관리자</option>
                                </select>
                            </td>
                            <td><input type="tel" id="newTeacherPhone" placeholder="010-0000-0000" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
                            <td><input type="text" id="newTeacherWorkHours" placeholder="예: 월~금 14:00-18:00" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
                            <td><input type="text" id="newTeacherUsername" placeholder="아이디" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
                            <td><input type="password" id="newTeacherPassword" placeholder="비밀번호" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="quickAddTeacher()" style="padding: 0.5rem 1rem;">
                                    <i class="fas fa-plus"></i> 등록
                                </button>
                            </td>
                        </tr>
                        <!-- 기존 선생님 목록 -->
                        <tr><td colspan="8" class="text-center">로딩 중...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <!-- 담당 학생 영역 (4단 배열) -->
            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">담당 학생 현황</h3>
                <div id="teacherStudentsGrid" class="teacher-students-grid">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>등록된 선생님이 없습니다</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 선생님 수정 모달 -->
        <div class="modal" id="teacherModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="teacherModalTitle">선생님 수정</h3>
                    <button class="modal-close" onclick="closeTeacherModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="teacherForm" onsubmit="saveTeacher(event)">
                        <input type="hidden" id="teacherId">
                        <div class="form-row">
                            <div class="form-group">
                                <label>이름 *</label>
                                <input type="text" id="teacherName" required>
                            </div>
                            <div class="form-group">
                                <label>담당 과목 *</label>
                                <input type="text" id="teacherSubject" placeholder="예: 수학" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>연락처 *</label>
                                <input type="tel" id="teacherPhone" placeholder="010-0000-0000" required>
                            </div>
                            <div class="form-group">
                                <label>근무시간</label>
                                <input type="text" id="teacherWorkHours" placeholder="예: 월~금 14:00-18:00">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>입사일 *</label>
                                <input type="date" id="teacherHireDate" required>
                            </div>
                            <div class="form-group">
                                <label>상태 *</label>
                                <select id="teacherStatus" required>
                                    <option value="재직중">재직중</option>
                                    <option value="퇴사">퇴사</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>메모</label>
                            <textarea id="teacherMemo" placeholder="특이사항이나 메모를 입력하세요"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeTeacherModal()">취소</button>
                    <button class="btn btn-primary" onclick="document.getElementById('teacherForm').requestSubmit()">저장</button>
                </div>
            </div>
        </div>
    `;
    
    loadTeachers();
    updateButtonStates();
}

// 선생님 목록 로드
let allTeachers = [];

async function loadTeachers() {
    try {
        const result = await API.getList('teachers', { limit: 1000 });
        // Supabase는 배열을 직접 반환
        allTeachers = Array.isArray(result) ? result : (result.data || []);
        renderTeachers(allTeachers);
    } catch (error) {
        document.getElementById('teachersTableBody').innerHTML = 
            '<tr><td colspan="5" class="text-center">데이터를 불러오는데 실패했습니다</td></tr>';
    }
}

// 선생님 목록 렌더링
function renderTeachers(teachers) {
    const tbody = document.getElementById('teachersTableBody');
    
    // 등록 행 먼저 추가
    let html = `
        <tr class="teacher-register-row">
            <td></td>
            <td><input type="text" id="newTeacherName" placeholder="이름" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
            <td><input type="tel" id="newTeacherPhone" placeholder="010-0000-0000" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
            <td><input type="text" id="newTeacherWorkHours" placeholder="예: 월~금 14:00-18:00" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
            <td><input type="text" id="newTeacherUsername" placeholder="아이디" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
            <td><input type="password" id="newTeacherPassword" placeholder="비밀번호" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></td>
            <td></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="quickAddTeacher()" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-plus"></i> 등록
                </button>
            </td>
        </tr>
    `;
    
    if (!teachers || teachers.length === 0) {
        tbody.innerHTML = html + '<tr><td colspan="8" class="text-center">등록된 선생님이 없습니다</td></tr>';
        renderTeacherStudentsGrid([]);
        return;
    }
    
    // 재직 → 퇴직 순으로 정렬, 각각 created_at 순
    const sortedTeachers = teachers.sort((a, b) => {
        const statusA = a.status || '재직';
        const statusB = b.status || '재직';
        
        // 상태 정규화 (재직중 -> 재직)
        const normalizedA = (statusA === '재직' || statusA === '재직중') ? '재직' : '퇴직';
        const normalizedB = (statusB === '재직' || statusB === '재직중') ? '재직' : '퇴직';
        
        // 상태별 정렬 (재직이 먼저)
        if (normalizedA !== normalizedB) {
            return normalizedA === '재직' ? -1 : 1;
        }
        
        // 같은 상태는 생성 시간 순 (created_at)
        return (a.created_at || 0) - (b.created_at || 0);
    });
    
    html += sortedTeachers.map(teacher => {
        const status = teacher.status || '재직';
        // 재직중도 재직으로 통일
        const normalizedStatus = (status === '재직' || status === '재직중') ? '재직' : '퇴직';
        const statusBadgeClass = normalizedStatus === '재직' ? 'status-badge status-active' : 'status-badge status-inactive';
        const statusText = normalizedStatus;
        const role = teacher.role || 'teacher';
        const roleText = role === 'subadmin' ? '부관리자' : '선생님';
        const currentColor = teacher.color || '';
        
        // 9가지 색상 옵션 정의
        const colorOptions = [
            { value: '', label: '색상 없음', color: '#FFFFFF' },
            { value: '#FFE6F0', label: '연분홍', color: '#FFE6F0' },
            { value: '#FFD0D0', label: '연빨강', color: '#FFD0D0' },  // 더 빨갛게 조정
            { value: '#FFE8D6', label: '연주황', color: '#FFE8D6' },
            { value: '#FFF9E5', label: '연노랑', color: '#FFF9E5' },
            { value: '#E8F5E9', label: '연두', color: '#E8F5E9' },
            { value: '#C8E6C9', label: '연초록', color: '#C8E6C9' },  // 더 초록색으로 조정
            { value: '#E3F2FD', label: '연하늘', color: '#E3F2FD' },
            { value: '#BBDEFB', label: '연파랑', color: '#BBDEFB' },  // 더 파랗게 조정
            { value: '#F3E5F5', label: '연보라', color: '#F3E5F5' }
        ];
        
        const colorOptionsHtml = colorOptions.map(opt => 
            `<option value="${opt.value}" ${currentColor === opt.value ? 'selected' : ''} style="background-color: ${opt.color};">${opt.label}</option>`
        ).join('');
        
        return `
        <tr id="teacher-row-${teacher.id}" class="teacher-data-row">
            <td class="teacher-status-cell" style="background-color: ${currentColor};">
                <span class="${statusBadgeClass}" onclick="toggleTeacherStatus('${teacher.id}')" style="cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.4rem;">
                    ${statusText}
                </span>
            </td>
            <td class="teacher-name-cell" style="background-color: ${currentColor};" ondblclick="editTeacherCell('${teacher.id}', 'name', this)">
                <span class="display-value">${teacher.name}</span>
                <input type="text" class="edit-input" value="${teacher.name}" style="display: none; width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px;" onblur="saveTeacherCell('${teacher.id}', 'name', this)" onkeypress="if(event.key==='Enter') this.blur()">
            </td>
            <td class="teacher-phone-cell" style="background-color: ${currentColor};" ondblclick="editTeacherCell('${teacher.id}', 'phone', this)">
                <span class="display-value">${Utils.formatPhone(teacher.phone)}</span>
                <input type="tel" class="edit-input" value="${teacher.phone}" style="display: none; width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px;" onblur="saveTeacherCell('${teacher.id}', 'phone', this)" onkeypress="if(event.key==='Enter') this.blur()">
            </td>
            <td class="teacher-workhours-cell" style="background-color: ${currentColor};" ondblclick="editTeacherCell('${teacher.id}', 'work_hours', this)">
                <span class="display-value">${teacher.work_hours || '-'}</span>
                <input type="text" class="edit-input" value="${teacher.work_hours || ''}" style="display: none; width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px;" onblur="saveTeacherCell('${teacher.id}', 'work_hours', this)" onkeypress="if(event.key==='Enter') this.blur()">
            </td>
            <td class="teacher-username-cell" style="background-color: ${currentColor};" ondblclick="editTeacherCell('${teacher.id}', 'username', this)">
                <span class="display-value">${teacher.username || '-'}</span>
                <input type="text" class="edit-input" value="${teacher.username || ''}" style="display: none; width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px;" onblur="saveTeacherCell('${teacher.id}', 'username', this)" onkeypress="if(event.key==='Enter') this.blur()">
            </td>
            <td class="teacher-password-cell" style="background-color: ${currentColor};" ondblclick="editTeacherCell('${teacher.id}', 'password', this)">
                <span class="display-value">${teacher.password ? '●●●●●●' : '-'}</span>
                <input type="password" class="edit-input" value="${teacher.password || ''}" placeholder="새 비밀번호" style="display: none; width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px;" onblur="saveTeacherCell('${teacher.id}', 'password', this)" onkeypress="if(event.key==='Enter') this.blur()">
            </td>
            <td style="text-align: center; background-color: ${currentColor};">
                <select onchange="updateTeacherColor('${teacher.id}', this.value)" style="width: 90%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.85rem; background-color: ${currentColor || '#FFFFFF'};">
                    ${colorOptionsHtml}
                </select>
            </td>
            <td style="white-space: nowrap; background-color: ${currentColor};">
                <button class="btn btn-primary btn-sm edit-teacher-btn" data-mode="edit" onclick="editTeacher('${teacher.id}')" style="padding: 0.2rem 0.4rem; margin-right: 0.2rem; font-size: 0.75rem;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTeacher('${teacher.id}')" style="padding: 0.2rem 0.4rem; margin-right: 0.2rem; font-size: 0.75rem;">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="showTeacherStudents('${teacher.id}')" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">
                    <i class="fas fa-users"></i>
                </button>
            </td>
        </tr>
    `}).join('');
    
    tbody.innerHTML = html;
    
    // 재직 선생님만 필터링
    const activeTeachers = sortedTeachers.filter(t => {
        const status = t.status || '재직';
        return status === '재직' || status === '재직중';
    });
    renderTeacherStudentsGrid(activeTeachers);
    
    updateButtonStates();
}

// 선생님 상태 토글
async function toggleTeacherStatus(teacherId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        const teacher = allTeachers.find(t => t.id === teacherId);
        if (!teacher) return;
        
        const currentStatus = teacher.status || '재직';
        const normalizedStatus = (currentStatus === '재직' || currentStatus === '재직중') ? '재직' : '퇴직';
        const newStatus = normalizedStatus === '재직' ? '퇴직' : '재직';
        
        console.log('상태 토글:', currentStatus, '->', newStatus);
        
        // 퇴직으로 변경 시 확인
        if (newStatus === '퇴직') {
            if (!confirm('퇴직으로 변경하면 로그인할 수 없습니다. 계속하시겠습니까?')) {
                return;
            }
        }
        
        // PATCH를 사용하여 status만 업데이트
        await API.patch('teachers', teacherId, { status: newStatus });
        
        // 로컬 데이터 업데이트
        teacher.status = newStatus;
        
        // window.allTeachersCache도 업데이트
        if (window.allTeachersCache) {
            const cacheTeacher = window.allTeachersCache.find(t => t.id === teacherId);
            if (cacheTeacher) {
                cacheTeacher.status = newStatus;
            }
        }
        
        // 재렌더링
        renderTeachers(allTeachers);
    } catch (error) {
        console.error('상태 변경 실패:', error);
        alert('상태 변경에 실패했습니다');
    }
}

// 선생님 색상 업데이트
async function updateTeacherColor(teacherId, color) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        const teacher = allTeachers.find(t => t.id === teacherId);
        if (!teacher) return;
        
        // 빈 값이면 null로 저장
        const colorValue = color === '' ? null : color;
        
        console.log(`선생님 ${teacher.name}의 색상 변경:`, colorValue);
        
        // PATCH를 사용하여 color만 업데이트
        await API.patch('teachers', teacherId, { color: colorValue });
        
        // 로컬 데이터 업데이트
        teacher.color = colorValue;
        
        // window.allTeachersCache도 업데이트
        if (window.allTeachersCache) {
            const cachedTeacher = window.allTeachersCache.find(t => t.id === teacherId);
            if (cachedTeacher) {
                cachedTeacher.color = colorValue;
            }
        }
        
        // 재렌더링
        renderTeachers(allTeachers);
        
        // 현재 학생 목록이 표시 중이면 재원생 목록도 업데이트
        if (typeof renderStudentList === 'function' && window.allStudents) {
            renderStudentList(window.allStudents);
        }
        
    } catch (error) {
        console.error('색상 변경 실패:', error);
        alert('색상 변경에 실패했습니다');
    }
}

// 선생님 색상 제거
async function clearTeacherColor(teacherId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    try {
        const teacher = allTeachers.find(t => t.id === teacherId);
        if (!teacher) return;
        
        console.log(`선생님 ${teacher.name}의 색상 제거`);
        
        // PATCH를 사용하여 color를 null로 업데이트
        await API.patch('teachers', teacherId, { color: null });
        
        // 로컬 데이터 업데이트
        teacher.color = null;
        
        // window.allTeachersCache도 업데이트
        if (window.allTeachersCache) {
            const cachedTeacher = window.allTeachersCache.find(t => t.id === teacherId);
            if (cachedTeacher) {
                cachedTeacher.color = null;
            }
        }
        
        // 재렌더링
        renderTeachers(allTeachers);
        
        // 현재 학생 목록이 표시 중이면 재원생 목록도 업데이트
        if (typeof renderStudentList === 'function' && window.allStudents) {
            renderStudentList(window.allStudents);
        }
        
    } catch (error) {
        console.error('색상 제거 실패:', error);
        alert('색상 제거에 실패했습니다');
    }
}

// 선생님 셀 편집 모드로 전환 (더블클릭 시)
window.editTeacherCell = function(teacherId, field, cell) {
    const displayValue = cell.querySelector('.display-value');
    const editInput = cell.querySelector('.edit-input');
    
    if (displayValue && editInput) {
        displayValue.style.display = 'none';
        editInput.style.display = 'block';
        editInput.focus();
        editInput.select();
    }
}

// 선생님 셀 저장 (blur 또는 Enter 시)
window.saveTeacherCell = async function(teacherId, field, input) {
    const cell = input.parentElement;
    const displayValue = cell.querySelector('.display-value');
    const newValue = input.value.trim();
    
    try {
        const teacher = allTeachers.find(t => t.id === teacherId);
        if (!teacher) return;
        
        // 값이 변경되었는지 확인
        const oldValue = teacher[field] || '';
        if (newValue === oldValue) {
            // 변경 없음 - 편집 모드 종료
            input.style.display = 'none';
            displayValue.style.display = 'block';
            return;
        }
        
        // API 업데이트
        const updateData = {};
        updateData[field] = newValue || null;
        await API.patch('teachers', teacherId, updateData);
        
        // 로컬 데이터 업데이트
        teacher[field] = newValue;
        
        // window.allTeachersCache도 업데이트
        if (window.allTeachersCache) {
            const cachedTeacher = window.allTeachersCache.find(t => t.id === teacherId);
            if (cachedTeacher) {
                cachedTeacher[field] = newValue;
            }
        }
        
        // 표시값 업데이트
        if (field === 'phone') {
            displayValue.textContent = Utils.formatPhone(newValue);
        } else if (field === 'password') {
            displayValue.textContent = newValue ? '●●●●●●' : '-';
        } else {
            displayValue.textContent = newValue || '-';
        }
        
        // 편집 모드 종료
        input.style.display = 'none';
        displayValue.style.display = 'block';
        
        console.log(`${field} 업데이트 완료:`, newValue);
        
    } catch (error) {
        console.error('셀 저장 실패:', error);
        alert('저장에 실패했습니다');
        
        // 편집 모드 종료
        input.style.display = 'none';
        displayValue.style.display = 'block';
    }
}


// 담당 학생 그리드 렌더링 (4단 배열)
async function renderTeacherStudentsGrid(teachers) {
    const grid = document.getElementById('teacherStudentsGrid');
    
    if (!teachers || teachers.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>등록된 선생님이 없습니다</p>
            </div>
        `;
        return;
    }
    
    // 학생 목록 로드 (담당 선생님 정보 포함)
    try {
        const studentsResult = await API.getList('students', { limit: 1000 });
        const students = Array.isArray(studentsResult) ? studentsResult : (studentsResult.data || []);
        
        grid.innerHTML = teachers.map(teacher => {
            // 해당 선생님이 담당하는 학생들 필터링
            const teacherStudents = students.filter(s => s.teacher_id === teacher.id);
            
            // 학교 → 학년 → 가나다순 정렬
            const sortedStudents = teacherStudents.sort((a, b) => {
                if (a.school && b.school && a.school !== b.school) {
                    return a.school.localeCompare(b.school, 'ko');
                }
                if (a.grade !== b.grade) {
                    return a.grade.localeCompare(b.grade, 'ko');
                }
                return a.name.localeCompare(b.name, 'ko');
            });
            
            const teacherColor = teacher.color || '';
            const cardStyle = teacherColor ? `style="background-color: ${teacherColor};"` : '';
            
            return `
                <div class="teacher-student-card" ${cardStyle}>
                    <div class="teacher-card-header">
                        <h4>${teacher.name} 선생님</h4>
                        <span class="student-count">${teacherStudents.length}명</span>
                    </div>
                    <div class="teacher-card-body">
                        ${sortedStudents.length > 0 ? 
                            sortedStudents.map(student => `
                                <div class="student-mini-item">
                                    <div class="student-name">${student.name}</div>
                                    <div class="student-info">${formatSchoolName(student.school)} ${student.grade}</div>
                                </div>
                            `).join('') 
                            : '<p class="text-muted">담당 학생이 없습니다</p>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('학생 데이터 로딩 실패:', error);
        grid.innerHTML = '<div class="empty-state"><p>데이터를 불러오는데 실패했습니다</p></div>';
    }
}

// 빠른 선생님 추가
// 선생님 등록 엔터 핸들러
function handleTeacherEnter(event) {
    if (event.key === 'Enter') {
        quickAddTeacher();
    }
}

// 빠른 선생님 등록
async function quickAddTeacher() {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const name = document.getElementById('newTeacherName').value.trim();
    const role = document.getElementById('newTeacherRole').value;
    const phone = document.getElementById('newTeacherPhone').value.trim();
    const workHours = document.getElementById('newTeacherWorkHours').value.trim();
    const username = document.getElementById('newTeacherUsername').value.trim();
    const password = document.getElementById('newTeacherPassword').value.trim();
    
    if (!name) {
        alert('이름을 입력해주세요');
        return;
    }
    
    if (!phone) {
        alert('전화번호를 입력해주세요');
        return;
    }
    
    if (!username) {
        alert('아이디를 입력해주세요');
        return;
    }
    
    if (!password) {
        alert('비밀번호를 입력해주세요');
        return;
    }
    
    try {
        // 아이디 중복 체크
        const existingTeacher = allTeachers.find(t => t.username === username);
        if (existingTeacher) {
            alert('이미 사용 중인 아이디입니다');
            return;
        }
        
        const newTeacher = {
            name: name,
            phone: phone,
            work_hours: workHours,
            status: '재직',
            subject: '수학',
            memo: '',
            role: role,
            username: username,
            password: password
        };
        
        console.log('새 선생님 등록:', newTeacher);
        
        await API.create('teachers', newTeacher);
        alert('선생님이 등록되었습니다');
        
        // 입력 필드 초기화
        document.getElementById('newTeacherName').value = '';
        document.getElementById('newTeacherRole').value = 'teacher';
        document.getElementById('newTeacherPhone').value = '';
        document.getElementById('newTeacherWorkHours').value = '';
        document.getElementById('newTeacherUsername').value = '';
        document.getElementById('newTeacherPassword').value = '';
        
        // 목록 새로고침
        await loadTeachers();
    } catch (error) {
        console.error('선생님 등록 실패:', error);
        alert('등록에 실패했습니다');
    }
}

// 선생님 검색
function searchTeachers() {
    const searchTerm = document.getElementById('teacherSearch').value.toLowerCase();
    const statusFilter = document.getElementById('teacherStatusFilter').value;
    
    let filtered = allTeachers;
    
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(searchTerm) ||
            t.subject.toLowerCase().includes(searchTerm) ||
            (t.phone && t.phone.includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    renderTeachers(filtered);
}

// 선생님 상태 필터
function filterTeachers() {
    searchTeachers();
}

// 선생님 모달 열기
function openTeacherModal(teacherId = null) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const modal = document.getElementById('teacherModal');
    const title = document.getElementById('teacherModalTitle');
    
    if (teacherId) {
        title.textContent = '선생님 수정';
        const teacher = allTeachers.find(t => t.id === teacherId);
        if (teacher) {
            document.getElementById('teacherId').value = teacher.id;
            document.getElementById('teacherName').value = teacher.name;
            document.getElementById('teacherSubject').value = teacher.subject;
            document.getElementById('teacherPhone').value = teacher.phone;
            document.getElementById('teacherWorkHours').value = teacher.work_hours || '';
            document.getElementById('teacherHireDate').value = Utils.formatDate(teacher.hire_date);
            document.getElementById('teacherStatus').value = teacher.status;
            document.getElementById('teacherMemo').value = teacher.memo || '';
        }
    } else {
        title.textContent = '선생님 추가';
        document.getElementById('teacherForm').reset();
        document.getElementById('teacherId').value = '';
        document.getElementById('teacherHireDate').value = Utils.today();
        document.getElementById('teacherStatus').value = '재직중';
    }
    
    modal.classList.add('active');
}

// 선생님 모달 닫기
function closeTeacherModal() {
    document.getElementById('teacherModal').classList.remove('active');
    document.getElementById('teacherForm').reset();
}

// 선생님 편집
// 인라인 편집 토글
function toggleEditTeacher(teacherId) {
    const row = document.getElementById(`teacher-row-${teacherId}`);
    if (!row) return;
    
    const isEditing = row.classList.contains('editing');
    
    if (isEditing) {
        // 저장
        saveTeacherInline(teacherId);
    } else {
        // 편집 모드로 전환
        row.classList.add('editing');
        
        // display-value 숨기고 edit-input 표시
        row.querySelectorAll('.display-value').forEach(el => el.style.display = 'none');
        row.querySelectorAll('.edit-input').forEach(el => el.style.display = 'block');
        
        // 버튼 아이콘 변경
        const editBtn = row.querySelector('.edit-btn');
        editBtn.innerHTML = '<i class="fas fa-check"></i> 저장';
        editBtn.classList.remove('btn-primary');
        editBtn.classList.add('btn-success');
    }
}

// 인라인 저장
async function saveTeacherInline(teacherId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const row = document.getElementById(`teacher-row-${teacherId}`);
    if (!row) return;
    
    try {
        // 입력값 가져오기
        const nameInput = row.querySelector('.teacher-name-cell .edit-input');
        const roleInput = row.querySelector('.teacher-role-cell .edit-input');
        const phoneInput = row.querySelector('.teacher-phone-cell .edit-input');
        const workHoursInput = row.querySelector('.teacher-workhours-cell .edit-input');
        const usernameInput = row.querySelector('.teacher-username-cell .edit-input');
        const passwordInput = row.querySelector('.teacher-password-cell .edit-input');
        
        if (!nameInput || !roleInput || !phoneInput || !workHoursInput || !usernameInput || !passwordInput) {
            console.error('입력 필드를 찾을 수 없습니다');
            alert('입력 필드를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }
        
        const name = nameInput.value.trim();
        const role = roleInput.value;
        const phone = phoneInput.value.trim();
        const work_hours = workHoursInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        console.log('저장 시도:', { name, role, phone, work_hours, username, hasPassword: !!password });
        
        // 필수값 체크
        if (!name) {
            alert('이름을 입력해주세요');
            return;
        }
        if (!username) {
            alert('아이디를 입력해주세요');
            return;
        }
        
        // 아이디 중복 체크 (자기 자신 제외)
        const duplicateTeacher = allTeachers.find(t => 
            t.username === username && t.id !== teacherId
        );
        if (duplicateTeacher) {
            alert('이미 사용 중인 아이디입니다');
            return;
        }
        
        // 현재 선생님 데이터 가져오기
        const currentTeacher = allTeachers.find(t => t.id === teacherId);
        
        // 업데이트할 데이터 (DB에 실제 존재하는 필드만)
        const updateData = {
            name: name,
            phone: phone,
            work_hours: work_hours,
            status: currentTeacher?.status || '재직'
        };
        
        // memo 필드가 있으면 유지
        if (currentTeacher?.memo) {
            updateData.memo = currentTeacher.memo;
        }
        
        // ✅ username, password, role도 저장
        if (role) {
            updateData.role = role;
        }
        if (username) {
            updateData.username = username;
        }
        if (password) {
            updateData.password = password;
        }
        
        console.log('업데이트 데이터:', updateData);
        
        // API 업데이트
        const result = await API.update('teachers', teacherId, updateData);
        console.log('업데이트 결과:', result);
        
        // 성공 시 display-value 업데이트
        const roleText = role === 'subadmin' ? '부관리자' : '선생님';
        row.querySelector('.teacher-name-cell .display-value').textContent = name;
        row.querySelector('.teacher-role-cell .display-value').textContent = roleText;
        row.querySelector('.teacher-phone-cell .display-value').textContent = Utils.formatPhone(phone);
        row.querySelector('.teacher-workhours-cell .display-value').textContent = work_hours || '-';
        row.querySelector('.teacher-username-cell .display-value').textContent = username || '-';
        if (password) {
            row.querySelector('.teacher-password-cell .display-value').textContent = '●●●●●●';
        }
        
        // 편집 모드 종료
        row.classList.remove('editing');
        row.querySelectorAll('.display-value').forEach(el => el.style.display = 'block');
        row.querySelectorAll('.edit-input').forEach(el => el.style.display = 'none');
        
        // 버튼 아이콘 복원
        const editBtn = row.querySelector('.edit-btn');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> 수정';
        editBtn.classList.remove('btn-success');
        editBtn.classList.add('btn-primary');
        
        // allTeachers 캐시 업데이트
        const teacherIndex = allTeachers.findIndex(t => t.id === teacherId);
        if (teacherIndex !== -1) {
            allTeachers[teacherIndex] = {
                ...allTeachers[teacherIndex],
                name: name,
                role: role,
                phone: phone,
                work_hours: work_hours,
                username: username
            };
            if (password) {
                allTeachers[teacherIndex].password = password;
            }
        }
        
        // window.allTeachersCache도 업데이트
        if (window.allTeachersCache) {
            const cacheIndex = window.allTeachersCache.findIndex(t => t.id === teacherId);
            if (cacheIndex !== -1) {
                window.allTeachersCache[cacheIndex] = {
                    ...window.allTeachersCache[cacheIndex],
                    name: name,
                    role: role,
                    phone: phone,
                    work_hours: work_hours,
                    username: username
                };
                if (password) {
                    window.allTeachersCache[cacheIndex].password = password;
                }
            }
        }
        
        console.log('선생님 정보가 성공적으로 저장되었습니다');
        
    } catch (error) {
        console.error('선생님 정보 저장 실패:', error);
        console.error('에러 상세:', error.message, error.stack);
        alert('저장에 실패했습니다.\n에러: ' + (error.message || '알 수 없는 오류'));
    }
}

// 수정 버튼 클릭 시 - 토글 방식 (수정 ↔ 저장)
window.editTeacher = function(teacherId) {
    const row = document.getElementById(`teacher-row-${teacherId}`);
    if (!row) return;
    
    const editButton = row.querySelector('.edit-teacher-btn');
    const isEditMode = editButton.getAttribute('data-mode') === 'edit';
    
    if (isEditMode) {
        // 현재 편집 모드 → 저장 모드로 전환
        const editableCells = row.querySelectorAll('td[ondblclick]');
        editableCells.forEach(cell => {
            const displayValue = cell.querySelector('.display-value');
            const editInput = cell.querySelector('.edit-input');
            
            if (displayValue && editInput) {
                displayValue.style.display = 'none';
                editInput.style.display = 'block';
                
                // 첫 번째 입력란에 포커스
                if (!row.querySelector('.edit-input:focus')) {
                    editInput.focus();
                    editInput.select();
                }
            }
        });
        
        // 버튼을 저장 모드로 변경
        editButton.innerHTML = '<i class="fas fa-save"></i>';
        editButton.setAttribute('data-mode', 'save');
        editButton.classList.remove('btn-primary');
        editButton.classList.add('btn-success');
        
    } else {
        // 현재 저장 모드 → 모든 셀 저장 후 편집 모드로 전환
        saveAllTeacherCells(teacherId);
    }
}

// 해당 행의 모든 셀 저장
async function saveAllTeacherCells(teacherId) {
    const row = document.getElementById(`teacher-row-${teacherId}`);
    if (!row) return;
    
    const editButton = row.querySelector('.edit-teacher-btn');
    const editableCells = row.querySelectorAll('td[ondblclick]');
    
    // 모든 입력란을 표시 모드로 전환
    editableCells.forEach(cell => {
        const displayValue = cell.querySelector('.display-value');
        const editInput = cell.querySelector('.edit-input');
        
        if (displayValue && editInput) {
            // 입력값이 변경되었으면 blur로 저장 트리거
            if (editInput.style.display === 'block') {
                editInput.blur();
            }
            // 즉시 표시 모드로 전환
            editInput.style.display = 'none';
            displayValue.style.display = 'inline';
        }
    });
    
    // 버튼을 편집 모드로 변경
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.setAttribute('data-mode', 'edit');
    editButton.classList.remove('btn-success');
    editButton.classList.add('btn-primary');
}

// 선생님 저장
async function saveTeacher(event) {
    event.preventDefault();
    
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const id = document.getElementById('teacherId').value;
    const data = {
        name: document.getElementById('teacherName').value,
        subject: document.getElementById('teacherSubject').value,
        phone: document.getElementById('teacherPhone').value,
        work_hours: document.getElementById('teacherWorkHours').value,
        hire_date: new Date(document.getElementById('teacherHireDate').value).getTime(),
        status: document.getElementById('teacherStatus').value,
        memo: document.getElementById('teacherMemo').value
    };
    
    try {
        if (id) {
            await API.update('teachers', id, data);
            alert('선생님 정보가 수정되었습니다');
        } else {
            await API.create('teachers', data);
            alert('선생님이 추가되었습니다');
        }
        
        closeTeacherModal();
        loadTeachers();
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다');
    }
}

// 선생님 삭제
async function deleteTeacher(teacherId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        await API.delete('teachers', teacherId);
        alert('선생님이 삭제되었습니다');
        loadTeachers();
    } catch (error) {
        alert('삭제에 실패했습니다');
    }
}

// 전체 회원 관리 페이지
async function showAllMembersPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="page-container">
            <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    ${Auth.isAdmin() || Auth.isSubAdmin() ? `
                    <select id="allMembersTeacherFilterSelect" class="form-select" style="width: 200px;" onchange="filterAllMembersByTeacher()">
                        <option value="all">전체 선생님</option>
                    </select>
                    ` : ''}
                </div>
                <button class="btn btn-primary" onclick="printAllMembers()">
                    <i class="fas fa-print"></i> 인쇄
                </button>
            </div>
            
            <div id="printableArea" class="table-container">
                <div id="membersByGrade"></div>
            </div>
        </div>
    `;
    
    // 관리자/부관리자인 경우 선생님 목록 로드
    if (Auth.isAdmin() || Auth.isSubAdmin()) {
        await loadTeachersForAllMembersFilter();
    }
    
    loadAllMembers();
}

// 전체 회원 로드
let allMembers = [];

async function loadAllMembers() {
    try {
        console.log('[loadAllMembers] 시작');
        
        // 재원 학생만 가져오기
        const studentsResult = await API.getList('students', { limit: 1000 });
        console.log('[loadAllMembers] API 응답:', studentsResult);
        
        const allStudentsData = Array.isArray(studentsResult) ? studentsResult : (studentsResult.data || []);
        console.log('[loadAllMembers] 전체 학생 수:', allStudentsData.length);
        
        let activeStudents = allStudentsData.filter(s => s.status === '재원');
        console.log('[loadAllMembers] 재원생 수:', activeStudents.length);
        
        // 현재 로그인한 사용자 정보
        console.log('[loadAllMembers] 사용자 정보:', {
            userId: Auth.getUserId(),
            username: Auth.getUsername(),
            role: Auth.getRole(),
            isAdmin: Auth.isAdmin(),
            isSubAdmin: Auth.isSubAdmin(),
            isTeacher: Auth.isTeacher()
        });
        
        // 권한에 따라 학생 필터링 (Permissions 유틸리티 사용)
        console.log('[loadAllMembers] 필터링 전 첫 5명의 teacher_id:', activeStudents.slice(0, 5).map(s => ({
            name: s.name,
            teacher_id: s.teacher_id
        })));
        
        activeStudents = Permissions.filterStudentsByTeacher(activeStudents);
        console.log('[loadAllMembers] 권한 필터링 후 재원생 수:', activeStudents.length);
        
        // 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
        if ((Auth.isAdmin() || Auth.isSubAdmin()) && currentAllMembersTeacherFilter !== 'all') {
            activeStudents = activeStudents.filter(s => s.teacher_id === currentAllMembersTeacherFilter);
            console.log('[loadAllMembers] 선생님 필터링 후 재원생 수:', activeStudents.length);
        }
        
        if (activeStudents.length > 0) {
            console.log('[loadAllMembers] 필터링된 학생 목록 (처음 5명):', activeStudents.slice(0, 5).map(s => ({
                name: s.name,
                school: s.school,
                grade: s.grade,
                teacher_id: s.teacher_id
            })));
        }
        
        renderAllMembersByGrade(activeStudents);
    } catch (error) {
        console.error('[loadAllMembers] 오류 발생:', error);
        document.getElementById('membersByGrade').innerHTML = 
            '<p class="text-center">데이터를 불러오는데 실패했습니다</p>';
    }
}

// 학교/학년별로 그룹화하여 렌더링 (단일 테이블)
function renderAllMembersByGrade(students) {
    const container = document.getElementById('membersByGrade');
    
    if (!students || students.length === 0) {
        container.innerHTML = '<p class="text-center">등록된 재원생이 없습니다</p>';
        return;
    }
    
    // 학교급+학년별로 그룹화
    const grouped = {};
    students.forEach(student => {
        const schoolType = student.school_type || '미지정';
        const grade = student.grade || '미지정';
        
        // 학교급 이름 변환 (축약형)
        let schoolTypeName = '';
        if (schoolType === '초') schoolTypeName = '초';
        else if (schoolType === '중') schoolTypeName = '중';
        else if (schoolType === '고') schoolTypeName = '고';
        else schoolTypeName = schoolType;
        
        const key = `${schoolTypeName}_${grade}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                schoolType: schoolTypeName,
                grade: grade,
                students: []
            };
        }
        grouped[key].students.push(student);
    });
    
    // 그룹 정렬
    const sortedGroups = Object.values(grouped).sort((a, b) => {
        const schoolOrder = {'초': 1, '중': 2, '고': 3};
        const orderA = schoolOrder[a.schoolType] || 999;
        const orderB = schoolOrder[b.schoolType] || 999;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.grade.localeCompare(b.grade, 'ko');
    });
    
    // 단일 테이블로 생성
    let tableRows = '';
    
    sortedGroups.forEach(group => {
        // 각 그룹 내 학생들을 이름순으로 정렬 (가나다순)
        const sortedStudents = group.students.sort((a, b) => 
            (a.name || '').localeCompare(b.name || '', 'ko')
        );
        
        sortedStudents.forEach((student, index) => {
            // 사용책 데이터 파싱 및 최신 데이터 추출
            let bookConcept = '-';
            let bookReview = '-';
            let bookAdvanced = '-';
            
            try {
                let books = [];
                if (student.books && typeof student.books === 'string' && student.books.trim() !== '') {
                    books = JSON.parse(student.books);
                } else if (Array.isArray(student.books)) {
                    books = student.books;
                }
                
                if (books.length > 0) {
                    // 최신순 정렬 (날짜 문자열 비교)
                    const sortedBooks = [...books].sort((a, b) => {
                        return (b.date || '').localeCompare(a.date || '');
                    });
                    
                    // 선행개념 찾기: 최신 항목부터 내용이 있는 것 찾기
                    for (const book of sortedBooks) {
                        if (book.concept && book.concept.trim() !== '' && book.concept.trim() !== '0') {
                            bookConcept = book.concept;
                            break;
                        }
                    }
                    
                    // 선행복습 찾기
                    for (const book of sortedBooks) {
                        if (book.review && book.review.trim() !== '' && book.review.trim() !== '0') {
                            bookReview = book.review;
                            break;
                        }
                    }
                    
                    // 현행심화 찾기
                    for (const book of sortedBooks) {
                        if (book.advanced && book.advanced.trim() !== '' && book.advanced.trim() !== '0') {
                            bookAdvanced = book.advanced;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.error('[renderAllMembersByGrade] 사용책 파싱 오류:', e);
            }
            
            // 담당 선생님 색상 (관리자/부관리자만 표시)
            let colorStyle = '';
            if (Auth.isAdminOrSubAdmin()) {
                const teacherColor = getTeacherColorClass(student.teacher_id);
                colorStyle = teacherColor ? `style="background-color: ${teacherColor};"` : '';
            }
            
            // 첫 번째 학생 행에만 분류 표시 (rowspan)
            if (index === 0) {
                tableRows += `
                    <tr ${colorStyle}>
                        <td class="category-cell" rowspan="${sortedStudents.length}">${group.schoolType}${group.grade}</td>
                        <td>${student.name || '-'}</td>
                        <td>${formatSchoolName(student.school) || '-'}</td>
                        <td>${student.parent_phone || '-'}</td>
                        <td>${student.phone || '-'}</td>
                        <td>${bookConcept}</td>
                        <td>${bookReview}</td>
                        <td>${bookAdvanced}</td>
                    </tr>
                `;
            } else {
                tableRows += `
                    <tr ${colorStyle}>
                        <td>${student.name || '-'}</td>
                        <td>${formatSchoolName(student.school) || '-'}</td>
                        <td>${student.parent_phone || '-'}</td>
                        <td>${student.phone || '-'}</td>
                        <td>${bookConcept}</td>
                        <td>${bookReview}</td>
                        <td>${bookAdvanced}</td>
                    </tr>
                `;
            }
        });
    });
    
    container.innerHTML = `
        <table class="all-members-table">
            <thead>
                <tr>
                    <th>분류</th>
                    <th>이름</th>
                    <th>학교명</th>
                    <th>학부모 연락처</th>
                    <th>학생 연락처</th>
                    <th>선행개념</th>
                    <th>선행복습</th>
                    <th>현행심화</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

// 전체 회원 검색 (사용 안 함 - 검색 기능 제거됨)
function searchAllMembers() {
    // 검색 기능 제거됨
}

// 전체 회원 인쇄
function printAllMembers() {
    // 인쇄용 스타일 동적 추가
    const printStyle = document.createElement('style');
    printStyle.id = 'dynamic-print-style';
    printStyle.textContent = `
        @media print {
            @page {
                size: landscape !important;
                margin: 1cm;
            }
            
            /* 불필요한 요소 숨기기 */
            header, .main-nav, .sub-menu-container, .main-menu, .btn, .page-header, 
            .modal, #assignStudentsModal {
                display: none !important;
            }
            
            body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .page-container {
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
            }
            
            #membersByGrade {
                width: 100% !important;
            }
            
            .all-members-table {
                width: 100% !important;
                box-shadow: none !important;
                page-break-inside: auto !important;
            }
            
            .all-members-table th,
            .all-members-table td {
                padding: 0.4rem 0.6rem !important;
                font-size: 9pt !important;
            }
            
            .all-members-table .category-cell {
                background: #FFF8F0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .all-members-table thead {
                background: #FFF8F0 !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    `;
    
    // 기존 동적 스타일 제거
    const oldStyle = document.getElementById('dynamic-print-style');
    if (oldStyle) {
        oldStyle.remove();
    }
    
    // 새 스타일 추가
    document.head.appendChild(printStyle);
    
    // 인쇄 실행
    setTimeout(() => {
        window.print();
        
        // 인쇄 후 스타일 제거
        setTimeout(() => {
            printStyle.remove();
        }, 1000);
    }, 100);
}

// 전체 회원 필터
function filterAllMembers() {
    searchAllMembers();
}

// ========================================
// 담당선생님 필터링 함수들 (학생관리/전체회원관리)
// ========================================

// 학생관리 페이지: 선생님 목록 로드 및 드롭다운 구성
async function loadTeachersForFilter() {
    try {
        const result = await API.getList('teachers', { limit: 1000 });
        const teachers = Array.isArray(result) ? result : (result.data || []);
        
        // status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
        // role이 'teacher' 또는 '선생님'인 경우만 포함 (관리자/부관리자 제외)
        const activeTeachers = teachers.filter(t => {
            const status = t.status || '재직';
            const isActive = status === '재직' || status === '재직중';
            const isTeacher = t.role === 'teacher' || t.role === '선생님' || !t.role; // role이 없으면 일반 선생님으로 간주
            return isActive && isTeacher;
        });
        
        console.log('[loadTeachersForFilter] 재직 선생님(관리자 제외):', activeTeachers.map(t => `${t.name}(${t.role || '선생님'}/${t.status || '재직'})`));
        
        // 드롭다운 구성
        const select = document.getElementById('teacherFilterSelect');
        if (!select) return;
        
        let options = '<option value="all">전체 선생님</option>';
        
        // 모든 재직 선생님 나열
        activeTeachers.forEach(t => {
            options += `<option value="${t.id}">${t.name}</option>`;
        });
        
        select.innerHTML = options;
    } catch (error) {
        console.error('[loadTeachersForFilter] 선생님 목록 로드 실패:', error);
    }
}

// 학생관리 페이지: 선생님 필터 변경 핸들러
function filterStudentsByTeacher() {
    const select = document.getElementById('teacherFilterSelect');
    if (!select) return;
    
    currentTeacherFilter = select.value;
    console.log('[filterStudentsByTeacher] 선택된 선생님 ID:', currentTeacherFilter);
    
    // 현재 상태 탭 유지하면서 필터링 재실행
    filterStudentsByStatus(currentStudentStatusFilter);
}

// 전체회원관리 페이지: 선생님 목록 로드 및 드롭다운 구성
async function loadTeachersForAllMembersFilter() {
    try {
        const result = await API.getList('teachers', { limit: 1000 });
        const teachers = Array.isArray(result) ? result : (result.data || []);
        
        // status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
        // role이 'teacher' 또는 '선생님'인 경우만 포함 (관리자/부관리자 제외)
        const activeTeachers = teachers.filter(t => {
            const status = t.status || '재직';
            const isActive = status === '재직' || status === '재직중';
            const isTeacher = t.role === 'teacher' || t.role === '선생님' || !t.role; // role이 없으면 일반 선생님으로 간주
            return isActive && isTeacher;
        });
        
        console.log('[loadTeachersForAllMembersFilter] 재직 선생님(관리자 제외):', activeTeachers.map(t => `${t.name}(${t.role || '선생님'}/${t.status || '재직'})`));
        
        // 드롭다운 구성
        const select = document.getElementById('allMembersTeacherFilterSelect');
        if (!select) return;
        
        let options = '<option value="all">전체 선생님</option>';
        
        // 모든 재직 선생님 나열
        activeTeachers.forEach(t => {
            options += `<option value="${t.id}">${t.name}</option>`;
        });
        
        select.innerHTML = options;
    } catch (error) {
        console.error('[loadTeachersForAllMembersFilter] 선생님 목록 로드 실패:', error);
    }
}

// 전체회원관리 페이지: 선생님 필터 변경 핸들러
function filterAllMembersByTeacher() {
    const select = document.getElementById('allMembersTeacherFilterSelect');
    if (!select) return;
    
    currentAllMembersTeacherFilter = select.value;
    console.log('[filterAllMembersByTeacher] 선택된 선생님 ID:', currentAllMembersTeacherFilter);
    
    // 필터링 재실행
    loadAllMembers();
}

// ========================================
// 담당학생 관리 함수들
// ========================================

let currentTeacherId = null;

// 담당학생 모달 열기
async function showTeacherStudents(teacherId) {
    currentTeacherId = teacherId;
    const modal = document.getElementById('assignStudentsModal');
    const listContainer = document.getElementById('studentsSelectionList');
    
    // 모달 표시
    modal.style.display = 'flex';
    
    try {
        // 재학생 목록 불러오기 (재원 상태만)
        const result = await API.getList('students', { limit: 1000 });
        const allStudentsForGrade = Array.isArray(result) ? result : (result.data || []);
        const activeStudents = allStudentsForGrade.filter(s => s.status === '재원');
        
        // 선생님 정보 불러오기
        const teacher = allTeachers.find(t => t.id === teacherId);
        
        // 가나다순 정렬
        const sortedStudents = activeStudents.sort((a, b) => 
            (a.name || '').localeCompare(b.name || '', 'ko')
        );
        
        // 체크박스 리스트 생성
        listContainer.innerHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                ${sortedStudents.map(student => {
                    const isAssigned = student.teacher_id === teacherId;
                    return `
                        <div class="student-checkbox-item" style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center;">
                            <input 
                                type="checkbox" 
                                id="student-${student.id}" 
                                value="${student.id}"
                                ${isAssigned ? 'checked' : ''}
                                style="margin-right: 1rem; width: 18px; height: 18px; cursor: pointer;">
                            <label for="student-${student.id}" style="cursor: pointer; flex: 1;">
                                <span style="font-weight: 600;">${student.name || 'undefined'}</span>
                                <span style="color: var(--text-light); margin-left: 1rem;">${formatSchoolName(student.school) || '-'} ${student.grade || '-'}</span>
                            </label>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        if (sortedStudents.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">재학생이 없습니다</p>';
        }
    } catch (error) {
        console.error('학생 목록 로드 실패:', error);
        listContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">데이터를 불러오는데 실패했습니다</p>';
    }
}

// 담당학생 모달 닫기
function closeAssignStudentsModal() {
    const modal = document.getElementById('assignStudentsModal');
    modal.style.display = 'none';
    currentTeacherId = null;
}

// 담당학생 저장
async function saveAssignedStudents() {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    if (!currentTeacherId) {
        alert('선생님 정보를 찾을 수 없습니다');
        return;
    }
    
    try {
        console.log('=== 담당학생 저장 시작 ===');
        console.log('현재 선생님 ID:', currentTeacherId);
        
        // 체크된 학생 ID 수집
        const checkboxes = document.querySelectorAll('#studentsSelectionList input[type="checkbox"]');
        const selectedStudentIds = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        console.log('선택된 학생 IDs:', selectedStudentIds);
        
        // 모든 재원생 목록 가져오기
        const result = await API.getList('students', { limit: 1000 });
        const allStudentsData = (result.data || []).filter(s => s.status === '재원');
        
        console.log('전체 재원생 수:', allStudentsData.length);
        
        // 업데이트 작업
        const updatePromises = [];
        
        for (const student of allStudentsData) {
            const shouldBeAssigned = selectedStudentIds.includes(student.id);
            const isCurrentlyAssigned = student.teacher_id === currentTeacherId;
            
            // 상태가 변경된 경우만 업데이트
            if (shouldBeAssigned && !isCurrentlyAssigned) {
                console.log(`${student.name} → ${currentTeacherId} 할당`);
                // 담당 선생님 할당 - 시스템 필드 제외하고 복사
                const { gs_project_id, gs_table_name, created_at, updated_at, deleted, ...studentData } = student;
                const updatedStudent = {
                    ...studentData,
                    teacher_id: currentTeacherId
                };
                console.log(`업데이트할 데이터:`, updatedStudent);
                updatePromises.push(
                    API.update('students', student.id, updatedStudent)
                        .then(result => {
                            console.log(`✅ ${student.name} 할당 성공`, result);
                            return result;
                        })
                        .catch(err => {
                            console.error(`❌ ${student.name} 할당 실패:`, err);
                            throw err;
                        })
                );
            } else if (!shouldBeAssigned && isCurrentlyAssigned) {
                console.log(`${student.name} 담당 선생님 해제`);
                // 담당 선생님 해제 - 시스템 필드 제외하고 복사
                const { gs_project_id, gs_table_name, created_at, updated_at, deleted, ...studentData } = student;
                const updatedStudent = {
                    ...studentData,
                    teacher_id: null
                };
                console.log(`업데이트할 데이터:`, updatedStudent);
                updatePromises.push(
                    API.update('students', student.id, updatedStudent)
                        .then(result => {
                            console.log(`✅ ${student.name} 해제 성공`, result);
                            return result;
                        })
                        .catch(err => {
                            console.error(`❌ ${student.name} 해제 실패:`, err);
                            throw err;
                        })
                );
            }
        }
        
        console.log('업데이트할 학생 수:', updatePromises.length);
        
        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            console.log('✅ 모든 업데이트 완료');
        }
        
        // 로컬 allStudents 배열 업데이트
        await loadStudents();
        console.log('✅ 학생 목록 새로고침 완료, 학생 수:', allStudents.length);
        
        alert('담당 학생이 저장되었습니다');
        closeAssignStudentsModal();
        
        // 선생님 페이지 새로고침
        await showTeachersPage();
        
        console.log('=== 담당학생 저장 완료 ===');
    } catch (error) {
        console.error('❌ 담당 학생 저장 실패:', error);
        console.error('에러 상세:', error.message, error.stack);
        alert('저장에 실패했습니다: ' + error.message);
    }
}

// ========================================
// 스케줄 관리 함수들
// ========================================

// 입실 시간을 기반으로 퇴실 시간 자동 계산
function calculateCheckOutTime(checkInTime, durationMinutes) {
    if (!checkInTime) return '';
    
    const [hours, minutes] = checkInTime.split(':').map(Number);
    const checkInDate = new Date();
    checkInDate.setHours(hours, minutes, 0, 0);
    
    const checkOutDate = new Date(checkInDate.getTime() + durationMinutes * 60000);
    
    const outHours = String(checkOutDate.getHours()).padStart(2, '0');
    const outMinutes = String(checkOutDate.getMinutes()).padStart(2, '0');
    
    return `${outHours}:${outMinutes}`;
}

// 실시간 퇴실시간 계산 (DB 저장 없이 화면만 업데이트)
function updateScheduleCheckoutRealtime(studentId, dayKey) {
    const checkInInput = document.getElementById(`schedule-${dayKey}-checkin`);
    const durationInput = document.getElementById(`schedule-${dayKey}-duration`);
    const checkOutInput = document.getElementById(`schedule-${dayKey}-checkout`);
    
    if (!checkInInput || !durationInput || !checkOutInput) return;
    
    const checkInTime = checkInInput.value;
    const duration = parseInt(durationInput.value) || 90;
    
    // 입실시간이 유효한 HH:MM 형식이면 퇴실시간 계산
    if (/^\d{2}:\d{2}$/.test(checkInTime)) {
        const checkOutTime = calculateCheckOutTime(checkInTime, duration);
        checkOutInput.value = checkOutTime;
    }
}

// 학생의 schedule을 안전하게 가져오는 헬퍼 함수
function getStudentSchedule(student) {
    let schedule = student.schedule;
    
    // 문자열이면 JSON 파싱
    if (typeof schedule === 'string') {
        try {
            schedule = JSON.parse(schedule);
        } catch (e) {
            console.error('[getStudentSchedule] JSON 파싱 실패:', e);
            schedule = {};
        }
    }
    
    // null이나 undefined면 빈 객체
    if (!schedule || typeof schedule !== 'object') {
        schedule = {};
    }
    
    return schedule;
}

// 학생의 필수 정보가 모두 입력되었는지 체크
function isStudentInfoComplete(student) {
    // 필수 항목: 학교명, 구분, 학년, 연락처, 학부모연락처, 스케줄
    if (!student.school || !student.school_type || !student.grade) {
        return false;
    }
    
    if (!student.phone && !student.parent_phone) {
        return false;
    }
    
    // 스케줄 체크 (최소 하나의 요일이 enabled = true)
    const schedule = getStudentSchedule(student);
    const hasSchedule = Object.values(schedule).some(day => day && day.enabled === true);
    
    if (!hasSchedule) {
        return false;
    }
    
    return true;
}

// 시간 형식 변환 함수 (1400 → 14:00, 문자열 버전)
function formatTimeString(value) {
    if (!value) return '';
    
    // 숫자만 추출
    const digits = value.replace(/\D/g, '');
    
    // 3자리인 경우 (930 → 09:30)
    if (digits.length === 3) {
        const hour = digits.substring(0, 1).padStart(2, '0');
        const minute = digits.substring(1, 3);
        
        if (parseInt(hour) < 24 && parseInt(minute) < 60) {
            return `${hour}:${minute}`;
        }
    }
    
    // 4자리 숫자인 경우 (1400 → 14:00)
    if (digits.length === 4) {
        const hour = digits.substring(0, 2);
        const minute = digits.substring(2, 4);
        
        // 유효성 검사
        if (parseInt(hour) < 24 && parseInt(minute) < 60) {
            return `${hour}:${minute}`;
        }
    }
    
    // 이미 HH:MM 형식이면 그대로 반환
    if (/^\d{2}:\d{2}$/.test(value)) {
        return value;
    }
    
    return value;
}

// 스케줄 수업 여부 업데이트
async function updateScheduleEnabled(studentId, dayKey, enabled) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }

    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;

        // 스케줄 객체 가져오기 (JSON 파싱 포함)
        let schedule = getStudentSchedule(student);
        
        // 해당 요일 초기화
        if (!schedule[dayKey]) {
            schedule[dayKey] = { enabled: false, checkIn: '', checkOut: '', duration: 90 };
        }

        schedule[dayKey].enabled = enabled;

        // JSON 문자열로 변환하여 저장 (스케줄 업데이트 시간 기록)
        await API.update('students', studentId, { 
            schedule: JSON.stringify(schedule),
            schedule_updated_at: Date.now()
        });
        
        // 로컬 데이터 업데이트
        student.schedule = schedule;
        
        // UI는 새로고침하지 않음 (체크박스 상태 유지)
        console.log(`[updateScheduleEnabled] ${dayKey} 수업 여부: ${enabled}`);
    } catch (error) {
        console.error('스케줄 업데이트 실패:', error);
        alert('스케줄 업데이트에 실패했습니다');
    }
}

// 입실 시간 업데이트
async function updateScheduleCheckIn(studentId, dayKey, checkInTime) {
    console.log('[updateScheduleCheckIn] 시작 - 입력값:', checkInTime);
    
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }

    try {
        // 시간 형식 자동 변환 (1400 → 14:00)
        const originalTime = checkInTime;
        checkInTime = formatTimeString(checkInTime);
        console.log('[updateScheduleCheckIn] 변환:', originalTime, '→', checkInTime);
        
        const student = allStudents.find(s => s.id === studentId);
        if (!student) {
            console.error('[updateScheduleCheckIn] 학생을 찾을 수 없음:', studentId);
            return;
        }

        // 스케줄 객체 가져오기 (JSON 파싱 포함)
        let schedule = getStudentSchedule(student);
        
        // 해당 요일 초기화
        if (!schedule[dayKey]) {
            schedule[dayKey] = { enabled: false, checkIn: '', checkOut: '', duration: 90 };
        }

        schedule[dayKey].checkIn = checkInTime;
        
        // 재실시간을 기반으로 퇴실시간 자동 계산
        const duration = schedule[dayKey].duration || 90;
        const checkOutTime = calculateCheckOutTime(checkInTime, duration);
        console.log('[updateScheduleCheckIn] 퇴실시간 계산:', checkInTime, '+', duration, '분 =', checkOutTime);
        
        schedule[dayKey].checkOut = checkOutTime;

        // JSON 문자열로 변환하여 저장 (스케줄 업데이트 시간 기록)
        await API.update('students', studentId, { 
            schedule: JSON.stringify(schedule),
            schedule_updated_at: Date.now()
        });
        console.log('[updateScheduleCheckIn] DB 저장 완료');
        
        // 로컬 데이터 업데이트
        student.schedule = schedule;
        
        // 입력 필드 업데이트 (변환된 형식으로)
        const checkInInput = document.getElementById(`schedule-${dayKey}-checkin`);
        if (checkInInput) {
            checkInInput.value = checkInTime;
            console.log('[updateScheduleCheckIn] 입력 필드 업데이트:', checkInTime);
        }
        
        // 퇴실시간 필드 업데이트
        const checkOutInput = document.getElementById(`schedule-${dayKey}-checkout`);
        if (checkOutInput) {
            checkOutInput.value = checkOutTime;
            console.log('[updateScheduleCheckIn] 퇴실시간 필드 업데이트:', checkOutTime);
        }
    } catch (error) {
        console.error('[updateScheduleCheckIn] 오류 발생:', error);
        alert('스케줄 업데이트에 실패했습니다');
    }
}

// 재실시간 업데이트
async function updateScheduleDuration(studentId, dayKey, duration) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }

    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;

        // 스케줄 객체 가져오기 (JSON 파싱 포함)
        let schedule = getStudentSchedule(student);
        
        // 해당 요일 초기화
        if (!schedule[dayKey]) {
            schedule[dayKey] = { enabled: false, checkIn: '', checkOut: '', duration: 90 };
        }

        schedule[dayKey].duration = parseInt(duration);
        
        // 입실시간이 있으면 퇴실시간 재계산
        const checkInTime = schedule[dayKey].checkIn;
        if (checkInTime) {
            const checkOutTime = calculateCheckOutTime(checkInTime, parseInt(duration));
            schedule[dayKey].checkOut = checkOutTime;
            
            // 퇴실시간 필드 업데이트
            const checkOutInput = document.getElementById(`schedule-${dayKey}-checkout`);
            if (checkOutInput) {
                checkOutInput.value = checkOutTime;
            }
        }

        // JSON 문자열로 변환하여 저장 (스케줄 업데이트 시간 기록)
        await API.update('students', studentId, { 
            schedule: JSON.stringify(schedule),
            schedule_updated_at: Date.now()
        });
        
        // 로컬 데이터 업데이트
        student.schedule = schedule;
    } catch (error) {
        console.error('스케줄 업데이트 실패:', error);
        alert('스케줄 업데이트에 실패했습니다');
    }
}

// ===== 추가 수업 행 관련 함수들 =====

// 추가 행 요일 선택
async function updateScheduleExtraDay(studentId, dayKey) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }

    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;

        let schedule = getStudentSchedule(student);
        
        if (!schedule.extra) {
            schedule.extra = { dayKey: '', enabled: false, checkIn: '', checkOut: '', duration: 90 };
        }

        schedule.extra.dayKey = dayKey;

        await API.update('students', studentId, { 
            schedule: JSON.stringify(schedule),
            schedule_updated_at: Date.now()
        });
        
        student.schedule = schedule;
        console.log(`[updateScheduleExtraDay] 추가 수업 요일: ${dayKey}`);
    } catch (error) {
        console.error('추가 수업 요일 업데이트 실패:', error);
        alert('추가 수업 요일 업데이트에 실패했습니다');
    }
}

// 추가 행 수업 여부
async function updateScheduleExtraEnabled(studentId, enabled) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }

    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;

        let schedule = getStudentSchedule(student);
        
        if (!schedule.extra) {
            schedule.extra = { dayKey: '', enabled: false, checkIn: '', checkOut: '', duration: 90 };
        }

        schedule.extra.enabled = enabled;

        await API.update('students', studentId, { 
            schedule: JSON.stringify(schedule),
            schedule_updated_at: Date.now()
        });
        
        student.schedule = schedule;
        console.log(`[updateScheduleExtraEnabled] 추가 수업 여부: ${enabled}`);
    } catch (error) {
        console.error('추가 수업 여부 업데이트 실패:', error);
        alert('추가 수업 여부 업데이트에 실패했습니다');
    }
}

// 추가 행 입실시간
async function updateScheduleExtraCheckIn(studentId, checkInTime) {
    console.log('[updateScheduleExtraCheckIn] 시작 - 입력값:', checkInTime);
    
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }

    try {
        const originalTime = checkInTime;
        checkInTime = formatTimeString(checkInTime);
        console.log('[updateScheduleExtraCheckIn] 변환:', originalTime, '→', checkInTime);
        
        const student = allStudents.find(s => s.id === studentId);
        if (!student) {
            console.error('[updateScheduleExtraCheckIn] 학생을 찾을 수 없음:', studentId);
            return;
        }

        let schedule = getStudentSchedule(student);
        
        if (!schedule.extra) {
            schedule.extra = { dayKey: '', enabled: false, checkIn: '', checkOut: '', duration: 90 };
        }

        schedule.extra.checkIn = checkInTime;
        
        const duration = schedule.extra.duration || 90;
        const checkOutTime = calculateCheckOutTime(checkInTime, duration);
        console.log('[updateScheduleExtraCheckIn] 퇴실시간 계산:', checkInTime, '+', duration, '분 =', checkOutTime);
        
        schedule.extra.checkOut = checkOutTime;

        await API.update('students', studentId, { 
            schedule: JSON.stringify(schedule),
            schedule_updated_at: Date.now()
        });
        console.log('[updateScheduleExtraCheckIn] DB 저장 완료');
        
        student.schedule = schedule;
        
        const checkInInput = document.getElementById('schedule-extra-checkin');
        if (checkInInput) {
            checkInInput.value = checkInTime;
            console.log('[updateScheduleExtraCheckIn] 입력 필드 업데이트:', checkInTime);
        }
        
        const checkOutInput = document.getElementById('schedule-extra-checkout');
        if (checkOutInput) {
            checkOutInput.value = checkOutTime;
            console.log('[updateScheduleExtraCheckIn] 퇴실시간 필드 업데이트:', checkOutTime);
        }
    } catch (error) {
        console.error('[updateScheduleExtraCheckIn] 오류 발생:', error);
        alert('추가 수업 입실시간 업데이트에 실패했습니다');
    }
}

// 추가 행 재실시간
async function updateScheduleExtraDuration(studentId, duration) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }

    try {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;

        let schedule = getStudentSchedule(student);
        
        if (!schedule.extra) {
            schedule.extra = { dayKey: '', enabled: false, checkIn: '', checkOut: '', duration: 90 };
        }

        schedule.extra.duration = parseInt(duration);
        
        const checkInTime = schedule.extra.checkIn;
        if (checkInTime) {
            const checkOutTime = calculateCheckOutTime(checkInTime, parseInt(duration));
            schedule.extra.checkOut = checkOutTime;
            
            const checkOutInput = document.getElementById('schedule-extra-checkout');
            if (checkOutInput) {
                checkOutInput.value = checkOutTime;
            }
        }

        await API.update('students', studentId, { 
            schedule: JSON.stringify(schedule),
            schedule_updated_at: Date.now()
        });
        
        student.schedule = schedule;
    } catch (error) {
        console.error('추가 수업 재실시간 업데이트 실패:', error);
        alert('추가 수업 재실시간 업데이트에 실패했습니다');
    }
}

// 추가 행 실시간 퇴실시간 계산
function updateScheduleExtraCheckoutRealtime(studentId) {
    const checkInInput = document.getElementById('schedule-extra-checkin');
    const durationInput = document.getElementById('schedule-extra-duration');
    const checkOutInput = document.getElementById('schedule-extra-checkout');
    
    if (!checkInInput || !durationInput || !checkOutInput) return;
    
    const checkInTime = formatTimeString(checkInInput.value);
    const duration = parseInt(durationInput.value) || 90;
    
    if (checkInTime) {
        const checkOutTime = calculateCheckOutTime(checkInTime, duration);
        checkOutInput.value = checkOutTime;
    }
}

