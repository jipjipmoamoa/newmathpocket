// 스케줄 관리 모듈

// 일정 배경색 (events.js와 동일한 설정)
const EVENT_COLORS = {
    'red': { name: '연빨강', color: '#FFCDD2' },
    'blue': { name: '연하늘', color: '#BBDEFB' },
    'yellow': { name: '연노랑', color: '#FFF9C4' },
    'green': { name: '연두색', color: '#C8E6C9' },
    'purple': { name: '연보라', color: '#E1BEE7' },
    'orange': { name: '연주황', color: '#FFE0B2' },
    'pink': { name: '연분홍', color: '#F8BBD0' },
    'gray': { name: '연회색', color: '#E0E0E0' }
};

// 학생별 고유 색상 (20가지 파스텔톤 - 모두 다른 색)
const studentColors = [
    '#FFE5E5', // 1. 연분홍
    '#FFF4CC', // 2. 연노랑
    '#E5F5E5', // 3. 연두
    '#E5F2FF', // 4. 연하늘
    '#F0E5FF', // 5. 연보라
    '#FFE5F0', // 6. 연핑크
    '#E5FFE5', // 7. 연민트
    '#FFEEE5', // 8. 연주황
    '#E5F9FF', // 9. 연청록
    '#FFF0E5', // 10. 연피치
    '#F5E5FF', // 11. 연라벤더
    '#E5FFFF', // 12. 연시안
    '#FFFFE5', // 13. 연레몬
    '#FFE5FF', // 14. 연마젠타
    '#E5FFF0', // 15. 연에메랄드
    '#F0FFE5', // 16. 연라임
    '#E5E5FF', // 17. 연퍼플
    '#FFE5E0', // 18. 연코랄
    '#E5F0FF', // 19. 연아이스
    '#FFF5E5', // 20. 연아이보리
];

let studentColorMap = {}; // 학생 ID -> 색상 매핑
let scheduleTeacherFilter = 'all'; // 스케줄 페이지 선생님 필터
let monthlyScheduleTeacherFilter = 'all'; // 월간 스케줄 페이지 선생님 필터
let highlightedScheduleStudentId = null; // 강조된 학생 ID
let monthlyAttendanceCount = {}; // 학생별 월별 출석 횟수 { studentId: count }
let currentScheduleTab = 'weekly'; // 현재 탭: 'weekly' 또는 'monthly'
let monthlyScheduleYear = new Date().getFullYear(); // 월간 스케줄 연도
let monthlyScheduleMonth = new Date().getMonth(); // 월간 스케줄 월 (0-based)
let globalDateScheduleData = {}; // 날짜별 스케줄 데이터 (4열 초과 정보 포함)

// 학생 색상 가져오기 헬퍼 함수
function getStudentColor(studentId) {
    if (!studentColorMap[studentId]) {
        // 색상이 없으면 임시로 할당
        const keys = Object.keys(studentColorMap);
        const index = keys.length;
        studentColorMap[studentId] = studentColors[index % studentColors.length];
    }
    return studentColorMap[studentId];
}

// 월간 스케줄표 인쇄 (세로)
window.printMonthlySchedule = function() {
    // 인쇄 전 추가 스타일 주입 (한 페이지 강제)
    const style = document.createElement('style');
    style.id = 'monthlyPrintFix';
    style.textContent = `
        @media print {
            @page {
                size: A4 portrait !important;
                margin: 0 !important;
            }
            html, body {
                height: 297mm !important;
                max-height: 297mm !important;
                overflow: hidden !important;
                position: relative !important;
            }
            .page-container {
                position: relative !important;
                overflow: hidden !important;
            }
            #monthlyScheduleCalendar {
                position: absolute !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
            }
            #monthlyScheduleCalendar > div,
            #monthlyScheduleCalendar table,
            #monthlyScheduleCalendar tbody,
            #monthlyScheduleCalendar tr {
                page-break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
            }
            table {
                width: 100% !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // CSS 파일이 이미 로드되어 있으므로 바로 인쇄
    window.print();
    
    // 인쇄 후 제거
    setTimeout(() => {
        const fixStyle = document.getElementById('monthlyPrintFix');
        if (fixStyle) fixStyle.remove();
    }, 1000);
}

// 주간 스케줄표 페이지
window.showScheduleWeekly = async function() {
    // 기존 팝업 제거
    const existingPopup = document.getElementById('studentAttendancePopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    highlightedScheduleStudentId = null;
    
    const mainContent = document.getElementById('mainContent');
    
    // 스케줄 인쇄 CSS 추가
    let schedulePrintCSS = document.getElementById('schedulePrintCSS');
    if (!schedulePrintCSS) {
        schedulePrintCSS = document.createElement('link');
        schedulePrintCSS.id = 'schedulePrintCSS';
        schedulePrintCSS.rel = 'stylesheet';
        schedulePrintCSS.href = 'css/schedule-print.css?v=20260210012';
        document.head.appendChild(schedulePrintCSS);
    }
    
    // 일반 선생님인 경우 필터 숨김
    const isTeacher = Auth.isTeacher();
    const filterDisplay = isTeacher ? 'display: none;' : '';
    
    mainContent.innerHTML = `
        <div class="page-container" id="schedulePageContainer" style="max-width: 98%; margin: 0 auto;">
            <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <h2>주간 스케줄표</h2>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div id="teacherCheckboxList" style="${filterDisplay} display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                        <!-- 체크박스 목록이 여기에 동적으로 추가됩니다 -->
                    </div>
                    <button class="btn btn-primary" onclick="printScheduleTable()">
                        <i class="fas fa-print"></i> 인쇄
                    </button>
                </div>
            </div>
            
            <!-- 주간 스케줄 -->
            <div id="weeklyScheduleTable" style="transform-origin: top left;"></div>
        </div>
    `;
    
    // 일반 선생님인 경우 필터 로드 안 함
    if (!Auth.isTeacher()) {
        await loadTeachersForCheckboxFilter();
    }
    
    // 월별 출석 횟수 로드
    await loadMonthlyAttendanceCount();
    await loadWeeklySchedule();
    
    // 테이블 크기에 맞춰 자동 스케일 조정
    adjustTableScale();
}

// 월간 스케줄표 페이지
window.showScheduleMonthly = async function() {
    // 기존 팝업 제거
    const existingPopup = document.getElementById('studentAttendancePopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    highlightedScheduleStudentId = null;
    
    const mainContent = document.getElementById('mainContent');
    
    // 월간 스케줄 인쇄 CSS 추가
    let monthlyPrintCSS = document.getElementById('monthlyPrintCSS');
    if (!monthlyPrintCSS) {
        monthlyPrintCSS = document.createElement('link');
        monthlyPrintCSS.id = 'monthlyPrintCSS';
        monthlyPrintCSS.rel = 'stylesheet';
        monthlyPrintCSS.href = 'css/monthly-schedule-print.css?v=' + Date.now();
        document.head.appendChild(monthlyPrintCSS);
    }
    
    // 일반 선생님인 경우 드롭다운 숨김
    const isTeacher = Auth.isTeacher();
    const teacherDropdownDisplay = isTeacher ? 'display: none;' : '';
    
    mainContent.innerHTML = `
        <div class="page-container" style="max-width: 98%; margin: 0 auto;">
            <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <!-- 선생님 드롭다운 (관리자만) -->
                <div style="${teacherDropdownDisplay}">
                    <select id="monthlyTeacherSelect" class="form-select" style="width: 200px;" onchange="changeMonthlyTeacher()">
                        <option value="all">전체 선생님</option>
                    </select>
                </div>
                <div style="flex: 1;"></div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <!-- 일정 등록 버튼 -->
                    <button class="btn btn-success" onclick="openEventModal()" style="background: #4CAF50; padding: 0.5rem 1rem;">
                        <i class="fas fa-plus"></i> 일정 등록
                    </button>
                    <!-- 월간 스케줄 월 이동 버튼 -->
                    <button onclick="changeMonthlyScheduleMonth(-1)" class="btn-secondary" style="padding: 0.5rem 1rem;">◀ 이전 달</button>
                    <span id="monthlyScheduleTitle" style="font-size: 1.1rem; font-weight: 600; min-width: 120px; text-align: center;"></span>
                    <button onclick="changeMonthlyScheduleMonth(1)" class="btn-secondary" style="padding: 0.5rem 1rem;">다음 달 ▶</button>
                    <button class="btn btn-primary" onclick="printMonthlySchedule()" style="margin-left: 1rem;">
                        <i class="fas fa-print"></i> 인쇄
                    </button>
                </div>
            </div>
            
            <!-- 월간 스케줄 -->
            <div id="monthlyScheduleCalendar"></div>
        </div>
    `;
    
    // 초기 연월 설정
    const today = new Date();
    monthlyScheduleYear = today.getFullYear();
    monthlyScheduleMonth = today.getMonth();
    
    // 선생님 드롭다운 로드 (관리자만)
    if (!isTeacher) {
        await loadMonthlyTeacherDropdown();
    }
    
    // 월간 스케줄 로드
    await loadMonthlyScheduleCalendar();
}

// 이번달 스케줄표 페이지 (하위 호환성 유지)
window.showScheduleCurrentPage = async function() {
    const mainContent = document.getElementById('mainContent');
    
    // 스케줄 인쇄 CSS 추가
    let schedulePrintCSS = document.getElementById('schedulePrintCSS');
    if (!schedulePrintCSS) {
        schedulePrintCSS = document.createElement('link');
        schedulePrintCSS.id = 'schedulePrintCSS';
        schedulePrintCSS.rel = 'stylesheet';
        schedulePrintCSS.href = 'css/schedule-print.css?v=20260210012';
        document.head.appendChild(schedulePrintCSS);
    }
    
    // 일반 선생님인 경우 필터 숨김
    const isTeacher = Auth.isTeacher();
    const filterDisplay = isTeacher ? 'display: none;' : '';
    
    mainContent.innerHTML = `
        <div class="page-container" id="schedulePageContainer" style="max-width: 98%; margin: 0 auto;">
            <!-- 탭 메뉴 -->
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 2px solid #dee2e6;">
                <button id="weeklyScheduleTab" class="schedule-tab-btn active" onclick="switchScheduleTab('weekly')" style="padding: 0.75rem 1.5rem; border: none; background: none; font-size: 1rem; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s;">
                    주간 스케줄표
                </button>
                <button id="monthlyScheduleTab" class="schedule-tab-btn" onclick="switchScheduleTab('monthly')" style="padding: 0.75rem 1.5rem; border: none; background: none; font-size: 1rem; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s;">
                    월간 스케줄표
                </button>
            </div>
            
            <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div id="teacherCheckboxList" style="${filterDisplay} display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                    <!-- 체크박스 목록이 여기에 동적으로 추가됩니다 -->
                </div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <!-- 월간 스케줄 월 이동 버튼 -->
                    <div id="monthlyScheduleControls" style="display: none; align-items: center; gap: 1rem;">
                        <button onclick="changeMonthlyScheduleMonth(-1)" class="btn-secondary" style="padding: 0.5rem 1rem;">◀</button>
                        <span id="monthlyScheduleTitle" style="font-size: 1.1rem; font-weight: 600; min-width: 120px; text-align: center;"></span>
                        <button onclick="changeMonthlyScheduleMonth(1)" class="btn-secondary" style="padding: 0.5rem 1rem;">▶</button>
                    </div>
                    <button class="btn btn-primary" onclick="printScheduleTable()">
                        <i class="fas fa-print"></i> 인쇄
                    </button>
                </div>
            </div>
            
            <!-- 주간 스케줄 -->
            <div id="weeklyScheduleContainer" style="display: block;">
                <div id="weeklyScheduleTable" style="transform-origin: top left;"></div>
            </div>
            
            <!-- 월간 스케줄 -->
            <div id="monthlyScheduleContainer" style="display: none;">
                <div id="monthlyScheduleCalendar"></div>
            </div>
        </div>
    `;
    
    // 일반 선생님인 경우 필터 로드 안 함
    if (!Auth.isTeacher()) {
        await loadTeachersForCheckboxFilter();
    }
    
    // 초기 연월 설정
    const today = new Date();
    monthlyScheduleYear = today.getFullYear();
    monthlyScheduleMonth = today.getMonth();
    
    // 월별 출석 횟수 로드
    await loadMonthlyAttendanceCount();
    await loadWeeklySchedule();
    
    // 테이블 크기에 맞춰 자동 스케일 조정
    adjustTableScale();
}

// 탭 전환
window.switchScheduleTab = async function(tab) {
    currentScheduleTab = tab;
    
    // 탭 버튼 스타일 업데이트
    const weeklyTab = document.getElementById('weeklyScheduleTab');
    const monthlyTab = document.getElementById('monthlyScheduleTab');
    
    if (tab === 'weekly') {
        weeklyTab.classList.add('active');
        weeklyTab.style.color = '#FF6B35';
        weeklyTab.style.borderBottomColor = '#FF6B35';
        monthlyTab.classList.remove('active');
        monthlyTab.style.color = '#666';
        monthlyTab.style.borderBottomColor = 'transparent';
        
        // 컨테이너 표시/숨김
        document.getElementById('weeklyScheduleContainer').style.display = 'block';
        document.getElementById('monthlyScheduleContainer').style.display = 'none';
        document.getElementById('monthlyScheduleControls').style.display = 'none';
        
    } else if (tab === 'monthly') {
        monthlyTab.classList.add('active');
        monthlyTab.style.color = '#FF6B35';
        monthlyTab.style.borderBottomColor = '#FF6B35';
        weeklyTab.classList.remove('active');
        weeklyTab.style.color = '#666';
        weeklyTab.style.borderBottomColor = 'transparent';
        
        // 컨테이너 표시/숨김
        document.getElementById('weeklyScheduleContainer').style.display = 'none';
        document.getElementById('monthlyScheduleContainer').style.display = 'block';
        document.getElementById('monthlyScheduleControls').style.display = 'flex';
        
        // 월간 스케줄 로드
        await loadMonthlyScheduleCalendar();
    }
}

// 월간 스케줄 월 변경
window.changeMonthlyScheduleMonth = async function(direction) {
    monthlyScheduleMonth += direction;
    
    if (monthlyScheduleMonth < 0) {
        monthlyScheduleMonth = 11;
        monthlyScheduleYear--;
    } else if (monthlyScheduleMonth > 11) {
        monthlyScheduleMonth = 0;
        monthlyScheduleYear++;
    }
    
    await loadMonthlyScheduleCalendar();
}

// 월간 스케줄 선생님 드롭다운 로드
async function loadMonthlyTeacherDropdown() {
    try {
        const teachersResponse = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(teachersResponse) ? teachersResponse : (teachersResponse.data || []);
        
        // 재직 중인 선생님만
        const activeTeachers = allTeachers.filter(t => {
            const hasRole = t.role && (
                t.role === '관리자' || t.role === 'admin' || 
                t.role === '부관리자' || t.role === 'sub-admin' || 
                t.role === '선생님' || t.role === 'teacher'
            );
            const notResigned = !t.status || (t.status !== '퇴사' && t.status !== '퇴직');
            return hasRole && notResigned;
        });
        
        const selectElement = document.getElementById('monthlyTeacherSelect');
        if (!selectElement) return;
        
        // 옵션 추가
        activeTeachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacher.name;
            selectElement.appendChild(option);
        });
        
        console.log('[loadMonthlyTeacherDropdown] 선생님 드롭다운 로드 완료:', activeTeachers.length);
    } catch (error) {
        console.error('[loadMonthlyTeacherDropdown] 선생님 로드 실패:', error);
    }
}

// 월간 스케줄 선생님 변경
window.changeMonthlyTeacher = async function() {
    const selectElement = document.getElementById('monthlyTeacherSelect');
    if (!selectElement) return;
    
    monthlyScheduleTeacherFilter = selectElement.value;
    console.log('[changeMonthlyTeacher] 선생님 필터 변경:', monthlyScheduleTeacherFilter);
    
    // 월간 스케줄 다시 로드
    await loadMonthlyScheduleCalendar();
}

// 월간 스케줄 달력 로드
async function loadMonthlyScheduleCalendar() {
    const container = document.getElementById('monthlyScheduleCalendar');
    const titleElement = document.getElementById('monthlyScheduleTitle');
    
    if (!container || !titleElement) {
        console.error('[loadMonthlyScheduleCalendar] 컨테이너 또는 타이틀 요소를 찾을 수 없습니다.');
        return;
    }
    
    titleElement.textContent = `${monthlyScheduleYear}년 ${monthlyScheduleMonth + 1}월`;
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">로딩 중...</p>';
    
    try {
        console.log('[loadMonthlyScheduleCalendar] 데이터 로드 시작');
        
        // 학생 목록 로드
        const studentsResponse = await API.getList('students', { limit: 1000 });
        let allStudents = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        console.log('[loadMonthlyScheduleCalendar] 전체 학생 수:', allStudents.length);
        
        // 권한 필터링
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        console.log('[loadMonthlyScheduleCalendar] 권한 필터링 후 학생 수:', allStudents.length);
        
        // 재원생만
        const activeStudents = allStudents.filter(s => s.status === '재원');
        console.log('[loadMonthlyScheduleCalendar] 재원생 수:', activeStudents.length);
        
        // 학생 색상 할당
        assignStudentColors(activeStudents);
        console.log('[loadMonthlyScheduleCalendar] 학생 색상 할당 완료');
        
        // 해당 월의 출석 기록 로드
        const startDate = new Date(monthlyScheduleYear, monthlyScheduleMonth, 1);
        const endDate = new Date(monthlyScheduleYear, monthlyScheduleMonth + 1, 0);
        const startDateStr = `${monthlyScheduleYear}-${String(monthlyScheduleMonth + 1).padStart(2, '0')}-01`;
        const endDateStr = `${monthlyScheduleYear}-${String(monthlyScheduleMonth + 1).padStart(2, '0')}-${endDate.getDate()}`;
        
        const attendanceResponse = await API.getList('attendance', { limit: 10000 });
        const allAttendance = Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse.data || []);
        const monthAttendance = allAttendance.filter(r => r.date >= startDateStr && r.date <= endDateStr);
        console.log('[loadMonthlyScheduleCalendar] 출석 기록 수:', monthAttendance.length);
        
        // 보강/보충 통계
        const makeupCount = monthAttendance.filter(r => r.status === '보강').length;
        const supplementCount = monthAttendance.filter(r => r.status === '보충').length;
        const attendanceCount = monthAttendance.filter(r => r.status === '출석').length;
        const absenceCount = monthAttendance.filter(r => r.status === '결석').length;
        console.log(`[loadMonthlyScheduleCalendar] 출석 현황 - 출석: ${attendanceCount}, 보강: ${makeupCount}, 보충: ${supplementCount}, 결석: ${absenceCount}`);
        
        // 보강/보충 상세 로그
        if (makeupCount > 0) {
            console.log('[loadMonthlyScheduleCalendar] 보강 기록:', monthAttendance.filter(r => r.status === '보강').map(r => ({
                student: r.student_name,
                date: r.date,
                checkIn: r.check_in_time,
                checkOut: r.check_out_time
            })));
        }
        if (supplementCount > 0) {
            console.log('[loadMonthlyScheduleCalendar] 보충 기록:', monthAttendance.filter(r => r.status === '보충').map(r => ({
                student: r.student_name,
                date: r.date,
                checkIn: r.check_in_time,
                checkOut: r.check_out_time
            })));
        }
        
        // 일정 데이터 로드
        if (typeof window.loadSchoolEvents === 'function') {
            await window.loadSchoolEvents();
            console.log('[loadMonthlyScheduleCalendar] 일정 데이터 로드 완료');
        } else {
            console.warn('[loadMonthlyScheduleCalendar] loadSchoolEvents 함수를 찾을 수 없습니다');
        }
        
        // 달력 렌더링
        renderMonthlyScheduleCalendar(activeStudents, monthAttendance);
        console.log('[loadMonthlyScheduleCalendar] 달력 렌더링 완료');
        
    } catch (error) {
        console.error('[loadMonthlyScheduleCalendar] 월간 스케줄 로드 실패:', error);
        console.error('[loadMonthlyScheduleCalendar] 에러 스택:', error.stack);
        container.innerHTML = `<p style="text-align: center; color: #f44336; padding: 2rem;">데이터 로드에 실패했습니다.<br/>에러: ${error.message}</p>`;
    }
}

// 이름에서 성 제거 (마지막 2글자만)
function getShortName(fullName) {
    if (!fullName || fullName.length <= 2) return fullName;
    return fullName.slice(-2); // 마지막 2글자 (이름만)
}

// 월간 스케줄 달력 렌더링 (거대한 단일 테이블)
async function renderMonthlyScheduleCalendar(students, attendanceRecords) {
    console.log('[renderMonthlyScheduleCalendar] 렌더링 시작');
    console.log('[renderMonthlyScheduleCalendar] 학생 수:', students.length);
    console.log('[renderMonthlyScheduleCalendar] 출석 기록 수:', attendanceRecords.length);
    
    const container = document.getElementById('monthlyScheduleCalendar');
    if (!container) {
        console.error('[renderMonthlyScheduleCalendar] 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    // 선생님 목록 로드
    let teachers = [];
    try {
        const teachersResponse = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(teachersResponse) ? teachersResponse : (teachersResponse.data || []);
        
        // 재직 중인 선생님만
        teachers = allTeachers.filter(t => {
            const hasRole = t.role && (
                t.role === '관리자' || t.role === 'admin' || 
                t.role === '부관리자' || t.role === 'sub-admin' || 
                t.role === '선생님' || t.role === 'teacher'
            );
            const notResigned = !t.status || (t.status !== '퇴사' && t.status !== '퇴직');
            return hasRole && notResigned;
        });
        
        // 선생님 로그인 시 본인 것만 표시
        if (Auth.isTeacher()) {
            const currentUser = Auth.getCurrentUser();
            teachers = teachers.filter(t => t.id === currentUser.id);
            console.log('[renderMonthlyScheduleCalendar] 선생님 로그인 - 본인만 표시:', teachers.length);
        } else if (monthlyScheduleTeacherFilter !== 'all') {
            // 관리자가 드롭다운에서 특정 선생님 선택
            teachers = teachers.filter(t => t.id === monthlyScheduleTeacherFilter);
            console.log('[renderMonthlyScheduleCalendar] 드롭다운 필터링 - 선생님:', teachers.length);
        }
        
        console.log('[renderMonthlyScheduleCalendar] 선생님 수:', teachers.length);
    } catch (error) {
        console.error('[renderMonthlyScheduleCalendar] 선생님 로드 실패:', error);
    }
    
    const firstDay = new Date(monthlyScheduleYear, monthlyScheduleMonth, 1);
    const lastDay = new Date(monthlyScheduleYear, monthlyScheduleMonth + 1, 0);
    
    // 월요일부터 시작하도록 조정
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    startDayOfWeek -= 1;
    
    let html = '';
    
    // 선생님별로 거대한 테이블 생성
    teachers.forEach((teacher, teacherIndex) => {
        const teacherStudents = students.filter(s => s.teacher_id === teacher.id);
        if (teacherStudents.length === 0) return;
        
        console.log(`[renderMonthlyScheduleCalendar] ${teacher.name} 선생님 학생 수:`, teacherStudents.length);
        
        // 선생님 구분 (년월 + 선생님 이름 표시)
        const yearMonthText = `${monthlyScheduleYear}년 ${monthlyScheduleMonth + 1}월`;
        const teacherNameText = teachers.length > 1 ? ` - <span class="teacher-name-print-hide">${teacher.name} 선생님</span>` : '';
        html += `<div style="margin-bottom: 2rem; ${teacherIndex > 0 ? 'margin-top: 3rem; padding-top: 2rem; border-top: 4px solid #FF6B35;' : ''}">`;
        html += `<h3 style="margin: 0 0 1rem 0; padding: 0.5rem; background: #f8f9fa; border-left: 4px solid #FF6B35; font-size: 1.1rem;">${yearMonthText}${teacherNameText}</h3>`;
        
        // 해당 월의 모든 날짜 수집 (주차별로 그룹핑)
        const weekGroups = []; // 각 주차별 날짜 배열 [{ monday: {...}, tuesday: {...}, ... }]
        let currentWeek = { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null };
        let currentDate = 1;
        
        // 첫 번째 날짜부터 시작
        let startDate = new Date(monthlyScheduleYear, monthlyScheduleMonth, 1);
        let startDayOfWeek = startDate.getDay(); // 0=일, 1=월, ..., 6=토
        
        // 첫 번째 주의 시작을 월요일로 맞추기
        if (startDayOfWeek === 0) { // 일요일인 경우
            currentDate = 2; // 다음 월요일부터 시작
        } else if (startDayOfWeek >= 2) { // 화요일 이후인 경우
            currentDate = 9 - startDayOfWeek; // 다음 월요일로 이동
        }
        
        while (currentDate <= lastDay.getDate()) {
            let actualDate = new Date(monthlyScheduleYear, monthlyScheduleMonth, currentDate);
            let actualDayOfWeek = actualDate.getDay();
            
            // 월요일이 시작이면 새로운 주 시작
            if (actualDayOfWeek === 1 && (currentWeek.monday || currentWeek.tuesday || currentWeek.wednesday || currentWeek.thursday || currentWeek.friday || currentWeek.saturday)) {
                weekGroups.push({...currentWeek});
                currentWeek = { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null };
            }
            
            // 일요일 제외
            if (actualDayOfWeek !== 0) {
                const dateString = `${monthlyScheduleYear}-${String(monthlyScheduleMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
                const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const dayKey = dayKeys[actualDayOfWeek];
                
                currentWeek[dayKey] = {
                    date: currentDate,
                    dateString: dateString,
                    dayOfWeek: actualDayOfWeek,
                    dayName: ['일', '월', '화', '수', '목', '금', '토'][actualDayOfWeek]
                };
            }
            
            currentDate++;
        }
        
        // 마지막 주 추가
        if (currentWeek.monday || currentWeek.tuesday || currentWeek.wednesday || currentWeek.thursday || currentWeek.friday || currentWeek.saturday) {
            weekGroups.push(currentWeek);
        }
        
        console.log(`[renderMonthlyScheduleCalendar] 주차별 날짜:`, weekGroups);
        
        // ========================================
        // 핵심 로직: 날짜별 스케줄 데이터 구성
        // ========================================
        
        // 시간 중복 체크 함수 (먼저 정의)
        function hasTimeOverlap(column, newItem) {
            const newStart = timeToMinutes(newItem.checkIn);
            const newEnd = timeToMinutes(newItem.checkOut);
            
            for (const item of column) {
                const start = timeToMinutes(item.checkIn);
                const end = timeToMinutes(item.checkOut);
                if (!(newEnd <= start || newStart >= end)) {
                    return true; // 중복
                }
            }
            return false;
        }
        
        function timeToMinutes(time) {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        }
        
        // 오늘 날짜
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        console.log('[renderMonthlyScheduleCalendar] 오늘:', todayString);
        
        // 주간 스케줄 빌드 (buildScheduleData 활용)
        const weeklyScheduleResult = buildScheduleData(teacherStudents);
        const weeklySchedule = weeklyScheduleResult.scheduleData;
        
        // 날짜별 스케줄 데이터
        const dateScheduleData = {}; // { 'dateString': { columns: [[...], [...], [...], [...]] } }
        const dayKeysForSchedule = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        weekGroups.forEach((week) => {
            dayKeysForSchedule.forEach(dayKey => {
                const dateInfo = week[dayKey];
                if (!dateInfo) return;
                
                const dateString = dateInfo.dateString;
                const isToday = dateString === todayString;
                const isPast = dateString < todayString;
                
                console.log(`[${dateString}] ${isToday ? '당일' : isPast ? '과거' : '미래'}, 출석 기록 수:`, attendanceRecords.filter(r => r.date === dateString).length);
                
                let columns = [[], [], [], []]; // 기본 4열
                
                if (isToday) {
                    // ===== 당일: 주간 스케줄 전체 표시 + 보충 스케줄만 추가 =====
                    
                    // 1) 주간 스케줄을 평탄화 (모든 학생을 배열로)
                    const weeklyDay = weeklySchedule[dayKey];
                    let allItems = [];
                    
                    if (weeklyDay && weeklyDay.columns) {
                        weeklyDay.columns.forEach(col => {
                            col.forEach(item => allItems.push({...item}));
                        });
                    }
                    
                    // 2) 출석 기록에서 보충만 추가
                    const teacherStudentIds = teacherStudents.map(s => s.id);
                    const records = attendanceRecords.filter(r => 
                        r.date === dateString && teacherStudentIds.includes(r.student_id)
                    );
                    
                    console.log(`  [당일] 주간 스케줄 ${allItems.length}명:`, allItems.map(item => item.student.name));
                    console.log(`  [당일] 출석 기록 ${records.length}개:`, records.map(r => `${r.student_name}(${r.status})`));
                    
                    // 3) 보강/보충 스케줄 추가 (결석 제외)
                    records.forEach(record => {
                        // 보강 또는 보충만 추가
                        if ((record.status !== '보강' && record.status !== '보충') || !record.check_in_time || !record.check_out_time) {
                            return;
                        }
                        
                        const student = teacherStudents.find(s => s.id === record.student_id);
                        if (student) {
                            allItems.push({
                                student: student,
                                checkIn: record.check_in_time,
                                checkOut: record.check_out_time,
                                status: record.status
                            });
                            console.log(`  ➕ [당일] ${student.name} ${record.status} 추가: ${record.check_in_time}-${record.check_out_time}`);
                        }
                    });
                    
                    console.log(`  [당일] 최종 표시할 학생 ${allItems.length}명:`, allItems.map(item => item.student.name));
                    
                    // 4) 시작 시간 순으로 정렬
                    allItems.sort((a, b) => timeToMinutes(a.checkIn) - timeToMinutes(b.checkIn));
                    
                    // 5) 열에 배치
                    allItems.forEach(item => {
                        let placed = false;
                        for (let col = 0; col < 4; col++) {
                            if (!hasTimeOverlap(columns[col], item)) {
                                columns[col].push(item);
                                placed = true;
                                item.overflow = false;
                                console.log(`  ✅ [당일] ${item.student.name} → 열${col} (${item.checkIn}-${item.checkOut})`);
                                break;
                            }
                        }
                        
                        if (!placed) {
                            const colCounts = columns.map(col => col.length);
                            const minCol = colCounts.indexOf(Math.min(...colCounts));
                            columns[minCol].push(item);
                            item.overflow = true;
                            console.log(`  ⚠️ [당일] ${item.student.name} → 열${minCol} (${item.checkIn}-${item.checkOut}) [4열 초과]`);
                        }
                    });
                    
                    console.log(`  [당일] 📊 처리 완료: ${allItems.length}명`);
                    console.log(`  [당일] 📊 최종 열 구성:`, columns.map((col, i) => `열${i}(${col.length}명)`).join(', '));
                    
                } else if (isPast) {
                    // ===== 과거: 주간 스케줄 기본 + 출석 기록에서 빠진 스케줄 추가 =====
                    
                    // 1) 주간 스케줄을 평탄화 (모든 학생을 배열로)
                    const weeklyDay = weeklySchedule[dayKey];
                    let allItems = [];
                    
                    if (weeklyDay && weeklyDay.columns) {
                        weeklyDay.columns.forEach(col => {
                            col.forEach(item => allItems.push({...item}));
                        });
                    }
                    
                    // 2) 출석 기록 확인
                    const teacherStudentIds = teacherStudents.map(s => s.id);
                    const records = attendanceRecords.filter(r => 
                        r.date === dateString && teacherStudentIds.includes(r.student_id)
                    );
                    
                    console.log(`  [과거] 주간 스케줄 ${allItems.length}명:`, allItems.map(item => item.student.name));
                    console.log(`  [과거] 출석 기록 ${records.length}개:`, records.map(r => `${r.student_name}(${r.status})`));
                    
                    // 3) 출석 기록이 있는 학생만 필터링
                    const attendedStudentIds = new Set(
                        records
                            .filter(r => r.status !== '결석')
                            .map(r => r.student_id)
                    );
                    
                    console.log(`  [과거] 출석한 학생 ID:`, Array.from(attendedStudentIds));
                    
                    // 주간 스케줄에서 출석한 학생만 남기기
                    const beforeFilter = allItems.length;
                    allItems = allItems.filter(item => attendedStudentIds.has(item.student.id));
                    console.log(`  [과거] 필터링 후: ${beforeFilter}명 → ${allItems.length}명`);
                    
                    // 4) 출석 기록에는 있는데 주간 스케줄에 없는 학생 추가 (보강/보충 포함)
                    records.forEach(record => {
                        if (record.status === '결석' || !record.check_in_time || !record.check_out_time) {
                            return;
                        }
                        
                        // 보강/보충은 무조건 추가
                        if (record.status === '보강' || record.status === '보충') {
                            const student = teacherStudents.find(s => s.id === record.student_id);
                            if (student) {
                                allItems.push({
                                    student: student,
                                    checkIn: record.check_in_time,
                                    checkOut: record.check_out_time,
                                    status: record.status
                                });
                                console.log(`  ➕ [과거] ${student.name} 보강/보충 추가: ${record.check_in_time}-${record.check_out_time} [${record.status}]`);
                            }
                            return;
                        }
                        
                        // 일반 출석은 주간 스케줄에 없을 때만 추가
                        const alreadyExists = allItems.some(item => item.student.id === record.student_id);
                        if (!alreadyExists) {
                            const student = teacherStudents.find(s => s.id === record.student_id);
                            if (student) {
                                allItems.push({
                                    student: student,
                                    checkIn: record.check_in_time,
                                    checkOut: record.check_out_time,
                                    status: record.status
                                });
                                console.log(`  ➕ [과거] ${student.name} 추가 (주간 스케줄에 없음): ${record.check_in_time}-${record.check_out_time}`);
                            }
                        }
                    });
                    
                    console.log(`  [과거] 최종 표시할 학생 ${allItems.length}명:`, allItems.map(item => item.student.name));
                    
                    // 6) 시작 시간 순으로 정렬
                    allItems.sort((a, b) => timeToMinutes(a.checkIn) - timeToMinutes(b.checkIn));
                    
                    // 6) 🎯 Greedy Column Packing: 한 열에 최대한 많은 스케줄 채우기
                    allItems.forEach(item => {
                        // 열0부터 순서대로 시도 (한 열을 최대한 채우기)
                        let placed = false;
                        for (let col = 0; col < 4; col++) {
                            if (!hasTimeOverlap(columns[col], item)) {
                                columns[col].push(item);
                                placed = true;
                                item.overflow = false; // 정상 배치
                                console.log(`  ✅ [과거] ${item.student.name} → 열${col} (${item.checkIn}-${item.checkOut})`);
                                break;
                            }
                        }
                        
                        if (!placed) {
                            // 4열에 정말 안 들어가면 가장 적게 찬 열에 강제 배치
                            const colCounts = columns.map(col => col.length);
                            const minCol = colCounts.indexOf(Math.min(...colCounts));
                            columns[minCol].push(item);
                            item.overflow = true; // 4열 초과 표시
                            console.log(`  ⚠️ [과거] ${item.student.name} → 열${minCol} (${item.checkIn}-${item.checkOut}) [4열 초과]`);
                        }
                    });
                    
                    console.log(`  [과거] 📊 처리 완료: ${allItems.length}명`);
                    console.log(`  [과거] 📊 최종 열 구성:`, columns.map((col, i) => `열${i}(${col.length}명)`).join(', '));
                } else {
                    // ===== 미래: 주간 스케줄 + 출석 기록 반영 =====
                    
                    // 1) 주간 스케줄을 평탄화 (모든 학생을 배열로)
                    const weeklyDay = weeklySchedule[dayKey];
                    let allItems = [];
                    
                    if (weeklyDay && weeklyDay.columns) {
                        weeklyDay.columns.forEach(col => {
                            col.forEach(item => allItems.push({...item}));
                        });
                    }
                    
                    // 2) 출석 기록 반영 (결석 제거, 보강/보충 추가)
                    const records = attendanceRecords.filter(r => r.date === dateString);
                    const teacherStudentIds = teacherStudents.map(s => s.id);
                    
                    console.log(`  [미래] 주간 스케줄 ${allItems.length}명:`, allItems.map(item => item.student.name));
                    console.log(`  [미래] 출석 기록 ${records.length}개:`, records.map(r => `${r.student_name}(${r.status})`));
                    
                    records.forEach(record => {
                        if (!teacherStudentIds.includes(record.student_id)) {
                            console.log(`  ⏭️ [미래] ${record.student_name}: 다른 선생님 학생`);
                            return;
                        }
                        
                        const student = teacherStudents.find(s => s.id === record.student_id);
                        if (!student) {
                            console.log(`  ⚠️ [미래] ${record.student_name}: 학생 정보 없음`);
                            return;
                        }
                        
                        if (record.status === '결석') {
                            // 결석: 제거
                            console.log(`  ❌ [미래] ${student.name}: 결석 제거`);
                            allItems = allItems.filter(item => item.student.id !== student.id);
                        } else if (record.status === '보강' || record.status === '보충') {
                            // 보강/보충: 시간이 있으면 추가
                            if (record.check_in_time && record.check_out_time) {
                                console.log(`  ➕ [미래] ${student.name}: ${record.status} 추가 (${record.check_in_time}-${record.check_out_time})`);
                                allItems.push({
                                    student: student,
                                    checkIn: record.check_in_time,
                                    checkOut: record.check_out_time,
                                    status: record.status
                                });
                            } else {
                                console.log(`  ⚠️ [미래] ${student.name}: ${record.status} 시간 없음 (입실: ${record.check_in_time}, 퇴실: ${record.check_out_time})`);
                            }
                        } else if (record.status === '출석' && record.check_in_time && record.check_out_time) {
                            // 출석 기록에는 있는데 주간 스케줄에 없는 학생 추가
                            const alreadyExists = allItems.some(item => item.student.id === student.id);
                            if (!alreadyExists) {
                                console.log(`  ➕ [미래] ${student.name}: 추가 (주간 스케줄에 없음) ${record.check_in_time}-${record.check_out_time}`);
                                allItems.push({
                                    student: student,
                                    checkIn: record.check_in_time,
                                    checkOut: record.check_out_time,
                                    status: record.status
                                });
                            }
                        }
                    });
                    
                    console.log(`  [미래] 최종 표시할 학생 ${allItems.length}명:`, allItems.map(item => item.student.name));
                    
                    // 3) 시작 시간 순으로 정렬
                    allItems.sort((a, b) => timeToMinutes(a.checkIn) - timeToMinutes(b.checkIn));
                    
                    // 4) 🎯 Greedy Column Packing: 한 열에 최대한 많은 스케줄 채우기
                    allItems.forEach(item => {
                        // 열0부터 순서대로 시도 (한 열을 최대한 채우기)
                        let placed = false;
                        for (let col = 0; col < 4; col++) {
                            if (!hasTimeOverlap(columns[col], item)) {
                                columns[col].push(item);
                                placed = true;
                                item.overflow = false; // 정상 배치
                                console.log(`  ✅ [미래] ${item.student.name} → 열${col} (${item.checkIn}-${item.checkOut})`);
                                break;
                            }
                        }
                        
                        if (!placed) {
                            // 4열에 정말 안 들어가면 가장 적게 찬 열에 강제 배치
                            const colCounts = columns.map(col => col.length);
                            const minCol = colCounts.indexOf(Math.min(...colCounts));
                            columns[minCol].push(item);
                            item.overflow = true; // 4열 초과 표시
                            console.log(`  ⚠️ [미래] ${item.student.name} → 열${minCol} (${item.checkIn}-${item.checkOut}) [4열 초과]`);
                        }
                    });
                    
                    console.log(`  [미래] 📊 처리 완료: ${allItems.length}명`);
                    console.log(`  [미래] 📊 최종 열 구성:`, columns.map((col, i) => `열${i}(${col.length}명)`).join(', '));
                }
                
                // 최소 4열 보장
                while (columns.length < 4) columns.push([]);
                
                dateScheduleData[dateString] = { columns };
            });
        });
        
        console.log('[renderMonthlyScheduleCalendar] 날짜별 스케줄:', dateScheduleData);
        
        // 전역 변수에 저장 (출석현황에서 사용)
        globalDateScheduleData = dateScheduleData;
        
        // ========================================
        
        // 토요일에 스케줄이 있는지 확인
        let hasSaturdaySchedule = false;
        teacherStudents.forEach(student => {
            let schedule = student.schedule;
            if (typeof schedule === 'string') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (e) {
                    schedule = null;
                }
            }
            if (schedule && schedule.saturday && schedule.saturday.enabled) {
                hasSaturdaySchedule = true;
            }
        });
        
        console.log(`[renderMonthlyScheduleCalendar] 토요일 스케줄 존재:`, hasSaturdaySchedule);
        
        // 시간대 목록 (13:30 ~ 19:30, 30분 단위) - 총 13개 시간대
        const timeSlots = [];
        timeSlots.push('13:30');
        for (let hour = 14; hour <= 19; hour++) {
            timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
            if (hour < 19) {
                timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
            }
        }
        timeSlots.push('19:30');
        
        console.log(`[renderMonthlyScheduleCalendar] 시간대 개수:`, timeSlots.length);
        console.log(`[renderMonthlyScheduleCalendar] 주차 수:`, weekGroups.length);
        
        // 요일 배열 (토요일은 조건부)
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (hasSaturdaySchedule) {
            dayKeys.push('saturday');
        }
        const dayNames = { monday: '월', tuesday: '화', wednesday: '수', thursday: '목', friday: '금', saturday: '토' };
        
        // 거대한 테이블 생성 (동적 열)
        html += '<div style="overflow-x: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 0.6rem;">';
        
        // colgroup으로 열 너비 설정 (요일별 4열 고정)
        html += '<colgroup>';
        html += '<col style="width: 60px;">'; // 시간 열
        dayKeys.forEach(dayKey => {
            // 각 요일당 4개 열 고정
            for (let i = 0; i < 4; i++) {
                html += '<col style="width: 45px;">'; // 학생 열 너비
            }
        });
        html += '</colgroup>';
        
        // 1행: 요일 헤더 (고정 4열)
        html += '<thead>';
        html += '<tr>';
        html += '<th style="border: 1px solid #ccc; padding: 0.3rem; background: #f8f9fa; color: #333; font-weight: 700; text-align: center;">시간</th>';
        
        dayKeys.forEach(dayKey => {
            html += `<th colspan="4" style="border: 1px solid #ccc; padding: 0.3rem; background: #f8f9fa; color: #333; font-weight: 600; text-align: center; font-size: 0.7rem;">${dayNames[dayKey]}</th>`;
        });
        html += '</tr>';
        
        // 2행: 날짜 행 추가 (고정 4열)
        html += '<tr>';
        html += '<th style="border: 1px solid #ccc; padding: 0.3rem; background: #e9ecef; color: #333; font-weight: 700; text-align: center;">날짜</th>';
        
        dayKeys.forEach(dayKey => {
            const dateInfo = weekGroups[0] ? weekGroups[0][dayKey] : null; // 첫 주의 날짜 정보
            const dateText = dateInfo ? dateInfo.date : '-';
            
            // 해당 날짜의 일정 가져오기
            let eventHTML = '';
            let bgColor = '#e9ecef';
            if (dateInfo && typeof window.getEventsForDate === 'function') {
                const events = window.getEventsForDate(dateInfo.dateString);
                if (events && events.length > 0) {
                    const event = events[0]; // 첫 번째 일정만 표시
                    const eventColor = EVENT_COLORS[event.background_color] || EVENT_COLORS.red;
                    bgColor = eventColor.color;
                    eventHTML = `<div style="font-weight: 700; margin-bottom: 0.2rem;" onclick="openEventModal('${event.id}')">${event.title}</div>`;
                    eventHTML += `<div style="font-size: 0.55rem; color: #666;">(${event.start_date.slice(5)}~${event.end_date.slice(5)})</div>`;
                }
            }
            
            html += `<th colspan="4" style="border: 1px solid #ccc; padding: 0.3rem; background: ${bgColor}; color: #333; font-weight: 600; text-align: center; font-size: 0.65rem; cursor: ${eventHTML ? 'pointer' : 'default'};">${dateText}${eventHTML ? '<br/>' + eventHTML : ''}</th>`;
        });
        
        html += '</tr></thead><tbody>';
        
        // 각 주차별로 반복
        weekGroups.forEach((week, weekIndex) => {
            console.log(`[renderMonthlyScheduleCalendar] ${weekIndex + 1}주차 렌더링`);
            
            // 주차 구분: 날짜 행 추가
            if (weekIndex > 0) {
                html += '<tr>';
                html += '<th style="border: 1px solid #ccc; padding: 0.3rem; background: #e9ecef; color: #333; font-weight: 700; text-align: center;">날짜</th>';
                
                dayKeys.forEach(dayKey => {
                    const dateInfo = week[dayKey];
                    const dateText = dateInfo ? dateInfo.date : '-';
                    
                    // 해당 날짜의 일정 가져오기
                    let eventHTML = '';
                    let bgColor = '#e9ecef';
                    if (dateInfo && typeof window.getEventsForDate === 'function') {
                        const events = window.getEventsForDate(dateInfo.dateString);
                        if (events && events.length > 0) {
                            const event = events[0]; // 첫 번째 일정만 표시
                            const eventColor = EVENT_COLORS[event.background_color] || EVENT_COLORS.red;
                            bgColor = eventColor.color;
                            eventHTML = `<div style="font-weight: 700; margin-bottom: 0.2rem;" onclick="openEventModal('${event.id}')">${event.title}</div>`;
                            eventHTML += `<div style="font-size: 0.55rem; color: #666;">(${event.start_date.slice(5)}~${event.end_date.slice(5)})</div>`;
                        }
                    }
                    
                    html += `<th colspan="4" style="border: 1px solid #ccc; padding: 0.3rem; background: ${bgColor}; color: #333; font-weight: 600; text-align: center; font-size: 0.65rem; cursor: ${eventHTML ? 'pointer' : 'default'};">${dateText}${eventHTML ? '<br/>' + eventHTML : ''}</th>`;
                });
                
                html += '</tr>';
            }
            
            // renderedCells: rowspan 추적
            const renderedCells = {};
            
            // 각 시간대별 행 (총 13개 시간대)
            timeSlots.forEach((time, timeIndex) => {
                const weekSeparatorStyle = '';
                
                html += `<tr style="${weekSeparatorStyle}">`;
                html += `<td style="border: 1px solid #ccc; padding: 0.3rem; text-align: center; font-weight: 700; background: #f8f9fa; vertical-align: middle; font-size: 0.65rem; ${weekSeparatorStyle}">${time}</td>`;
                
                // 각 요일별로 4열씩
                dayKeys.forEach((dayKey, dayIndex) => {
                    const dateInfo = week[dayKey];
                    const dayBorderStyle = dayIndex > 0 ? 'border-left: 1px solid #ccc;' : '';
                    
                    if (!dateInfo) {
                        // 해당 월이 아닌 날: 연한 회색
                        for (let col = 0; col < 4; col++) {
                            const firstColBorder = col === 0 ? dayBorderStyle : '';
                            html += `<td style="border: 1px solid #dee2e6; padding: 0.2rem; background: #f0f0f0; vertical-align: middle; ${weekSeparatorStyle} ${firstColBorder}"></td>`;
                        }
                        return;
                    }
                    
                    const dateString = dateInfo.dateString;
                    const dateData = dateScheduleData[dateString];
                    const columns = dateData ? dateData.columns : [[], [], [], []];
                    
                    // 모든 열이 비어있으면 연한 회색
                    const isEmpty = columns.every(col => col.length === 0);
                    const bgColor = isEmpty ? '#f0f0f0' : '#fff';
                    
                    // 🎯 무조건 4열만 출력
                    for (let col = 0; col < 4; col++) {
                        const cellKey = `${weekIndex}-${dayIndex}-${col}-${timeIndex}`;
                        
                        if (renderedCells[cellKey]) continue;
                        
                        const firstColBorder = col === 0 ? dayBorderStyle : '';
                        
                        // 이 시간에 시작하는 학생 찾기
                        const item = columns[col] ? columns[col].find(s => s.checkIn === time) : null;
                        
                        if (item) {
                            const shortName = getShortName(item.student.name);
                            const color = getStudentColor(item.student.id);
                            
                            // rowspan 계산
                            const checkInIdx = timeSlots.indexOf(item.checkIn);
                            const checkOutIdx = timeSlots.indexOf(item.checkOut);
                            const slots = (checkInIdx >= 0 && checkOutIdx > checkInIdx) ? (checkOutIdx - checkInIdx) : 1;
                            
                            // 렌더링된 셀 표시
                            for (let s = 0; s < slots; s++) {
                                renderedCells[`${weekIndex}-${dayIndex}-${col}-${timeIndex + s}`] = true;
                            }
                            
                            // 상태별 색상
                            let textColor = '#000';
                            if (item.status === '보강') textColor = '#f44336';
                            else if (item.status === '보충') textColor = '#9C27B0';
                            
                            const isHighlighted = highlightedScheduleStudentId === item.student.id;
                            const borderStyle = isHighlighted ? 'border: 3px solid #FF6B35 !important;' : '';
                            
                            // ✅ 추가 스케줄(보강/보충)이면서 30분/60분인 경우만 이름만 표시
                            const isShortSchedule = slots <= 2; // 1칸(30분) 또는 2칸(60분)
                            const isExtraSchedule = item.status === '보강' || item.status === '보충'; // 추가 스케줄 여부
                            
                            if (isShortSchedule && isExtraSchedule) {
                                // 추가 스케줄 + 짧은 시간: 이름만 표시
                                html += `<td rowspan="${slots}" class="monthly-student-cell" data-student-id="${item.student.id}" style="border: 1px solid #dee2e6; padding: 0.3rem; background: ${color}; vertical-align: middle; text-align: center; ${weekSeparatorStyle} ${firstColBorder} ${borderStyle} cursor: pointer;" onclick="toggleHighlightMonthlyStudent('${item.student.id}', event)">
                                    <div class="student-name" style="font-size: 0.91rem; font-weight: 600; color: ${textColor};">${shortName}</div>
                                </td>`;
                            } else {
                                // 주간 스케줄 또는 긴 시간 스케줄: 이름 + 시간 표시
                                html += `<td rowspan="${slots}" class="monthly-student-cell" data-student-id="${item.student.id}" style="border: 1px solid #dee2e6; padding: 0.2rem; background: ${color}; vertical-align: top; text-align: center; ${weekSeparatorStyle} ${firstColBorder} ${borderStyle} cursor: pointer;" onclick="toggleHighlightMonthlyStudent('${item.student.id}', event)">
                                    <div class="student-name" style="font-size: 0.91rem; font-weight: 600; color: ${textColor}; margin-bottom: 0;">${shortName}</div>
                                    <div class="student-time" style="font-size: 0.7rem; font-weight: normal; color: #888; line-height: 1.0;">
                                        <div>${item.checkIn}</div>
                                        <div>${item.checkOut}</div>
                                    </div>
                                </td>`;
                            }
                        } else {
                            // 빈 셀
                            html += `<td style="border: 1px solid #dee2e6; padding: 0.2rem; background: ${bgColor}; vertical-align: middle; ${weekSeparatorStyle} ${firstColBorder}"></td>`;
                        }
                    }
                });
                
                html += '</tr>';
            });
        });
        
        html += '</tbody></table>';
        html += '</div>'; // overflow-x wrapper
        html += '</div>'; // 선생님 달력 끝
    });
    
    if (html === '') {
        html = '<p style="text-align: center; color: #999; padding: 2rem;">표시할 스케줄이 없습니다.</p>';
    }
    
    container.innerHTML = html;
}

// 테이블 스케일 자동 조정
function adjustTableScale() {
    const container = document.getElementById('weeklyScheduleTable');
    if (!container) return;
    
    const table = container.querySelector('table');
    if (!table) return;
    
    const containerWidth = container.parentElement.offsetWidth;
    const tableWidth = table.offsetWidth;
    
    if (tableWidth > containerWidth) {
        const scale = containerWidth / tableWidth; // 100%로 꽉 채우기
        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'top left';
        container.style.marginBottom = `${(table.offsetHeight * scale - table.offsetHeight) + 20}px`;
    } else {
        // 테이블이 컨테이너보다 작으면 100% 채우기
        container.style.transform = 'scale(1)';
        container.style.width = '100%';
    }
}

// 선생님 체크박스 목록 로드 (새로운 방식)
async function loadTeachersForCheckboxFilter() {
    try {
        const result = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(result) ? result : (result.data || []);
        
        // status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
        const teachers = allTeachers.filter(t => {
            const status = t.status || '재직';
            return status === '재직' || status === '재직중';
        });
        
        console.log('[loadTeachersForCheckboxFilter] 재직 선생님:', teachers.map(t => `${t.name}(${t.status || '재직'})`));
        
        const checkboxContainer = document.getElementById('teacherCheckboxList');
        if (!checkboxContainer) return;
        
        // 선생님을 3개 그룹으로 분류
        const teachersWithDash = teachers.filter(t => t.name.includes('-')); // 이름에 "-"가 있는 선생님
        const teachersWithoutDash = teachers.filter(t => !t.name.includes('-')); // 나머지 선생님
        
        // 전체 선택 체크박스 HTML
        const selectAllHtml = `
            <label style="display: flex; align-items: center; gap: 0.3rem; cursor: pointer; white-space: nowrap; font-weight: 600;">
                <input type="checkbox" 
                       id="selectAllTeachers" 
                       checked
                       onchange="toggleAllTeachers()"
                       style="cursor: pointer; width: 18px; height: 18px;">
                <span style="font-size: 1rem;">전체 선택</span>
            </label>
        `;
        
        // 2번째 줄 전체 선택 체크박스
        const selectAllNormalHtml = `
            <label style="display: flex; align-items: center; gap: 0.3rem; cursor: pointer; white-space: nowrap; font-weight: 600;">
                <input type="checkbox" 
                       id="selectAllNormalTeachers" 
                       checked
                       onchange="toggleNormalTeachers()"
                       style="cursor: pointer; width: 18px; height: 18px;">
                <span style="font-size: 1rem;">전체</span>
            </label>
        `;
        
        // 3번째 줄 전체 선택 체크박스
        const selectAllDashHtml = `
            <label style="display: flex; align-items: center; gap: 0.3rem; cursor: pointer; white-space: nowrap; font-weight: 600;">
                <input type="checkbox" 
                       id="selectAllDashTeachers" 
                       checked
                       onchange="toggleDashTeachers()"
                       style="cursor: pointer; width: 18px; height: 18px;">
                <span style="font-size: 1rem;">전체</span>
            </label>
        `;
        
        // 일반 선생님 체크박스 생성
        const normalTeachersHtml = teachersWithoutDash.map(teacher => `
            <label style="display: flex; align-items: center; gap: 0.3rem; cursor: pointer; white-space: nowrap;">
                <input type="checkbox" 
                       class="teacher-checkbox normal-teacher-checkbox" 
                       value="${teacher.id}" 
                       checked
                       onchange="filterByTeacherCheckbox()"
                       style="cursor: pointer; width: 16px; height: 16px;">
                <span style="font-size: 0.95rem;">${teacher.name}</span>
            </label>
        `).join('');
        
        // "-"가 있는 선생님 체크박스 생성
        const dashTeachersHtml = teachersWithDash.map(teacher => `
            <label style="display: flex; align-items: center; gap: 0.3rem; cursor: pointer; white-space: nowrap;">
                <input type="checkbox" 
                       class="teacher-checkbox dash-teacher-checkbox" 
                       value="${teacher.id}" 
                       checked
                       onchange="filterByTeacherCheckbox()"
                       style="cursor: pointer; width: 16px; height: 16px;">
                <span style="font-size: 0.95rem;">${teacher.name}</span>
            </label>
        `).join('');
        
        // 3줄 구조로 렌더링
        checkboxContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                <!-- 첫 번째 줄: 전체 선택 -->
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; padding-bottom: 0.3rem; border-bottom: 1px solid #e0e0e0;">
                    ${selectAllHtml}
                </div>
                
                <!-- 두 번째 줄: 일반 선생님 전체 선택 + 일반 선생님 -->
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                    ${selectAllNormalHtml}
                    ${normalTeachersHtml}
                </div>
                
                <!-- 세 번째 줄: "-"가 있는 선생님 전체 선택 + "-"가 있는 선생님 -->
                ${teachersWithDash.length > 0 ? `
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; padding-top: 0.3rem; border-top: 1px solid #e0e0e0;">
                        ${selectAllDashHtml}
                        ${dashTeachersHtml}
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('선생님 목록 로드 실패:', error);
    }
}

// 전체 선택/해제 토글
window.toggleAllTeachers = function() {
    const selectAllCheckbox = document.getElementById('selectAllTeachers');
    const teacherCheckboxes = document.querySelectorAll('.teacher-checkbox');
    
    teacherCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    // 2번째 줄, 3번째 줄 전체 선택도 업데이트
    const selectAllNormal = document.getElementById('selectAllNormalTeachers');
    const selectAllDash = document.getElementById('selectAllDashTeachers');
    if (selectAllNormal) selectAllNormal.checked = selectAllCheckbox.checked;
    if (selectAllDash) selectAllDash.checked = selectAllCheckbox.checked;
    
    filterByTeacherCheckbox();
}

// 2번째 줄 (일반 선생님) 전체 선택/해제 토글
window.toggleNormalTeachers = function() {
    const selectAllNormalCheckbox = document.getElementById('selectAllNormalTeachers');
    const normalCheckboxes = document.querySelectorAll('.normal-teacher-checkbox');
    
    normalCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllNormalCheckbox.checked;
    });
    
    updateSelectAllCheckbox();
    filterByTeacherCheckbox();
}

// 3번째 줄 ("-"가 있는 선생님) 전체 선택/해제 토글
window.toggleDashTeachers = function() {
    const selectAllDashCheckbox = document.getElementById('selectAllDashTeachers');
    const dashCheckboxes = document.querySelectorAll('.dash-teacher-checkbox');
    
    dashCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllDashCheckbox.checked;
    });
    
    updateSelectAllCheckbox();
    filterByTeacherCheckbox();
}

// 체크된 선생님 ID 목록 가져오기
function getCheckedTeacherIds() {
    const checkboxes = document.querySelectorAll('.teacher-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// 체크박스 필터 변경
window.filterByTeacherCheckbox = function() {
    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox();
    
    loadWeeklySchedule();
}

// 전체 선택 체크박스 상태 업데이트
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllTeachers');
    const selectAllNormalCheckbox = document.getElementById('selectAllNormalTeachers');
    const selectAllDashCheckbox = document.getElementById('selectAllDashTeachers');
    
    if (!selectAllCheckbox) return;
    
    const teacherCheckboxes = document.querySelectorAll('.teacher-checkbox');
    const normalCheckboxes = document.querySelectorAll('.normal-teacher-checkbox');
    const dashCheckboxes = document.querySelectorAll('.dash-teacher-checkbox');
    
    const checkedCount = document.querySelectorAll('.teacher-checkbox:checked').length;
    const normalCheckedCount = document.querySelectorAll('.normal-teacher-checkbox:checked').length;
    const dashCheckedCount = document.querySelectorAll('.dash-teacher-checkbox:checked').length;
    
    // 전체 선택 체크박스 업데이트
    selectAllCheckbox.checked = checkedCount === teacherCheckboxes.length;
    
    // 2번째 줄 전체 선택 체크박스 업데이트
    if (selectAllNormalCheckbox && normalCheckboxes.length > 0) {
        selectAllNormalCheckbox.checked = normalCheckedCount === normalCheckboxes.length;
    }
    
    // 3번째 줄 전체 선택 체크박스 업데이트
    if (selectAllDashCheckbox && dashCheckboxes.length > 0) {
        selectAllDashCheckbox.checked = dashCheckedCount === dashCheckboxes.length;
    }
}

// 선생님 필터 목록 로드 (기존 방식 - 다른 페이지용)
async function loadTeachersForFilter() {
    try {
        const result = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(result) ? result : (result.data || []);
        
        // status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
        const teachers = allTeachers.filter(t => {
            const status = t.status || '재직';
            return status === '재직' || status === '재직중';
        });
        
        const selectElement = document.getElementById('teacherFilter');
        if (!selectElement) return;
        
        teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacher.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('선생님 목록 로드 실패:', error);
    }
}

// 선생님 필터 변경
window.filterByTeacher = function() {
    const selectElement = document.getElementById('teacherFilter');
    scheduleTeacherFilter = selectElement.value;
    loadWeeklySchedule();
}

// 주간 스케줄 로드 및 렌더링
async function loadWeeklySchedule() {
    try {
        console.log('[loadWeeklySchedule] 시작');
        
        // 학생 데이터 로드 (재원생만)
        const studentsResult = await API.getList('students', { limit: 1000 });
        console.log('[loadWeeklySchedule] API 응답:', studentsResult);
        
        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
        let allStudents = Array.isArray(studentsResult) ? studentsResult : (studentsResult.data || []);
        console.log('[loadWeeklySchedule] 전체 학생 수:', allStudents.length);
        
        // 권한에 따라 학생 필터링 (Permissions 유틸리티 사용)
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        console.log('[loadWeeklySchedule] 권한 필터링 후 학생 수:', allStudents.length);
        
        let students = allStudents.filter(s => s.status === '재원');
        console.log('[loadWeeklySchedule] 재원생 수:', students.length);
        
        // 각 학생의 상태 확인
        students.forEach(s => {
            console.log(`[학생 확인] 이름: ${s.name}, 상태: ${s.status}, ID: ${s.id}`);
        });
        
        // 🔥 관리자/부관리자인 경우 체크박스 필터 적용하여 선생님별로 그룹화하여 표시
        if (Auth.isAdminOrSubAdmin()) {
            await renderScheduleByTeachers(students);
        } else {
            // 선생님인 경우 기존 방식으로 표시
            // 학생들에게 색상 할당
            assignStudentColors(students);
            
            // 요일별 스케줄 데이터 구성
            const scheduleData = buildScheduleData(students);
            
            // 테이블 렌더링
            renderWeeklyScheduleTable(scheduleData);
        }
        
    } catch (error) {
        console.error('스케줄 로드 실패:', error);
        const container = document.getElementById('weeklyScheduleTable');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">스케줄을 불러오는데 실패했습니다.</div>';
        }
    }
}

// 학생들에게 고유 색상 할당
function assignStudentColors(students) {
    // 학생 ID를 기준으로 정렬하여 항상 같은 색상을 유지
    const sortedStudents = [...students].sort((a, b) => a.id.localeCompare(b.id));
    
    sortedStudents.forEach((student, index) => {
        if (!studentColorMap[student.id]) {
            studentColorMap[student.id] = studentColors[index % studentColors.length];
            console.log(`[색상 할당] ${student.name} -> ${studentColors[index % studentColors.length]}`);
        }
    });
}

// 스케줄 데이터 구성
function buildScheduleData(students) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayLabels = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    
    const scheduleData = {};
    let hasSaturday = false;
    const maxColumnsPerDay = {}; // 각 요일의 최대 열 개수
    
    // 모든 요일 초기화
    days.forEach((day, dayIndex) => {
        scheduleData[day] = {
            label: dayLabels[dayIndex],
            columns: [] // 열 기반 데이터 구조로 변경
        };
        maxColumnsPerDay[day] = 0;
    });
    
    // 학생들을 시작 시간순으로 정렬하여 최적 배치 (핵심!)
    days.forEach((day) => {
        // 이 요일의 모든 학생 스케줄 수집
        const dayStudents = [];
        
        students.forEach(student => {
            // schedule이 JSON 문자열이면 파싱
            let schedule = student.schedule;
            
            if (typeof schedule === 'string' && schedule.trim() !== '') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (e) {
                    console.error('[buildScheduleData] 스케줄 파싱 오류:', e, 'student:', student.name);
                    schedule = null;
                }
            }
            
            // 이 요일의 스케줄이 있으면 수집
            if (schedule && schedule[day] && schedule[day].enabled) {
                const daySchedule = schedule[day];
                const checkIn = daySchedule.checkIn;
                const duration = parseInt(daySchedule.duration) || 90;
                const checkOut = daySchedule.checkOut;
                
                if (checkIn) {
                    // 토요일 스케줄이 있으면 표시
                    if (day === 'saturday') {
                        hasSaturday = true;
                    }
                    
                    // 시간을 분으로 변환
                    const [inHour, inMin] = checkIn.split(':').map(Number);
                    const [outHour, outMin] = checkOut.split(':').map(Number);
                    const startMinutes = inHour * 60 + inMin;
                    const endMinutes = outHour * 60 + outMin;
                    
                    dayStudents.push({
                        student: student,
                        duration: duration,
                        checkIn: checkIn,
                        checkOut: checkOut,
                        startMinutes: startMinutes,
                        endMinutes: endMinutes
                    });
                }
            }
        });
        
        // ===== 핵심: 시작 시간순으로 정렬 =====
        dayStudents.sort((a, b) => a.startMinutes - b.startMinutes);
        
        console.log(`[buildScheduleData] ${day} 학생 정렬 결과:`, dayStudents.map(s => `${s.student.name}(${s.checkIn})`).join(', '));
        
        // 정렬된 순서대로 최적 열에 배치 (4열 우선)
        dayStudents.forEach(studentData => {
            const { student, duration, checkIn, checkOut, startMinutes, endMinutes } = studentData;
            
            let assignedCol = -1;
            
            // 1단계: 기존 4열 안에서 시간이 겹치지 않는 열 찾기
            for (let col = 0; col < Math.min(scheduleData[day].columns.length, 4); col++) {
                const column = scheduleData[day].columns[col];
                let hasConflict = false;
                
                for (let item of column) {
                    const [itemInHour, itemInMin] = item.checkIn.split(':').map(Number);
                    const [itemOutHour, itemOutMin] = item.checkOut.split(':').map(Number);
                    const itemStart = itemInHour * 60 + itemInMin;
                    const itemEnd = itemOutHour * 60 + itemOutMin;
                    
                    // 시간 겹침 확인
                    if (!(endMinutes <= itemStart || startMinutes >= itemEnd)) {
                        hasConflict = true;
                        break;
                    }
                }
                
                if (!hasConflict) {
                    assignedCol = col;
                    break;
                }
            }
            
            // 2단계: 4열 안에 자리가 없고, 4열 미만이면 새 열 추가 (4열까지)
            if (assignedCol === -1 && scheduleData[day].columns.length < 4) {
                assignedCol = scheduleData[day].columns.length;
                scheduleData[day].columns.push([]);
                console.log(`[buildScheduleData] ℹ️ ${student.name} ${day} - 새 열 ${assignedCol} 추가 (4열 내)`);
            }
            
            // 3단계: 4열 모두 사용 중이면, 5열 이상에서 찾기
            if (assignedCol === -1) {
                for (let col = 4; col < scheduleData[day].columns.length; col++) {
                    const column = scheduleData[day].columns[col];
                    let hasConflict = false;
                    
                    for (let item of column) {
                        const [itemInHour, itemInMin] = item.checkIn.split(':').map(Number);
                        const [itemOutHour, itemOutMin] = item.checkOut.split(':').map(Number);
                        const itemStart = itemInHour * 60 + itemInMin;
                        const itemEnd = itemOutHour * 60 + itemOutMin;
                        
                        if (!(endMinutes <= itemStart || startMinutes >= itemEnd)) {
                            hasConflict = true;
                            break;
                        }
                    }
                    
                    if (!hasConflict) {
                        assignedCol = col;
                        break;
                    }
                }
            }
            
            // 4단계: 모든 열에 자리가 없으면 새 열 추가 (5열 이상)
            if (assignedCol === -1) {
                assignedCol = scheduleData[day].columns.length;
                scheduleData[day].columns.push([]);
                console.log(`[buildScheduleData] ⚠️ ${student.name} ${day} - 5열 이상 추가 (열 ${assignedCol})`);
            }
            
            // 학생을 열에 추가
            scheduleData[day].columns[assignedCol].push({
                student: student,
                duration: duration,
                checkIn: checkIn,
                checkOut: checkOut
            });
            
            console.log(`[buildScheduleData] ✅ ${student.name} ${day} - 열 ${assignedCol}에 배치: ${checkIn}~${checkOut}`);
            
            // 최대 열 개수 업데이트
            if (scheduleData[day].columns.length > maxColumnsPerDay[day]) {
                maxColumnsPerDay[day] = scheduleData[day].columns.length;
            }
        });
    });
    
    // ===== 각 요일당 최소 4열 보장 (모든 학생 표시) =====
    days.forEach(day => {
        const currentColumns = scheduleData[day].columns.length;
        
        if (currentColumns < 4) {
            // 4열까지 빈 열 추가
            for (let i = currentColumns; i < 4; i++) {
                scheduleData[day].columns.push([]);
            }
            console.log(`[buildScheduleData] ${day}: ${currentColumns}열 → 4열로 확장`);
        } else if (currentColumns > 4) {
            console.log(`[buildScheduleData] ℹ️ ${day}: ${currentColumns}열 사용 (시간 최적화됨)`);
        }
        
        maxColumnsPerDay[day] = Math.max(currentColumns, 4); // 최소 4열, 필요시 더 많이
    });
    
    return { scheduleData, hasSaturday, maxColumnsPerDay };
}

// 주간 스케줄 테이블 렌더링 (리팩토링: 공통 함수 사용)
function renderWeeklyScheduleTable(data) {
    const container = document.getElementById('weeklyScheduleTable');
    container.innerHTML = generateScheduleTableHTML(data);
}

// 이전 렌더링 함수 (백업, 사용하지 않음)
function renderWeeklyScheduleTable_OLD(data) {
    const { scheduleData, hasSaturday, maxColumnsPerDay } = data;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (hasSaturday) {
        days.push('saturday');
    }
    
    const container = document.getElementById('weeklyScheduleTable');
    
    // 실제 스케줄의 최소/최대 시간을 계산
    let minHour = 14, maxHour = 19;
    let minMinute = 0, maxMinute = 30;
    let hasSchedule = false;
    
    // 모든 스케줄을 순회하며 시간 범위 계산
    days.forEach(day => {
        if (scheduleData[day] && scheduleData[day].columns) {
            scheduleData[day].columns.forEach(column => {
                column.forEach(item => {
                    hasSchedule = true;
                    const [inHour, inMin] = item.checkIn.split(':').map(Number);
                    const [outHour, outMin] = item.checkOut.split(':').map(Number);
                    
                    // 가장 이른 시작 시간
                    if (inHour < minHour || (inHour === minHour && inMin < minMinute)) {
                        minHour = inHour;
                        minMinute = inMin;
                    }
                    
                    // 가장 늦은 종료 시간
                    if (outHour > maxHour || (outHour === maxHour && outMin > maxMinute)) {
                        maxHour = outHour;
                        maxMinute = outMin;
                    }
                });
            });
        }
    });
    
    // 스케줄이 없으면 기본 범위 사용
    if (!hasSchedule) {
        minHour = 14;
        minMinute = 0;
        maxHour = 19;
        maxMinute = 30;
    }
    
    // 시작 시간을 30분 단위로 내림
    if (minMinute > 0 && minMinute < 30) {
        minMinute = 0;
    } else if (minMinute > 30) {
        minMinute = 30;
    }
    
    // 종료 시간을 30분 단위로 올림
    if (maxMinute > 0 && maxMinute <= 30) {
        maxMinute = 30;
    } else if (maxMinute > 30) {
        maxHour += 1;
        maxMinute = 0;
    }
    
    console.log(`[generateScheduleTableHTML] 시간 범위: ${minHour}:${String(minMinute).padStart(2, '0')} ~ ${maxHour}:${String(maxMinute).padStart(2, '0')}`);
    
    // 시간대 배열 생성 (동적 범위)
    const times = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
        for (let min = 0; min < 60; min += 30) {
            const currentTime = hour * 60 + min;
            const startTime = minHour * 60 + minMinute;
            const endTime = maxHour * 60 + maxMinute;
            
            // 시작 시간 이전이나 종료 시간 이후는 건너뛰기
            if (currentTime < startTime || currentTime > endTime) continue;
            
            times.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
        }
    }
    
    // 각 요일/열/시간의 셀이 이미 렌더링되었는지 추적
    const renderedCells = {};
    
    // 요일 레이블 간단히 (월, 화, 수, 목, 금)
    const dayLabelsShort = {
        'monday': '월',
        'tuesday': '화',
        'wednesday': '수',
        'thursday': '목',
        'friday': '금',
        'saturday': '토'
    };
    
    let html = `
        <table class="weekly-schedule-table">
            <thead>
                <tr>
                    <th class="time-header-cell" rowspan="1"></th>
    `;
    
    // 요일 헤더 (최소 4열 보장)
    days.forEach(day => {
        const colCount = Math.max(maxColumnsPerDay[day] || 0, 4);
        html += `<th colspan="${colCount}" class="day-header">${dayLabelsShort[day]}</th>`;
    });
    
    html += `
                    </tr>
                </thead>
                <tbody>
    `;
    
    // 시간대별 행
    times.forEach((time, timeIndex) => {
        // 정각인지 확인
        const isHourMark = time.endsWith(':00');
        const rowClass = isHourMark ? 'hour-mark-row' : '';
        
        html += `<tr class="${rowClass}">`;
        
        // 시간 열
        html += `<td class="time-cell">${time}</td>`;
        
        // 각 요일의 열
        days.forEach((day, dayIndex) => {
            const columns = scheduleData[day] ? scheduleData[day].columns : [];
            const colCount = Math.max(maxColumnsPerDay[day] || 0, 4);
            
            // 각 열을 렌더링
            for (let col = 0; col < colCount; col++) {
                const cellKey = `${dayIndex}-${col}-${timeIndex}`;
                
                // 요일의 마지막 열인지 확인
                const isLastColOfDay = (col === colCount - 1);
                
                // 이미 rowspan으로 렌더링된 셀이면 건너뛰기
                if (renderedCells[cellKey]) {
                    continue;
                }
                
                // 이 열에서 이 시간에 시작하는 수업 찾기
                let studentSchedule = null;
                if (columns[col]) {
                    studentSchedule = columns[col].find(item => item.checkIn === time);
                }
                
                if (studentSchedule) {
                    const { student, duration, checkIn, checkOut } = studentSchedule;
                    const slots = Math.ceil(duration / 30); // 30분당 1칸
                    const color = studentColorMap[student.id];
                    
                    // 이 셀이 차지하는 모든 시간대를 렌더링됨으로 표시
                    for (let s = 0; s < slots; s++) {
                        const key = `${dayIndex}-${col}-${timeIndex + s}`;
                        renderedCells[key] = true;
                    }
                    
                    const isHighlighted = highlightedScheduleStudentId === student.id;
                    const borderStyle = isHighlighted ? 'border: 3px solid #FF6B35 !important;' : '';
                    
                    html += `
                        <td rowspan="${slots}" class="student-cell ${isLastColOfDay ? 'last-col' : ''}" style="background: ${color}; vertical-align: top; padding: 0.4rem; ${borderStyle} cursor: pointer; position: relative;" onclick="toggleHighlightScheduleStudent('${student.id}', event)" data-student-id="${student.id}">
                            <div class="student-name" style="font-weight: 700; color: #333; font-size: 0.85rem;">${student.name}</div>
                            <div class="student-time" style="font-size: 0.7rem; color: #888; margin-top: 0.3rem; line-height: 1.4;">
                                <div style="font-size: 0.7rem; font-weight: 400; color: #888;">${checkIn}</div>
                                <div style="font-size: 0.7rem; font-weight: 400; color: #888;">${checkOut}</div>
                            </div>
                        </td>
                    `;
                } else {
                    // 빈 셀
                    html += `<td class="empty-cell ${isLastColOfDay ? 'last-col' : ''}"></td>`;
                }
            }
        });
        
        html += `</tr>`;
    });
    
    html += `
                </tbody>
            </table>
    `;
    
    container.innerHTML = html;
}

// 🔥 선생님별로 스케줄 그룹화하여 렌더링 (관리자/부관리자용)
// 전체 학생의 시간 범위 계산 (모든 선생님에게 동일하게 적용)
function calculateGlobalTimeRange(allStudents) {
    let minHour = 23, maxHour = 0;
    let minMinute = 59, maxMinute = 0;
    let hasSchedule = false;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    allStudents.forEach(student => {
        if (!student.schedule) return;
        
        let scheduleObj = student.schedule;
        if (typeof scheduleObj === 'string') {
            try {
                scheduleObj = JSON.parse(scheduleObj);
            } catch (e) {
                return;
            }
        }
        
        days.forEach(day => {
            if (scheduleObj[day] && scheduleObj[day].enabled) {
                hasSchedule = true;
                const checkIn = scheduleObj[day].checkIn;
                const checkOut = scheduleObj[day].checkOut;
                
                if (checkIn && checkOut) {
                    const [inHour, inMin] = checkIn.split(':').map(Number);
                    const [outHour, outMin] = checkOut.split(':').map(Number);
                    
                    // 가장 이른 시작 시간
                    if (inHour < minHour || (inHour === minHour && inMin < minMinute)) {
                        minHour = inHour;
                        minMinute = inMin;
                    }
                    
                    // 가장 늦은 종료 시간
                    if (outHour > maxHour || (outHour === maxHour && outMin > maxMinute)) {
                        maxHour = outHour;
                        maxMinute = outMin;
                    }
                }
            }
        });
    });
    
    // 스케줄이 없으면 기본 범위 사용
    if (!hasSchedule) {
        return { minHour: 14, minMinute: 0, maxHour: 19, maxMinute: 30 };
    }
    
    // 시작 시간을 30분 단위로 내림
    if (minMinute > 0 && minMinute < 30) {
        minMinute = 0;
    } else if (minMinute > 30) {
        minMinute = 30;
    }
    
    // 종료 시간을 30분 단위로 올림
    if (maxMinute > 0 && maxMinute <= 30) {
        maxMinute = 30;
    } else if (maxMinute > 30) {
        maxHour += 1;
        maxMinute = 0;
    }
    
    return { minHour, minMinute, maxHour, maxMinute };
}

async function renderScheduleByTeachers(allStudents) {
    try {
        // 선생님 목록 로드
        const teachersResult = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(teachersResult) ? teachersResult : (teachersResult.data || []);
        
        // status가 '재직', '재직중', 또는 비어있으면 재직으로 간주
        const activeTeachers = allTeachers.filter(t => {
            const status = t.status || '재직';
            return status === '재직' || status === '재직중';
        });
        
        console.log('[renderScheduleByTeachers] 전체 재직 선생님:', activeTeachers.map(t => `${t.name}(${t.status || '재직'})`));
        
        // 체크된 선생님만 필터링
        const checkedTeacherIds = getCheckedTeacherIds();
        const filteredTeachers = checkedTeacherIds.length > 0 
            ? activeTeachers.filter(t => checkedTeacherIds.includes(t.id))
            : activeTeachers;
        
        console.log('[renderScheduleByTeachers] 체크된 선생님:', filteredTeachers.map(t => t.name));
        
        // 선생님별로 학생 그룹화
        const studentsByTeacher = {};
        const noTeacherStudents = [];
        
        allStudents.forEach(student => {
            if (student.teacher_id) {
                if (!studentsByTeacher[student.teacher_id]) {
                    studentsByTeacher[student.teacher_id] = [];
                }
                studentsByTeacher[student.teacher_id].push(student);
            } else {
                noTeacherStudents.push(student);
            }
        });
        
        // ===== 전체 학생의 시간 범위를 먼저 계산 =====
        const globalTimeRange = calculateGlobalTimeRange(allStudents);
        console.log('[renderScheduleByTeachers] 전체 시간 범위:', globalTimeRange);
        
        const container = document.getElementById('weeklyScheduleTable');
        
        if (!container) {
            console.error('[renderScheduleByTeachers] weeklyScheduleTable 요소를 찾을 수 없습니다');
            return;
        }
        
        let html = '';
        
        // 체크된 선생님별로 순회하면서 스케줄 테이블 생성
        console.log('[renderScheduleByTeachers] filteredTeachers:', filteredTeachers.map(t => t.name));
        filteredTeachers.forEach(teacher => {
            const teacherStudents = studentsByTeacher[teacher.id] || [];
            console.log(`[renderScheduleByTeachers] ${teacher.name} 선생님 - 담당 학생 수: ${teacherStudents.length}`);
            
            // 모든 재직 선생님의 스케줄 표시 (담당 학생이 없어도 표시)
            
            // 선생님 이름 헤더
            html += `
                <div class="teacher-schedule-section" style="margin-bottom: 3rem; page-break-inside: avoid;">
                    <h3 style="margin-bottom: 1rem; padding: 0.75rem; background: #f0f0f0; border-left: 4px solid #4CAF50; font-size: 1.1rem;">
                        <i class="fas fa-user-tie"></i> ${teacher.name} 선생님 (${teacherStudents.length}명)
                    </h3>
            `;
            
            // 이 선생님의 학생들에게 색상 할당
            assignStudentColors(teacherStudents);
            
            // 스케줄 데이터 구성
            const scheduleData = buildScheduleData(teacherStudents);
            
            // 테이블 HTML 생성 (전체 시간 범위 적용)
            html += generateScheduleTableHTML(scheduleData, globalTimeRange);
            
            html += `</div>`;
        });
        
        // 담당 선생님이 없는 학생들
        if (noTeacherStudents.length > 0) {
            html += `
                <div class="teacher-schedule-section" style="margin-bottom: 3rem; page-break-inside: avoid;">
                    <h3 style="margin-bottom: 1rem; padding: 0.75rem; background: #f0f0f0; border-left: 4px solid #999; font-size: 1.1rem;">
                        <i class="fas fa-user-times"></i> 담당 선생님 미지정 (${noTeacherStudents.length}명)
                    </h3>
            `;
            
            assignStudentColors(noTeacherStudents);
            const scheduleData = buildScheduleData(noTeacherStudents);
            html += generateScheduleTableHTML(scheduleData, globalTimeRange);
            
            html += `</div>`;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('선생님별 스케줄 렌더링 실패:', error);
        const container = document.getElementById('weeklyScheduleTable');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">스케줄을 불러오는데 실패했습니다.</div>';
        }
    }
}

// 스케줄 테이블 HTML 생성 (공통 함수)
function generateScheduleTableHTML(data, globalTimeRange = null) {
    const { scheduleData, hasSaturday, maxColumnsPerDay } = data;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (hasSaturday) {
        days.push('saturday');
    }
    
    let minHour, maxHour, minMinute, maxMinute;
    
    // globalTimeRange가 제공되면 사용, 아니면 자체 계산
    if (globalTimeRange) {
        ({ minHour, minMinute, maxHour, maxMinute } = globalTimeRange);
        console.log('[generateScheduleTableHTML] 전체 시간 범위 사용:', globalTimeRange);
    } else {
        // 실제 스케줄의 최소/최대 시간을 계산
        minHour = 14;
        maxHour = 19;
        minMinute = 0;
        maxMinute = 30;
        let hasSchedule = false;
        
        // 모든 스케줄을 순회하며 시간 범위 계산
        days.forEach(day => {
            if (scheduleData[day] && scheduleData[day].columns) {
                scheduleData[day].columns.forEach(column => {
                    column.forEach(item => {
                        hasSchedule = true;
                        const [inHour, inMin] = item.checkIn.split(':').map(Number);
                        const [outHour, outMin] = item.checkOut.split(':').map(Number);
                        
                        // 가장 이른 시작 시간
                        if (inHour < minHour || (inHour === minHour && inMin < minMinute)) {
                            minHour = inHour;
                            minMinute = inMin;
                        }
                        
                        // 가장 늦은 종료 시간
                        if (outHour > maxHour || (outHour === maxHour && outMin > maxMinute)) {
                            maxHour = outHour;
                            maxMinute = outMin;
                        }
                    });
                });
            }
        });
        
        // 스케줄이 없으면 기본 범위 사용
        if (!hasSchedule) {
            minHour = 14;
            minMinute = 0;
            maxHour = 19;
            maxMinute = 30;
        }
        
        // 시작 시간을 30분 단위로 내림
        if (minMinute > 0 && minMinute < 30) {
            minMinute = 0;
        } else if (minMinute > 30) {
            minMinute = 30;
        }
        
        // 종료 시간을 30분 단위로 올림
        if (maxMinute > 0 && maxMinute <= 30) {
            maxMinute = 30;
        } else if (maxMinute > 30) {
            maxHour += 1;
            maxMinute = 0;
        }
        
        console.log(`[generateScheduleTableHTML] 개별 시간 범위: ${minHour}:${String(minMinute).padStart(2, '0')} ~ ${maxHour}:${String(maxMinute).padStart(2, '0')}`);
    }
    
    // 시간대 배열 생성 (동적 범위)
    const times = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
        for (let min = 0; min < 60; min += 30) {
            const currentTime = hour * 60 + min;
            const startTime = minHour * 60 + minMinute;
            const endTime = maxHour * 60 + maxMinute;
            
            // 시작 시간 이전이나 종료 시간 이후는 건너뛰기
            if (currentTime < startTime || currentTime > endTime) continue;
            
            times.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
        }
    }
    
    // 각 요일/열/시간의 셀이 이미 렌더링되었는지 추적
    const renderedCells = {};
    
    // 요일 레이블 간단히 (월, 화, 수, 목, 금)
    const dayLabelsShort = {
        'monday': '월',
        'tuesday': '화',
        'wednesday': '수',
        'thursday': '목',
        'friday': '금',
        'saturday': '토'
    };
    
    let html = `
        <table class="weekly-schedule-table">
            <thead>
                <tr>
                    <th class="time-header-cell" rowspan="1"></th>
    `;
    
    // 요일 헤더 (최소 4열 보장)
    days.forEach(day => {
        const colCount = Math.max(maxColumnsPerDay[day] || 0, 4);
        html += `<th colspan="${colCount}" class="day-header">${dayLabelsShort[day]}</th>`;
    });
    
    html += `
                </tr>
            </thead>
            <tbody>
    `;
    
    // 시간대별 행
    times.forEach((time, timeIndex) => {
        // 정각인지 확인
        const isHourMark = time.endsWith(':00');
        const rowClass = isHourMark ? 'hour-mark-row' : '';
        
        html += `<tr class="${rowClass}">`;
        
        // 시간 열
        html += `<td class="time-cell">${time}</td>`;
        
        // 각 요일의 열
        days.forEach((day, dayIndex) => {
            const columns = scheduleData[day] ? scheduleData[day].columns : [];
            const colCount = Math.max(maxColumnsPerDay[day] || 0, 4);
            
            // 각 열을 렌더링
            for (let col = 0; col < colCount; col++) {
                const cellKey = `${dayIndex}-${col}-${timeIndex}`;
                
                // 요일의 마지막 열인지 확인
                const isLastColOfDay = (col === colCount - 1);
                
                // 이미 rowspan으로 렌더링된 셀이면 건너뛰기
                if (renderedCells[cellKey]) {
                    continue;
                }
                
                // 이 열에서 이 시간에 시작하는 수업 찾기
                let studentSchedule = null;
                if (columns[col]) {
                    studentSchedule = columns[col].find(item => item.checkIn === time);
                }
                
                if (studentSchedule) {
                    const { student, duration, checkIn, checkOut } = studentSchedule;
                    const slots = Math.ceil(duration / 30); // 30분당 1칸
                    const color = studentColorMap[student.id];
                    
                    // 이 셀이 차지하는 모든 시간대를 렌더링됨으로 표시
                    for (let s = 0; s < slots; s++) {
                        const key = `${dayIndex}-${col}-${timeIndex + s}`;
                        renderedCells[key] = true;
                    }
                    
                    const isHighlighted = highlightedScheduleStudentId === student.id;
                    const borderStyle = isHighlighted ? 'border: 3px solid #FF6B35 !important;' : '';
                    
                    html += `
                        <td rowspan="${slots}" class="student-cell ${isLastColOfDay ? 'last-col' : ''}" style="background: ${color}; vertical-align: top; padding: 0.4rem; ${borderStyle} cursor: pointer; position: relative;" onclick="toggleHighlightScheduleStudent('${student.id}', event)" data-student-id="${student.id}">
                            <div class="student-name" style="font-weight: 700; color: #333; font-size: 0.85rem;">${student.name}</div>
                            <div class="student-time" style="font-size: 0.7rem; color: #888; margin-top: 0.3rem; line-height: 1.4;">
                                <div style="font-size: 0.7rem; font-weight: 400; color: #888;">${checkIn}</div>
                                <div style="font-size: 0.7rem; font-weight: 400; color: #888;">${checkOut}</div>
                            </div>
                        </td>
                    `;
                } else {
                    // 빈 셀
                    html += `<td class="empty-cell ${isLastColOfDay ? 'last-col' : ''}"></td>`;
                }
            }
        });
        
        html += `</tr>`;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

// 월별 출석 상세 정보 로드 (휴일 제외)
async function loadMonthlyAttendanceCount() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-based
        
        // 해당 월의 시작/종료 날짜
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        console.log(`[loadMonthlyAttendanceCount] 조회 기간: ${startDateStr} ~ ${endDateStr}`);
        
        // 출석 데이터 로드
        const attendanceResponse = await API.getList('attendance', { limit: 10000 });
        const allAttendance = Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse.data || []);
        
        // 학생 목록 로드
        const studentsResponse = await API.getList('students', { limit: 1000 });
        const allStudents = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        
        // 해당 월의 출석 기록만 필터링
        const monthAttendance = allAttendance.filter(record => 
            record.date >= startDateStr && record.date <= endDateStr
        );
        
        // 날짜별로 그룹화하여 휴일 여부 확인
        const dateGroups = {};
        monthAttendance.forEach(record => {
            if (!dateGroups[record.date]) {
                dateGroups[record.date] = [];
            }
            dateGroups[record.date].push(record);
        });
        
        // 휴일 날짜 찾기 (모든 학생이 같은 사유로 결석)
        const holidayDates = new Set();
        Object.keys(dateGroups).forEach(date => {
            const records = dateGroups[date];
            const allAbsent = records.every(r => r.status === '결석');
            const allSameReason = allAbsent && records.length > 0 && 
                                  records.every(r => r.absence_reason === records[0].absence_reason);
            
            if (allAbsent && allSameReason && records[0].absence_reason) {
                holidayDates.add(date);
                console.log(`[loadMonthlyAttendanceCount] 휴일 발견: ${date} (사유: ${records[0].absence_reason})`);
            }
        });
        
        // 각 학생의 상세 출석 정보 계산
        const detailMap = {};
        
        allStudents.forEach(student => {
            // 학생의 스케줄 파싱
            let schedule = student.schedule;
            if (typeof schedule === 'string') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (e) {
                    schedule = null;
                }
            }
            
            // 이번 달 출석해야 하는 횟수 계산 (주간 스케줄 * 4주 - 휴일)
            let expectedCount = 0;
            if (schedule) {
                const dayKeys = ['월', '화', '수', '목', '금', '토'];
                const dayKeysEng = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                
                dayKeysEng.forEach(dayKey => {
                    if (schedule[dayKey] && schedule[dayKey].enabled) {
                        expectedCount++;
                    }
                });
                
                expectedCount *= 4; // 4주 기준
                
                // 휴일 중 해당 학생이 스케줄이 있는 날짜 개수 차감
                holidayDates.forEach(date => {
                    const dateObj = new Date(date);
                    const dayOfWeek = dateObj.getDay(); // 0=일, 1=월, ..., 6=토
                    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const dayKey = dayKeys[dayOfWeek];
                    
                    if (schedule[dayKey] && schedule[dayKey].enabled) {
                        expectedCount--;
                    }
                });
            }
            
            detailMap[student.id] = {
                expected: expectedCount,
                attendance: 0,
                makeup: 0,
                supplement: 0,
                absence: 0
            };
        });
        
        // 출석 기록 집계 (휴일 제외)
        monthAttendance.forEach(record => {
            if (holidayDates.has(record.date)) {
                return; // 휴일은 제외
            }
            
            if (!detailMap[record.student_id]) {
                return;
            }
            
            // 퇴실시간이 있는 경우만 카운트
            if (record.check_out_time) {
                if (record.status === '출석') {
                    detailMap[record.student_id].attendance++;
                } else if (record.status === '보강') {
                    detailMap[record.student_id].makeup++;
                } else if (record.status === '보충') {
                    detailMap[record.student_id].supplement++;
                }
            }
            
            // 결석은 퇴실시간 없어도 카운트
            if (record.status === '결석') {
                detailMap[record.student_id].absence++;
            }
        });
        
        console.log(`[loadMonthlyAttendanceCount] 학생별 출석 상세:`, detailMap);
        console.log(`[loadMonthlyAttendanceCount] 제외된 휴일 수: ${holidayDates.size}일`);
        
        monthlyAttendanceCount = detailMap;
        
    } catch (error) {
        console.error('[loadMonthlyAttendanceCount] 월별 출석 정보 로드 실패:', error);
        monthlyAttendanceCount = {};
    }
}

// 학생 강조 토글 및 정보 팝업 표시
// 주간 스케줄 학생 하이라이트
window.toggleHighlightScheduleStudent = function(studentId, event) {
    // 기존 팝업 제거
    const existingPopup = document.getElementById('studentAttendancePopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    if (highlightedScheduleStudentId === studentId) {
        // 이미 선택된 학생 클릭 시 해제
        highlightedScheduleStudentId = null;
        
        // 모든 학생 셀의 테두리 제거
        const allStudentCells = document.querySelectorAll('.student-cell[data-student-id]');
        allStudentCells.forEach(cell => {
            cell.style.border = '';
        });
        
        return;
    }
    
    // 새로운 학생 선택
    highlightedScheduleStudentId = studentId;
    
    console.log('[toggleHighlightScheduleStudent] 선택된 학생 ID:', highlightedScheduleStudentId);
    
    // 모든 학생 셀의 스타일 업데이트
    const allStudentCells = document.querySelectorAll('.student-cell[data-student-id]');
    allStudentCells.forEach(cell => {
        const cellStudentId = cell.getAttribute('data-student-id');
        if (cellStudentId === highlightedScheduleStudentId) {
            cell.style.border = '3px solid #FF6B35';
        } else {
            cell.style.border = '';
        }
    });
    
    // 출석 정보 팝업 생성 및 표시
    const studentInfo = monthlyAttendanceCount[studentId];
    if (!studentInfo) {
        console.warn('[toggleHighlightScheduleStudent] 학생 정보 없음:', studentId);
        return;
    }
    
    const popup = document.createElement('div');
    popup.id = 'studentAttendancePopup';
    popup.style.cssText = `
        position: fixed;
        background: white;
        border: 2px solid #FF6B35;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 200px;
    `;
    
    const now = new Date();
    const monthName = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    
    popup.innerHTML = `
        <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.75rem; color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 0.5rem;">
            ${monthName}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">출석해야 할 횟수:</span>
                <span style="font-weight: 600; color: #333;">${studentInfo.expected}회</span>
            </div>
            <div style="height: 1px; background: #e0e0e0;"></div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">출석:</span>
                <span style="font-weight: 600; color: #4CAF50;">${studentInfo.attendance}회</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">보강:</span>
                <span style="font-weight: 600; color: #f44336;">${studentInfo.makeup}회</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">보충:</span>
                <span style="font-weight: 600; color: #9C27B0;">${studentInfo.supplement}회</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">결석:</span>
                <span style="font-weight: 600; color: #000; text-decoration: line-through;">${studentInfo.absence}회</span>
            </div>
        </div>
    `;
    
    // 클릭한 셀의 위치 계산
    const targetCell = event.target.closest('.student-cell');
    if (targetCell) {
        const rect = targetCell.getBoundingClientRect();
        
        // 팝업 위치: 셀 오른쪽 상단
        popup.style.left = `${rect.right + 10}px`;
        popup.style.top = `${rect.top}px`;
        
        // 화면 오른쪽을 벗어나면 왼쪽에 표시
        document.body.appendChild(popup);
        const popupRect = popup.getBoundingClientRect();
        if (popupRect.right > window.innerWidth) {
            popup.style.left = `${rect.left - popupRect.width - 10}px`;
        }
        
        // 화면 아래를 벗어나면 위로 이동
        if (popupRect.bottom > window.innerHeight) {
            popup.style.top = `${rect.bottom - popupRect.height}px`;
        }
    } else {
        // 기본 위치: 화면 중앙
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(popup);
    }
}

// 월간 스케줄 학생 하이라이트 (동일한 로직, .monthly-student-cell 사용)
window.toggleHighlightMonthlyStudent = function(studentId, event) {
    // 기존 팝업 제거
    const existingPopup = document.getElementById('studentAttendancePopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    if (highlightedScheduleStudentId === studentId) {
        // 이미 선택된 학생 클릭 시 해제
        highlightedScheduleStudentId = null;
        
        // 모든 월간 학생 셀의 테두리 제거
        const allStudentCells = document.querySelectorAll('.monthly-student-cell[data-student-id]');
        allStudentCells.forEach(cell => {
            cell.style.border = '1px solid #dee2e6';
        });
        
        return;
    }
    
    // 새로운 학생 선택
    highlightedScheduleStudentId = studentId;
    
    console.log('[toggleHighlightMonthlyStudent] 선택된 학생 ID:', highlightedScheduleStudentId);
    
    // 모든 월간 학생 셀의 스타일 업데이트
    const allStudentCells = document.querySelectorAll('.monthly-student-cell[data-student-id]');
    allStudentCells.forEach(cell => {
        const cellStudentId = cell.getAttribute('data-student-id');
        if (cellStudentId === highlightedScheduleStudentId) {
            cell.style.border = '3px solid #FF6B35';
        } else {
            cell.style.border = '1px solid #dee2e6';
        }
    });
    
    // 출석 정보 팝업 생성 및 표시
    const studentInfo = monthlyAttendanceCount[studentId];
    if (!studentInfo) {
        console.warn('[toggleHighlightMonthlyStudent] 학생 정보 없음:', studentId);
        return;
    }
    
    const popup = document.createElement('div');
    popup.id = 'studentAttendancePopup';
    popup.style.cssText = `
        position: fixed;
        background: white;
        border: 2px solid #FF6B35;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 200px;
    `;
    
    // 현재 선택된 월간 스케줄의 연월 사용
    const monthName = `${monthlyScheduleYear}년 ${monthlyScheduleMonth + 1}월`;
    
    popup.innerHTML = `
        <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.75rem; color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 0.5rem;">
            ${monthName}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">출석해야 할 횟수:</span>
                <span style="font-weight: 600; color: #333;">${studentInfo.expected}회</span>
            </div>
            <div style="height: 1px; background: #e0e0e0;"></div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">출석:</span>
                <span style="font-weight: 600; color: #4CAF50;">${studentInfo.attendance}회</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">보강:</span>
                <span style="font-weight: 600; color: #f44336;">${studentInfo.makeup}회</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">보충:</span>
                <span style="font-weight: 600; color: #9C27B0;">${studentInfo.supplement}회</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">결석:</span>
                <span style="font-weight: 600; color: #000; text-decoration: line-through;">${studentInfo.absence}회</span>
            </div>
        </div>
    `;
    
    // 클릭한 셀의 위치 계산
    const targetCell = event.target.closest('.monthly-student-cell');
    if (targetCell) {
        const rect = targetCell.getBoundingClientRect();
        
        // 팝업 위치: 셀 오른쪽 상단
        popup.style.left = `${rect.right + 10}px`;
        popup.style.top = `${rect.top}px`;
        
        // 화면 오른쪽을 벗어나면 왼쪽에 표시
        document.body.appendChild(popup);
        const popupRect = popup.getBoundingClientRect();
        if (popupRect.right > window.innerWidth) {
            popup.style.left = `${rect.left - popupRect.width - 10}px`;
        }
        
        // 화면 아래를 벗어나면 위로 이동
        if (popupRect.bottom > window.innerHeight) {
            popup.style.top = `${rect.bottom - popupRect.height}px`;
        }
    } else {
        // 기본 위치: 화면 중앙
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(popup);
    }
}

// 스케줄표 인쇄
window.printScheduleTable = function() {
    window.print();
}

// 스케줄 조회 페이지 (기존 코드 유지)
window.showScheduleViewPage = async function() {
    const mainContent = document.getElementById('mainContent');
    const now = new Date();
    const year = now.getFullYear();
    
    mainContent.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <div class="form-row" style="max-width: 400px;">
                    <select id="viewScheduleYear" onchange="updateViewScheduleMonth()">
                        ${generateScheduleYearOptions(year)}
                    </select>
                    <select id="viewScheduleMonth" onchange="loadViewSchedules()">
                        ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                            `<option value="${m}" ${m === now.getMonth() + 1 ? 'selected' : ''}>${m}월</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            
            <div id="viewCalendarView" style="margin-top: 1.5rem;"></div>
            
            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">일정 목록</h3>
                <div id="viewScheduleList"></div>
            </div>
        </div>
    `;
    
    loadViewSchedules();
}

function generateScheduleYearOptions(currentYear) {
    let html = '';
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        html += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}년</option>`;
    }
    return html;
}

function updateViewScheduleMonth() {
    loadViewSchedules();
}

async function loadViewSchedules() {
    const year = parseInt(document.getElementById('viewScheduleYear').value);
    const month = parseInt(document.getElementById('viewScheduleMonth').value);
    
    try {
        const result = await API.getList('schedules', { limit: 1000 });
        const schedules = Array.isArray(result) ? result : (result.data || []);
        
        const filtered = schedules.filter(s => {
            const date = new Date(s.date);
            return date.getFullYear() === year && date.getMonth() + 1 === month;
        });
        
        renderViewCalendar(year, month, filtered);
        renderViewScheduleList(filtered);
    } catch (error) {
        document.getElementById('viewScheduleList').innerHTML = 
            '<div class="alert alert-danger">데이터를 불러오는데 실패했습니다</div>';
    }
}

function renderViewCalendar(year, month, schedules) {
    document.getElementById('viewCalendarView').innerHTML = '<p>캘린더 기능은 추후 구현 예정입니다.</p>';
}

function renderViewScheduleList(schedules) {
    const container = document.getElementById('viewScheduleList');
    
    if (schedules.length === 0) {
        container.innerHTML = '<div class="empty-state">등록된 일정이 없습니다</div>';
        return;
    }
    
    schedules.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let html = '<div class="schedule-list">';
    schedules.forEach(schedule => {
        const date = new Date(schedule.date);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        html += `
            <div class="schedule-item">
                <div class="schedule-date">${dateStr} ${schedule.time || ''}</div>
                <div class="schedule-title">${schedule.title}</div>
                ${schedule.description ? `<div class="schedule-desc">${schedule.description}</div>` : ''}
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}
