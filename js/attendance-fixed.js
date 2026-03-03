// ============================================
// 출석 관리 모듈
// ============================================
console.log('[attendance-fixed.js] 로드 시작');

// 전역 변수
let todayAttendanceRecords = [];
let attendanceStudents = [];
let allMonthAttendance = [];
// 현재 선택된 담당선생님 필터 (출석관리)
let currentAttendanceTeacherFilter = 'all';
// 현재 선택된 담당선생님 필터 (출석조회)
let currentAttendanceViewTeacherFilter = 'all';
// 통계표에서 클릭한 학생 (형광펜 표시용 - 출석체크 페이지)
let highlightedStudentName = null;
// 출석조회 페이지에서 클릭한 학생 (형광펜 표시용)
let highlightedViewStudentName = null;
// 출석체크 페이지 달력의 현재 연월
let currentCheckPageYear = new Date().getFullYear();
let currentCheckPageMonth = new Date().getMonth();
// 출석조회 페이지 달력의 현재 연월
let displayedYear = new Date().getFullYear();
let displayedMonth = new Date().getMonth();

// ============================================
// 헬퍼 함수: 시간을 분 단위로 변환
// ============================================
function formatMakeupDateInput(input) {
    let value = input.value.replace(/[^0-9/]/g, '');
    
    // YYMMDD 형식 입력 처리
    if (value.indexOf('/') === -1 && value.length >= 4) {
        // YYMMDD 형식으로 입력된 경우
        const numbers = value.replace(/\//g, '');
        if (numbers.length === 4) {
            // MMDD 형식
            const month = numbers.substring(0, 2);
            const day = numbers.substring(2, 4);
            value = `${parseInt(month, 10)}/${parseInt(day, 10)}`;
        } else if (numbers.length >= 6) {
            // YYMMDD 형식
            const month = numbers.substring(2, 4);
            const day = numbers.substring(4, 6);
            value = `${parseInt(month, 10)}/${parseInt(day, 10)}`;
        }
    }
    
    // MM/DD 형식 검증
    if (value.indexOf('/') !== -1) {
        const parts = value.split('/');
        if (parts.length === 2) {
            const month = parseInt(parts[0], 10);
            const day = parseInt(parts[1], 10);
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                value = `${month}/${day}`;
            }
        }
    }
    
    input.value = value;
}

function timeToMinutes(timeString) {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
}

// ============================================
// 1. 출석 체크 페이지 표시
// ============================================
async function showAttendanceCheckPage() {
    console.log('=== 출석 체크 페이지 로드 시작 ===');
    
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('mainContent 요소를 찾을 수 없습니다.');
        return;
    }

    // 페이지 HTML 구조
    mainContent.innerHTML = `
        <div class="attendance-check-container">
            <!-- 관리자용 드롭다운 (2단 위 우측 상단) -->
            ${Auth.isAdmin() || Auth.isSubAdmin() ? `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                <select id="attendanceTeacherFilterSelect" class="form-select" style="width: 200px;" onchange="filterAttendanceByTeacher()">
                    <option value="all">전체 선생님</option>
                </select>
            </div>
            ` : ''}

            <!-- 2단: 출석 테이블 -->
            <div class="attendance-table-section">
                <div class="table-header">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <h2>출석 현황&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id="attendanceSummary" style="font-size: 0.9rem; background-color: #fff3cd; padding: 2px 8px; border-radius: 3px;"></span></h2>
                    </div>
                    <div class="date-selector">
                        <button class="btn-secondary" onclick="openScheduleModal()" style="margin-right: 1rem; padding: 0.5rem 1rem; font-size: 0.9rem;">일정 등록</button>
                        <button class="date-nav-btn" onclick="changeAttendanceDate(-1)" title="전날">◀</button>
                        <span class="calendar-icon" onclick="document.getElementById('attendanceDateInput').showPicker()">🗓️</span>
                        <input type="date" id="attendanceDateInput" class="date-input" onchange="loadAttendanceByDate()" />
                        <span id="attendanceDateDisplay" class="date-display"></span>
                        <button class="date-nav-btn" onclick="changeAttendanceDate(1)" title="다음날">▶</button>
                    </div>
                </div>
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>이름 (출결번호)</th>
                            <th>출석시간</th>
                            <th>퇴실시간</th>
                            <th>재실시간</th>
                            <th>상태</th>
                            <th>등록</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceTableBody">
                        <tr>
                            <td colspan="7" style="text-align: center; color: #999;">로딩 중...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 3단: 월별 출결 현황 -->
            <div class="monthly-calendar-section">
                <h2>월별 출결 현황</h2>
                <div class="calendar-header">
                    <button onclick="changeCheckPageMonth(-1)" class="btn-month-nav">◀</button>
                    <h3 id="calendarMonthTitle"></h3>
                    <button onclick="changeCheckPageMonth(1)" class="btn-month-nav">▶</button>
                </div>
                <div id="monthlyCalendarContainer"></div>
                
                <!-- 학년별 통계 표 -->
                <div id="attendanceStatsContainer"></div>
            </div>
        </div>
    `;

    // 이벤트 바인딩
    const checkInInput = document.getElementById('registerCheckInTime');
    if (checkInInput) {
        checkInInput.addEventListener('change', calculateExpectedOutTime);
    }

    // 오늘 날짜 설정
    const dateInput = document.getElementById('attendanceDateInput');
    if (dateInput) {
        dateInput.value = getTodayDateString();
        updateDateDisplay(getTodayDateString());
    }

    // 출석체크 페이지 달력의 초기 연월 설정 (오늘 날짜 기준)
    const today = new Date();
    currentCheckPageYear = today.getFullYear();
    currentCheckPageMonth = today.getMonth();

    // 데이터 로드
    await loadAttendanceData();
    await renderMonthlyCalendar();

    // 관리자/부관리자인 경우 선생님 목록 로드 (DOM 렌더링 후)
    if (Auth.isAdmin() || Auth.isSubAdmin()) {
        console.log('[showAttendanceCheckPage] 선생님 목록 로드 시작');
        // DOM 렌더링 완료를 위해 짧은 지연 추가
        setTimeout(async () => {
            await loadTeachersForAttendanceFilter();
        }, 100);
    }
    
    console.log('=== 출석 체크 페이지 로드 완료 ===');
}

// ============================================
// 2. 출결번호 입력 처리
// ============================================

// 입실 처리
async function processCheckIn() {
    const numberInput = document.getElementById('attendanceNumberInput');
    const number = numberInput.value.trim();
    
    if (!number) {
        alert('출결번호를 입력해주세요.');
        return;
    }
    
    if (number.length < 4 || number.length > 5) {
        alert('출결번호는 4-5자리입니다.');
        return;
    }
    
    try {
        if (!Auth.isLoggedIn()) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const student = attendanceStudents.find(s => s.attendance_number === number);
        
        if (!student) {
            alert(`출결번호 ${number}에 해당하는 학생을 찾을 수 없습니다.`);
            return;
        }
        
        const now = new Date();
        const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
        
        if (existingRecord) {
            await API.update('attendance', existingRecord.id, {
                ...existingRecord,
                check_in_time: checkInTime,
                status: '출석'
            });
            alert(`${student.name} 입실 ${checkInTime}`);
        } else {
            const attendanceData = {
                student_id: student.id,
                student_name: student.name,
                date: getSelectedDateString(),
                check_in_time: checkInTime,
                check_out_time: '',
                status: '출석',
                absence_reason: '',
                makeup_date: ''
            };
            
            await API.create('attendance', attendanceData);
            alert(`${student.name} 입실 ${checkInTime}`);
        }
        
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
        numberInput.value = '';
        numberInput.focus();
        
    } catch (error) {
        console.error('입실 처리 실패:', error);
        alert('입실 처리에 실패했습니다.');
    }
}

// 퇴실 처리
async function processCheckOut() {
    const numberInput = document.getElementById('attendanceNumberInput');
    const number = numberInput.value.trim();
    
    if (!number) {
        alert('출결번호를 입력해주세요.');
        return;
    }
    
    if (number.length < 4 || number.length > 5) {
        alert('출결번호는 4-5자리입니다.');
        return;
    }
    
    try {
        if (!Auth.isLoggedIn()) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const student = attendanceStudents.find(s => s.attendance_number === number);
        
        if (!student) {
            alert(`출결번호 ${number}에 해당하는 학생을 찾을 수 없습니다.`);
            return;
        }
        
        const existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
        
        if (!existingRecord) {
            alert(`${student.name} 학생의 입실 기록이 없습니다.`);
            return;
        }
        
        const now = new Date();
        const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        await API.update('attendance', existingRecord.id, {
            ...existingRecord,
            check_out_time: checkOutTime
        });
        
        alert(`${student.name} 퇴실 ${checkOutTime}`);
        
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
        numberInput.value = '';
        numberInput.focus();
        
    } catch (error) {
        console.error('퇴실 처리 실패:', error);
        alert('퇴실 처리에 실패했습니다.');
    }
}

// 통합 출석 처리 함수
async function processStudentAttendance(studentData, studentStatus) {
    console.log('출석 처리:', studentData.name, studentStatus);
    
    // 로그인 확인
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        return;
    }

    // 이미 출석 체크되었는지 확인 (ID가 있는 경우만)
    if (studentData.id) {
        const existingRecord = todayAttendanceRecords.find(r => r.student_id === studentData.id);
        
        if (existingRecord) {
            alert(`${studentData.name} 학생은 이미 출석 체크되었습니다.`);
            return;
        }
    } else {
        // ID가 없는 경우 이름으로 중복 체크
        const existingRecord = todayAttendanceRecords.find(r => 
            r.student_name === studentData.name && !r.student_id
        );
        
        if (existingRecord) {
            alert(`${studentData.name} 학생은 이미 출석 체크되었습니다.`);
            return;
        }
    }

    // 현재 시간
    const now = new Date();
    const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 출석 데이터 생성
    const attendanceData = {
        student_id: studentData.id || null,
        student_name: studentData.name,
        date: getSelectedDateString(),
        check_in_time: checkInTime,
        check_out_time: '',
        status: '출석',
        absence_reason: '',
        makeup_date: ''
    };

    try {
        const result = await API.create('attendance', attendanceData);
        console.log('출석 체크 성공:', result);
        
        // 상태별 메시지
        let message = `${studentData.name} 학생 출석 체크 완료`;
        if (studentStatus === 'unknown') {
            message += ' (정보 없음 - 파란색 표시)';
        } else if (studentStatus === '휴원' || studentStatus === '퇴원') {
            message += ` (${studentStatus} 학생)`;
        }
        
        alert(message);
        
        // 데이터 새로고침
        await loadAttendanceData();
        await renderMonthlyCalendar();
    } catch (error) {
        console.error('출석 체크 실패:', error);
        alert('출석 체크에 실패했습니다.');
    }
}

// ============================================
// 3. 데이터 로드
// ============================================
async function loadAttendanceData() {
    console.log('출석 데이터 로드 시작');
    
    try {
        // 학생 목록 로드
        const studentsResponse = await API.getList('students', { limit: 1000 });
        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
        let allStudents = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        
        // ✅ 선생님인 경우 담당 학생만 필터링 (teacher_id 기반)
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        console.log('[loadAttendanceData] 권한 필터링 후 학생 수:', allStudents.length);
        
        // 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
        if ((Auth.isAdmin() || Auth.isSubAdmin()) && currentAttendanceTeacherFilter !== 'all') {
            allStudents = allStudents.filter(s => s.teacher_id === currentAttendanceTeacherFilter);
            console.log('[loadAttendanceData] 선생님 필터링 후 학생 수:', allStudents.length);
        }
        
        console.log('전체 학생 수:', allStudents.length);
        console.log('재원생 수:', allStudents.filter(s => s.status === '재원').length);
        
        // 선택된 날짜의 요일 확인
        const selectedDate = getSelectedDateString();
        console.log('선택된 날짜:', selectedDate);
        
        const dateObj = new Date(selectedDate);
        console.log('날짜 객체:', dateObj);
        
        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const selectedDayKey = dayKeys[dateObj.getDay()];
        console.log('선택된 요일 키:', selectedDayKey, '(인덱스:', dateObj.getDay(), ')');
        
        // ✅ 예약 상태/스케줄 반영하여 재원생만 필터링
        attendanceStudents = await window.getActiveStudentsOnDate(allStudents, selectedDate);
        
        console.log(`재원생 학생 수:`, attendanceStudents.length);
        console.log('필터링된 학생:', attendanceStudents.map(s => s.name));
        console.log('선택된 요일:', selectedDayKey);
        
        // 선택된 날짜의 출석 기록 로드
        const attendanceResponse = await API.getList('attendance', { limit: 1000 });
        const allAttendance = Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse.data || []);
        
        todayAttendanceRecords = allAttendance.filter(record => record.date === selectedDate);
        
        console.log('선택 날짜 출석 기록:', todayAttendanceRecords.length);
        
        // 화면 렌더링
        renderStudentSelect();
        renderAttendanceTable();
        
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        const tbody = document.getElementById('attendanceTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #f44336;">
                        데이터를 불러오는데 실패했습니다.
                    </td>
                </tr>
            `;
        }
    }
}

// 학생이 특정 날짜에 활동 중이었는지 확인
function checkStudentActiveOnDate(student, dateString) {
    if (student.status === '재원') return true;
    
    // 휴원일 또는 퇴원일이 있는지 확인
    let statusChangeDate = null;
    
    if (student.status === '휴원' && student.withdrawal_date) {
        statusChangeDate = student.withdrawal_date;
    } else if (student.status === '퇴원' && student.withdrawal_date) {
        statusChangeDate = student.withdrawal_date;
    }
    
    // 상태 변경 날짜가 없거나, 조회 날짜가 상태 변경 날짜 이전이면 활동 중
    if (!statusChangeDate) return student.status === '재원';
    
    return dateString < statusChangeDate;
}

// 날짜 변경 시 데이터 다시 로드
async function loadAttendanceByDate() {
    const selectedDate = document.getElementById('attendanceDateInput').value;
    updateDateDisplay(selectedDate);
    await loadAttendanceData();
    await renderMonthlyCalendar();
}

// 날짜 변경 (전날/다음날)
function changeAttendanceDate(days) {
    const dateInput = document.getElementById('attendanceDateInput');
    const currentDate = new Date(dateInput.value || new Date());
    currentDate.setDate(currentDate.getDate() + days);
    
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;
    
    dateInput.value = newDateStr;
    loadAttendanceByDate();
}

// ============================================
// 4. 학생 선택 드롭다운 렌더링
// ============================================
function renderStudentSelect() {
    const select = document.getElementById('registerStudentSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">학생 선택</option>';
    
    attendanceStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (${student.attendance_number || '-'})`;
        select.appendChild(option);
    });
}

// ============================================
// 5. 출석 테이블 렌더링 (스케줄 기반)
// ============================================
function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // 2행: 신규 출석 등록 행 추가
    const registerRow = document.createElement('tr');
    registerRow.className = 'register-row';
    registerRow.style.backgroundColor = '#fffbf0';
    registerRow.innerHTML = `
        <td style="padding: 0.5rem; background-color: #fffbf0;">
            <select id="registerStudentSelect" class="form-select" style="width: 100%; margin-bottom: 0.3rem;" onchange="handleRegisterStudentChange()">
                <option value="">재원생 선택</option>
            </select>
            <input type="text" id="registerManualName" class="form-input" placeholder="또는 이름 입력" style="width: 100%;" />
        </td>
        <td style="background-color: #fffbf0;"><input type="text" id="registerCheckInTime" class="form-input" placeholder="14:00" 
            onblur="this.value = formatTimeInput(this.value)" /></td>
        <td style="background-color: #fffbf0;"><input type="text" id="registerCheckOutTime" class="form-input" placeholder="15:30"
            onblur="this.value = formatTimeInput(this.value)" /></td>
        <td style="background-color: #fffbf0;"></td>
        <td style="background-color: #fffbf0;">
            <select id="registerStatus" class="form-select" onchange="handleRegisterStatusChange()">
                <option value="">상태</option>
                <option value="출석" style="color: #4CAF50; font-weight: 600;">출석</option>
                <option value="결석" style="color: #000; text-decoration: line-through;">결석</option>
                <option value="보강" style="color: #f44336; font-weight: 600;">보강</option>
                <option value="보충" style="color: #9C27B0; font-weight: 600;">보충</option>
            </select>
            <input type="text" id="registerAbsenceReason" class="form-input" placeholder="결석 사유 입력" style="display: none; margin-top: 5px;" />
            <div id="registerMakeupDate" style="display: none; margin-top: 5px;">
                <input type="date" id="registerMakeupDateInput" class="form-input" style="width: 100%;" placeholder="보강 날짜" />
            </div>
        </td>
        <td style="background-color: #fffbf0;">
            <button class="btn-register" onclick="registerNewAttendance()">등록</button>
        </td>
        <td style="background-color: #fffbf0;"></td>
    `;
    tbody.appendChild(registerRow);
    
    // 등록 행의 학생 선택 드롭다운 채우기
    renderStudentSelectForRegister();
    
    // 3행부터: 모든 출석 기록을 입실시간 빠른 순으로 정렬
    // 1. 스케줄이 있는 학생들의 출석 정보 수집
    const allAttendanceRows = [];
    const selectedDate = getSelectedDateString();
    const dateObj = new Date(selectedDate);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const selectedDayKey = dayKeys[dateObj.getDay()];
    
    attendanceStudents.forEach(student => {
        // ✅ effectiveSchedule 사용 (예약 스케줄이 적용된 스케줄)
        let schedule = student.effectiveSchedule || student.schedule;
        if (typeof schedule === 'string' && schedule.trim() !== '') {
            try { schedule = JSON.parse(schedule); } catch (e) { schedule = {}; }
        } else if (!schedule) {
            schedule = {};
        }
        
        // 기본 요일 스케줄
        const daySchedule = schedule[selectedDayKey] || {};
        
        // ✅ 학생의 모든 출석 기록 가져오기 (같은 날짜에 여러 개 있을 수 있음)
        const studentRecords = todayAttendanceRecords.filter(r => r.student_id === student.id);
        
        // ✅ 이미 사용된 기록 ID 추적
        const usedRecordIds = new Set();
        
        console.log(`[출석현황] ${student.name}: 주간스케줄=${daySchedule.enabled}, 출석기록수=${studentRecords.length}`);
        
        // ✅ 기본 요일 스케줄이 있으면 메인 행으로 추가
        if (daySchedule.enabled) {
            // 기본 스케줄의 checkIn 시간과 가장 가까운 출석 기록 찾기
            let mainRecord = null;
            if (studentRecords.length > 0) {
                // ✅ 우선순위 1: 결석 레코드가 있으면 그것을 메인 레코드로 사용 (휴일 등록 등)
                mainRecord = studentRecords.find(r => r.status === '결석');
                
                // ✅ 우선순위 2: 결석이 없으면 입실 시간이 스케줄과 가장 가까운 레코드
                // ⚠️ 보강/보충 레코드는 제외 (추가 행으로 별도 렌더링)
                if (!mainRecord && daySchedule.checkIn) {
                    mainRecord = studentRecords.reduce((closest, record) => {
                        // 보강/보충 레코드는 메인 레코드로 사용하지 않음
                        if (record.status === '보강' || record.status === '보충') return closest;
                        if (!record.check_in_time) return closest;
                        const recordTime = record.check_in_time;
                        const scheduleTime = daySchedule.checkIn;
                        
                        if (!closest) return record;
                        
                        const closestDiff = Math.abs(timeToMinutes(closest.check_in_time || '00:00') - timeToMinutes(scheduleTime));
                        const recordDiff = Math.abs(timeToMinutes(recordTime) - timeToMinutes(scheduleTime));
                        
                        return recordDiff < closestDiff ? record : closest;
                    }, null);
                } else if (!mainRecord) {
                    // 입실 시간도 없으면 첫 번째 레코드 사용 (보강/보충 제외)
                    mainRecord = studentRecords.find(r => r.status !== '보강' && r.status !== '보충') || null;
                }
                
                if (mainRecord) usedRecordIds.add(mainRecord.id); // 사용된 기록 마킹
            }
            
            const checkInTime = mainRecord?.check_in_time || daySchedule.checkIn || '23:59';
            console.log(`  → 메인행 추가: ${student.name} (checkIn=${checkInTime}, record=${mainRecord?.id || 'null'})`);
            allAttendanceRows.push({
                type: 'scheduled',
                student: student,
                record: mainRecord,
                daySchedule: daySchedule,
                checkInTime: checkInTime,
                scheduleType: 'main'
            });
        }
        
        // ✅ 같은 학생의 나머지 출석 기록도 무조건 추가 (주간 스케줄 유무와 무관)
        studentRecords.forEach(record => {
            if (!usedRecordIds.has(record.id)) {
                console.log(`  → 추가행 추가: ${student.name} (checkIn=${record.check_in_time}, record=${record.id})`);
                allAttendanceRows.push({
                    type: 'extra',
                    student: student,
                    record: record,
                    checkInTime: record.check_in_time || '23:59',
                    scheduleType: 'extra'
                });
            }
        });
    });
    
    // 2. 스케줄이 없지만 수동으로 등록된 출석 기록 추가
    // ✅ 선생님 필터가 적용된 경우, 해당 선생님 학생의 기록만 표시
    const studentsWithSchedule = new Set(attendanceStudents.map(s => s.id));
    const allowedStudentIds = new Set(attendanceStudents.map(s => s.id));
    
    todayAttendanceRecords.forEach(record => {
        // 스케줄에 없고, 필터링된 학생 목록에 포함된 경우만 추가
        if (!studentsWithSchedule.has(record.student_id) && allowedStudentIds.has(record.student_id)) {
            allAttendanceRows.push({
                type: 'manual',
                record: record,
                checkInTime: record.check_in_time || '23:59'
            });
        }
    });
    
    // 3. 입실시간 순으로 정렬
    allAttendanceRows.sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));
    
    // 4. 정렬된 행 렌더링
    allAttendanceRows.forEach(item => {
        if (item.type === 'scheduled') {
            // 스케줄이 있는 학생
            const student = item.student;
            const existingRecord = item.record;
            const daySchedule = item.daySchedule;
            
            // 기본값: 스케줄의 입실/퇴실 시간 사용
            const scheduleCheckIn = daySchedule.checkIn || '';
            const scheduleCheckOut = daySchedule.checkOut || '';
            
            let checkInTime = '';
            let checkOutTime = '';
            let status = '';
            let actualDuration = '';
            let scheduledDuration = parseInt(daySchedule.duration) || 90;
            
            let absenceReason = '';
            let makeupDate = '';
            
            if (existingRecord) {
                // 출석 기록이 있으면 기록의 시간 사용
                checkInTime = existingRecord.check_in_time || '';
                checkOutTime = existingRecord.check_out_time || '';
                status = existingRecord.status || '';
                absenceReason = existingRecord.absence_reason || '';
                makeupDate = existingRecord.makeup_date || '';
                
                if (checkInTime && checkOutTime) {
                    actualDuration = calculateDurationInMinutes(checkInTime, checkOutTime);
                    // 재실시간이 60분이면 스케줄 기준 시간으로 계산
                    if (actualDuration === 60 && scheduledDuration) {
                        actualDuration = scheduledDuration;
                    }
                }
            } else {
                // 출석 기록이 없으면 스케줄 시간을 표시
                checkInTime = scheduleCheckIn;
                checkOutTime = scheduleCheckOut;
            }
        
        const row = document.createElement('tr');
        row.dataset.studentId = student.id;
        row.dataset.studentName = student.name;
        row.dataset.recordId = existingRecord ? existingRecord.id : '';
        row.dataset.scheduledDuration = scheduledDuration;
        row.dataset.scheduleType = item.scheduleType; // 'main' 또는 'extra'
        
        // 고유 행 ID 생성
        const rowId = `${student.id}-${item.scheduleType}`;
        
        // 담당 선생님 색상 적용 (관리자/부관리자만)
        if (Auth.isAdminOrSubAdmin() && student.teacher_id && typeof getTeacherColorClass === 'function') {
            const teacherColor = getTeacherColorClass(student.teacher_id);
            if (teacherColor) {
                row.style.backgroundColor = teacherColor;
            }
        }
        
            // 재실시간 표시
            let durationText = '';
            let durationColor = ''; // 변수 선언 추가
            if (actualDuration) {
                durationText = `${actualDuration}분`;
            } else if (scheduledDuration) {
                // 실제 재실시간이 없으면 스케줄 기준 시간 표시
                durationText = `${scheduledDuration}분`;
                durationColor = 'style="color: #999;"'; // 회색으로 표시
            }
            
            // 재실시간 색상 결정
            if (actualDuration && actualDuration < scheduledDuration) {
                durationColor = 'style="color: red; font-weight: bold;"';
            }
        
        // 상태별 색상 및 텍스트
        let statusColor = '';
        let statusText = status || '';
        let statusStyle = '';
        
        // 4열 초과 여부 확인
        let overflowBadge = '';
        const selectedDate = getSelectedDateString();
        if (typeof globalDateScheduleData !== 'undefined' && globalDateScheduleData[selectedDate]) {
            const dateData = globalDateScheduleData[selectedDate];
            // 모든 열에서 현재 학생의 overflow 여부 확인
            dateData.columns.forEach(col => {
                const studentItem = col.find(item => item.student.id === student.id);
                if (studentItem && studentItem.overflow) {
                    overflowBadge = '<span style="display: inline-block; background-color: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem; margin-left: 5px;">4열 초과</span>';
                }
            });
        }
        
        if (status === '출석') {
            statusColor = 'style="color: #4CAF50; font-weight: 600;"';
        } else if (status === '보강') {
            // 보강 날짜 표시
            if (makeupDate) {
                // "2025-01-05" → "1/5" 형식으로 변환
                const dateParts = makeupDate.substring(5).split('-');
                const month = parseInt(dateParts[0], 10);
                const day = parseInt(dateParts[1], 10);
                const formattedDate = `${month}/${day}`;
                statusText = `보강(${formattedDate})`;
            }
            statusColor = 'style="color: #f44336; font-weight: 600;"';
        } else if (status === '보충') {
            // 보충 표시
            statusColor = 'style="color: #9C27B0; font-weight: 600;"';
        } else if (status === '결석') {
            // ✅ 결석 사유 표시: "결석"에만 취소선
            if (absenceReason) {
                statusText = `<span style="text-decoration: line-through;">결석</span>(${absenceReason})`;
            } else {
                statusText = `<span style="text-decoration: line-through;">결석</span>`;
            }
            // ✅ 보강 결석: 빨간색, 보충 결석: 보라색, 일반 결석: 검정색
            if (makeupDate) {
                // 보강 결석: 빨간색 유지
                statusColor = 'style="color: #f44336; font-weight: 600;"';
            } else if (item.scheduleType === 'extra') {
                // 보충 결석: 보라색 유지
                statusColor = 'style="color: #9C27B0; font-weight: 600;"';
            } else {
                // 일반 결석: 검정색
                statusColor = 'style="color: #000; font-weight: 600;"';
            }
        } else {
            // 상태가 비어있을 때: 입실만 있으면 체크 이모티콘 표시
            if (checkInTime && !checkOutTime) {
                statusText = '✓';
                // 보강/보충 여부에 따라 색상 변경
                if (makeupDate) {
                    // 보강: 빨간색 체크
                    statusColor = 'style="color: #f44336; font-weight: 600; font-size: 1.2rem;"';
                } else if (item.scheduleType === 'extra') {
                    // 보충: 보라색 체크
                    statusColor = 'style="color: #9C27B0; font-weight: 600; font-size: 1.2rem;"';
                } else {
                    // 일반: 초록색 체크
                    statusColor = 'style="color: #4CAF50; font-weight: 600; font-size: 1.2rem;"';
                }
            } else {
                statusColor = 'style="color: #000;"';
            }
        }
        
        row.innerHTML = `
            <td>${student.name} (${student.attendance_number || '-'})</td>
            <td>
                <span class="display-mode" id="display-checkin-${rowId}">${checkInTime || '-'}</span>
                <input type="text" class="form-input edit-mode" id="edit-checkin-${rowId}" value="${checkInTime}" placeholder="14:00" style="display: none;"
                    onblur="this.value = formatTimeInput(this.value)" />
            </td>
            <td>
                <span class="display-mode" id="display-checkout-${rowId}">${checkOutTime || '-'}</span>
                <input type="text" class="form-input edit-mode" id="edit-checkout-${rowId}" value="${checkOutTime}" placeholder="15:30" style="display: none;"
                    onblur="this.value = formatTimeInput(this.value)" />
            </td>
            <td class="duration-display" ${durationColor}>${durationText}</td>
            <td>
                <span class="display-mode" id="display-status-${rowId}" ${statusColor}>${statusText || (existingRecord ? '-' : '')}${overflowBadge}</span>
                <div class="edit-mode" id="edit-status-container-${rowId}" style="display: none;">
                    <select class="form-select status-select" id="status-${rowId}" onchange="handleStatusChange('${rowId}')">
                        <option value="" ${status === '' ? 'selected' : ''}></option>
                        <option value="출석" ${status === '출석' ? 'selected' : ''} style="color: #4CAF50; font-weight: 600;">출석</option>
                        <option value="결석" ${status === '결석' ? 'selected' : ''} style="color: #000; text-decoration: line-through;">결석</option>
                        <option value="보강" ${status === '보강' ? 'selected' : ''} style="color: #f44336; font-weight: 600;">보강</option>
                        <option value="보충" ${status === '보충' ? 'selected' : ''} style="color: #9C27B0; font-weight: 600;">보충</option>
                    </select>
                    <input type="text" class="form-input" id="absence-reason-${rowId}" value="${absenceReason}" placeholder="결석 사유 입력" style="display: ${status === '결석' ? 'block' : 'none'}; margin-top: 5px;" />
                    <div id="makeup-date-${rowId}" style="display: ${status === '보강' ? 'block' : 'none'}; margin-top: 5px;">
                        <input type="text" id="makeup-date-input-${rowId}" class="form-input" value="${makeupDate ? makeupDate.substring(5).replace('-', '/') : ''}" style="width: 100%;" placeholder="결석날짜 (MM/DD)" maxlength="5" oninput="formatMakeupDateInput(this)" />
                    </div>
                </div>
            </td>
            <td>
                <button class="btn-attendance" onclick="handleAttendance('${student.id}', '${existingRecord ? existingRecord.id : ''}')" title="출석">출석</button>
                <button class="btn-absence" onclick="handleAbsence('${student.id}', '${existingRecord ? existingRecord.id : ''}')" title="결석">결석</button>
            </td>
            <td>
                <button class="btn-icon btn-edit display-mode" id="btn-edit-${rowId}" onclick="enterEditMode('${rowId}')" title="수정"></button>
                ${existingRecord ? `<button class="btn-icon btn-delete display-mode" id="btn-delete-${rowId}" onclick="deleteAttendance('${rowId}', '${existingRecord.id}')" style="margin-left: 0.5rem;" title="삭제"></button>` : ''}
                <div class="edit-mode" id="edit-buttons-${rowId}" style="display: none;">
                    <button class="btn-save" onclick="saveAttendance('${rowId}', '${existingRecord ? existingRecord.id : ''}')">저장</button>
                    <button class="btn-cancel" onclick="cancelEditMode('${rowId}')">취소</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
        } else if (item.type === 'manual') {
            // 스케줄이 없는 수동 등록
            const record = item.record;
            const checkInTime = record.check_in_time || '';
            const expectedOutTime = record.expected_out_time || '';
            const checkOutTime = record.check_out_time || '';
            const status = record.status || '';
            const absenceReason = record.absence_reason || '';
            const makeupDate = record.makeup_date || '';
            
            let actualDuration = '';
            if (checkInTime && checkOutTime) {
                actualDuration = calculateDurationInMinutes(checkInTime, checkOutTime);
            }
            
            let durationColor = '';
            if (actualDuration) {
                const scheduledDuration = 90;
                if (actualDuration < scheduledDuration) {
                    durationColor = 'color: red; font-weight: bold;';
                }
            }
            
            // 상태별 색상 및 텍스트
            let statusColor = '';
            let statusText = status || '';
            if (status === '출석') {
                statusColor = 'color: #4CAF50; font-weight: 600;';
            } else if (status === '보강') {
                // 보강 날짜 표시
                if (makeupDate) {
                    // "2025-01-05" → "1/5" 형식으로 변환
                    const dateParts = makeupDate.substring(5).split('-');
                    const month = parseInt(dateParts[0], 10);
                    const day = parseInt(dateParts[1], 10);
                    const formattedDate = `${month}/${day}`;
                    statusText = `보강(${formattedDate})`;
                }
                statusColor = 'color: #f44336; font-weight: 600;';
            } else if (status === '보충') {
                statusColor = 'color: #9C27B0; font-weight: 600;';
            } else if (status === '결석') {
                if (absenceReason) {
                    statusText = `<span style="text-decoration: line-through;">결석</span>(${absenceReason})`;
                } else {
                    statusText = `<span style="text-decoration: line-through;">결석</span>`;
                }
                // ✅ 보강 결석: 빨간색, 일반 결석: 검정색
                if (makeupDate) {
                    statusColor = 'color: #f44336; font-weight: 600;';
                } else {
                    statusColor = 'color: #000; font-weight: 600;';
                }
            } else {
                // 상태가 비어있을 때: 입실만 있으면 체크 이모티콘 표시
                if (checkInTime && !checkOutTime) {
                    statusText = '✓';
                    // 보강/보충 여부에 따라 색상 변경
                    if (makeupDate) {
                        // 보강: 빨간색 체크
                        statusColor = 'color: #f44336; font-weight: 600; font-size: 1.2rem;';
                    } else {
                        // 일반: 초록색 체크
                        statusColor = 'color: #4CAF50; font-weight: 600; font-size: 1.2rem;';
                    }
                } else {
                    statusColor = 'color: #000;';
                }
            }
            
            const row = document.createElement('tr');
            row.dataset.studentId = record.student_id || 'unknown';
            row.dataset.studentName = record.student_name || '';
            row.dataset.recordId = record.id;
            
            // 담당 선생님 색상 적용 (수동 등록 학생 - 관리자/부관리자만)
            if (Auth.isAdminOrSubAdmin() && record.student_id) {
                const student = attendanceStudents.find(s => s.id === record.student_id);
                if (student && student.teacher_id && typeof getTeacherColorClass === 'function') {
                    const teacherColor = getTeacherColorClass(student.teacher_id);
                    if (teacherColor) {
                        row.style.backgroundColor = teacherColor;
                    }
                }
            }
            
            // 고유 rowId 생성 (같은 학생의 여러 행 구분)
            const rowId = `${record.student_id}-${record.id}`;
            
            row.innerHTML = `
                <td style="text-align: center;">${record.student_name || '-'}</td>
                <td style="text-align: center;">
                    <div class="display-mode" id="display-checkin-${rowId}">${checkInTime || '-'}</div>
                    <input type="text" class="form-input edit-mode" id="edit-checkin-${rowId}" value="${checkInTime}" style="display: none;" 
                        onblur="this.value = formatTimeInput(this.value)" />
                </td>
                <td style="text-align: center;">
                    <div class="display-mode" id="display-checkout-${rowId}">${checkOutTime || '-'}</div>
                    <input type="text" class="form-input edit-mode" id="edit-checkout-${rowId}" value="${checkOutTime}" style="display: none;" 
                        onblur="this.value = formatTimeInput(this.value)" />
                </td>
                <td class="duration-display" style="${durationColor}">${actualDuration ? `${actualDuration}분` : '-'}</td>
                <td style="text-align: center;">
                    <span class="display-mode" id="display-status-${rowId}" style="${statusColor}">${statusText || '-'}</span>
                    <div class="edit-mode" id="edit-status-container-${rowId}" style="display: none;">
                        <select class="form-select" id="status-${rowId}" onchange="handleStatusChange('${rowId}')">
                            <option value="" ${status === '' ? 'selected' : ''}></option>
                            <option value="출석" ${status === '출석' ? 'selected' : ''}>출석</option>
                            <option value="결석" ${status === '결석' ? 'selected' : ''}>결석</option>
                            <option value="보강" ${status === '보강' ? 'selected' : ''}>보강</option>
                            <option value="보충" ${status === '보충' ? 'selected' : ''}>보충</option>
                        </select>
                        <input type="text" class="form-input" id="absence-reason-${rowId}" value="${absenceReason}" placeholder="결석 사유 입력" style="display: ${status === '결석' ? 'block' : 'none'}; margin-top: 5px;" />
                        <div id="makeup-date-${rowId}" style="display: ${status === '보강' ? 'block' : 'none'}; margin-top: 5px;">
                            <input type="text" id="makeup-date-input-${rowId}" class="form-input" value="${makeupDate ? makeupDate.substring(5).replace('-', '/') : ''}" style="width: 100%;" placeholder="결석날짜 (MM/DD)" maxlength="5" oninput="formatMakeupDateInput(this)" />
                        </div>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="btn-attendance" onclick="handleAttendance('${record.student_id}', '${record.id}')" title="출석">출석</button>
                    <button class="btn-absence" onclick="handleAbsence('${record.student_id}', '${record.id}')" title="결석">결석</button>
                </td>
                <td style="text-align: center;">
                    <button class="btn-icon btn-edit display-mode" id="btn-edit-${rowId}" onclick="enterEditMode('${rowId}')" title="수정"></button>
                    <button class="btn-icon btn-delete display-mode" id="btn-delete-${rowId}" onclick="deleteAttendance('${rowId}', '${record.id}')" style="margin-left: 0.5rem;" title="삭제"></button>
                    <div class="edit-mode" id="edit-buttons-${rowId}" style="display: none;">
                        <button class="btn-save" onclick="saveAttendance('${rowId}', '${record.id}')">저장</button>
                        <button class="btn-cancel" onclick="cancelEditMode('${rowId}')">취소</button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        } else if (item.type === 'extra') {
            // 같은 학생의 추가 출석 기록 (보충 등)
            const student = item.student;
            const record = item.record;
            const checkInTime = record.check_in_time || '';
            const expectedOutTime = record.expected_out_time || '';
            const checkOutTime = record.check_out_time || '';
            let status = record.status || '';
            const absenceReason = record.absence_reason || '';
            const makeupDate = record.makeup_date || '';
            
            let actualDuration = '';
            let durationText = '';
            let durationColor = '';
            
            if (checkInTime && checkOutTime) {
                actualDuration = calculateDurationInMinutes(checkInTime, checkOutTime);
                durationText = `${actualDuration}분`;
            }
            
            const rowId = `${student.id}-${record.id}`;
            
            // 상태별 색상 및 텍스트
            let statusColor = '';
            let statusText = status || '';
            
            if (status === '출석') {
                statusColor = 'style="color: #4CAF50; font-weight: 600;"';
            } else if (status === '보강') {
                if (makeupDate) {
                    const formattedDate = makeupDate.substring(5).replace('-', '/');
                    statusText = `보강(${formattedDate})`;
                }
                statusColor = 'style="color: #f44336; font-weight: 600;"';
            } else if (status === '보충') {
                statusColor = 'style="color: #9C27B0; font-weight: 600;"';
            } else if (status === '결석') {
                if (absenceReason) {
                    statusText = `<span style="text-decoration: line-through;">결석</span>(${absenceReason})`;
                } else {
                    statusText = `<span style="text-decoration: line-through;">결석</span>`;
                }
                // ✅ 보강 결석: 빨간색, 보충 결석: 보라색, 일반 결석: 검정색
                if (makeupDate) {
                    statusColor = 'style="color: #f44336; font-weight: 600;"';
                } else if (item.scheduleType === 'extra') {
                    statusColor = 'style="color: #9C27B0; font-weight: 600;"';
                } else {
                    statusColor = 'style="color: #000; font-weight: 600;"';
                }
            } else {
                // 상태가 비어있을 때: 입실만 있으면 체크 이모티콘 표시
                if (checkInTime && !checkOutTime) {
                    statusText = '✓';
                    // extra 타입은 항상 보충이므로 보라색 체크
                    statusColor = 'style="color: #9C27B0; font-weight: 600; font-size: 1.2rem;"';
                } else {
                    statusColor = 'style="color: #000;"';
                }
            }
            
            const row = document.createElement('tr');
            row.dataset.studentId = student.id;
            row.dataset.studentName = student.name;
            row.dataset.recordId = record.id;
            row.dataset.scheduleType = 'extra'; // 추가 행 표시
            
            // 담당 선생님 색상 적용 (관리자/부관리자만)
            if (Auth.isAdminOrSubAdmin() && student.teacher_id && typeof getTeacherColorClass === 'function') {
                const teacherColor = getTeacherColorClass(student.teacher_id);
                if (teacherColor) {
                    row.style.backgroundColor = teacherColor;
                }
            }
            
            row.innerHTML = `
                <td>${student.name} (${student.attendance_number || '-'})</td>
                <td>
                    <span class="display-mode" id="display-checkin-${rowId}">${checkInTime || '-'}</span>
                    <input type="text" class="form-input edit-mode" id="edit-checkin-${rowId}" value="${checkInTime}" placeholder="14:00" style="display: none;"
                        onblur="this.value = formatTimeInput(this.value)" />
                </td>
                <td>
                    <span class="display-mode" id="display-checkout-${rowId}">${checkOutTime || '-'}</span>
                    <input type="text" class="form-input edit-mode" id="edit-checkout-${rowId}" value="${checkOutTime}" placeholder="15:30" style="display: none;"
                        onblur="this.value = formatTimeInput(this.value)" />
                </td>
                <td class="duration-display">${durationText}</td>
                <td>
                    <span class="display-mode" id="display-status-${rowId}" ${statusColor}>${statusText || '-'}</span>
                    <div class="edit-mode" id="edit-status-container-${rowId}" style="display: none;">
                        <select class="form-select status-select" id="status-${rowId}" onchange="handleStatusChange('${rowId}')">
                            <option value="" ${status === '' ? 'selected' : ''}></option>
                            <option value="출석" ${status === '출석' ? 'selected' : ''} style="color: #4CAF50; font-weight: 600;">출석</option>
                            <option value="결석" ${status === '결석' ? 'selected' : ''} style="color: #000; text-decoration: line-through;">결석</option>
                            <option value="보강" ${status === '보강' ? 'selected' : ''} style="color: #f44336; font-weight: 600;">보강</option>
                            <option value="보충" ${status === '보충' ? 'selected' : ''} style="color: #9C27B0; font-weight: 600;">보충</option>
                        </select>
                        <input type="text" class="form-input" id="absence-reason-${rowId}" value="${absenceReason}" placeholder="결석 사유 입력" style="display: ${status === '결석' ? 'block' : 'none'}; margin-top: 5px;" />
                        <div id="makeup-date-${rowId}" style="display: ${status === '보강' ? 'block' : 'none'}; margin-top: 5px;">
                            <input type="text" id="makeup-date-input-${rowId}" class="form-input" value="${makeupDate ? makeupDate.substring(5).replace('-', '/') : ''}" style="width: 100%;" placeholder="결석날짜 (MM/DD)" maxlength="5" oninput="formatMakeupDateInput(this)" />
                        </div>
                    </div>
                </td>
                <td>
                    <button class="btn-attendance" onclick="handleAttendance('${student.id}', '${record.id}')" title="출석">출석</button>
                    <button class="btn-absence" onclick="handleAbsence('${student.id}', '${record.id}')" title="결석">결석</button>
                </td>
                <td>
                    <button class="btn-icon btn-edit display-mode" id="btn-edit-${rowId}" onclick="enterEditMode('${rowId}')" title="수정"></button>
                    <button class="btn-icon btn-delete display-mode" id="btn-delete-${rowId}" onclick="deleteAttendance('${rowId}', '${record.id}')" style="margin-left: 0.5rem;" title="삭제"></button>
                    <div class="edit-mode" id="edit-buttons-${rowId}" style="display: none;">
                        <button class="btn-save" onclick="saveAttendance('${rowId}', '${record.id}')">저장</button>
                        <button class="btn-cancel" onclick="cancelEditMode('${rowId}')">취소</button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        }
    });
    
    // 스케줄도 없고 출석 기록도 없는 경우
    if (allAttendanceRows.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="7" style="text-align: center; color: #999;">
                해당 날짜에 출석 기록이 없습니다.
            </td>
        `;
        tbody.appendChild(emptyRow);
    }
    
    // 통계 계산 및 표시
    let attendanceCount = 0;
    let makeupCount = 0;
    let absenceCount = 0;
    
    allAttendanceRows.forEach(item => {
        if (item.type === 'scheduled') {
            const status = item.record?.status || '';
            if (status === '출석') attendanceCount++;
            else if (status === '보강') makeupCount++;
            else if (status === '결석') absenceCount++;
        } else if (item.type === 'manual') {
            const status = item.record?.status || '';
            if (status === '출석') attendanceCount++;
            else if (status === '보강') makeupCount++;
            else if (status === '결석') absenceCount++;
        }
    });
    
    // 통계 표시
    const summaryElement = document.getElementById('attendanceSummary');
    if (summaryElement) {
        summaryElement.textContent = `${attendanceCount}(${makeupCount})명 / ${absenceCount}명`;
    }
}

// 재실시간 계산 (분 단위로 반환)
function calculateDurationInMinutes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const diffMinutes = endMinutes - startMinutes;
    
    return diffMinutes > 0 ? diffMinutes : 0;
}

// 입실시간 입력 시 퇴실예정시간 자동 계산
function autoUpdateExpectedOutTime(rowId, checkInTime, scheduledDuration) {
    // 시간 형식 자동 변환 (1400 → 14:00)
    const formattedTime = formatTimeInput(checkInTime);
    
    if (!formattedTime || !/^\d{2}:\d{2}$/.test(formattedTime)) {
        return; // 유효하지 않은 시간 형식이면 중단
    }
    
    // 퇴실예정시간 계산
    const duration = scheduledDuration || 90; // 기본 90분
    const expectedOutTime = addMinutesToTime(formattedTime, duration);
    
    // 퇴실예정시간 입력란 업데이트
    const expectedOutInput = document.getElementById(`edit-expected-${rowId}`);
    if (expectedOutInput) {
        expectedOutInput.value = expectedOutTime;
    }
    
    // 표시 영역도 업데이트 (편집 모드에서 보이지 않지만 저장 시 사용)
    const expectedOutDisplay = document.getElementById(`display-expected-${rowId}`);
    if (expectedOutDisplay) {
        expectedOutDisplay.textContent = expectedOutTime;
    }
}

// 시간에 분을 더하는 함수
function addMinutesToTime(timeStr, minutes) {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return '';
    
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// ============================================
// 수정/취소 모드 전환
// ============================================

function enterEditMode(rowId) {
    // Display 모드 숨기기
    const displayElements = document.querySelectorAll(`#display-checkin-${rowId}, #display-expected-${rowId}, #display-checkout-${rowId}, #display-status-${rowId}, #btn-edit-${rowId}`);
    displayElements.forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Edit 모드 표시
    const editElements = document.querySelectorAll(`#edit-checkin-${rowId}, #edit-expected-${rowId}, #edit-checkout-${rowId}, #edit-status-container-${rowId}, #edit-buttons-${rowId}`);
    editElements.forEach(el => {
        if (el) el.style.display = el.id.includes('container') ? 'block' : 'inline-block';
    });
}

function cancelEditMode(rowId) {
    // Edit 모드 숨기기
    const editElements = document.querySelectorAll(`#edit-checkin-${rowId}, #edit-expected-${rowId}, #edit-checkout-${rowId}, #edit-status-container-${rowId}, #edit-buttons-${rowId}`);
    editElements.forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Display 모드 표시
    const displayElements = document.querySelectorAll(`#display-checkin-${rowId}, #display-expected-${rowId}, #display-checkout-${rowId}, #display-status-${rowId}, #btn-edit-${rowId}`);
    displayElements.forEach(el => {
        if (el) el.style.display = 'inline-block';
    });
    
    // 데이터 다시 로드하여 원래 값으로 복원
    loadAttendanceData();
}

// 시간 형식 변환 함수 (1530 → 15:30)
function formatTimeInput(value) {
    if (!value) return '';
    
    // 숫자만 추출
    const digits = value.replace(/\D/g, '');
    
    // 4자리 숫자인 경우 HH:MM 형식으로 변환
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

// 출석 필드 업데이트
async function updateAttendanceField(studentId, field, value) {
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (!row) return;
    
    const recordId = row.dataset.recordId;
    
    // 입실시간 변경 시 퇴실예정시간 자동 계산
    if (field === 'check_in_time' && value) {
        const student = attendanceStudents.find(s => s.id === studentId);
        if (student) {
            let schedule = student.schedule;
            if (typeof schedule === 'string') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (e) {
                    return;
                }
            }
            
            const selectedDate = getSelectedDateString();
            const dateObj = new Date(selectedDate);
            const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const selectedDayKey = dayKeys[dateObj.getDay()];
            
            const daySchedule = schedule[selectedDayKey];
            if (daySchedule) {
                const duration = parseInt(daySchedule.duration) || 90;
                const expectedOut = addMinutesToTime(value, duration);
                
                const expectedOutInput = row.querySelector('td:nth-child(3) input');
                if (expectedOutInput) {
                    expectedOutInput.value = expectedOut;
                }
            }
        }
    }
    
    // 퇴실시간 변경 시 재실시간 자동 계산 및 색상 처리
    if (field === 'check_out_time') {
        const checkInInput = row.querySelector('td:nth-child(2) input');
        const durationCell = row.querySelector('.duration-display');
        const scheduledDuration = parseInt(row.dataset.scheduledDuration) || 90;
        
        if (checkInInput && durationCell && value) {
            const actualDuration = calculateDurationInMinutes(checkInInput.value, value);
            
            // 재실시간 표시
            durationCell.textContent = `${actualDuration}분`;
            
            // 색상 처리: 스케줄보다 작으면 빨강, 이상이면 검정
            if (actualDuration < scheduledDuration) {
                durationCell.style.color = 'red';
                durationCell.style.fontWeight = 'bold';
            } else {
                durationCell.style.color = '';
                durationCell.style.fontWeight = '';
            }
        }
    }
    
    // 상태를 "출석"으로 변경 시 스케줄 시간으로 자동 설정
    if (field === 'status' && value === '출석') {
        const student = attendanceStudents.find(s => s.id === studentId);
        if (student) {
            let schedule = student.schedule;
            if (typeof schedule === 'string') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (e) {
                    return;
                }
            }
            
            const selectedDate = getSelectedDateString();
            const dateObj = new Date(selectedDate);
            const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const selectedDayKey = dayKeys[dateObj.getDay()];
            
            const daySchedule = schedule[selectedDayKey];
            if (daySchedule) {
                // 스케줄의 입실/퇴실 시간으로 설정
                const checkInInput = row.querySelector('td:nth-child(2) input');
                const checkOutInput = row.querySelector('td:nth-child(4) input');
                const expectedOutInput = row.querySelector('td:nth-child(3) input');
                const durationCell = row.querySelector('.duration-display');
                
                if (checkInInput && daySchedule.checkIn) {
                    checkInInput.value = daySchedule.checkIn;
                }
                
                if (expectedOutInput && daySchedule.checkOut) {
                    expectedOutInput.value = daySchedule.checkOut;
                }
                
                if (checkOutInput && daySchedule.checkOut) {
                    checkOutInput.value = daySchedule.checkOut;
                }
                
                // 재실시간 자동 계산 및 표시
                if (durationCell && daySchedule.duration) {
                    const scheduledDuration = parseInt(daySchedule.duration) || 90;
                    durationCell.textContent = `${scheduledDuration}분`;
                    durationCell.style.color = '';
                    durationCell.style.fontWeight = '';
                }
            }
        }
    }
}

// 시간에 분 추가 (HH:MM 형식)
function addMinutesToTime(time, minutes) {
    if (!time) return '';
    
    const [hour, min] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + min + minutes;
    
    const newHour = Math.floor(totalMinutes / 60) % 24;
    const newMin = totalMinutes % 60;
    
    return `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
}

// 출석 저장
async function saveAttendance(rowId, recordId) {
    const selectedDate = getSelectedDateString();
    
    // rowId에서 studentId 추출
    // rowId 형식:
    //   - scheduled/extra: "studentId-scheduleType" (예: uuid-main)
    //   - manual: "studentId-recordId" (예: uuid-uuid)
    let studentId;
    
    if (recordId && rowId.includes(recordId)) {
        // manual 타입: rowId에서 recordId 부분 제거
        studentId = rowId.replace(`-${recordId}`, '');
    } else {
        // scheduled/extra 타입: 마지막 부분(scheduleType) 제거
        const parts = rowId.split('-');
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'main' || lastPart === 'extra') {
            studentId = parts.slice(0, -1).join('-');
        } else {
            // 알 수 없는 형식이면 rowId 전체를 studentId로 사용
            studentId = rowId;
        }
    }
    
    console.log('[saveAttendance] rowId:', rowId);
    console.log('[saveAttendance] recordId:', recordId);
    console.log('[saveAttendance] studentId 추출:', studentId);
    
    // 기존 레코드 확인 (시간 유지를 위해)
    const existingRecord = recordId ? todayAttendanceRecords.find(r => r.id === recordId) : null;
    
    // 입력 필드에서 값 가져오기 (✅ 사용자가 수정한 값 우선 사용)
    let checkInTime = document.getElementById(`edit-checkin-${rowId}`)?.value || '';
    let checkOutTime = document.getElementById(`edit-checkout-${rowId}`)?.value || '';
    let status = document.getElementById(`status-${rowId}`)?.value || '';
    const absenceReason = document.getElementById(`absence-reason-${rowId}`)?.value || '';
    let makeupDateInput = document.getElementById(`makeup-date-input-${rowId}`)?.value || '';
    
    // MM/DD 형식을 YYYY-MM-DD 형식으로 변환
    let makeupDate = '';
    if (makeupDateInput && status === '보강') {
        const currentYear = new Date().getFullYear();
        const parts = makeupDateInput.split('/');
        if (parts.length === 2) {
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            makeupDate = `${currentYear}-${month}-${day}`;
        }
    }
    
    // 스케줄에서 기본값 가져오기 (기존 레코드에도 없을 때만)
    const student = attendanceStudents.find(s => s.id === studentId);
    let studentName = '';
    
    if (student) {
        studentName = student.name;
        
        let schedule = student.schedule;
        if (typeof schedule === 'string' && schedule.trim() !== '') {
            try {
                schedule = JSON.parse(schedule);
            } catch (e) {
                schedule = {};
            }
        }
        
        const dateObj = new Date(selectedDate);
        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const selectedDayKey = dayKeys[dateObj.getDay()];
        const daySchedule = schedule[selectedDayKey];
        
        // 입력도 없고 기존 레코드에도 없으면 스케줄 시간 사용
        if (!checkInTime && daySchedule) {
            checkInTime = daySchedule.checkIn || '';
        }
        if (!checkOutTime && daySchedule) {
            checkOutTime = daySchedule.checkOut || '';
        }
    }
    
    // 입실시간이 없으면 경고
    if (!checkInTime) {
        alert('출석시간을 입력하거나 스케줄을 등록해주세요.');
        return;
    }
    
    // 보강 상태일 때 보강 날짜 필수 검증
    if (status === '보강' && !makeupDate) {
        alert('보강 상태로 저장하려면 보강 날짜를 선택해주세요.');
        return;
    }
    
    // 결석 상태일 때 사유 필수 검증 (선택사항)
    // if (status === '결석' && !absenceReason) {
    //     alert('결석 상태로 저장하려면 사유를 입력해주세요.');
    //     return;
    // }
    
    // 상태가 비어있으면 자동 결정
    if (!status) {
        if (checkInTime && checkOutTime) {
            // 입실/퇴실 모두 있으면: 보강/보충/출석 확정
            if (makeupDate) {
                status = '보강';
            } else if (existingRecord && existingRecord.schedule_type === 'extra') {
                status = '보충';
            } else {
                status = '출석';
            }
        } else if (checkInTime && !checkOutTime) {
            // 입실만 있고 퇴실 없으면: 체크 표시 (빈 상태 유지)
            status = '';
        } else {
            // 입실도 없으면 빈 상태
            status = '';
        }
    }
    
    const attendanceData = {
        student_id: studentId,
        student_name: studentName,
        date: selectedDate,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        status: status,
        absence_reason: absenceReason,
        makeup_date: makeupDate
    };
    
    try {
        if (recordId) {
            // 기존 기록 업데이트
            await API.update('attendance', recordId, attendanceData);
            alert('출석이 수정되었습니다.');
        } else {
            // 새 기록 생성
            await API.create('attendance', attendanceData);
            alert('출석이 저장되었습니다.');
        }
        
        // 데이터 다시 로드 및 테이블 재렌더링
        await loadAttendanceData();
        renderAttendanceTable(); // 출석현황 테이블 재렌더링
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('출석 저장 오류:', error);
        console.error('오류 상세:', error.message);
        console.error('저장하려던 데이터:', attendanceData);
        alert('출석 저장에 실패했습니다.\n오류: ' + (error.message || '알 수 없는 오류'));
    }
}

// ============================================
// 출석/결석 버튼 함수
// ============================================

// 출석 처리 (스케줄 시간대로 입실/퇴실 자동 저장)
async function handleAttendance(studentId, recordId = null) {
    try {
        console.log('[handleAttendance] 시작 - studentId:', studentId, 'recordId:', recordId);
        
        if (!Auth.isLoggedIn()) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const student = attendanceStudents.find(s => s.id === studentId);
        console.log('[handleAttendance] 학생 정보:', student);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        console.log('[handleAttendance] 학생 스케줄 (raw):', student.schedule);
        console.log('[handleAttendance] 스케줄 타입:', typeof student.schedule);
        
        let checkInTime, checkOutTime, expectedOutTime;
        
        // ✅ 빈 문자열도 null로 처리
        if (recordId === '') recordId = null;
        
        // recordId가 있으면 해당 기록만 업데이트 (2행 등록된 보강/보충 유지)
        if (recordId) {
            const existingRecord = todayAttendanceRecords.find(r => r.id === recordId);
            console.log('[handleAttendance] 기존 레코드 (recordId 있음):', existingRecord);
            
            if (!existingRecord) {
                alert('출석 기록을 찾을 수 없습니다.');
                return;
            }
            
            console.log('[handleAttendance] 기존 레코드 상태:', existingRecord.status);
            
            // ✅ 보강/보충인 경우: 기존 레코드의 시간 사용
            if (existingRecord.status === '보강' || existingRecord.status === '보충') {
                console.log('[handleAttendance] 보강/보충 처리 시작');
                console.log('[handleAttendance] 기존 입실:', existingRecord.check_in_time);
                console.log('[handleAttendance] 기존 퇴실:', existingRecord.check_out_time);
                // 이미 입실/퇴실 시간이 있으면 그대로 사용
                if (existingRecord.check_in_time && existingRecord.check_out_time) {
                    checkInTime = existingRecord.check_in_time;
                    checkOutTime = existingRecord.check_out_time;
                    expectedOutTime = existingRecord.expected_out_time || checkOutTime;
                } else {
                    // 시간이 없으면 스케줄에서 가져오기
                    console.log('[handleAttendance] 보강/보충이지만 시간 없음 - 스케줄 확인');
                    const schedule = getStudentTodaySchedule(student);
                    console.log('[handleAttendance] 가져온 스케줄:', schedule);
                    
                    if (!schedule || !schedule.checkIn || !schedule.checkOut) {
                        alert('스케줄 정보가 없습니다. 2행에서 시간을 먼저 입력해주세요.');
                        return;
                    }
                    checkInTime = schedule.checkIn;
                    checkOutTime = schedule.checkOut;
                    expectedOutTime = schedule.checkOut;
                }
            } else {
                // ✅ 일반 출석: 레코드의 기존 시간 그대로 유지
                console.log('[handleAttendance] 일반 스케줄 처리 (recordId 있음)');
                
                checkInTime = existingRecord.check_in_time || '';
                checkOutTime = existingRecord.check_out_time || '';
                expectedOutTime = existingRecord.expected_out_time || checkOutTime;
                
                console.log('[handleAttendance] 레코드의 시간 유지 - 입실:', checkInTime, '퇴실:', checkOutTime);
            }
            
            // ✅ 기존 상태가 보강/보충이면 유지, 그렇지 않으면 출석으로 변경
            const status = (existingRecord.status === '보강' || existingRecord.status === '보충') 
                ? existingRecord.status 
                : '출석';
            
            await API.update('attendance', existingRecord.id, {
                ...existingRecord,
                check_in_time: checkInTime,
                expected_out_time: expectedOutTime,
                check_out_time: checkOutTime,
                status: status
            });
            
            const statusText = status === '보강' ? '보강' : status === '보충' ? '보충' : '출석';
            // ✅ 조용히 처리 (alert 제거)
            console.log(`✅ ${student.name} ${statusText} 처리 완료 - 입실: ${checkInTime}, 퇴실: ${checkOutTime}`);
        } else {
            // ✅ recordId가 없을 때: 새 출석 기록 생성만 허용
            console.log('[handleAttendance] recordId 없음 - 새 출석 기록 생성');
            const schedule = getStudentTodaySchedule(student);
            console.log('[handleAttendance] 가져온 스케줄:', schedule);
            
            if (!schedule || !schedule.checkIn || !schedule.checkOut) {
                console.log('[handleAttendance] ❌ 스케줄 없음 - schedule:', schedule);
                alert('해당 학생의 오늘 스케줄 정보를 찾을 수 없습니다.');
                return;
            }
            
            checkInTime = schedule.checkIn;
            checkOutTime = schedule.checkOut;
            expectedOutTime = schedule.checkOut;
            console.log('[handleAttendance] 스케줄에서 가져온 시간 - 입실:', checkInTime, '퇴실:', checkOutTime);
            
            // ✅ 새 레코드만 생성 (기존 레코드 덮어쓰기 방지)
                // 새 레코드 생성
                const attendanceData = {
                    student_id: student.id,
                    student_name: student.name,
                    date: getSelectedDateString(),
                    check_in_time: checkInTime,
                    expected_out_time: expectedOutTime,
                    check_out_time: checkOutTime,
                    status: '출석',
                    absence_reason: '',
                    makeup_date: ''
                };
                
                await API.create('attendance', attendanceData);
                // ✅ 조용히 처리 (alert 제거)
                console.log(`✅ ${student.name} 출석 처리 완료 - 입실: ${checkInTime}, 퇴실: ${checkOutTime}`);
            }
        }
        
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('❌ 출석 처리 실패:', error);
        // ✅ 실패 시에도 alert 제거 (콘솔에만 로그)
    }
}

// 결석 처리
async function handleAbsence(studentId, recordId = null) {
    try {
        if (!Auth.isLoggedIn()) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const student = attendanceStudents.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        const absenceReason = prompt('결석 사유를 입력하세요 (예: 병결, 학교, 여행, 기타):', '');
        
        if (absenceReason === null) {
            return; // 취소
        }
        
        // ✅ 빈 문자열도 null로 처리
        if (recordId === '') recordId = null;
        
        // recordId가 있으면 해당 기록만 업데이트
        if (recordId) {
            const existingRecord = todayAttendanceRecords.find(r => r.id === recordId);
            if (existingRecord) {
                await API.update('attendance', existingRecord.id, {
                    ...existingRecord,
                    check_in_time: '',
                    expected_out_time: '',
                    check_out_time: '',
                    status: '결석',
                    absence_reason: absenceReason || ''
                });
                
                // ✅ 조용히 처리 (alert 제거)
                console.log(`✅ ${student.name} 결석 처리 완료 (사유: ${absenceReason || '없음'})`);
            }
        } else {
            // recordId가 없으면 기존 레코드 찾기
            const existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
            
            if (existingRecord) {
                // 기존 레코드가 있으면 업데이트
                await API.update('attendance', existingRecord.id, {
                    ...existingRecord,
                    check_in_time: '',
                    expected_out_time: '',
                    check_out_time: '',
                    status: '결석',
                    absence_reason: absenceReason || ''
                });
                
                // ✅ 조용히 처리 (alert 제거)
                console.log(`✅ ${student.name} 결석 처리 완료 (사유: ${absenceReason || '없음'})`);
            } else {
                // 새 레코드 생성
                const attendanceData = {
                    student_id: student.id,
                    student_name: student.name,
                    date: getSelectedDateString(),
                    check_in_time: '',
                    expected_out_time: '',
                    check_out_time: '',
                    status: '결석',
                    absence_reason: absenceReason || '',
                    makeup_date: ''
                };
                
                await API.create('attendance', attendanceData);
                // ✅ 조용히 처리 (alert 제거)
                console.log(`✅ ${student.name} 결석 처리 완료 (사유: ${absenceReason || '없음'})`);
            }
        }
        
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('❌ 결석 처리 실패:', error);
        // ✅ 실패 시에도 alert 제거 (콘솔에만 로그)
    }
}

// ============================================
// 빠른 입실/퇴실 버튼 함수 (구버전 - 제거 예정)
// ============================================

// 빠른 입실 처리
async function quickCheckIn(studentId, recordId = null) {
    try {
        if (!Auth.isLoggedIn()) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const student = attendanceStudents.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        const now = new Date();
        const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const schedule = getStudentTodaySchedule(student);
        const expectedOutTime = calculateExpectedTime(checkInTime, schedule ? schedule.duration : 90);
        
        // recordId가 있으면 해당 기록만 업데이트
        if (recordId) {
            const existingRecord = todayAttendanceRecords.find(r => r.id === recordId);
            if (existingRecord) {
                // 입실 버튼: 상태를 체크로 (빈 문자열)
                // 단, 기존에 보강/보충으로 등록되었다면 해당 상태 유지 (체크 표시)
                let newStatus = '';
                if (existingRecord.makeup_date) {
                    newStatus = ''; // 보강도 입실 시 체크 표시
                } else if (existingRecord.schedule_type === 'extra') {
                    newStatus = ''; // 보충도 입실 시 체크 표시
                }
                
                await API.update('attendance', existingRecord.id, {
                    ...existingRecord,
                    check_in_time: checkInTime,
                    expected_out_time: expectedOutTime,
                    status: newStatus
                });
                alert(`${student.name} 입실 ${checkInTime}`);
            }
        } else {
            // recordId가 없으면 새로 생성 (기존 로직)
            const existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
            
            if (existingRecord) {
                // 입실 버튼: 상태를 체크로 (빈 문자열)
                // 단, 기존에 보강/보충으로 등록되었다면 해당 상태 유지 (체크 표시)
                let newStatus = '';
                if (existingRecord.makeup_date) {
                    newStatus = ''; // 보강도 입실 시 체크 표시
                } else if (existingRecord.schedule_type === 'extra') {
                    newStatus = ''; // 보충도 입실 시 체크 표시
                }
                
                await API.update('attendance', existingRecord.id, {
                    ...existingRecord,
                    check_in_time: checkInTime,
                    expected_out_time: expectedOutTime,
                    status: newStatus
                });
                alert(`${student.name} 입실 ${checkInTime}`);
            } else {
                const attendanceData = {
                    student_id: student.id,
                    student_name: student.name,
                    date: getSelectedDateString(),
                    check_in_time: checkInTime,
                    expected_out_time: expectedOutTime,
                    check_out_time: '',
                    status: '',
                    absence_reason: '',
                    makeup_date: ''
                };
                
                await API.create('attendance', attendanceData);
                alert(`${student.name} 입실 ${checkInTime}`);
            }
        }
        
        await loadAttendanceData();
        renderAttendanceTable(); // 출석현황 테이블 재렌더링
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('입실 처리 실패:', error);
        alert('입실 처리에 실패했습니다.');
    }
}

// 빠른 퇴실 처리
async function quickCheckOut(studentId, recordId = null) {
    try {
        if (!Auth.isLoggedIn()) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const student = attendanceStudents.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        // recordId가 있으면 해당 기록만 업데이트
        let existingRecord;
        if (recordId) {
            existingRecord = todayAttendanceRecords.find(r => r.id === recordId);
        } else {
            existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
        }
        
        if (!existingRecord) {
            alert(`${student.name} 학생의 입실 기록이 없습니다.`);
            return;
        }
        
        const now = new Date();
        const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // 입실시간이 있으면 상태 결정: 보강 날짜가 있으면 '보강', 보충 스케줄이면 '보충', 아니면 '출석'
        let newStatus = existingRecord.status;
        if (existingRecord.check_in_time) {
            if (existingRecord.makeup_date) {
                newStatus = '보강';
            } else if (existingRecord.schedule_type === 'extra') {
                newStatus = '보충';
            } else {
                newStatus = '출석';
            }
        }
        
        await API.update('attendance', existingRecord.id, {
            ...existingRecord,
            check_out_time: checkOutTime,
            status: newStatus
        });
        
        alert(`${student.name} 퇴실 ${checkOutTime}`);
        
        await loadAttendanceData();
        renderAttendanceTable(); // 출석현황 테이블 재렌더링
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('퇴실 처리 실패:', error);
        alert('퇴실 처리에 실패했습니다.');
    }
}

// 출석 삭제 (확정된 출석만 삭제 가능)
async function deleteAttendance(rowId, recordId) {
    if (!confirm('이 출석 기록을 삭제하시겠습니까?\n\n※ 삭제 후에는 예정 스케줄로 돌아갑니다.')) {
        return;
    }
    
    try {
        await API.delete('attendance', recordId);
        alert('출석 기록이 삭제되었습니다.');
        
        // 데이터 다시 로드
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('출석 삭제 오류:', error);
        alert('출석 삭제에 실패했습니다.');
    }
}

// ============================================
// 6. 출석 등록
// ============================================

// 상태 변경 핸들러 (등록 행)
function handleRegisterStatusChange() {
    const statusSelect = document.getElementById('registerStatus');
    const reasonSelect = document.getElementById('registerAbsenceReason');
    const makeupDateDiv = document.getElementById('registerMakeupDate');
    const checkInInput = document.getElementById('registerCheckInTime');
    const checkOutInput = document.getElementById('registerCheckOutTime');
    const studentSelect = document.getElementById('registerStudentSelect');
    
    if (!statusSelect) return;
    
    const status = statusSelect.value;
    
    if (status === '결석') {
        if (reasonSelect) reasonSelect.style.display = 'block';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
    } else if (status === '보강') {
        if (reasonSelect) reasonSelect.style.display = 'none';
        if (makeupDateDiv) makeupDateDiv.style.display = 'block';
        
        // ✅ 보강 선택 시 시간 입력창 비우기 (기존 스케줄 시간 제거)
        if (checkInInput) {
            checkInInput.value = '';
            checkInInput.placeholder = '보강 입실 시간 (예: 16:00)';
        }
        if (checkOutInput) {
            checkOutInput.value = '';
            checkOutInput.placeholder = '보강 퇴실 시간 (예: 17:30)';
        }
        
        console.log('[상태 변경] 보강 모드 - 시간 입력창 초기화');
    } else if (status === '보충') {
        if (reasonSelect) reasonSelect.style.display = 'none';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
        
        // ✅ 보충 선택 시 시간 입력창 비우기
        if (checkInInput) {
            checkInInput.value = '';
            checkInInput.placeholder = '보충 입실 시간 (예: 16:00)';
        }
        if (checkOutInput) {
            checkOutInput.value = '';
            checkOutInput.placeholder = '보충 퇴실 시간 (예: 17:30)';
        }
        
        console.log('[상태 변경] 보충 모드 - 시간 입력창 초기화');
    } else {
        if (reasonSelect) reasonSelect.style.display = 'none';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
        
        // ✅ 2행 등록은 별개의 스케줄이므로 일반 출석 선택 시에도 스케줄 시간을 자동으로 채우지 않음
        console.log('[상태 변경] 일반 출석 모드 - 사용자 직접 입력');
    }
}

// 상태 변경 핸들러 (기존 행)
function handleStatusChange(rowId) {
    const statusSelect = document.getElementById(`status-${rowId}`);
    const reasonSelect = document.getElementById(`absence-reason-${rowId}`);
    const makeupDateDiv = document.getElementById(`makeup-date-${rowId}`);
    
    if (!statusSelect) return;
    
    const status = statusSelect.value;
    
    // rowId에서 studentId 추출 (studentId-recordId 형식)
    const studentId = rowId.split('-').slice(0, -1).join('-'); // 마지막 부분(recordId) 제거
    
    // 상태를 updateAttendanceField로 업데이트
    updateAttendanceField(studentId, 'status', status);
    
    if (status === '결석') {
        if (reasonSelect) reasonSelect.style.display = 'block';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
    } else if (status === '보강') {
        if (reasonSelect) reasonSelect.style.display = 'none';
        if (makeupDateDiv) makeupDateDiv.style.display = 'block';
    } else {
        if (reasonSelect) reasonSelect.style.display = 'none';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
    }
}

async function registerAttendance() {
    console.log('출석 등록 시작');
    
    // 로그인 확인
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    // 입력값 가져오기
    const studentId = document.getElementById('registerStudentSelect').value;
    const checkInTime = document.getElementById('registerCheckInTime').value;
    const expectedOutTime = document.getElementById('registerExpectedOutTime').value;
    const checkOutTime = document.getElementById('registerCheckOutTime').value;
    const status = document.getElementById('registerStatus').value;
    const absenceReason = document.getElementById('registerAbsenceReason').value;
    const makeupDate = document.getElementById('registerMakeupDate').value;
    
    // 필수값 검증
    if (!studentId) {
        alert('학생을 선택해주세요.');
        return;
    }
    
    if (!checkInTime) {
        alert('출석시간을 입력해주세요.');
        return;
    }
    
    // 학생 정보 찾기
    const student = attendanceStudents.find(s => s.id === studentId);
    if (!student) {
        alert('학생 정보를 찾을 수 없습니다.');
        return;
    }
    
    // ✅ 일반 출석만 중복 체크 (보강/보충은 여러 개 등록 가능)
    if (status !== '보강' && status !== '보충') {
        const existingRecord = todayAttendanceRecords.find(r => r.student_id === studentId);
        if (existingRecord) {
            alert(`${student.name} 학생은 이미 출석 체크되었습니다.`);
            return;
        }
    }
    
    // 출석 데이터 생성
    const attendanceData = {
        student_id: studentId,
        student_name: student.name,
        date: getSelectedDateString(),
        check_in_time: checkInTime,
        expected_out_time: expectedOutTime,
        check_out_time: checkOutTime,
        status: status,
        absence_reason: status === '결석' ? absenceReason : '',
        makeup_date: status === '보강' ? makeupDate : ''
    };
    
    try {
        // ✅ 보강/보충 등록 시 주간 스케줄 레코드가 없으면 먼저 생성
        if (status === '보강' || status === '보충') {
            const dateString = getSelectedDateString();
            const dateObj = new Date(dateString);
            const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayKey = dayKeys[dateObj.getDay()];
            
            // 학생의 스케줄 확인
            let schedule = student.schedule;
            if (typeof schedule === 'string' && schedule.trim() !== '') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (e) {
                    schedule = null;
                }
            }
            
            const daySchedule = schedule && schedule[dayKey];
            const hasSchedule = daySchedule && daySchedule.enabled && daySchedule.checkIn && daySchedule.checkOut;
            
            if (hasSchedule) {
                // 해당 날짜에 주간 스케줄 레코드가 있는지 확인
                const allRecords = await API.getList('attendance', { limit: 10000 });
                const allAttendance = Array.isArray(allRecords) ? allRecords : (allRecords.data || []);
                
                const existingRecords = allAttendance.filter(r => 
                    r.student_id === studentId && 
                    r.date === dateString
                );
                
                // 주간 스케줄과 가장 가까운 시간의 레코드 찾기
                const mainRecord = existingRecords.find(r => 
                    r.check_in_time === daySchedule.checkIn || 
                    (r.check_in_time && Math.abs(timeToMinutes(r.check_in_time) - timeToMinutes(daySchedule.checkIn)) < 30)
                );
                
                // 주간 스케줄 레코드가 없으면 생성
                if (!mainRecord) {
                    const mainData = {
                        student_id: studentId,
                        student_name: student.name,
                        date: dateString,
                        check_in_time: daySchedule.checkIn,
                        expected_out_time: daySchedule.checkOut,
                        check_out_time: daySchedule.checkOut,
                        status: '',
                        absence_reason: '',
                        makeup_date: ''
                    };
                    
                    await API.create('attendance', mainData);
                    console.log(`✅ 주간 스케줄 레코드 생성: ${student.name} (${daySchedule.checkIn}-${daySchedule.checkOut})`);
                }
            }
        }
        
        // 보강/보충 레코드 생성
        const result = await API.create('attendance', attendanceData);
        console.log(`✅ ${status} 등록 성공:`, result);
        
        // ✅ 조용히 등록 (알림 제거)
        
        // 입력 폼 초기화
        document.getElementById('registerStudentSelect').value = '';
        document.getElementById('registerCheckInTime').value = '';
        document.getElementById('registerExpectedOutTime').value = '';
        document.getElementById('registerCheckOutTime').value = '';
        document.getElementById('registerStatus').value = '출석';
        document.getElementById('registerAbsenceReason').style.display = 'none';
        document.getElementById('registerMakeupDate').style.display = 'none';
        
        // 데이터 새로고침
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error(`❌ ${status} 등록 실패:`, error);
        alert(`${status} 등록에 실패했습니다.\n오류: ${error.message || '알 수 없는 오류'}`);
    }
}

// ============================================
// 7. 출석 수정
// ============================================
async function editAttendance(recordId) {
    console.log('출석 수정:', recordId);
    
    // 로그인 확인
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    // 기록 찾기
    const record = todayAttendanceRecords.find(r => r.id === recordId);
    if (!record) {
        alert('출석 기록을 찾을 수 없습니다.');
        return;
    }
    
    // 수정할 값 입력받기
    const newCheckIn = prompt('출석시간 (HH:MM)', record.check_in_time || '');
    if (newCheckIn === null) return; // 취소
    
    const newCheckOut = prompt('퇴실시간 (HH:MM)', record.check_out_time || '');
    if (newCheckOut === null) return; // 취소
    
    // 퇴실예정시간 재계산
    const student = attendanceStudents.find(s => s.id === record.student_id);
    const schedule = getStudentTodaySchedule(student);
    const newExpectedOut = calculateExpectedTime(newCheckIn, schedule ? schedule.duration : 90);
    
    try {
        await API.update('attendance', recordId, {
            ...record,
            check_in_time: newCheckIn,
            check_out_time: newCheckOut,
            expected_out_time: newExpectedOut
        });
        
        console.log('출석 수정 성공');
        alert('출석 정보가 수정되었습니다.');
        
        // 데이터 새로고침
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('출석 수정 실패:', error);
        alert('출석 수정에 실패했습니다.');
    }
}

// ============================================
// 8. 출석 삭제
// ============================================


// ============================================
// 9. 유틸리티 함수
// ============================================

// 오늘 날짜 문자열 (YYYY-MM-DD)
function getTodayDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// 선택된 날짜 문자열 가져오기
function getSelectedDateString() {
    const dateInput = document.getElementById('attendanceDateInput');
    return dateInput ? dateInput.value : getTodayDateString();
}

// 날짜 표시 업데이트 (YYYY-MM-DD (요일))
function updateDateDisplay(dateString) {
    const dateDisplay = document.getElementById('attendanceDateDisplay');
    if (!dateDisplay) return;
    
    const date = new Date(dateString);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    
    dateDisplay.textContent = `${dateString} (${dayName})`;
}

// 학생의 선택된 날짜 스케줄 가져오기
function getStudentTodaySchedule(student) {
    console.log('[getStudentTodaySchedule] 시작 - 학생:', student?.name);
    console.log('[getStudentTodaySchedule] 스케줄 (raw):', student?.schedule);
    
    if (!student || !student.schedule) {
        console.log('[getStudentTodaySchedule] ❌ 학생 또는 스케줄 없음');
        return null;
    }
    
    // ✅ JSON 파싱 추가
    let schedule = student.schedule;
    console.log('[getStudentTodaySchedule] 스케줄 타입:', typeof schedule);
    
    if (typeof schedule === 'string' && schedule.trim() !== '') {
        console.log('[getStudentTodaySchedule] 문자열 스케줄 - JSON 파싱 시도');
        try {
            schedule = JSON.parse(schedule);
            console.log('[getStudentTodaySchedule] ✅ JSON 파싱 성공:', schedule);
        } catch (e) {
            console.error('[getStudentTodaySchedule] ❌ JSON 파싱 실패:', student.name, e);
            return null;
        }
    } else if (typeof schedule !== 'object') {
        console.log('[getStudentTodaySchedule] ❌ 스케줄이 객체가 아님:', typeof schedule);
        return null;
    }
    
    const selectedDate = getSelectedDateString();
    const dateObj = new Date(selectedDate);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const selectedDayKey = dayKeys[dateObj.getDay()];
    
    console.log('[getStudentTodaySchedule] 선택된 날짜:', selectedDate);
    console.log('[getStudentTodaySchedule] 요일 키:', selectedDayKey);
    console.log('[getStudentTodaySchedule] 해당 요일 스케줄:', schedule[selectedDayKey]);
    
    const scheduleForDay = schedule[selectedDayKey];
    if (!scheduleForDay || !scheduleForDay.enabled) {
        console.log('[getStudentTodaySchedule] ❌ 해당 요일 스케줄 없음 또는 비활성화');
        return null;
    }
    
    console.log('[getStudentTodaySchedule] ✅ 스케줄 반환:', scheduleForDay);
    return scheduleForDay;
}

// 퇴실 예정 시간 계산
function calculateExpectedTime(checkInTime, durationMinutes) {
    if (!checkInTime) return '';
    
    const [hours, minutes] = checkInTime.split(':').map(Number);
    const checkInDate = new Date();
    checkInDate.setHours(hours, minutes, 0, 0);
    
    const expectedOutDate = new Date(checkInDate.getTime() + durationMinutes * 60000);
    
    return `${String(expectedOutDate.getHours()).padStart(2, '0')}:${String(expectedOutDate.getMinutes()).padStart(2, '0')}`;
}

// 등록 폼의 퇴실 예정 시간 계산
function calculateExpectedOutTime() {
    const checkInTime = document.getElementById('registerCheckInTime').value;
    const studentId = document.getElementById('registerStudentSelect').value;
    
    if (!checkInTime || !studentId) {
        document.getElementById('registerExpectedOutTime').value = '';
        return;
    }
    
    const student = attendanceStudents.find(s => s.id === studentId);
    const schedule = getStudentTodaySchedule(student);
    const duration = schedule ? schedule.duration : 90;
    
    const expectedTime = calculateExpectedTime(checkInTime, duration);
    document.getElementById('registerExpectedOutTime').value = expectedTime;
}

// ============================================
// 월별 출결 현황 달력
// ============================================

// 월별 달력 렌더링
async function renderMonthlyCalendar() {
    const container = document.getElementById('monthlyCalendarContainer');
    const title = document.getElementById('calendarMonthTitle');
    
    if (!container || !title) return;
    
    // 현재 달력의 연/월 사용 (전역 변수 기준)
    const currentYear = currentCheckPageYear;
    const currentMonth = currentCheckPageMonth;
    
    // 오늘 날짜
    const today = new Date();
    const todayDate = today.getDate();
    
    // 타이틀에 년월만 표시
    title.innerHTML = `${currentYear}년 ${currentMonth + 1}월`;
    
    // 해당 월의 출석 기록 로드 (출석체크 페이지) [CHECK_PAGE_MARKER]
    await loadMonthAttendance(currentYear, currentMonth, 'check');
    
    // ✅ 보강 번호 계산
    const makeupNumberMap = calculateMakeupNumbers(allMonthAttendance);
    
    // 달력 생성
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // 월요일부터 시작하도록 조정
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    startDayOfWeek -= 1;
    
    // 항상 월~금요일만 표시 (5열)
    const maxDayOfWeek = 4; // 인덱스 0~4 (월~금)
    
    // 달력 테이블 생성
    let calendarHTML = '<div class="calendar-legend" style="text-align: right; margin-bottom: 0.5rem; font-size: 0.9rem;">';
    calendarHTML += '<span style="color: #000;">출석</span>';
    calendarHTML += '<span style="color: #000; text-decoration: line-through; margin-left: 15px;">결석</span>';
    calendarHTML += '<span style="color: #f44336; margin-left: 15px;">보강</span>';
    calendarHTML += '<span style="color: #9C27B0; margin-left: 15px;">보충</span>';
    calendarHTML += '</div>';
    calendarHTML += '<table class="monthly-calendar">';
    
    // 요일 헤더
    calendarHTML += '<thead>';
    calendarHTML += '<tr>';
    const dayNames = ['월', '화', '수', '목', '금'];
    for (let i = 0; i <= maxDayOfWeek; i++) {
        calendarHTML += `<th>${dayNames[i]}</th>`;
    }
    calendarHTML += '</tr></thead><tbody>';
    
    // 날짜 셀 생성
    let currentDate = 1;
    let finished = false;
    
    while (!finished) {
        let rowHTML = '';
        let hasContent = false; // 이 행에 실제 날짜가 있는지 확인
        
        for (let dayOfWeek = 0; dayOfWeek <= maxDayOfWeek; dayOfWeek++) {
            if (currentDate > lastDay.getDate()) {
                rowHTML += '<td class="empty-cell"></td>';
                finished = true;
                continue;
            }
            
            // 실제 요일 확인 (0=일, 1=월, ..., 6=토)
            let actualDate = new Date(currentYear, currentMonth, currentDate);
            let actualDayOfWeek = actualDate.getDay();
            
            // 토요일(6) 또는 일요일(0)을 만나면 계속 건너뛰기
            while ((actualDayOfWeek === 0 || actualDayOfWeek === 6) && currentDate <= lastDay.getDate()) {
                currentDate++;
                if (currentDate > lastDay.getDate()) break;
                actualDate = new Date(currentYear, currentMonth, currentDate);
                actualDayOfWeek = actualDate.getDay();
            }
            
            if (currentDate > lastDay.getDate()) {
                rowHTML += '<td class="empty-cell"></td>';
                finished = true;
                continue;
            }
            
            if (currentDate === 1 && dayOfWeek < startDayOfWeek) {
                // 첫 주의 빈 칸
                rowHTML += '<td class="empty-cell"></td>';
            } else {
                hasContent = true; // 실제 날짜가 있음
                const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
                
                // 오늘 날짜와 비교
                const cellDateObj = new Date(currentYear, currentMonth, currentDate);
                const todayObj = new Date();
                todayObj.setHours(0, 0, 0, 0);
                cellDateObj.setHours(0, 0, 0, 0);
                
                const isToday = cellDateObj.getTime() === todayObj.getTime();
                
                let cellClass = 'calendar-cell';
                if (isToday) cellClass += ' today';
                
                // 상태가 확정된 출석이 있으면 언제든지 표시
                const schedules = getSchedulesForDate(dateString);
                
                rowHTML += `<td class="${cellClass}">`;
                rowHTML += `<div class="date-number">${currentDate}</div>`;
                
                if (schedules.length > 0) {
                    // ✅ 특수 케이스: 해당 날짜의 모든 기록이 결석이고 사유가 모두 같으면 사유만 표시
                    const allAbsent = schedules.every(s => s.status === '결석');
                    const allSameReason = allAbsent && schedules.every(s => s.absence_reason === schedules[0].absence_reason);
                    
                    if (allAbsent && allSameReason && schedules[0].absence_reason) {
                        // 사유만 표시 (취소선 없이)
                        rowHTML += '<div class="schedule-list">';
                        rowHTML += `<div class="schedule-item holiday-reason" style="color: #666; font-weight: 600; text-align: center;">${schedules[0].absence_reason}</div>`;
                        rowHTML += '</div>';
                    } else {
                        // 일반 표시 (모든 출석 기록)
                        rowHTML += '<div class="schedule-list">';
                        schedules.forEach(schedule => {
                            rowHTML += renderScheduleItem(schedule, 'check', makeupNumberMap);
                        });
                        rowHTML += '</div>';
                    }
                }
                
                rowHTML += '</td>';
                currentDate++;
            }
        }
        
        // 실제 날짜가 있는 행만 추가
        if (hasContent) {
            calendarHTML += '<tr>' + rowHTML + '</tr>';
        }
    }
    
    calendarHTML += '</tbody></table>';
    container.innerHTML = calendarHTML;
    
    // 통계 표 렌더링
    await renderAttendanceStats(currentYear, currentMonth);
}

// 해당 월의 출석 기록 로드
async function loadMonthAttendance(year, month, pageType = 'check') {
    try {
        const response = await API.getList('attendance', { limit: 1000 });
        let allAttendance = Array.isArray(response) ? response : (response.data || []);
        
        // 학생 목록 로드
        const studentsResponse = await API.getList('students', { limit: 1000 });
        let allStudentsData = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        
        // ✅ 선생님인 경우 담당 학생만 필터링
        allStudentsData = Permissions.filterStudentsByTeacher(allStudentsData);
        console.log(`[loadMonthAttendance:${pageType}] 권한 필터링 후 학생 수:`, allStudentsData.length);
        
        // ✅ 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
        if (Auth.isAdmin() || Auth.isSubAdmin()) {
            // 페이지 타입에 따라 적절한 필터 변수 사용
            const teacherFilter = pageType === 'view' ? currentAttendanceViewTeacherFilter : currentAttendanceTeacherFilter;
            
            if (teacherFilter !== 'all') {
                allStudentsData = allStudentsData.filter(s => s.teacher_id === teacherFilter);
                console.log(`[loadMonthAttendance:${pageType}] 선생님 필터링 후 학생 수:`, allStudentsData.length, '선생님 ID:', teacherFilter);
            }
        }
        
        const myStudentIds = allStudentsData.map(s => s.id);
        
        // 필터링된 학생들의 출석 기록만 표시
        allAttendance = allAttendance.filter(record => myStudentIds.includes(record.student_id));
        console.log(`[loadMonthAttendance:${pageType}] 필터링된 학생 출석 기록:`, allAttendance.length);
        
        // 해당 월의 데이터만 필터링
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;
        
        allMonthAttendance = allAttendance.filter(record => {
            return record.date >= monthStart && record.date <= monthEnd;
        });
        
        console.log(`[loadMonthAttendance:${pageType}] ${year}년 ${month + 1}월 출석 기록:`, allMonthAttendance.length);
        
    } catch (error) {
        console.error('월별 출석 기록 로드 실패:', error);
        allMonthAttendance = [];
    }
}

// 출석체크 페이지 달력 월 변경 함수
async function changeCheckPageMonth(direction) {
    currentCheckPageMonth += direction;
    
    if (currentCheckPageMonth < 0) {
        currentCheckPageMonth = 11;
        currentCheckPageYear--;
    } else if (currentCheckPageMonth > 11) {
        currentCheckPageMonth = 0;
        currentCheckPageYear++;
    }
    
    // 달력 다시 렌더링
    await renderMonthlyCalendar();
}

// 특정 날짜의 스케줄 가져오기 (상태가 확정된 출석만, 입실시간 빠른순 정렬, 모든 기록 표시)
function getSchedulesForDate(dateString) {
    const filtered = allMonthAttendance.filter(record => {
        const hasDate = record.date === dateString;
        const hasStatus = record.status && record.status !== '';
        
        // 날짜가 일치하고, 상태가 확정된 경우만 반환
        return hasDate && hasStatus;
    });
    
    // ✅ 중복 제거 제거: 같은 날 같은 학생의 여러 스케줄 모두 표시
    // 입실시간 빠른순 정렬만 수행
    filtered.sort((a, b) => {
        const timeA = a.check_in_time || '23:59';
        const timeB = b.check_in_time || '23:59';
        return timeA.localeCompare(timeB);
    });
    
    if (filtered.length > 0) {
        console.log(`[getSchedulesForDate] ${dateString} 결과: ${filtered.length}개 (입실시간 빠른순, 모든 기록 표시)`);
        filtered.forEach((record, index) => {
            console.log(`  ${index + 1}. ${record.check_in_time} - ${record.student_name}, 상태: ${record.status}, 퇴실: ${record.check_out_time}`);
        });
    }
    
    return filtered;
}

// ============================================
// 보강 번호 부여 로직
// ============================================

/**
 * 같은 결석날짜에 대한 보강들을 그룹화하고 번호를 부여합니다.
 * @param {Array} allRecords - 전체 출석 기록 배열
 * @returns {Map} - recordId를 키로, 보강 번호(①, ②, ③...)를 값으로 하는 Map
 */
function calculateMakeupNumbers(allRecords) {
    const makeupNumberMap = new Map();
    
    // 1. 보강 레코드만 필터링 (status === '보강' && makeup_date 존재)
    const makeupRecords = allRecords.filter(r => 
        r.status === '보강' && r.makeup_date
    );
    
    if (makeupRecords.length === 0) {
        return makeupNumberMap;
    }
    
    console.log('[calculateMakeupNumbers] 보강 레코드 총', makeupRecords.length, '개');
    
    // 2. 학생별 + 결석날짜별로 그룹화
    const groupByStudentAndAbsenceDate = {};
    
    makeupRecords.forEach(record => {
        const key = `${record.student_id}_${record.makeup_date}`;
        if (!groupByStudentAndAbsenceDate[key]) {
            groupByStudentAndAbsenceDate[key] = [];
        }
        groupByStudentAndAbsenceDate[key].push(record);
    });
    
    console.log('[calculateMakeupNumbers] 그룹 수:', Object.keys(groupByStudentAndAbsenceDate).length);
    
    // 3. 각 그룹별로 번호 부여 여부 결정
    Object.entries(groupByStudentAndAbsenceDate).forEach(([key, records]) => {
        const [studentId, makeupDate] = key.split('_');
        
        // 같은 결석날짜에 대한 보강이 2개 이상인 경우에만 번호 부여
        if (records.length < 2) {
            console.log(`[calculateMakeupNumbers] ${key}: 보강 1개만 있어서 번호 부여 안 함`);
            return;
        }
        
        // 원래 결석 수업의 시간(분) 확인
        const absenceRecord = allRecords.find(r => 
            r.student_id === studentId && 
            r.date === makeupDate && 
            r.status === '결석'
        );
        
        let originalDuration = 0;
        if (absenceRecord && absenceRecord.check_in_time && absenceRecord.check_out_time) {
            originalDuration = timeToMinutes(absenceRecord.check_out_time) - timeToMinutes(absenceRecord.check_in_time);
        } else {
            // 결석 레코드를 못 찾으면 기본 90분으로 가정
            originalDuration = 90;
        }
        
        // 보강 시간 합계 계산
        let totalMakeupDuration = 0;
        records.forEach(r => {
            if (r.check_in_time && r.check_out_time) {
                const duration = timeToMinutes(r.check_out_time) - timeToMinutes(r.check_in_time);
                totalMakeupDuration += duration;
            }
        });
        
        console.log(`[calculateMakeupNumbers] ${key}: 원래 ${originalDuration}분, 보강 합계 ${totalMakeupDuration}분`);
        
        // 보강 시간 합계가 원래 수업 시간 이내라면 번호 부여
        if (totalMakeupDuration <= originalDuration) {
            // 보강 날짜 순서대로 정렬 (date 기준 오름차순)
            records.sort((a, b) => {
                if (a.date !== b.date) {
                    return a.date.localeCompare(b.date);
                }
                // 같은 날이면 입실시간 순
                return (a.check_in_time || '').localeCompare(b.check_in_time || '');
            });
            
            // 번호 부여
            const numberSymbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
            records.forEach((record, index) => {
                const symbol = numberSymbols[index] || `⑪`; // 10개 초과 시 ⑪로 표시
                makeupNumberMap.set(record.id, symbol);
                console.log(`  - ${record.date} ${record.check_in_time}: ${symbol}`);
            });
        } else {
            console.log(`[calculateMakeupNumbers] ${key}: 보강 시간이 초과되어 번호 부여 안 함`);
        }
    });
    
    console.log('[calculateMakeupNumbers] 번호 부여된 보강:', makeupNumberMap.size, '개');
    return makeupNumberMap;
}

// 스케줄 아이템 렌더링 (pageType: 'check' 또는 'view')
function renderScheduleItem(schedule, pageType = 'check', makeupNumberMap = null) {
    let itemClass = 'schedule-item';
    let content = '';
    let highlightStyle = '';
    
    // 정보 없는 학생 (is_external) 플래그 확인
    const isExternal = schedule.is_external === true || schedule.is_external === 1;
    
    // 형광펜 표시 - 페이지별로 독립적으로 동작
    let shouldHighlight = false;
    if (pageType === 'check') {
        // 출석체크 페이지: highlightedStudentName만 사용
        shouldHighlight = highlightedStudentName && schedule.student_name === highlightedStudentName;
    } else if (pageType === 'view') {
        // 출석조회 페이지: highlightedViewStudentName만 사용
        shouldHighlight = highlightedViewStudentName && schedule.student_name === highlightedViewStudentName;
    }
    
    if (shouldHighlight) {
        if (schedule.status === '출석') {
            highlightStyle = 'background-color: #C8E6C9; padding: 2px 4px; border-radius: 2px;'; // 연초록
        } else if (schedule.status === '보강') {
            highlightStyle = 'background-color: #FFCDD2; padding: 2px 4px; border-radius: 2px;'; // 연빨강
        } else if (schedule.status === '보충') {
            highlightStyle = 'background-color: #E1BEE7; padding: 2px 4px; border-radius: 2px;'; // 연보라
        } else if (schedule.status === '결석') {
            highlightStyle = 'background-color: #E0E0E0; padding: 2px 4px; border-radius: 2px;'; // 연회색
        }
    }
    
    if (schedule.status === '결석') {
        // ✅ 결석: "결석"에만 취소선, 이름과 "(사유)"는 취소선 없음
        // ✅ 보강 결석: 빨간색, 보충 결석: 보라색, 일반 결석: 검정색
        const reason = schedule.absence_reason ? ` (${schedule.absence_reason})` : '';
        
        // makeup_date가 있으면 보강 결석 (빨간색)
        if (schedule.makeup_date) {
            itemClass += ' makeup';
            content = `${schedule.student_name} <span style="text-decoration: line-through;">결석</span>${reason}`;
        }
        // check_in_time이 비어있고 기존 레코드가 보충이면 보충 결석 (보라색)
        // 단, makeup_date가 없어야 보충으로 간주
        else if (!schedule.makeup_date && schedule.schedule_type === 'extra') {
            itemClass += ' supplement';
            content = `${schedule.student_name} <span style="text-decoration: line-through;">결석</span>${reason}`;
        }
        // 일반 결석 (검정색)
        else {
            itemClass += ' absent';
            content = `${schedule.student_name} <span style="text-decoration: line-through;">결석</span>${reason}`;
        }
    } else if (schedule.status === '보강') {
        // 보강: "입실시간, 이름, 퇴실시간 보강[번호] (결석날짜)" - 빨간색
        itemClass += ' makeup';
        const makeupDateStr = schedule.makeup_date ? ` (${schedule.makeup_date.substring(5).replace('-', '/')})` : '';
        
        // 보강 번호가 있으면 표시
        let makeupNumber = '';
        if (makeupNumberMap && schedule.id && makeupNumberMap.has(schedule.id)) {
            makeupNumber = makeupNumberMap.get(schedule.id);
        }
        
        content = `${schedule.check_in_time || '-'} ${schedule.student_name} ${schedule.check_out_time || '-'} 보강${makeupNumber}${makeupDateStr}`;
    } else if (schedule.status === '보충') {
        // 보충: "입실시간, 이름, 퇴실시간" - 보라색
        itemClass += ' supplement';
        content = `${schedule.check_in_time || '-'} ${schedule.student_name} ${schedule.check_out_time || '-'}`;
    } else {
        // 출석: "입실시간, 이름, 퇴실시간" - 검정색 (또는 파란색)
        itemClass += isExternal ? ' external' : ' attendance';
        content = `${schedule.check_in_time || '-'} ${schedule.student_name} ${schedule.check_out_time || '-'}`;
    }
    
    return `<div class="${itemClass}" style="${highlightStyle}">${content}</div>`;
}

// ============================================
// 학년별 출석 통계 표
// ============================================

async function renderAttendanceStats(year, month) {
    const container = document.getElementById('attendanceStatsContainer');
    if (!container) return;
    
    try {
        // 학생 목록 로드
        const response = await API.getList('students', { limit: 1000 });
        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
        let allStudents = Array.isArray(response) ? response : (response.data || []);
        
        // ✅ 선생님인 경우 담당 학생만 필터링 (teacher_id 기반)
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        console.log('[renderAttendanceStats] 권한 필터링 후 학생 수:', allStudents.length);
        
        // 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
        if ((Auth.isAdmin() || Auth.isSubAdmin()) && currentAttendanceTeacherFilter !== 'all') {
            allStudents = allStudents.filter(s => s.teacher_id === currentAttendanceTeacherFilter);
            console.log('[renderAttendanceStats] 선생님 필터링 후 학생 수:', allStudents.length);
        }
        
        // 재원생만 필터링 (항상 표시)
        const activeStudents = allStudents.filter(student => student.status === '재원');
        
        // 해당 월의 출석 기록이 있는 학생 확인
        let nonActiveWithAttendance = [];
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            const attendanceRecords = await API.getList('attendance');
            
            // 날짜 필터링 (클라이언트 측)
            const filteredRecords = (attendanceRecords.data || []).filter(record => 
                record.date >= startDateStr && record.date <= endDateStr
            );
            
            // 출석 기록이 있지만 재원생이 아닌 학생 찾기
            const attendedStudentIds = new Set(filteredRecords.map(r => r.student_id));
            nonActiveWithAttendance = allStudents.filter(student => 
                student.status !== '재원' && attendedStudentIds.has(student.id)
            );
        } catch (err) {
            console.warn('비재원생 출석자 조회 중 오류 (무시하고 계속):', err);
        }
        
        // 학교 유형별로 분류 및 정렬
        const elementary = activeStudents
            .filter(s => s.school_type === '초')
            .sort((a, b) => {
                // 학년 오름차순
                const gradeA = parseInt(a.grade) || 0;
                const gradeB = parseInt(b.grade) || 0;
                if (gradeA !== gradeB) return gradeA - gradeB;
                // 학년이 같으면 이름 가나다순
                return (a.name || '').localeCompare(b.name || '', 'ko');
            });
        
        const middle = activeStudents
            .filter(s => s.school_type === '중')
            .sort((a, b) => {
                const gradeA = parseInt(a.grade) || 0;
                const gradeB = parseInt(b.grade) || 0;
                if (gradeA !== gradeB) return gradeA - gradeB;
                return (a.name || '').localeCompare(b.name || '', 'ko');
            });
        
        let high = activeStudents
            .filter(s => s.school_type === '고')
            .sort((a, b) => {
                const gradeA = parseInt(a.grade) || 0;
                const gradeB = parseInt(b.grade) || 0;
                if (gradeA !== gradeB) return gradeA - gradeB;
                return (a.name || '').localeCompare(b.name || '', 'ko');
            });
        
        // 재원생이 아닌 확정 스케줄 학생을 고등학생 배열 오른쪽에 추가
        console.log('[renderAttendanceStats] 재원생 고등학생 수:', high.length);
        console.log('[renderAttendanceStats] 비재원생 출석자 수:', nonActiveWithAttendance.length);
        if (nonActiveWithAttendance.length > 0) {
            console.log('[renderAttendanceStats] 비재원생 출석자:', nonActiveWithAttendance.map(s => `${s.name}(${s.status})`));
        }
        high = [...high, ...nonActiveWithAttendance];
        console.log('[renderAttendanceStats] 통합 후 고등학생 수:', high.length);
        
        // 하나의 통합 표로 렌더링
        const statsHTML = renderUnifiedStatsTable(elementary, middle, high, year, month);
        
        container.innerHTML = statsHTML;
        
    } catch (error) {
        console.error('통계 표 렌더링 실패:', error);
        container.innerHTML = '<p style="text-align: center; color: #f44336;">통계를 불러오는데 실패했습니다.</p>';
    }
}

// 학생이 해당 월에 활동했는지 확인
function checkStudentActiveInMonth(student, year, month) {
    if (!student.withdrawal_date) return false;
    
    const withdrawalDate = new Date(student.withdrawal_date);
    const monthStart = new Date(year, month - 1, 1);
    
    // 퇴원/휴원 날짜가 해당 월 이후면 활동한 것으로 간주
    return withdrawalDate >= monthStart;
}

// 통합 통계표 렌더링 (초등/중등/고등을 세로로 붙임)
function renderUnifiedStatsTable(elementary, middle, high, year, month) {
    const MAX_COLUMNS = 9; // 학생 열 개수 (라벨 제외)
    
    let html = '<div class="stats-scroll-container"><table class="stats-table">';
    
    // ===== 초등학생 섹션 (1-4행) =====
    // 1행: 헤더 (초등학생 + 학생 이름) - 연노랑색 (더 파스텔)
    html += '<thead><tr><th style="background-color: #fffef0; font-weight: 700;">초등학생</th>';
    
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < elementary.length) {
            const student = elementary[i];
            const schoolName = student.school || '-';
            const grade = student.grade || '-';
            html += `<th style="background-color: #fffef0;">
                <div class="student-name" style="cursor: pointer;" onclick="highlightStudent('${student.name}')">${student.name}</div>
                <div class="student-info">${schoolName} ${grade}</div>
            </th>`;
        } else {
            html += '<th style="background-color: #fffef0;"></th>';
        }
    }
    html += '</tr></thead><tbody>';
    
    // 초등학생 통계 계산
    const elementaryStats = elementary.map(student => calculateStudentStats(student, year, month));
    
    // 2행: 출석(보강)/수업
    html += '<tr><td class="row-label">출석(보강)/수업</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < elementaryStats.length) {
            const attendance = elementaryStats[i].attendance;
            const makeup = elementaryStats[i].makeup;
            const expected = elementaryStats[i].expectedClasses;
            html += `<td>${attendance}(${makeup})/${expected}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    // 3행: 보강예정
    html += '<tr><td class="row-label">보강예정</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < elementaryStats.length) {
            const attendance = elementaryStats[i].attendance;
            const makeup = elementaryStats[i].makeup;
            const expected = elementaryStats[i].expectedClasses;
            const remaining = expected - attendance - makeup;
            const color = remaining > 0 ? '#f44336' : '#000';
            html += `<td style="color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};">${remaining}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    // ===== 중학생 섹션 (5-8행) =====
    // 5행: 헤더 (중학생 + 학생 이름) - 연두색 (더 파스텔)
    html += '<tr><th style="background-color: #f0faf4; font-weight: 700;">중학생</th>';
    
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < middle.length) {
            const student = middle[i];
            const schoolName = student.school || '-';
            const grade = student.grade || '-';
            html += `<th style="background-color: #f0faf4;">
                <div class="student-name" style="cursor: pointer;" onclick="highlightStudent('${student.name}')">${student.name}</div>
                <div class="student-info">${schoolName} ${grade}</div>
            </th>`;
        } else {
            html += '<th style="background-color: #f0faf4;"></th>';
        }
    }
    html += '</tr>';
    
    // 중학생 통계 계산
    const middleStats = middle.map(student => calculateStudentStats(student, year, month));
    
    // 6행: 출석(보강)/수업
    html += '<tr><td class="row-label">출석(보강)/수업</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < middleStats.length) {
            const attendance = middleStats[i].attendance;
            const makeup = middleStats[i].makeup;
            const expected = middleStats[i].expectedClasses;
            html += `<td>${attendance}(${makeup})/${expected}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    // 7행: 보강예정
    html += '<tr><td class="row-label">보강예정</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < middleStats.length) {
            const attendance = middleStats[i].attendance;
            const makeup = middleStats[i].makeup;
            const expected = middleStats[i].expectedClasses;
            const remaining = expected - attendance - makeup;
            const color = remaining > 0 ? '#f44336' : '#000';
            html += `<td style="color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};">${remaining}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    // ===== 고등학생 섹션 (9-11행) =====
    // 9행: 헤더 (고등학생 + 학생 이름) - 연하늘색 (더 파스텔)
    html += '<tr><th style="background-color: #f0f8ff; font-weight: 700;">고등학생</th>';
    
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < high.length) {
            const student = high[i];
            const schoolName = student.school || '-';
            const grade = student.grade || '-';
            html += `<th style="background-color: #f0f8ff;">
                <div class="student-name" style="cursor: pointer;" onclick="highlightStudent('${student.name}')">${student.name}</div>
                <div class="student-info">${schoolName} ${grade}</div>
            </th>`;
        } else {
            html += '<th style="background-color: #f0f8ff;"></th>';
        }
    }
    html += '</tr>';
    
    // 고등학생 통계 계산
    const highStats = high.map(student => calculateStudentStats(student, year, month));
    
    // 10행: 출석(보강)/수업
    html += '<tr><td class="row-label">출석(보강)/수업</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < highStats.length) {
            const attendance = highStats[i].attendance;
            const makeup = highStats[i].makeup;
            const expected = highStats[i].expectedClasses;
            html += `<td>${attendance}(${makeup})/${expected}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    // 11행: 보강예정
    html += '<tr><td class="row-label">보강예정</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < highStats.length) {
            const attendance = highStats[i].attendance;
            const makeup = highStats[i].makeup;
            const expected = highStats[i].expectedClasses;
            const remaining = expected - attendance - makeup;
            const color = remaining > 0 ? '#f44336' : '#000';
            html += `<td style="color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};">${remaining}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    html += '</tbody></table></div>'; // 스크롤 컨테이너 닫기
    return html;
}

// 기존 renderStatsTable 함수 (출결조회 페이지용으로 유지)

function renderStatsTable(students, year, month, gradeLabel = '') {
    const MAX_COLUMNS = 9; // 학생 열 개수 (라벨 제외)
    let html = '<div class="stats-scroll-container"><table class="stats-table">';
    
    // 1행: 학년 구분 + 학생 이름 + 학교/학년
    html += '<thead><tr><th>' + gradeLabel + '</th>';
    
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < students.length) {
            const student = students[i];
            const schoolName = student.school || '-';
            const grade = student.grade || '-';
            html += `<th>
                <div class="student-name">${student.name}</div>
                <div class="student-info">${schoolName} ${grade}</div>
            </th>`;
        } else {
            html += '<th></th>';
        }
    }
    html += '</tr></thead><tbody>';
    
    // 각 학생의 통계 계산
    const stats = students.map(student => calculateStudentStats(student, year, month));
    
    // 2행: 수업 횟수 (주당 스케줄 * 4주)
    html += '<tr><td class="row-label" style="text-align: center;">수업</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < stats.length) {
            html += `<td style="text-align: center;">${stats[i].expectedClasses}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    // 3행: 출석(보강) 횟수
    html += '<tr><td class="row-label" style="text-align: center;">출석(보강)</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < stats.length) {
            const total = stats[i].attendance + stats[i].makeup;
            html += `<td style="text-align: center;">${total}</td>`;
        } else {
            html += '<td></td>';
        }
    }
    html += '</tr>';
    
    // 4행: 보강예정 (수업 - 출석(보강))
    html += '<tr><td class="row-label" style="background-color: #f8f9fa !important; text-align: center;">보강예정</td>';
    for (let i = 0; i < MAX_COLUMNS; i++) {
        if (i < stats.length) {
            const total = stats[i].attendance + stats[i].makeup;
            const remaining = stats[i].expectedClasses - total;
            const color = remaining > 0 ? '#f44336' : '#000';
            const style = `background-color: white !important; text-align: center; color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};`;
            html += `<td style="${style}">${remaining}</td>`;
        } else {
            html += '<td style="background-color: white !important;"></td>';
        }
    }
    html += '</tr>';
    
    html += '</tbody></table></div>'; // 스크롤 컨테이너 닫기
    return html;
}

function calculateStudentStats(student, year, month) {
    // 해당 학생의 이번 달 출석 기록
    const studentRecords = allMonthAttendance.filter(record => record.student_id === student.id);
    
    // 출석 횟수
    const attendanceCount = studentRecords.filter(r => r.status === '출석').length;
    
    // ✅ 보강 횟수 계산 (번호가 부여된 그룹은 1회로 계산)
    const makeupRecords = studentRecords.filter(r => r.status === '보강');
    const makeupNumberMap = calculateMakeupNumbers(allMonthAttendance);
    
    // 보강을 결석날짜별로 그룹화
    const makeupGroups = {};
    makeupRecords.forEach(record => {
        const key = record.makeup_date || 'no-date';
        if (!makeupGroups[key]) {
            makeupGroups[key] = [];
        }
        makeupGroups[key].push(record);
    });
    
    // 각 그룹별로 횟수 계산
    let makeupCount = 0;
    Object.values(makeupGroups).forEach(group => {
        // 그룹 내에 번호가 부여된 보강이 있는지 확인
        const hasNumber = group.some(r => makeupNumberMap.has(r.id));
        
        if (hasNumber) {
            // 번호가 부여된 그룹 전체를 1회로 계산
            makeupCount += 1;
        } else {
            // 번호가 없는 보강은 각각 1회씩 계산
            makeupCount += group.length;
        }
    });
    
    // 수업 예정 횟수 계산 (주간 스케줄 기준)
    const weeklyScheduleCount = countWeeklySchedule(student.schedule);
    const weeksInMonth = 4; // 기본 4주
    const expectedClasses = weeklyScheduleCount * weeksInMonth;
    
    return {
        attendance: attendanceCount,
        makeup: makeupCount,
        expectedClasses: expectedClasses
    };
}

function countWeeklySchedule(schedule) {
    if (!schedule) return 0;
    
    // schedule이 문자열이면 파싱
    let parsedSchedule = schedule;
    if (typeof schedule === 'string' && schedule.trim() !== '') {
        try {
            parsedSchedule = JSON.parse(schedule);
        } catch (e) {
            console.error('스케줄 파싱 오류:', e);
            return 0;
        }
    }
    
    if (!parsedSchedule || typeof parsedSchedule !== 'object') return 0;
    
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let count = 0;
    
    dayKeys.forEach(key => {
        if (parsedSchedule[key] && parsedSchedule[key].enabled === true) {
            count++;
        }
    });
    
    return count;
}

// ============================================
// 학생 형광펜 표시 함수
// ============================================

function highlightStudent(studentName) {
    highlightedStudentName = studentName;
    // 월별 달력 다시 렌더링
    renderMonthlyCalendar();
}

// ============================================
// 2행 등록 관련 함수
// ============================================

// 등록 행의 학생 선택 드롭다운 채우기
async function renderStudentSelectForRegister() {
    const select = document.getElementById('registerStudentSelect');
    if (!select) return;
    
    try {
        const result = await API.getList('students', { limit: 1000 });
        const allStudents = result.data || result;
        
        // 재원생만 필터링
        const activeStudents = allStudents.filter(s => s.status === '재원');
        
        // 이름순 정렬
        activeStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko-KR'));
        
        // 옵션 추가
        select.innerHTML = '<option value="">재원생 선택</option>';
        
        activeStudents.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.name}${student.attendance_number ? ' (' + student.attendance_number + ')' : ''}`;
            option.dataset.studentData = JSON.stringify(student);
            select.appendChild(option);
        });
    } catch (error) {
        console.error('재원생 로드 실패:', error);
    }
}

// 등록 행 드롭다운 변경 핸들러
function handleRegisterStudentChange() {
    const select = document.getElementById('registerStudentSelect');
    const manualInput = document.getElementById('registerManualName');
    
    if (select.value) {
        // 드롭다운에서 선택하면 수동 입력 초기화
        if (manualInput) manualInput.value = '';
        
        // ✅ 2행 등록은 완전히 별개의 스케줄이므로 주간 스케줄 정보를 끌고 오지 않음
        // 사용자가 직접 시간을 입력하도록 함
        console.log(`[학생 선택] ${select.options[select.selectedIndex].textContent} - 별개 스케줄 등록 모드`);
    } else {
        // 선택 해제 시 입력창 비우기 (필요 없음 - 사용자가 입력한 값 유지)
        if (checkOutInput) checkOutInput.value = '';
    }
}

// 신규 출석 등록
async function registerNewAttendance() {
    const studentSelect = document.getElementById('registerStudentSelect');
    const manualInput = document.getElementById('registerManualName');
    const checkInTime = document.getElementById('registerCheckInTime').value;
    const checkOutTime = document.getElementById('registerCheckOutTime').value;
    const status = document.getElementById('registerStatus').value;
    const absenceReason = document.getElementById('registerAbsenceReason').value;
    const makeupDate = document.getElementById('registerMakeupDateInput').value;
    
    let studentData = null;
    
    // 1. 드롭다운 확인
    if (studentSelect.value) {
        const selectedOption = studentSelect.options[studentSelect.selectedIndex];
        studentData = JSON.parse(selectedOption.dataset.studentData);
    } 
    // 2. 수동 입력 확인
    else if (manualInput && manualInput.value.trim()) {
        const name = manualInput.value.trim();
        
        try {
            const result = await API.getList('students', { limit: 1000 });
            const allStudents = result.data || result;
            const foundStudent = allStudents.find(s => s.name === name);
            
            if (foundStudent) {
                studentData = foundStudent;
                console.log(`[수동입력] ${foundStudent.name} (상태: ${foundStudent.status})`);
            } else {
                // 정보 없는 학생
                studentData = {
                    id: null,
                    name: name,
                    status: 'unknown'
                };
                console.log(`[수동입력] 정보 없는 학생: ${name}`);
            }
        } catch (error) {
            console.error('학생 검색 실패:', error);
            alert('학생 정보를 검색하는데 실패했습니다.');
            return;
        }
    } else {
        alert('학생을 선택하거나 이름을 입력해주세요.');
        return;
    }
    
    if (!checkInTime) {
        alert('출석시간을 입력해주세요.');
        return;
    }
    
    // 보강 상태일 때 보강 날짜 필수 검증
    if (status === '보강' && !makeupDate) {
        alert('보강 상태로 등록하려면 보강 날짜를 선택해주세요.');
        return;
    }
    
    // ✅ 보강/보충 등록 시 기존 스케줄과 동일한 시간인지 확인
    if ((status === '보강' || status === '보충') && studentData.id && studentData.schedule) {
        try {
            let schedule = studentData.schedule;
            if (typeof schedule === 'string' && schedule.trim() !== '') {
                schedule = JSON.parse(schedule);
            }
            
            const selectedDate = getSelectedDateString();
            const dateObj = new Date(selectedDate);
            const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const selectedDayKey = dayKeys[dateObj.getDay()];
            const daySchedule = schedule && schedule[selectedDayKey];
            
            if (daySchedule && daySchedule.enabled) {
                const scheduledCheckIn = daySchedule.checkIn;
                const scheduledCheckOut = daySchedule.checkOut;
                
                // 기존 스케줄과 동일한 시간이면 경고
                if (checkInTime === scheduledCheckIn && checkOutTime === scheduledCheckOut) {
                    const confirmMsg = `⚠️ 입력하신 시간(${checkInTime}-${checkOutTime})이 기존 주간 스케줄과 동일합니다.\n\n` +
                        `${status} 스케줄은 주간 스케줄과 별개로 추가되어야 합니다.\n` +
                        `다른 시간으로 등록하시겠습니까?\n\n` +
                        `예: 기존 스케줄 ${scheduledCheckIn}-${scheduledCheckOut} → ${status} 16:00-17:30`;
                    
                    if (!confirm(confirmMsg)) {
                        console.log(`[등록 취소] ${studentData.name} ${status} - 기존 스케줄과 동일한 시간`);
                        return;
                    }
                }
            }
        } catch (e) {
            console.error('[시간 중복 확인 오류]', e);
        }
    }
    
    // 출석 데이터 생성
    const attendanceData = {
        student_id: studentData.id,
        student_name: studentData.name,
        date: getSelectedDateString(),
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        status: status || '출석',
        absence_reason: absenceReason,
        makeup_date: makeupDate
    };
    
    // 퇴실 예정시간 자동 계산 (스케줄 기반)
    if (studentData.id && studentData.schedule) {
        let schedule = studentData.schedule;
        if (typeof schedule === 'string' && schedule.trim() !== '') {
            try {
                schedule = JSON.parse(schedule);
            } catch (e) {
                schedule = {};
            }
        }
        
        const selectedDate = getSelectedDateString();
        const dateObj = new Date(selectedDate);
        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const selectedDayKey = dayKeys[dateObj.getDay()];
        const daySchedule = schedule[selectedDayKey];
        
        if (daySchedule && daySchedule.duration) {
            const duration = parseInt(daySchedule.duration) || 90;
            const [hour, min] = checkInTime.split(':').map(Number);
            const totalMinutes = hour * 60 + min + duration;
            const outHour = Math.floor(totalMinutes / 60);
            const outMin = totalMinutes % 60;
            attendanceData.expected_out_time = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`;
        }
    } else {
        // 스케줄 없으면 기본 90분
        const [hour, min] = checkInTime.split(':').map(Number);
        const totalMinutes = hour * 60 + min + 90;
        const outHour = Math.floor(totalMinutes / 60);
        const outMin = totalMinutes % 60;
        attendanceData.expected_out_time = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`;
    }
    
    try {
        await API.create('attendance', attendanceData);
        // ✅ 조용히 등록 완료 (alert 제거)
        console.log(`✅ ${studentData.name} 출석 등록 완료 (상태: ${status || '출석'})`);
        
        // 입력 필드 초기화
        document.getElementById('registerStudentSelect').value = '';
        if (manualInput) manualInput.value = '';
        document.getElementById('registerCheckInTime').value = '';
        document.getElementById('registerExpectedOutTime').value = '';
        document.getElementById('registerCheckOutTime').value = '';
        document.getElementById('registerStatus').value = '';
        document.getElementById('registerAbsenceReason').value = '';
        document.getElementById('registerMakeupDateInput').value = '';
        
        // 결석/보강 필드 숨기기
        document.getElementById('registerAbsenceReason').style.display = 'none';
        document.getElementById('registerMakeupDate').style.display = 'none';
        
        // 데이터 다시 로드 및 테이블 재렌더링
        await loadAttendanceData();
        renderAttendanceTable(); // 출석현황 테이블 재렌더링
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('❌ 출석 등록 오류:', error);
        console.error('오류 상세:', error.message);
        console.error('등록하려던 데이터:', attendanceData);
        alert('출석 등록에 실패했습니다.\n오류: ' + (error.message || '알 수 없는 오류'));
    }
}

// ============================================
// 출석 조회 페이지
// ============================================
let currentViewYear = new Date().getFullYear();
let currentViewMonth = new Date().getMonth() + 1;

async function showAttendanceViewPage() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const today = new Date();
    currentViewYear = today.getFullYear();
    currentViewMonth = today.getMonth() + 1;

    mainContent.innerHTML = `
        <div class="attendance-view-container">
            <!-- 2단 레이아웃 -->
            <div class="view-two-column-layout">
                <!-- 1단: 월별 출결 현황 달력 -->
                <div class="view-column-left">
                    <div class="monthly-calendar-section">
                        <div class="calendar-header">
                            <button onclick="changeViewMonthCalendar(-1)" class="btn-month-nav">◀</button>
                            <h3 id="viewCalendarMonthTitle"></h3>
                            <button onclick="changeViewMonthCalendar(1)" class="btn-month-nav">▶</button>
                        </div>
                        <div id="viewMonthlyCalendarContainer"></div>
                    </div>
                </div>
                
                <!-- 2단: 컨트롤 + 학생 목록 + MEMO -->
                <div class="view-column-right">
                    <!-- 조회 컨트롤 박스 -->
                    <div class="view-controls-box">
                        ${Auth.isAdmin() || Auth.isSubAdmin() ? `
                        <select id="attendanceViewTeacherFilterSelect" class="form-select" style="width: 100%; margin-bottom: 0.5rem;" onchange="filterAttendanceViewByTeacher()">
                            <option value="all">전체 선생님</option>
                        </select>
                        ` : ''}
                        <select id="viewMonthSelect" class="form-select" style="width: 100%; margin-bottom: 0.5rem;" onchange="loadAttendanceViewData()">
                            ${generateMonthDropdownOptions()}
                        </select>
                        <button onclick="printAttendanceView()" class="btn-secondary" style="width: 100%;">인쇄</button>
                    </div>
                    
                    <!-- 학생 목록 -->
                    <div class="view-student-list">
                        <h3>학생 목록</h3>
                        <div id="viewStudentListContainer" class="student-list-items">
                            <p style="text-align: center; color: #999; padding: 2rem;">학생 목록을 불러오는 중...</p>
                        </div>
                    </div>
                    
                    <!-- MEMO -->
                    <div class="view-memo-section">
                        <h4>MEMO</h4>
                        <textarea id="viewMemoTextarea" placeholder="" oninput="saveViewStudentMemoDebounced()"></textarea>
                    </div>
                </div>
            </div>
        </div>
    `;

    // MEMO textarea에 Enter 키 이벤트 추가
    setTimeout(() => {
        const memoTextarea = document.getElementById('viewMemoTextarea');
        if (memoTextarea) {
            memoTextarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    // Enter만 누르면 줄바꿈 (기본 동작)
                    // Shift+Enter는 저장 없이 줄바꿈
                }
            });
            
            // input 이벤트로 실시간 빈 내용 체크
            memoTextarea.addEventListener('input', () => {
                checkViewMemoEmpty();
            });
        }
        
        // 초기 빈 내용 체크
        checkViewMemoEmpty();
    }, 100);

    // 관리자/부관리자인 경우 선생님 목록 로드
    if (Auth.isAdmin() || Auth.isSubAdmin()) {
        await loadTeachersForAttendanceViewFilter();
    }

    // 초기 조회
    await loadAttendanceViewData();
    
    // 월별 전체 메모 로드
    await loadMonthlyGeneralMemo();
}

function generateMonthDropdownOptions() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    let options = '';
    
    // 현재 월부터 과거 24개월까지
    for (let i = 0; i < 24; i++) {
        let year = currentYear;
        let month = currentMonth - i;
        
        while (month <= 0) {
            month += 12;
            year--;
        }
        
        const value = `${year}-${month}`;
        const display = `${year}년 ${month}월`;
        const selected = (year === currentYear && month === currentMonth) ? 'selected' : '';
        
        options += `<option value="${value}" ${selected}>${display}</option>`;
    }
    
    return options;
}

function changeViewMonth(direction) {
    currentViewMonth += direction;
    
    if (currentViewMonth < 1) {
        currentViewMonth = 12;
        currentViewYear--;
    } else if (currentViewMonth > 12) {
        currentViewMonth = 1;
        currentViewYear++;
    }
    
    // 드롭다운 업데이트
    const select = document.getElementById('viewMonthSelect');
    const value = `${currentViewYear}-${currentViewMonth}`;
    select.value = value;
    
    loadAttendanceViewCalendar();
}

// 출결조회 페이지의 달력 월 변경
function changeViewMonthCalendar(direction) {
    currentViewMonth += direction;
    
    if (currentViewMonth < 1) {
        currentViewMonth = 12;
        currentViewYear--;
    } else if (currentViewMonth > 12) {
        currentViewMonth = 1;
        currentViewYear++;
    }
    
    // 드롭다운 업데이트
    const select = document.getElementById('viewMonthSelect');
    const value = `${currentViewYear}-${currentViewMonth}`;
    select.value = value;
    
    loadAttendanceViewData();
}

// 출결조회 페이지 데이터 로드
async function loadAttendanceViewData() {
    const select = document.getElementById('viewMonthSelect');
    const selectedValue = select.value;
    const [year, month] = selectedValue.split('-').map(Number);
    
    currentViewYear = year;
    currentViewMonth = month;
    
    // displayedYear와 displayedMonth 업데이트 (renderViewStudentList에서 사용)
    displayedYear = year;
    displayedMonth = month - 1; // 0-based로 변환
    
    const titleElement = document.getElementById('viewCalendarMonthTitle');
    const calendarContainer = document.getElementById('viewMonthlyCalendarContainer');
    const studentListContainer = document.getElementById('viewStudentListContainer');
    
    if (!titleElement || !calendarContainer || !studentListContainer) {
        console.error('출결조회 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    titleElement.textContent = `${year}년 ${month}월`;
    calendarContainer.innerHTML = '<p style="text-align: center;">로딩 중...</p>';
    studentListContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">로딩 중...</p>';
    
    try {
        // 해당 월의 출석 기록 로드 (출석조회 페이지)
        await loadMonthAttendance(year, month - 1, 'view'); // month는 0-based
        
        // 달력 렌더링
        renderViewMonthlyCalendar(year, month - 1);
        
        // 학생 목록 렌더링
        await renderViewStudentList();
        
        // 월별 전체 메모 로드
        await loadMonthlyGeneralMemo();
        
    } catch (error) {
        console.error('출결조회 로드 실패:', error);
        calendarContainer.innerHTML = '<p style="text-align: center; color: red;">데이터 로드에 실패했습니다.</p>';
    }
}

// 출결조회 페이지의 월별 달력 렌더링
function renderViewMonthlyCalendar(year, month) {
    const container = document.getElementById('viewMonthlyCalendarContainer');
    if (!container) return;
    
    // ✅ 보강 번호 계산
    const makeupNumberMap = calculateMakeupNumbers(allMonthAttendance);
    
    // 오늘 날짜
    const today = new Date();
    
    // 달력 생성
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 월요일부터 시작하도록 조정
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    startDayOfWeek -= 1;
    
    // 항상 월~금요일만 표시 (5열)
    const maxDayOfWeek = 4; // 인덱스 0~4 (월~금)
    
    // 달력 테이블 생성
    let calendarHTML = '<div class="calendar-legend" style="text-align: right; margin-bottom: 0.5rem; font-size: 0.9rem;">';
    calendarHTML += '<span style="color: #000;">출석</span>';
    calendarHTML += '<span style="color: #000; text-decoration: line-through; margin-left: 15px;">결석</span>';
    calendarHTML += '<span style="color: #f44336; margin-left: 15px;">보강</span>';
    calendarHTML += '<span style="color: #9C27B0; margin-left: 15px;">보충</span>';
    calendarHTML += '</div>';
    calendarHTML += '<table class="monthly-calendar">';
    
    // 요일 헤더
    calendarHTML += '<thead>';
    calendarHTML += '<tr>';
    const dayNames = ['월', '화', '수', '목', '금'];
    for (let i = 0; i <= maxDayOfWeek; i++) {
        calendarHTML += `<th>${dayNames[i]}</th>`;
    }
    calendarHTML += '</tr></thead><tbody>';
    
    // 날짜 셀 생성
    let currentDate = 1;
    let finished = false;
    
    while (!finished) {
        let rowHTML = '';
        let hasContent = false; // 이 행에 실제 날짜가 있는지 확인
        
        for (let dayOfWeek = 0; dayOfWeek <= maxDayOfWeek; dayOfWeek++) {
            if (currentDate > lastDay.getDate()) {
                rowHTML += '<td class="empty-cell"></td>';
                finished = true;
                continue;
            }
            
            // 실제 요일 확인 (0=일, 1=월, ..., 6=토)
            let actualDate = new Date(year, month, currentDate);
            let actualDayOfWeek = actualDate.getDay();
            
            // 토요일(6) 또는 일요일(0)을 만나면 계속 건너뛰기
            while ((actualDayOfWeek === 0 || actualDayOfWeek === 6) && currentDate <= lastDay.getDate()) {
                currentDate++;
                if (currentDate > lastDay.getDate()) break;
                actualDate = new Date(year, month, currentDate);
                actualDayOfWeek = actualDate.getDay();
            }
            
            if (currentDate > lastDay.getDate()) {
                rowHTML += '<td class="empty-cell"></td>';
                finished = true;
                continue;
            }
            
            if (currentDate === 1 && dayOfWeek < startDayOfWeek) {
                // 첫 주의 빈 칸
                rowHTML += '<td class="empty-cell"></td>';
            } else {
                hasContent = true; // 실제 날짜가 있음
                const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
                
                // 오늘 날짜와 비교
                const cellDateObj = new Date(year, month, currentDate);
                const todayObj = new Date();
                todayObj.setHours(0, 0, 0, 0);
                cellDateObj.setHours(0, 0, 0, 0);
                
                const isToday = cellDateObj.getTime() === todayObj.getTime();
                
                let cellClass = 'calendar-cell';
                if (isToday) cellClass += ' today';
                
                // 상태가 확정된 출석이 있으면 언제든지 표시
                const schedules = getSchedulesForDate(dateString);
                
                rowHTML += `<td class="${cellClass}">`;
                rowHTML += `<div class="date-number">${currentDate}</div>`;
                
                if (schedules.length > 0) {
                    // ✅ 특수 케이스: 해당 날짜의 모든 기록이 결석이고 사유가 모두 같으면 사유만 표시
                    const allAbsent = schedules.every(s => s.status === '결석');
                    const allSameReason = allAbsent && schedules.every(s => s.absence_reason === schedules[0].absence_reason);
                    
                    if (allAbsent && allSameReason && schedules[0].absence_reason) {
                        // 사유만 표시 (취소선 없이)
                        rowHTML += '<div class="schedule-list">';
                        rowHTML += `<div class="schedule-item holiday-reason" style="color: #666; font-weight: 600; text-align: center;">${schedules[0].absence_reason}</div>`;
                        rowHTML += '</div>';
                    } else {
                        // 일반 표시 (모든 출석 기록)
                        rowHTML += '<div class="schedule-list">';
                        schedules.forEach(schedule => {
                            rowHTML += renderScheduleItem(schedule, 'view', makeupNumberMap);
                        });
                        rowHTML += '</div>';
                    }
                }
                
                rowHTML += '</td>';
                currentDate++;
            }
        }
        
        // 실제 날짜가 있는 행만 추가
        if (hasContent) {
            calendarHTML += '<tr>' + rowHTML + '</tr>';
        }
    }
    
    calendarHTML += '</tbody></table>';
    container.innerHTML = calendarHTML;
}

// 출결조회 페이지의 통계 렌더링
async function renderViewAttendanceStats(year, month) {
    const container = document.getElementById('viewAttendanceStatsContainer');
    if (!container) return;
    
    try {
        // 학생 목록 로드
        const response = await API.getList('students', { limit: 1000 });
        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
        let allStudents = Array.isArray(response) ? response : (response.data || []);
        
        // ✅ 선생님인 경우 담당 학생만 필터링 (teacher_id 기반)
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        console.log('[renderViewAttendanceStats] 권한 필터링 후 학생 수:', allStudents.length);
        
        // 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
        if ((Auth.isAdmin() || Auth.isSubAdmin()) && currentAttendanceViewTeacherFilter !== 'all') {
            allStudents = allStudents.filter(s => s.teacher_id === currentAttendanceViewTeacherFilter);
            console.log('[renderViewAttendanceStats] 선생님 필터링 후 학생 수:', allStudents.length);
        }
        
        // 재원생만 필터링
        const activeStudents = allStudents.filter(student => student.status === '재원');
        
        // 해당 월의 출석 기록이 있는 학생 확인
        let nonActiveWithAttendance = [];
        try {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            const attendanceRecords = await API.getList('attendance');
            
            // 날짜 필터링 (클라이언트 측)
            const filteredRecords = (attendanceRecords.data || []).filter(record => 
                record.date >= startDateStr && record.date <= endDateStr
            );
            
            // 출석 기록이 있지만 재원생이 아닌 학생 찾기
            const attendedStudentIds = new Set(filteredRecords.map(r => r.student_id));
            nonActiveWithAttendance = allStudents.filter(student => 
                student.status !== '재원' && attendedStudentIds.has(student.id)
            );
        } catch (err) {
            console.warn('비재원생 출석자 조회 중 오류 (무시하고 계속):', err);
        }
        
        // 학교 유형별로 분류 및 정렬
        const elementary = activeStudents
            .filter(s => s.school_type === '초')
            .sort((a, b) => {
                const gradeA = parseInt(a.grade) || 0;
                const gradeB = parseInt(b.grade) || 0;
                if (gradeA !== gradeB) return gradeA - gradeB;
                return (a.name || '').localeCompare(b.name || '', 'ko');
            });
        
        const middle = activeStudents
            .filter(s => s.school_type === '중')
            .sort((a, b) => {
                const gradeA = parseInt(a.grade) || 0;
                const gradeB = parseInt(b.grade) || 0;
                if (gradeA !== gradeB) return gradeA - gradeB;
                return (a.name || '').localeCompare(b.name || '', 'ko');
            });
        
        let high = activeStudents
            .filter(s => s.school_type === '고')
            .sort((a, b) => {
                const gradeA = parseInt(a.grade) || 0;
                const gradeB = parseInt(b.grade) || 0;
                if (gradeA !== gradeB) return gradeA - gradeB;
                return (a.name || '').localeCompare(b.name || '', 'ko');
            });
        
        // 재원생이 아닌 확정 스케줄 학생을 고등학생 배열 오른쪽에 추가
        console.log('[renderAttendanceStats] 재원생 고등학생 수:', high.length);
        console.log('[renderAttendanceStats] 비재원생 출석자 수:', nonActiveWithAttendance.length);
        if (nonActiveWithAttendance.length > 0) {
            console.log('[renderAttendanceStats] 비재원생 출석자:', nonActiveWithAttendance.map(s => `${s.name}(${s.status})`));
        }
        high = [...high, ...nonActiveWithAttendance];
        console.log('[renderAttendanceStats] 통합 후 고등학생 수:', high.length);
        
        // 하나의 통합 표로 렌더링
        const statsHTML = renderUnifiedStatsTable(elementary, middle, high, year, month + 1);
        
        container.innerHTML = statsHTML;
        
    } catch (error) {
        console.error('통계 렌더링 실패:', error);
        container.innerHTML = '<p style="color: red;">통계 로드에 실패했습니다.</p>';
    }
}

async function loadAttendanceViewCalendar() {
    const select = document.getElementById('viewMonthSelect');
    const selectedValue = select.value;
    const [year, month] = selectedValue.split('-').map(Number);
    
    currentViewYear = year;
    currentViewMonth = month;
    
    const studentId = document.getElementById('viewStudentFilter').value;
    
    const container = document.getElementById('viewCalendarContainer');
    const title = document.getElementById('viewCalendarTitle');
    
    container.innerHTML = '<p style="text-align: center;">로딩 중...</p>';
    title.textContent = `${year}년 ${month}월`;
    
    try {
        // 해당 월의 출석 기록 로드
        const response = await API.getList('attendance', { limit: 1000 });
        let allAttendance = Array.isArray(response) ? response : (response.data || []);
        
        // 해당 월 필터링
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        
        let filteredAttendance = allAttendance.filter(record => {
            return record.date >= monthStart && record.date <= monthEnd;
        });
        
        // 학생 필터링
        if (studentId) {
            filteredAttendance = filteredAttendance.filter(record => record.student_id === studentId);
        }
        
        // 달력 렌더링 (출석 기록이 없어도 표시)
        renderViewCalendar(year, month, filteredAttendance);
        
    } catch (error) {
        console.error('출석 조회 실패:', error);
        // 오류가 발생해도 빈 달력은 표시
        renderViewCalendar(year, month, []);
    }
}

// 학생 목록 렌더링 (2단용)
async function renderViewStudentList() {
    const container = document.getElementById('viewStudentListContainer');
    if (!container) return;
    
    try {
        // 학생 목록 로드
        const response = await API.getList('students', { limit: 1000 });
        let allStudents = Array.isArray(response) ? response : (response.data || []);
        
        // 권한 필터링
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        
        // 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
        if ((Auth.isAdmin() || Auth.isSubAdmin()) && currentAttendanceViewTeacherFilter !== 'all') {
            allStudents = allStudents.filter(s => s.teacher_id === currentAttendanceViewTeacherFilter);
        }
        
        // 재원생만 필터링
        const activeStudents = allStudents.filter(s => s.status === '재원');
        
        // 📊 해당 월의 출석 데이터 로드 및 각 학생별 출석/보강 횟수 계산
        let attendanceCountMap = {}; // { studentId: { attendance: 0, makeup: 0 } }
        try {
            const year = displayedYear || currentYear;
            const month = displayedMonth !== undefined ? displayedMonth : currentMonth;
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            const attendanceRecords = await API.getList('attendance', { limit: 10000 });
            const records = Array.isArray(attendanceRecords) ? attendanceRecords : (attendanceRecords.data || []);
            
            // 해당 월의 출석 데이터 필터링
            const monthRecords = records.filter(record => 
                record.date >= startDateStr && record.date <= endDateStr && record.check_out_time
            );
            
            // 각 학생별 출석/보강 횟수 집계
            monthRecords.forEach(record => {
                if (!record.student_id) return;
                
                if (!attendanceCountMap[record.student_id]) {
                    attendanceCountMap[record.student_id] = { attendance: 0, makeup: 0 };
                }
                
                // status가 '출석'이면 출석 횟수 증가, '보강'이면 보강 횟수 증가
                if (record.status === '출석') {
                    attendanceCountMap[record.student_id].attendance++;
                } else if (record.status === '보강') {
                    attendanceCountMap[record.student_id].makeup++;
                }
            });
            
            console.log('[renderViewStudentList] 출석/보강 횟수 집계 완료:', attendanceCountMap);
        } catch (error) {
            console.error('[renderViewStudentList] 출석 데이터 로드 실패:', error);
        }
        
        if (activeStudents.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">조회된 학생이 없습니다.</p>';
            return;
        }
        
        // 학교급/학년별로 그룹화
        const groupedStudents = {};
        
        activeStudents.forEach(student => {
            const schoolType = student.school_type || '기타';
            const grade = student.grade || '미정';
            const schoolTypeFull = schoolType === '초' ? '초등' : 
                                   schoolType === '중' ? '중등' : 
                                   schoolType === '고' ? '고등' : schoolType;
            const key = `${schoolTypeFull} ${grade}학년`;
            
            if (!groupedStudents[key]) {
                groupedStudents[key] = [];
            }
            groupedStudents[key].push(student);
        });
        
        // 각 그룹 내에서 이름순 정렬
        Object.keys(groupedStudents).forEach(key => {
            groupedStudents[key].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
        });
        
        // 그룹 키 정렬
        const sortedKeys = Object.keys(groupedStudents).sort((a, b) => {
            const schoolOrder = { '초등': 1, '중등': 2, '고등': 3, '기타': 4 };
            const [typeA, gradeA] = a.split(' ');
            const [typeB, gradeB] = b.split(' ');
            
            if (typeA !== typeB) {
                return (schoolOrder[typeA] || 999) - (schoolOrder[typeB] || 999);
            }
            
            const gradeNumA = parseInt(gradeA) || 999;
            const gradeNumB = parseInt(gradeB) || 999;
            return gradeNumA - gradeNumB;
        });
        
        let html = '';
        
        // 학년별로 렌더링
        sortedKeys.forEach(groupKey => {
            const students = groupedStudents[groupKey];
            
            // 학년 헤더
            html += `<div style="font-weight: 700; color: #8B4513; font-size: 0.9rem; margin-top: 0.5rem; margin-bottom: 0.3rem; padding-bottom: 0.2rem; border-bottom: 2px solid #d0d0d0;">${groupKey}</div>`;
            
            // 학생 아이템 (텍스트 형식)
            students.forEach(student => {
                const schoolName = student.school || '-';
                const shortSchoolName = schoolName.length > 1 ? schoolName.slice(0, -1) : schoolName;
                
                // 출석/보강 횟수 가져오기
                const counts = attendanceCountMap[student.id] || { attendance: 0, makeup: 0 };
                const totalCount = counts.attendance + counts.makeup;
                const countText = totalCount > 0 ? `(${totalCount})` : '';
                
                // 월별 메모는 나중에 loadAndApplyMonthlyMemos()에서 로드됨
                html += `
                    <div class="student-text-item" data-student-id="${student.id}">
                        <span class="student-text-name" onclick="selectViewStudent('${student.id}', '${student.name}', event)">${student.name}</span>
                        ${countText ? `<span class="student-text-count">${countText}</span>` : ''}
                        <span class="student-text-school">(${shortSchoolName})</span>
                        <textarea 
                            class="student-text-memo"
                            placeholder="" 
                            data-student-id="${student.id}"
                            oninput="saveStudentMonthlyMemoDebounced('${student.id}', this.value)"
                            onclick="event.stopPropagation()"
                            rows="1"
                        ></textarea>
                    </div>
                `;
            });
        });
        
        container.innerHTML = html;
        
        // 학생별 월별 메모 로드 및 반영
        await loadAndApplyStudentMonthlyMemos(activeStudents);
        
    } catch (error) {
        console.error('학생 목록 로드 실패:', error);
        container.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">학생 목록 로드에 실패했습니다.</p>';
    }
}

// 학생 선택
let selectedViewStudentId = null;

// 학생별 월별 메모 로드 및 입력칸에 적용
async function loadAndApplyStudentMonthlyMemos(students) {
    try {
        const year = displayedYear || currentYear;
        const month = (displayedMonth !== undefined ? displayedMonth : currentMonth) + 1; // 1-based (1-12)
        
        console.log(`[학생별 월별 메모 로드] ${year}년 ${month}월`);
        
        // 해당 월의 모든 메모 가져오기
        const response = await API.getList('student_monthly_memos', { limit: 1000 });
        const allMemos = Array.isArray(response) ? response : (response.data || []);
        
        // 현재 연월에 해당하는 메모만 필터링
        const currentMonthMemos = allMemos.filter(memo => 
            memo.year === year && memo.month === month
        );
        
        console.log(`[학생별 월별 메모 로드] ${currentMonthMemos.length}개 발견`);
        
        // 학생 ID별로 메모 매핑
        const memoMap = {};
        currentMonthMemos.forEach(memo => {
            if (memo.student_id) {
                memoMap[memo.student_id] = memo.memo || '';
            }
        });
        
        // 각 학생의 입력칸에 해당 월 메모 설정
        students.forEach(student => {
            const inputElement = document.querySelector(`.student-text-memo[data-student-id="${student.id}"]`);
            if (inputElement) {
                const monthlyMemo = memoMap[student.id] || '';
                inputElement.value = monthlyMemo;
                
                if (monthlyMemo) {
                    console.log(`  - ${student.name}: "${monthlyMemo}"`);
                }
            }
        });
        
    } catch (error) {
        console.error('[학생별 월별 메모 로드 실패]', error);
    }
}

// 디바운스 타이머
let memoSaveTimers = {};

// 학생별 월별 메모 저장 (디바운싱)
function saveStudentMonthlyMemoDebounced(studentId, memoValue) {
    // 기존 타이머 취소
    if (memoSaveTimers[studentId]) {
        clearTimeout(memoSaveTimers[studentId]);
    }
    
    // 500ms 후 저장
    memoSaveTimers[studentId] = setTimeout(async () => {
        try {
            const year = displayedYear || currentYear;
            const month = (displayedMonth !== undefined ? displayedMonth : currentMonth) + 1; // 1-based
            
            console.log(`[학생별 월별 메모 저장] ${year}년 ${month}월, 학생 ID: ${studentId}, 내용: "${memoValue}"`);
            
            // 기존 메모 찾기
            const response = await API.getList('student_monthly_memos', { limit: 1000 });
            const allMemos = Array.isArray(response) ? response : (response.data || []);
            
            const existingMemo = allMemos.find(memo => 
                memo.student_id === studentId && 
                memo.year === year && 
                memo.month === month
            );
            
            if (existingMemo) {
                // 업데이트
                await API.update('student_monthly_memos', existingMemo.id, { memo: memoValue });
                console.log(`✅ 학생 메모 업데이트 완료`);
            } else {
                // 신규 생성
                await API.create('student_monthly_memos', {
                    student_id: studentId,
                    year: year,
                    month: month,
                    memo: memoValue
                });
                console.log(`✅ 학생 메모 신규 생성 완료`);
            }
            
            // 시각적 피드백
            const inputElement = document.querySelector(`.student-text-memo[data-student-id="${studentId}"]`);
            if (inputElement) {
                inputElement.style.borderColor = '#28a745';
                setTimeout(() => {
                    inputElement.style.borderColor = '';
                }, 300);
            }
        } catch (error) {
            console.error('❌ 학생별 월별 메모 저장 실패:', error);
        }
    }, 500);
}

function selectViewStudent(studentId, studentName, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // 진행 중인 MEMO 저장이 있으면 즉시 저장
    if (viewMemoSaveTimer) {
        clearTimeout(viewMemoSaveTimer);
        // 이전 월별 전체 메모를 즉시 저장 (비동기이지만 기다리지 않음)
        saveMonthlyGeneralMemo();
    }
    
    selectedViewStudentId = studentId;
    
    // 모든 학생 아이템에서 active 클래스 제거
    document.querySelectorAll('.student-text-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 클릭한 아이템에 active 클래스 추가
    const studentItem = document.querySelector(`.student-text-item[data-student-id="${studentId}"]`);
    if (studentItem) {
        studentItem.classList.add('active');
    }
    
    // 달력에서 해당 학생 하이라이트
    highlightViewStudent(studentName);
    
    // MEMO 불러오기
    loadViewStudentMemo(studentId);
}

// 학생 메모 textarea 키 이벤트 처리
function handleStudentMemoKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        // Enter만 누르면 줄바꿈 (기본 동작)
        // Shift+Enter도 줄바꿈
    }
    // textarea 클릭 시 이벤트 전파 방지는 onclick에서 처리
}

// 월별 전체 메모 로드 (학생 무관)
async function loadMonthlyGeneralMemo() {
    const textarea = document.getElementById('viewMemoTextarea');
    if (!textarea) return;
    
    try {
        const year = displayedYear || currentYear;
        const month = (displayedMonth !== undefined ? displayedMonth : currentMonth) + 1; // 1-based
        
        console.log(`[월별 전체 메모 로드] ${year}년 ${month}월`);
        
        // 해당 연월의 메모 찾기
        const response = await API.getList('monthly_general_memos', { limit: 1000 });
        const allMemos = Array.isArray(response) ? response : (response.data || []);
        
        const monthMemo = allMemos.find(memo => 
            memo.year === year && memo.month === month
        );
        
        textarea.value = monthMemo ? (monthMemo.memo || '') : '';
        console.log(`[월별 전체 메모 로드] 내용: "${textarea.value}"`);
        
    } catch (error) {
        console.error('[월별 전체 메모 로드 실패]', error);
        textarea.value = '';
    }
    
    // 빈 내용 체크 (인쇄 시 숨김 처리)
    checkViewMemoEmpty();
}

// 학생 MEMO 불러오기 → 이제 사용 안 함 (월별 전체 메모로 대체)
async function loadViewStudentMemo(studentId) {
    // 학생 선택 시 아무 동작 안 함 (MEMO는 월별 전체 메모)
    console.log(`[학생 선택] ${studentId} - MEMO는 월별 전체 메모`);
}

// 학생 MEMO 저장
// MEMO 내용 확인 및 빈 경우 숨김 처리
function checkViewMemoEmpty() {
    const memoSection = document.querySelector('.view-memo-section');
    const textarea = document.getElementById('viewMemoTextarea');
    
    if (memoSection && textarea) {
        const isEmpty = textarea.value.trim() === '';
        if (isEmpty) {
            memoSection.classList.add('empty-memo');
        } else {
            memoSection.classList.remove('empty-memo');
        }
    }
}

// MEMO 저장 타이머
let viewMemoSaveTimer = null;

// MEMO 실시간 저장 (디바운싱)
function saveViewStudentMemoDebounced() {
    // 기존 타이머 취소
    if (viewMemoSaveTimer) {
        clearTimeout(viewMemoSaveTimer);
    }
    
    // 500ms 후 저장
    viewMemoSaveTimer = setTimeout(() => {
        saveMonthlyGeneralMemo();
    }, 500);
}

// 월별 전체 메모 저장 (학생 무관)
async function saveMonthlyGeneralMemo() {
    const textarea = document.getElementById('viewMemoTextarea');
    if (!textarea) return;
    
    const memo = textarea.value;
    
    try {
        const year = displayedYear || currentYear;
        const month = (displayedMonth !== undefined ? displayedMonth : currentMonth) + 1; // 1-based
        
        console.log(`[월별 전체 메모 저장] ${year}년 ${month}월, 내용: "${memo}"`);
        
        // 기존 메모 찾기
        const response = await API.getList('monthly_general_memos', { limit: 1000 });
        const allMemos = Array.isArray(response) ? response : (response.data || []);
        
        const existingMemo = allMemos.find(m => 
            m.year === year && m.month === month
        );
        
        if (existingMemo) {
            // 업데이트
            await API.update('monthly_general_memos', existingMemo.id, { memo });
            console.log('✅ 월별 전체 메모 업데이트 완료');
        } else {
            // 신규 생성
            await API.create('monthly_general_memos', {
                year: year,
                month: month,
                memo: memo
            });
            console.log('✅ 월별 전체 메모 신규 생성 완료');
        }
        
        // 시각적 피드백
        if (textarea) {
            textarea.style.borderColor = '#28a745';
            setTimeout(() => {
                textarea.style.borderColor = '';
            }, 300);
        }
        
        // 메모 저장 후 빈 내용 체크
        checkViewMemoEmpty();
    } catch (error) {
        console.error('❌ 월별 전체 메모 저장 실패:', error);
    }
}

// 학생 정보 테이블 렌더링 (기존 함수 - 필요시 사용)
async function renderViewStudentInfoTable() {
    const container = document.getElementById('viewStudentInfoContainer');
    if (!container) return;
    
    try {
        // 학생 목록 로드
        const response = await API.getList('students', { limit: 1000 });
        let allStudents = Array.isArray(response) ? response : (response.data || []);
        
        // 권한 필터링
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        
        // 관리자/부관리자인 경우 선택된 선생님으로 추가 필터링
        if ((Auth.isAdmin() || Auth.isSubAdmin()) && currentAttendanceViewTeacherFilter !== 'all') {
            allStudents = allStudents.filter(s => s.teacher_id === currentAttendanceViewTeacherFilter);
        }
        
        // 재원생만 필터링
        const activeStudents = allStudents.filter(s => s.status === '재원');
        
        if (activeStudents.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">조회된 학생이 없습니다.</p>';
            return;
        }
        
        // 학교급/학년별로 그룹화 (초등/중등/고등 + 학년)
        const groupedStudents = {};
        
        activeStudents.forEach(student => {
            const schoolType = student.school_type || '기타';
            const grade = student.grade || '미정';
            // 학교급을 풀네임으로 변환
            const schoolTypeFull = schoolType === '초' ? '초등' : 
                                   schoolType === '중' ? '중등' : 
                                   schoolType === '고' ? '고등' : schoolType;
            const key = `${schoolTypeFull} ${grade}학년`;
            
            if (!groupedStudents[key]) {
                groupedStudents[key] = [];
            }
            groupedStudents[key].push(student);
        });
        
        // 각 그룹 내에서 이름순 정렬
        Object.keys(groupedStudents).forEach(key => {
            groupedStudents[key].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
        });
        
        // 그룹 키 정렬 (초등→중등→고등, 학년 오름차순)
        const sortedKeys = Object.keys(groupedStudents).sort((a, b) => {
            const schoolOrder = { '초등': 1, '중등': 2, '고등': 3, '기타': 4 };
            const [typeA, gradeA] = a.split(' ');
            const [typeB, gradeB] = b.split(' ');
            
            if (typeA !== typeB) {
                return (schoolOrder[typeA] || 999) - (schoolOrder[typeB] || 999);
            }
            
            const gradeNumA = parseInt(gradeA) || 999;
            const gradeNumB = parseInt(gradeB) || 999;
            return gradeNumA - gradeNumB;
        });
        
        let html = '<table class="student-info-table">';
        html += '<thead><tr>';
        html += '<th style="width: 30%;">이름(학교)</th>';
        html += '<th style="width: 70%;">메모</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        // 학년별로 렌더링
        sortedKeys.forEach(groupKey => {
            const students = groupedStudents[groupKey];
            
            // 학년 헤더 (테이블 칸이 아닌 텍스트로)
            html += '<tr class="grade-header-row">';
            html += `<td colspan="2"><div class="grade-header-text">${groupKey}</div></td>`;
            html += '</tr>';
            
            // 학생 행
            students.forEach(student => {
                const schoolName = student.school || '-';
                // 학교명에서 마지막 글자 제거 (예: "용소초" → "용소")
                const shortSchoolName = schoolName.length > 1 ? schoolName.slice(0, -1) : schoolName;
                const memo = student.memo || '';
                
                html += '<tr>';
                html += `<td class="student-name-cell" onclick="highlightViewStudent('${student.name}')">
                    <span class="student-name-text">${student.name}</span>
                    <span class="student-school-inline">(${shortSchoolName})</span>
                </td>`;
                html += `<td><textarea rows="1" class="${memo ? '' : 'print-hide-if-empty'}" data-student-id="${student.id}" onchange="saveStudentViewMemo('${student.id}', this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" placeholder="특이사항">${memo}</textarea></td>`;
                html += '</tr>';
            });
        });
        
        html += '</tbody></table>';
        
        // 2단 하단에 MEMO 섹션 추가
        html += '<div class="view-memo-section" style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">';
        html += '<h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; font-weight: 600; color: #495057;">MEMO</h4>';
        html += '<textarea id="viewMemoTextarea" style="width: 100%; min-height: 100px; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; font-family: \'Noto Sans KR\', sans-serif; font-size: 0.9rem; resize: vertical;" placeholder=""></textarea>';
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('학생 정보 테이블 렌더링 실패:', error);
        container.innerHTML = '<p style="text-align: center; color: #f44336;">데이터 로드에 실패했습니다.</p>';
    }
}

// 학생 조회 메모 자동 저장
async function saveStudentViewMemo(studentId, memo) {
    try {
        await API.update('students', studentId, { memo: memo });
        console.log(`학생 ${studentId} 메모 저장 완료:`, memo);
    } catch (error) {
        console.error('메모 저장 실패:', error);
        alert('메모 저장에 실패했습니다.');
    }
}

// 출석조회 페이지에서 학생 형광펜 표시
async function highlightViewStudent(studentName) {
    if (highlightedViewStudentName === studentName) {
        // 이미 선택된 학생 클릭 시 해제
        highlightedViewStudentName = null;
    } else {
        // 새로운 학생 선택
        highlightedViewStudentName = studentName;
    }
    
    // 월별 달력 다시 렌더링 (데이터 먼저 로드)
    const year = currentViewYear;
    const month = currentViewMonth;
    
    // 출석 데이터 로드 후 렌더링
    await loadMonthAttendance(year, month - 1, 'view'); // month는 1-based이므로 -1
    renderViewMonthlyCalendar(year, month - 1);
}

function printAttendanceView() {
    // 기본 브라우저 인쇄
    window.print();
}

function renderViewCalendar(year, month, attendanceRecords) {
    const container = document.getElementById('viewCalendarContainer');
    
    // ✅ 보강 번호 계산
    const makeupNumberMap = calculateMakeupNumbers(attendanceRecords);
    
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    // 월요일부터 시작하도록 조정
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    startDayOfWeek -= 1;
    
    // 토요일 출석이 있는지 확인
    const hasSaturday = attendanceRecords.some(record => {
        const recordDate = new Date(record.date);
        return recordDate.getDay() === 6;
    });
    
    const maxDayOfWeek = hasSaturday ? 6 : 5;
    
    let html = `
        <div class="calendar-view-section">
            <table class="monthly-calendar">
                <thead><tr>
    `;
    
    const dayNames = ['월', '화', '수', '목', '금', '토'];
    for (let i = 0; i <= maxDayOfWeek; i++) {
        html += `<th>${dayNames[i]}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    let currentDate = 1;
    let finished = false;
    
    while (!finished) {
        html += '<tr>';
        
        for (let dayOfWeek = 0; dayOfWeek <= maxDayOfWeek; dayOfWeek++) {
            if ((currentDate === 1 && dayOfWeek < startDayOfWeek) || currentDate > lastDay.getDate()) {
                html += '<td class="empty-cell"></td>';
                if (currentDate > lastDay.getDate()) finished = true;
            } else {
                const dateString = `${year}-${String(month).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
                const schedules = attendanceRecords.filter(r => r.date === dateString);
                
                html += `<td class="calendar-cell">`;
                html += `<div class="date-number">${currentDate}</div>`;
                
                if (schedules.length > 0) {
                    html += '<div class="schedule-list">';
                    schedules.forEach(schedule => {
                        html += renderScheduleItem(schedule, 'view', makeupNumberMap);
                    });
                    html += '</div>';
                }
                
                html += '</td>';
                currentDate++;
            }
        }
        
        html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ========================================
// 담당선생님 필터링 함수들 (출석관리/출석조회)
// ========================================

// 출석관리 페이지: 선생님 목록 로드 및 드롭다운 구성
async function loadTeachersForAttendanceFilter() {
    try {
        console.log('[loadTeachersForAttendanceFilter] 선생님 목록 로드 시작');
        
        const result = await API.getList('teachers', { limit: 1000 });
        const teachers = Array.isArray(result) ? result : (result.data || []);
        
        console.log('[loadTeachersForAttendanceFilter] 전체 선생님:', teachers.length, '명');
        
        // 선생님 데이터 상세 출력
        if (teachers.length > 0) {
            console.log('[loadTeachersForAttendanceFilter] 첫 번째 선생님 샘플:', teachers[0]);
            console.log('[loadTeachersForAttendanceFilter] 모든 선생님 정보:');
            teachers.forEach(t => {
                console.log(`  - ${t.name}: role=${t.role}, status=${t.status}`);
            });
        } else {
            console.warn('[loadTeachersForAttendanceFilter] ⚠️ teachers 데이터가 비어있습니다!');
        }
        
        // 선생님 필터링: role이 있으면서 퇴사하지 않은 모든 선생님 포함
        const activeTeachers = teachers.filter(t => {
            // role이 있는 선생님만 포함 (한글: 관리자/부관리자/선생님, 영어: admin/sub-admin/teacher)
            const hasRole = t.role && (
                t.role === '관리자' || t.role === 'admin' || 
                t.role === '부관리자' || t.role === 'sub-admin' || 
                t.role === '선생님' || t.role === 'teacher'
            );
            // status가 '퇴사'가 아닌 경우 (status가 없거나, '재직', '활동중', '근무중' 등)
            const notResigned = !t.status || (t.status !== '퇴사' && t.status !== '퇴직');
            return hasRole && notResigned;
        });
        
        console.log('[loadTeachersForAttendanceFilter] 필터링된 선생님:', activeTeachers.length, '명');
        
        // 재직 중인 선생님 목록 출력
        if (activeTeachers.length > 0) {
            console.log('[loadTeachersForAttendanceFilter] 재직 중인 선생님 목록:');
            activeTeachers.forEach(t => {
                console.log(`  ✓ ${t.name} (role: ${t.role}, status: ${t.status || '없음'})`);
            });
        } else {
            console.error('[loadTeachersForAttendanceFilter] ⚠️ 필터링 후 선생님이 0명입니다!');
            console.error('[loadTeachersForAttendanceFilter] 필터 조건: role이 있고, status가 퇴사/퇴직이 아닌 선생님');
        }
        
        // 역할별로 그룹화 (한글/영어 모두 지원)
        const admins = activeTeachers.filter(t => t.role === '관리자' || t.role === 'admin');
        const subAdmins = activeTeachers.filter(t => t.role === '부관리자' || t.role === 'sub-admin');
        const regularTeachers = activeTeachers.filter(t => t.role === '선생님' || t.role === 'teacher');
        
        console.log('[loadTeachersForAttendanceFilter] 관리자:', admins.length, '명, 부관리자:', subAdmins.length, '명, 선생님:', regularTeachers.length, '명');
        
        // 드롭다운 구성
        let select = document.getElementById('attendanceTeacherFilterSelect');
        
        // 드롭다운이 없으면 최대 3초 동안 재시도
        if (!select) {
            console.log('[loadTeachersForAttendanceFilter] 드롭다운 대기 중...');
            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                select = document.getElementById('attendanceTeacherFilterSelect');
                if (select) {
                    console.log(`[loadTeachersForAttendanceFilter] ✓ 드롭다운 발견 (${i * 100}ms 후)`);
                    break;
                }
            }
        }
        
        if (!select) {
            console.error('[loadTeachersForAttendanceFilter] ❌ 드롭다운을 찾을 수 없습니다! (3초 대기 후)');
            console.error('[loadTeachersForAttendanceFilter] attendance-check-container 존재:', !!document.querySelector('.attendance-check-container'));
            console.error('[loadTeachersForAttendanceFilter] 관리자 여부:', Auth.isAdmin(), '부관리자 여부:', Auth.isSubAdmin());
            return;
        }
        
        console.log('[loadTeachersForAttendanceFilter] ✓ 드롭다운 요소 발견');
        
        let options = '<option value="all">전체 선생님</option>';
        
        // 모든 선생님을 그룹 없이 나열 (관리자, 부관리자, 선생님 순서)
        [...admins, ...subAdmins, ...regularTeachers].forEach(t => {
            options += `<option value="${t.id}">${t.name}</option>`;
        });
        
        select.innerHTML = options;
        console.log('[loadTeachersForAttendanceFilter] ✓ 드롭다운 구성 완료');
        console.log('[loadTeachersForAttendanceFilter] 추가된 옵션 수:', select.options.length, '개');
    } catch (error) {
        console.error('[loadTeachersForAttendanceFilter] 선생님 목록 로드 실패:', error);
    }
}

// 출석관리 페이지: 선생님 필터 변경 핸들러 (전역 노출)
window.filterAttendanceByTeacher = function() {
    const select = document.getElementById('attendanceTeacherFilterSelect');
    if (!select) {
        console.error('[filterAttendanceByTeacher] 드롭다운을 찾을 수 없습니다.');
        return;
    }
    
    currentAttendanceTeacherFilter = select.value;
    console.log('[filterAttendanceByTeacher] 선택된 선생님 ID:', currentAttendanceTeacherFilter);
    
    // 출석 데이터 재로드
    loadAttendanceData();
    renderMonthlyCalendar();
}

// 출석조회 페이지: 선생님 목록 로드 및 드롭다운 구성
async function loadTeachersForAttendanceViewFilter() {
    try {
        const result = await API.getList('teachers', { limit: 1000 });
        const teachers = Array.isArray(result) ? result : (result.data || []);
        
        // 재직중인 선생님만 필터링 (퇴사/퇴직 제외)
        const activeTeachers = teachers.filter(t => {
            const status = (t.status || '').trim();
            return status !== '퇴사' && status !== '퇴직';
        });
        
        // 역할별로 그룹화 (한글/영어 모두 지원)
        const admins = activeTeachers.filter(t => t.role === '관리자' || t.role === 'admin');
        const subAdmins = activeTeachers.filter(t => t.role === '부관리자' || t.role === 'sub-admin');
        const regularTeachers = activeTeachers.filter(t => t.role === '선생님' || t.role === 'teacher');
        
        // 드롭다운 구성
        const select = document.getElementById('attendanceViewTeacherFilterSelect');
        if (!select) return;
        
        let options = '<option value="all">전체 선생님</option>';
        
        // 모든 선생님을 그룹 없이 나열 (관리자, 부관리자, 선생님 순서)
        [...admins, ...subAdmins, ...regularTeachers].forEach(t => {
            options += `<option value="${t.id}">${t.name}</option>`;
        });
        
        select.innerHTML = options;
    } catch (error) {
        console.error('[loadTeachersForAttendanceViewFilter] 선생님 목록 로드 실패:', error);
    }
}

// 출석조회 페이지: 선생님 필터 변경 핸들러
function filterAttendanceViewByTeacher() {
    const select = document.getElementById('attendanceViewTeacherFilterSelect');
    if (!select) return;
    
    currentAttendanceViewTeacherFilter = select.value;
    console.log('[filterAttendanceViewByTeacher] 선택된 선생님 ID:', currentAttendanceViewTeacherFilter);
    
    // 출석조회 데이터 재로드
    loadAttendanceViewData();
}

// ========================================
// 일정 등록 기능
// ========================================

let selectedScheduleDates = [];
let selectedScheduleStudentIds = [];

// 일정 등록 모달 열기
function openScheduleModal() {
    const modal = document.createElement('div');
    modal.id = 'scheduleModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 2rem; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <h2 style="margin: 0 0 1.5rem 0; color: #333;">일정 등록</h2>
            
            <!-- ① 제목 입력 -->
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #495057;">① 제목</label>
                <input type="text" id="scheduleTitle" placeholder="예: 설날, 추석, 보충수업" 
                    style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem;" />
            </div>
            
            <!-- ② 날짜 선택 -->
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #495057;">② 날짜 선택 (복수 선택 가능)</label>
                <div id="scheduleDatePicker" style="border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; background: #f8f9fa;"></div>
                <div id="selectedDatesDisplay" style="margin-top: 0.5rem; font-size: 0.9rem; font-weight: 600;"></div>
            </div>
            
            <!-- ③ 상태 설정 -->
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #495057;">③ 상태 설정</label>
                <select id="scheduleStatus" onchange="handleScheduleStatusChange()" 
                    style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem;">
                    <option value="결석">결석</option>
                    <option value="보충">보충</option>
                    <option value="보강">보강</option>
                </select>
                <!-- 결석 사유 입력 -->
                <input type="text" id="scheduleAbsenceReason" placeholder="결석 사유 입력" 
                    style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem; margin-top: 0.5rem;" />
                <!-- 보충/보강 시간 입력 -->
                <div id="scheduleSupplementTime" style="display: none; margin-top: 0.5rem; gap: 1rem;">
                    <div style="display: flex; gap: 1rem;">
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 0.9rem; margin-bottom: 0.3rem; color: #666;">입실 시간</label>
                            <input type="text" id="scheduleCheckInTime" placeholder="14:00" 
                                style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem;"
                                onblur="this.value = formatTimeInput(this.value)" />
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 0.9rem; margin-bottom: 0.3rem; color: #666;">퇴실 시간</label>
                            <input type="text" id="scheduleCheckOutTime" placeholder="15:30" 
                                style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem;"
                                onblur="this.value = formatTimeInput(this.value)" />
                        </div>
                    </div>
                </div>
                <!-- 보강 결석날짜 입력 -->
                <div id="scheduleMakeupDate" style="display: none; margin-top: 0.5rem;">
                    <label style="display: block; font-size: 0.9rem; margin-bottom: 0.3rem; color: #666;">결석 날짜 (MM/DD)</label>
                    <input type="text" id="scheduleMakeupDateInput" placeholder="02/16" 
                        maxlength="5"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 1rem;"
                        oninput="formatMakeupDateInput(this)" />
                </div>
            </div>
            
            <!-- ④ 학생 선택 -->
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #495057;">④ 학생 선택 (미선택 시 전체 학생)</label>
                <div id="scheduleStudentList" style="border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; background: #f8f9fa; max-height: 300px; overflow-y: auto;"></div>
            </div>
            
            <!-- ⑤ 등록 버튼 -->
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button onclick="closeScheduleModal()" class="btn-cancel">취소</button>
                <button onclick="registerSchedule()" class="btn-primary">등록</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 날짜 선택기 렌더링
    renderScheduleDatePicker();
    
    // 학생 목록 렌더링
    renderScheduleStudentList();
    
    // 초기 상태에 맞게 사유/시간 필드 표시
    handleScheduleStatusChange();
}

// 일정 등록 모달 닫기
function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.remove();
    }
    selectedScheduleDates = [];
    selectedScheduleStudentIds = [];
}

// 일정 달력 상태 변수
let scheduleCalendarYear = new Date().getFullYear();
let scheduleCalendarMonth = new Date().getMonth();

// 날짜 선택기 렌더링 (월 이동 가능)
function renderScheduleDatePicker() {
    const container = document.getElementById('scheduleDatePicker');
    
    const firstDay = new Date(scheduleCalendarYear, scheduleCalendarMonth, 1);
    const lastDay = new Date(scheduleCalendarYear, scheduleCalendarMonth + 1, 0);
    
    // 헤더 (년월 + 이전/다음 버튼)
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <button onclick="changeScheduleCalendarMonth(-1)" style="padding: 0.5rem 1rem; border: none; background: #f8f9fa; border-radius: 4px; cursor: pointer; font-size: 1.2rem;">◀</button>
            <div style="font-weight: 600; font-size: 1.1rem;">${scheduleCalendarYear}년 ${scheduleCalendarMonth + 1}월</div>
            <button onclick="changeScheduleCalendarMonth(1)" style="padding: 0.5rem 1rem; border: none; background: #f8f9fa; border-radius: 4px; cursor: pointer; font-size: 1.2rem;">▶</button>
        </div>
    `;
    
    html += `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem;">`;
    
    // 요일 헤더 (월~일)
    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
    dayNames.forEach(day => {
        html += `<div style="text-align: center; font-weight: 600; padding: 0.5rem; color: #666;">${day}</div>`;
    });
    
    // 첫 날의 요일 계산 (월요일=0, 일요일=6)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // 일요일인 경우
    
    // 빈 칸 (첫 주 시작 전)
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div></div>`;
    }
    
    // 날짜 버튼
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const dateString = `${scheduleCalendarYear}-${String(scheduleCalendarMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        
        // 요일 계산 (0=월요일, 6=일요일)
        const currentDate = new Date(scheduleCalendarYear, scheduleCalendarMonth, date);
        let dayOfWeek = currentDate.getDay() - 1;
        if (dayOfWeek === -1) dayOfWeek = 6;
        
        // 토요일(5) 또는 일요일(6)이면 배경색 연회색
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
        const bgColor = isWeekend ? '#f5f5f5' : 'white';
        
        // 이미 선택된 날짜인지 확인
        const isSelected = selectedScheduleDates.includes(dateString);
        const selectedStyle = isSelected ? 'background: #FF6B35; border-color: #FF6B35; color: white;' : `background: ${bgColor};`;
        
        html += `
            <button onclick="toggleScheduleDate('${dateString}')" 
                id="schedule-date-${dateString}"
                style="padding: 0.5rem; border: 2px solid #dee2e6; border-radius: 4px; ${selectedStyle} cursor: pointer; transition: all 0.2s;">
                ${date}
            </button>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

// 일정 달력 월 변경
function changeScheduleCalendarMonth(direction) {
    scheduleCalendarMonth += direction;
    
    if (scheduleCalendarMonth < 0) {
        scheduleCalendarMonth = 11;
        scheduleCalendarYear--;
    } else if (scheduleCalendarMonth > 11) {
        scheduleCalendarMonth = 0;
        scheduleCalendarYear++;
    }
    
    renderScheduleDatePicker();
}

// 날짜 토글
function toggleScheduleDate(dateString) {
    const button = document.getElementById(`schedule-date-${dateString}`);
    const index = selectedScheduleDates.indexOf(dateString);
    
    // 해당 날짜의 요일 확인 (토·일요일인지)
    const [year, month, day] = dateString.split('-');
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    let dayOfWeek = currentDate.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const weekendBgColor = isWeekend ? '#f5f5f5' : 'white';
    
    if (index > -1) {
        // 선택 해제 - 주말이면 연회색, 평일이면 흰색
        selectedScheduleDates.splice(index, 1);
        button.style.background = weekendBgColor;
        button.style.borderColor = '#dee2e6';
        button.style.color = '#333';
    } else {
        // 선택 - 주황색
        selectedScheduleDates.push(dateString);
        button.style.background = '#FF6B35';
        button.style.borderColor = '#FF6B35';
        button.style.color = 'white';
    }
    
    // 선택된 날짜 표시 업데이트
    updateSelectedDatesDisplay();
}

// 선택된 날짜 표시 업데이트
function updateSelectedDatesDisplay() {
    const display = document.getElementById('selectedDatesDisplay');
    if (selectedScheduleDates.length === 0) {
        display.innerHTML = '선택된 날짜가 없습니다.';
    } else {
        const sortedDates = selectedScheduleDates.sort();
        const dateStrings = sortedDates.map(d => {
            const [year, month, day] = d.split('-');
            return `${parseInt(month)}/${parseInt(day)}`;
        });
        display.innerHTML = `선택된 날짜: <span style="color: #FF6B35; font-weight: 600;">${dateStrings.join(', ')}</span> (${sortedDates.length}일)`;
    }
}

// 학생 목록 렌더링 (학년별 가로 나열)
async function renderScheduleStudentList() {
    const container = document.getElementById('scheduleStudentList');
    container.innerHTML = '<p style="text-align: center; color: #999;">로딩 중...</p>';
    
    try {
        const response = await API.getList('students', { limit: 1000 });
        let allStudents = Array.isArray(response) ? response : (response.data || []);
        
        // 권한 필터링
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        
        // 재원생만
        const activeStudents = allStudents.filter(s => s.status === '재원');
        
        if (activeStudents.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">재원생이 없습니다.</p>';
            return;
        }
        
        // 학교급/학년별로 그룹화
        const groupedStudents = {};
        
        activeStudents.forEach(student => {
            const schoolType = student.school_type || '기타';
            const grade = student.grade || '미정';
            const schoolTypeFull = schoolType === '초' ? '초등' : 
                                   schoolType === '중' ? '중등' : 
                                   schoolType === '고' ? '고등' : schoolType;
            const key = `${schoolTypeFull} ${grade}학년`;
            
            if (!groupedStudents[key]) {
                groupedStudents[key] = [];
            }
            groupedStudents[key].push(student);
        });
        
        // 각 그룹 내에서 이름순 정렬
        Object.keys(groupedStudents).forEach(key => {
            groupedStudents[key].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
        });
        
        // 그룹 키 정렬
        const sortedKeys = Object.keys(groupedStudents).sort((a, b) => {
            const schoolOrder = { '초등': 1, '중등': 2, '고등': 3, '기타': 4 };
            const [typeA, gradeA] = a.split(' ');
            const [typeB, gradeB] = b.split(' ');
            
            if (typeA !== typeB) {
                return (schoolOrder[typeA] || 999) - (schoolOrder[typeB] || 999);
            }
            
            const gradeNumA = parseInt(gradeA) || 999;
            const gradeNumB = parseInt(gradeB) || 999;
            return gradeNumA - gradeNumB;
        });
        
        let html = '';
        
        // 학년별로 렌더링
        sortedKeys.forEach(groupKey => {
            const students = groupedStudents[groupKey];
            
            // 학년 헤더
            html += `<div style="font-weight: 700; color: #8B4513; font-size: 0.95rem; margin-top: 1rem; margin-bottom: 0.5rem; padding-bottom: 0.3rem; border-bottom: 2px solid #d0d0d0;">${groupKey}</div>`;
            
            // 학생 체크박스 (가로 나열)
            html += `<div style="display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.5rem 0;">`;
            students.forEach(student => {
                html += `
                    <div style="display: flex; align-items: center; min-width: 120px;">
                        <input type="checkbox" id="schedule-student-${student.id}" value="${student.id}" 
                            onchange="toggleScheduleStudent('${student.id}')"
                            style="margin-right: 0.5rem; width: 18px; height: 18px; cursor: pointer;" />
                        <label for="schedule-student-${student.id}" style="cursor: pointer; font-size: 0.95rem; white-space: nowrap;">${student.name}</label>
                    </div>
                `;
            });
            html += `</div>`;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('학생 목록 로드 실패:', error);
        container.innerHTML = '<p style="text-align: center; color: #f44336;">학생 목록 로드에 실패했습니다.</p>';
    }
}

// 학생 토글
function toggleScheduleStudent(studentId) {
    const checkbox = document.getElementById(`schedule-student-${studentId}`);
    const index = selectedScheduleStudentIds.indexOf(studentId);
    
    if (checkbox.checked) {
        if (index === -1) {
            selectedScheduleStudentIds.push(studentId);
        }
    } else {
        if (index > -1) {
            selectedScheduleStudentIds.splice(index, 1);
        }
    }
}

// 상태 변경 핸들러
function handleScheduleStatusChange() {
    const statusSelect = document.getElementById('scheduleStatus');
    const reasonInput = document.getElementById('scheduleAbsenceReason');
    const supplementTimeDiv = document.getElementById('scheduleSupplementTime');
    const makeupDateDiv = document.getElementById('scheduleMakeupDate');
    
    if (statusSelect.value === '결석') {
        reasonInput.style.display = 'block';
        supplementTimeDiv.style.display = 'none';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
    } else if (statusSelect.value === '보충') {
        reasonInput.style.display = 'none';
        supplementTimeDiv.style.display = 'block';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
    } else if (statusSelect.value === '보강') {
        reasonInput.style.display = 'none';
        supplementTimeDiv.style.display = 'block';
        if (makeupDateDiv) makeupDateDiv.style.display = 'block';
    } else {
        reasonInput.style.display = 'none';
        supplementTimeDiv.style.display = 'none';
        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
    }
}

// 일정 등록 실행
async function registerSchedule() {
    const title = document.getElementById('scheduleTitle').value.trim();
    const status = document.getElementById('scheduleStatus').value;
    const absenceReason = document.getElementById('scheduleAbsenceReason').value.trim();
    const checkInTime = document.getElementById('scheduleCheckInTime')?.value.trim() || '';
    const checkOutTime = document.getElementById('scheduleCheckOutTime')?.value.trim() || '';
    const makeupDateInput = document.getElementById('scheduleMakeupDateInput')?.value.trim() || '';
    
    // 유효성 검사
    if (!title) {
        alert('제목을 입력해주세요.');
        return;
    }
    
    if (selectedScheduleDates.length === 0) {
        alert('날짜를 선택해주세요.');
        return;
    }
    
    // 결석인 경우 사유 확인
    if (status === '결석' && !absenceReason) {
        alert('결석 사유를 입력해주세요.');
        return;
    }
    
    // 보충 또는 보강인 경우 시간 확인
    if (status === '보충' || status === '보강') {
        if (!checkInTime || !checkOutTime) {
            alert('입실 시간과 퇴실 시간을 입력해주세요.');
            return;
        }
    }
    
    // 보강인 경우 결석날짜 확인
    if (status === '보강' && !makeupDateInput) {
        alert('결석 날짜를 입력해주세요.');
        return;
    }
    
    // 결석날짜 변환 (MM/DD → YYYY-MM-DD)
    let makeupDate = '';
    if (status === '보강' && makeupDateInput) {
        const [mm, dd] = makeupDateInput.split('/');
        if (mm && dd) {
            // 현재 연도 사용 (또는 첫 번째 선택 날짜의 연도)
            const year = selectedScheduleDates.length > 0 ? selectedScheduleDates[0].split('-')[0] : new Date().getFullYear();
            makeupDate = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
    }
    
    // 확인 메시지
    const studentText = selectedScheduleStudentIds.length === 0 
        ? '스케줄이 있는 모든 학생' 
        : `선택한 ${selectedScheduleStudentIds.length}명의 학생`;
    
    if (!confirm(`${selectedScheduleDates.length}일에 대해 ${studentText}을(를) "${status}" 처리하시겠습니까?`)) {
        return;
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        // 전체 출석 레코드 한번만 로드
        const attendanceResponse = await API.getList('attendance', { limit: 10000 });
        const allAttendance = Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse.data || []);
        
        // 학생 정보 로드
        const studentsResponse = await API.getList('students', { limit: 1000 });
        let allStudents = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        
        // 권한 필터링 (선생님인 경우 담당 학생만)
        allStudents = Permissions.filterStudentsByTeacher(allStudents);
        
        // 재원생만 필터링
        let activeStudents = allStudents.filter(s => s.status === '재원');
        
        // ✅ 학생 선택이 있으면 해당 학생들만 처리
        if (selectedScheduleStudentIds.length > 0) {
            activeStudents = activeStudents.filter(s => selectedScheduleStudentIds.includes(s.id));
        }
        
        console.log(`[registerSchedule] 처리 대상 학생 수: ${activeStudents.length}명`);
        
        // 각 날짜별로 처리
        for (const dateString of selectedScheduleDates) {
            // 해당 날짜의 요일 계산
            const [year, month, day] = dateString.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const dayOfWeek = dateObj.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
            
            // ✅ 영어 요일 키 사용 (학생 스케줄의 키 형식과 일치)
            const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayKey = dayKeys[dayOfWeek];
            
            const koreanDayKeys = ['일', '월', '화', '수', '목', '금', '토'];
            const koreanDayKey = koreanDayKeys[dayOfWeek];
            
            console.log(`[registerSchedule] 날짜: ${dateString} (${koreanDayKey}요일, 키: ${dayKey})`);
            
            // 모든 대상 학생에 대해 처리
            for (const student of activeStudents) {
                try {
                    // 학생의 스케줄 확인
                    let schedule = student.schedule;
                    if (typeof schedule === 'string') {
                        try {
                            schedule = JSON.parse(schedule);
                        } catch (e) {
                            schedule = null;
                        }
                    }
                    
                    // 해당 요일에 스케줄이 있는지 확인
                    const daySchedule = schedule && schedule[dayKey];
                    const hasSchedule = daySchedule && 
                                       daySchedule.checkIn && 
                                       daySchedule.checkOut;
                    
                    console.log(`  [${student.name}] 스케줄 확인: ${dayKey}요일 스케줄 ${hasSchedule ? '있음' : '없음'}${hasSchedule ? ` (입실: ${daySchedule.checkIn}, 퇴실: ${daySchedule.checkOut})` : ''}`);
                    
                    if (!hasSchedule) {
                        // 스케줄이 없으면 건너뜀
                        continue;
                    }
                    
                    // ✅ 해당 날짜에 이미 출석 레코드가 있는지 확인
                    const existingRecords = allAttendance.filter(r => r.student_id === student.id && r.date === dateString);
                    
                    // ✅ 주간 스케줄과 가장 가까운 시간의 레코드 찾기 (메인 레코드)
                    let mainRecord = null;
                    if (existingRecords.length > 0) {
                        mainRecord = existingRecords.reduce((closest, record) => {
                            if (!record.check_in_time) return closest;
                            if (!closest) return record;
                            
                            const closestDiff = Math.abs(timeToMinutes(closest.check_in_time) - timeToMinutes(daySchedule.checkIn));
                            const recordDiff = Math.abs(timeToMinutes(record.check_in_time) - timeToMinutes(daySchedule.checkIn));
                            
                            return recordDiff < closestDiff ? record : closest;
                        }, null) || existingRecords[0];
                    }
                    
                    if (status === '보충' || status === '보강') {
                        // ✅ 보충/보강 스케줄 추가: 기존 레코드는 유지하고 새 레코드 생성
                        
                        // ✅ 주간 스케줄 레코드가 없으면 먼저 생성 (메인 행 표시용)
                        if (!mainRecord) {
                            const mainCreateData = {
                                student_id: student.id,
                                student_name: student.name,
                                date: dateString,
                                check_in_time: daySchedule.checkIn,
                                expected_out_time: daySchedule.checkOut,
                                check_out_time: daySchedule.checkOut,
                                status: '',
                                absence_reason: '',
                                makeup_date: ''
                            };
                            
                            const mainResult = await API.create('attendance', mainCreateData);
                            console.log(`  ✅ 주간 스케줄 레코드 생성: ${student.name} (${daySchedule.checkIn}-${daySchedule.checkOut})`);
                        }
                        
                        // 보충/보강 레코드 생성
                        const createData = {
                            student_id: student.id,
                            student_name: student.name,
                            date: dateString,
                            check_in_time: checkInTime,
                            expected_out_time: calculateExpectedTime(checkInTime, daySchedule.duration || 90),
                            check_out_time: checkOutTime,
                            status: status, // '보충' 또는 '보강'
                            absence_reason: '',
                            makeup_date: status === '보강' ? makeupDate : ''
                        };
                        
                        await API.create('attendance', createData);
                        successCount++;
                        console.log(`  ✅ ${status} 생성: ${student.name} (${checkInTime}-${checkOutTime})${status === '보강' ? ` 결석날짜: ${makeupDate}` : ''}`);
                    } else if (status === '결석') {
                        // ✅ 결석 처리: 메인 레코드만 업데이트 (나머지 보충 레코드는 유지)
                        if (mainRecord) {
                            const updateData = {
                                ...mainRecord,
                                status: '결석',
                                absence_reason: absenceReason,
                                check_in_time: '',
                                check_out_time: '',
                                expected_out_time: '',
                                makeup_date: ''
                            };
                            
                            await API.update('attendance', mainRecord.id, updateData);
                            successCount++;
                            console.log(`  ✅ 결석 업데이트: ${student.name}`);
                        } else {
                            // 레코드가 없으면 새로 생성
                            const createData = {
                                student_id: student.id,
                                student_name: student.name,
                                date: dateString,
                                check_in_time: '',
                                expected_out_time: '',
                                check_out_time: '',
                                status: '결석',
                                absence_reason: absenceReason,
                                makeup_date: ''
                            };
                            
                            await API.create('attendance', createData);
                            successCount++;
                            console.log(`  ✅ 결석 생성: ${student.name}`);
                        }
                    }
                    
                } catch (error) {
                    console.error(`  ❌ 등록 실패 - 날짜: ${dateString}, 학생: ${student.name}`, error);
                    failCount++;
                }
            }
        }
        
        // ✅ 조용히 등록 완료 (alert 제거)
        console.log(`✅ 일정 등록 완료 - 성공: ${successCount}건${failCount > 0 ? `, 실패: ${failCount}건` : ''}`);
        
        // 모달 닫기
        closeScheduleModal();
        
        // 출석 데이터 새로고침
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('❌ 일정 등록 실패:', error);
        alert('일정 등록에 실패했습니다.\n오류: ' + (error.message || '알 수 없는 오류'));
    }
}

// ========================================
// 전역 함수 노출
// ========================================
window.showAttendanceCheckPage = showAttendanceCheckPage;
window.showAttendanceViewPage = showAttendanceViewPage;
window.changeCheckPageMonth = changeCheckPageMonth;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.changeScheduleCalendarMonth = changeScheduleCalendarMonth;
window.toggleScheduleDate = toggleScheduleDate;
window.toggleScheduleStudent = toggleScheduleStudent;
window.handleScheduleStatusChange = handleScheduleStatusChange;
window.registerSchedule = registerSchedule;

console.log('[attendance-fixed.js] 로드 완료');
console.log('[attendance-fixed.js] showAttendanceCheckPage:', typeof window.showAttendanceCheckPage);
console.log('[attendance-fixed.js] showAttendanceViewPage:', typeof window.showAttendanceViewPage);

// 파일 끝
