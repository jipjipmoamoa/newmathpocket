// ============================================
// 출석 관리 모듈
// ============================================

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

// ============================================
// 헬퍼 함수: 시간을 분 단위로 변환
// ============================================
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
                            <th>퇴실예정시간</th>
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
                    <h3 id="calendarMonthTitle"></h3>
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
        
        const schedule = getStudentTodaySchedule(student);
        const expectedOutTime = calculateExpectedTime(checkInTime, schedule ? schedule.duration : 90);
        
        const existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
        
        if (existingRecord) {
            await API.update('attendance', existingRecord.id, {
                ...existingRecord,
                check_in_time: checkInTime,
                expected_out_time: expectedOutTime,
                status: '출석'
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
    
    // 퇴실 예정 시간 계산
    const schedule = studentData.id ? getStudentTodaySchedule(studentData) : null;
    const expectedOutTime = calculateExpectedTime(checkInTime, schedule ? schedule.duration : 90);

    // 출석 데이터 생성
    const attendanceData = {
        student_id: studentData.id || null,
        student_name: studentData.name,
        date: getSelectedDateString(),
        check_in_time: checkInTime,
        expected_out_time: expectedOutTime,
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
        
        // ✅ 재원생만 필터링 (스케줄 유무와 관계없이 담당 학생은 모두 표시)
        attendanceStudents = allStudents.filter(student => {
            // 재원생만 표시
            const isActive = student.status === '재원';
            console.log(`[${student.name}] 상태: ${student.status}, 재원생: ${isActive}`);
            return isActive;
        });
        
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
        <td style="background-color: #fffbf0;"><input type="text" id="registerExpectedOutTime" class="form-input" placeholder="15:30" readonly /></td>
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
            <select id="registerAbsenceReason" class="form-select" style="display: none; margin-top: 5px;">
                <option value="">사유 선택</option>
                <option value="병결">병결</option>
                <option value="학교">학교</option>
                <option value="여행">여행</option>
                <option value="기타">기타</option>
            </select>
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
        let schedule = student.schedule;
        if (typeof schedule === 'string' && schedule.trim() !== '') {
            try { schedule = JSON.parse(schedule); } catch (e) { schedule = {}; }
        } else {
            schedule = {};
        }
        
        // 기본 요일 스케줄
        const daySchedule = schedule[selectedDayKey] || {};
        
        // ✅ 학생의 모든 출석 기록 가져오기 (같은 날짜에 여러 개 있을 수 있음)
        const studentRecords = todayAttendanceRecords.filter(r => r.student_id === student.id);
        
        // ✅ 기본 요일 스케줄이 있으면 추가
        if (daySchedule.enabled) {
            // 기본 스케줄의 checkIn 시간과 가장 가까운 출석 기록 찾기
            let mainRecord = null;
            if (daySchedule.checkIn && studentRecords.length > 0) {
                // 시간 차이가 가장 작은 기록 찾기
                mainRecord = studentRecords.reduce((closest, record) => {
                    if (!record.check_in_time) return closest;
                    const recordTime = record.check_in_time;
                    const scheduleTime = daySchedule.checkIn;
                    
                    if (!closest) return record;
                    
                    const closestDiff = Math.abs(timeToMinutes(closest.check_in_time || '00:00') - timeToMinutes(scheduleTime));
                    const recordDiff = Math.abs(timeToMinutes(recordTime) - timeToMinutes(scheduleTime));
                    
                    return recordDiff < closestDiff ? record : closest;
                }, null);
            }
            
            const checkInTime = mainRecord?.check_in_time || daySchedule.checkIn || '23:59';
            allAttendanceRows.push({
                type: 'scheduled',
                student: student,
                record: mainRecord,
                daySchedule: daySchedule,
                checkInTime: checkInTime,
                scheduleType: 'main'
            });
        }
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
            
            // 기본값: 스케줄의 입실/퇴실 시간
            let checkInTime = daySchedule.checkIn || '';
            let expectedOutTime = daySchedule.checkOut || '';
            let checkOutTime = '';
            let status = '';
            let actualDuration = '';
            let scheduledDuration = parseInt(daySchedule.duration) || 90;
            
            let absenceReason = '';
            let makeupDate = '';
            
            if (existingRecord) {
                checkInTime = existingRecord.check_in_time || checkInTime;
                expectedOutTime = existingRecord.expected_out_time || expectedOutTime;
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
        
        if (status === '출석') {
            statusColor = 'style="color: #4CAF50; font-weight: 600;"';
        } else if (status === '보강') {
            // 보강 날짜 표시
            if (makeupDate) {
                const formattedDate = makeupDate.substring(5).replace('-', '/');
                statusText = `보강(${formattedDate})`;
            }
            statusColor = 'style="color: #f44336; font-weight: 600;"';
        } else if (status === '보충') {
            // 보충 표시
            statusColor = 'style="color: #9C27B0; font-weight: 600;"';
        } else if (status === '결석') {
            // 결석 사유 표시
            if (absenceReason) {
                statusText = `결석(${absenceReason})`;
            }
            statusColor = 'style="color: #000; font-weight: 600; text-decoration: line-through;"';
        } else {
            // 상태가 비어있을 때: 입실만 있으면 초록색 체크, 입실도 없으면 검정색
            if (checkInTime && !checkOutTime) {
                statusText = '✓';
                statusColor = 'style="color: #4CAF50; font-weight: 600; font-size: 1.2rem;"';
            } else {
                statusColor = 'style="color: #000;"';
            }
        }
        
        row.innerHTML = `
            <td>${student.name} (${student.attendance_number || '-'})</td>
            <td>
                <span class="display-mode" id="display-checkin-${rowId}">${checkInTime || '-'}</span>
                <input type="text" class="form-input edit-mode" id="edit-checkin-${rowId}" value="${checkInTime}" placeholder="14:00" style="display: none;"
                    oninput="autoUpdateExpectedOutTime('${rowId}', this.value, ${scheduledDuration})"
                    onblur="this.value = formatTimeInput(this.value)" />
            </td>
            <td>
                <span class="display-mode" id="display-expected-${rowId}">${expectedOutTime || '-'}</span>
                <input type="text" class="form-input edit-mode" id="edit-expected-${rowId}" value="${expectedOutTime}" placeholder="15:30" readonly style="display: none;" />
            </td>
            <td>
                <span class="display-mode" id="display-checkout-${rowId}">${checkOutTime || '-'}</span>
                <input type="text" class="form-input edit-mode" id="edit-checkout-${rowId}" value="${checkOutTime}" placeholder="15:30" style="display: none;"
                    onblur="this.value = formatTimeInput(this.value)" />
            </td>
            <td class="duration-display" ${durationColor}>${durationText}</td>
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
                    <select class="form-select" id="absence-reason-${rowId}" style="display: ${status === '결석' ? 'block' : 'none'}; margin-top: 5px;">
                        <option value="">사유 선택</option>
                        <option value="병결" ${absenceReason === '병결' ? 'selected' : ''}>병결</option>
                        <option value="학교" ${absenceReason === '학교' ? 'selected' : ''}>학교</option>
                        <option value="여행" ${absenceReason === '여행' ? 'selected' : ''}>여행</option>
                        <option value="기타" ${absenceReason === '기타' ? 'selected' : ''}>기타</option>
                    </select>
                    <div id="makeup-date-${rowId}" style="display: ${status === '보강' ? 'block' : 'none'}; margin-top: 5px;">
                        <input type="date" id="makeup-date-input-${rowId}" class="form-input" value="${makeupDate}" style="width: 100%;" placeholder="보강 날짜" />
                    </div>
                </div>
            </td>
            <td>
                <button class="btn-quick-checkin" onclick="quickCheckIn('${student.id}', '${item.scheduleType}', '${existingRecord ? existingRecord.id : ''}')" title="입실">입실</button>
                <button class="btn-quick-checkout" onclick="quickCheckOut('${student.id}', '${item.scheduleType}', '${existingRecord ? existingRecord.id : ''}')" title="퇴실">퇴실</button>
            </td>
            <td>
                <button class="btn-icon btn-edit display-mode" id="btn-edit-${rowId}" onclick="enterEditMode('${rowId}')" title="수정"></button>
                ${existingRecord ? `<button class="btn-icon btn-delete display-mode" id="btn-delete-${rowId}" onclick="deleteAttendance('${rowId}', '${existingRecord.id}')" style="margin-left: 0.5rem;" title="삭제"></button>` : ''}
                <div class="edit-mode" id="edit-buttons-${rowId}" style="display: none;">
                    <button class="btn-save" onclick="saveAttendance('${rowId}')">저장</button>
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
                    const formattedDate = makeupDate.substring(5).replace('-', '/');
                    statusText = `보강(${formattedDate})`;
                }
                statusColor = 'color: #f44336; font-weight: 600;';
            } else if (status === '결석') {
                if (absenceReason) {
                    statusText = `결석(${absenceReason})`;
                }
                statusColor = 'color: #000; font-weight: 600; text-decoration: line-through;';
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
                    <div class="display-mode" id="display-expected-${rowId}">${expectedOutTime || '-'}</div>
                    <input type="text" class="form-input edit-mode" id="edit-expected-${rowId}" value="${expectedOutTime}" readonly style="display: none;" />
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
                        </select>
                        <select class="form-select" id="absence-reason-${rowId}" style="display: ${status === '결석' ? 'block' : 'none'}; margin-top: 5px;">
                            <option value="">사유 선택</option>
                            <option value="병결" ${absenceReason === '병결' ? 'selected' : ''}>병결</option>
                            <option value="학교" ${absenceReason === '학교' ? 'selected' : ''}>학교</option>
                            <option value="여행" ${absenceReason === '여행' ? 'selected' : ''}>여행</option>
                            <option value="기타" ${absenceReason === '기타' ? 'selected' : ''}>기타</option>
                        </select>
                        <div id="makeup-date-${rowId}" style="display: ${status === '보강' ? 'block' : 'none'}; margin-top: 5px;">
                            <input type="date" id="makeup-date-input-${rowId}" class="form-input" value="${makeupDate}" style="width: 100%;" placeholder="보강 날짜" />
                        </div>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="btn-quick-checkin" onclick="quickCheckIn('${record.student_id}', '${record.id}')" title="입실">입실</button>
                    <button class="btn-quick-checkout" onclick="quickCheckOut('${record.student_id}', '${record.id}')" title="퇴실">퇴실</button>
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
        }
    });
    
    // 스케줄도 없고 출석 기록도 없는 경우
    if (allAttendanceRows.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="8" style="text-align: center; color: #999;">
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
    const studentId = rowId.split('-').slice(0, -1).join('-');
    
    // 입력 필드에서 값 가져오기
    let checkInTime = document.getElementById(`edit-checkin-${rowId}`)?.value || '';
    const expectedOutTime = document.getElementById(`edit-expected-${rowId}`)?.value || '';
    let checkOutTime = document.getElementById(`edit-checkout-${rowId}`)?.value || '';
    let status = document.getElementById(`status-${rowId}`)?.value || '';
    const absenceReason = document.getElementById(`absence-reason-${rowId}`)?.value || '';
    const makeupDate = document.getElementById(`makeup-date-input-${rowId}`)?.value || '';
    
    // 스케줄에서 기본값 가져오기
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
        
        // 입력하지 않았으면 스케줄 시간 사용
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
    
    // 상태가 비어있으면 자동 결정: 입실+퇴실 있으면 "출석", 입실만 있으면 빈 상태
    if (!status) {
        if (checkInTime && checkOutTime) {
            status = '출석';
        } else {
            status = '';
        }
    }
    
    const attendanceData = {
        student_id: studentId,
        student_name: studentName,
        date: selectedDate,
        check_in_time: checkInTime,
        expected_out_time: expectedOutTime,
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
        
        // 데이터 다시 로드
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('출석 저장 오류:', error);
        alert('출석 저장에 실패했습니다.');
    }
}

// ============================================
// 빠른 입실/퇴실 버튼 함수
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
                await API.update('attendance', existingRecord.id, {
                    ...existingRecord,
                    check_in_time: checkInTime,
                    expected_out_time: expectedOutTime,
                    status: existingRecord.check_out_time ? '출석' : ''
                });
                alert(`${student.name} 입실 ${checkInTime}`);
            }
        } else {
            // recordId가 없으면 새로 생성 (기존 로직)
            const existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
            
            if (existingRecord) {
                await API.update('attendance', existingRecord.id, {
                    ...existingRecord,
                    check_in_time: checkInTime,
                    expected_out_time: expectedOutTime,
                    status: existingRecord.check_out_time ? '출석' : ''
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
        
        await API.update('attendance', existingRecord.id, {
            ...existingRecord,
            check_out_time: checkOutTime,
            status: existingRecord.check_in_time ? '출석' : existingRecord.status
        });
        
        alert(`${student.name} 퇴실 ${checkOutTime}`);
        
        await loadAttendanceData();
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
    
    if (!statusSelect) return;
    
    const status = statusSelect.value;
    
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
    
    // 이미 출석 체크되었는지 확인
    const existingRecord = todayAttendanceRecords.find(r => r.student_id === studentId);
    if (existingRecord) {
        alert(`${student.name} 학생은 이미 출석 체크되었습니다.`);
        return;
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
        const result = await API.create('attendance', attendanceData);
        console.log('출석 등록 성공:', result);
        alert('출석이 등록되었습니다.');
        
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
        console.error('출석 등록 실패:', error);
        alert('출석 등록에 실패했습니다.');
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
    if (!student || !student.schedule) return null;
    
    const selectedDate = getSelectedDateString();
    const dateObj = new Date(selectedDate);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const selectedDayKey = dayKeys[dateObj.getDay()];
    
    const scheduleForDay = student.schedule[selectedDayKey];
    if (!scheduleForDay || !scheduleForDay.enabled) return null;
    
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
    
    // 선택된 날짜의 연/월 사용 (출석현황에서 선택한 날짜 기준)
    const selectedDate = getSelectedDateString();
    const selectedDateObj = new Date(selectedDate);
    const currentYear = selectedDateObj.getFullYear();
    const currentMonth = selectedDateObj.getMonth();
    
    // 오늘 날짜
    const today = new Date();
    const todayDate = today.getDate();
    
    // 타이틀에 년월만 표시
    title.innerHTML = `${currentYear}년 ${currentMonth + 1}월`;
    
    // 해당 월의 출석 기록 로드 (출석체크 페이지) [CHECK_PAGE_MARKER]
    await loadMonthAttendance(currentYear, currentMonth, 'check');
    
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
    let calendarHTML = '<table class="monthly-calendar">';
    
    // 범례 행 (금요일 행 바로 위, 오른쪽 정렬)
    calendarHTML += '<thead>';
    calendarHTML += '<tr>';
    calendarHTML += '<th colspan="5" style="text-align: right; padding: 0.5rem; font-size: 0.9rem; font-weight: normal; border-bottom: none;">';
    calendarHTML += '<span style="color: #000;">출석</span>';
    calendarHTML += '<span style="color: #000; text-decoration: line-through; margin-left: 15px;">결석</span>';
    calendarHTML += '<span style="color: #f44336; margin-left: 15px;">보강</span>';
    calendarHTML += '<span style="color: #9C27B0; margin-left: 15px;">보충</span>';
    calendarHTML += '</th>';
    calendarHTML += '</tr>';
    
    // 요일 헤더
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
                
                // 통계 계산
                let attendanceCount = 0;
                let makeupCount = 0;
                let supplementCount = 0;
                let absenceCount = 0;
                
                schedules.forEach(schedule => {
                    if (schedule.status === '출석') attendanceCount++;
                    else if (schedule.status === '보강') makeupCount++;
                    else if (schedule.status === '보충') supplementCount++;
                    else if (schedule.status === '결석') absenceCount++;
                });
                
                const statsText = schedules.length > 0 
                    ? ` <span style="background-color: #fff3cd; padding: 1px 4px; border-radius: 2px; font-size: 0.85rem;">${attendanceCount}(${makeupCount})명 / ${absenceCount}명</span>` 
                    : '';
                
                rowHTML += `<td class="${cellClass}">`;
                rowHTML += `<div class="date-number">${currentDate}${statsText}</div>`;
                
                if (schedules.length > 0) {
                    rowHTML += '<div class="schedule-list">';
                    schedules.forEach(schedule => {
                        rowHTML += renderScheduleItem(schedule, 'check');
                    });
                    rowHTML += '</div>';
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

// 특정 날짜의 스케줄 가져오기 (상태가 확정된 출석만, 입실시간 빠른순 정렬, 중복 제거)
function getSchedulesForDate(dateString) {
    const filtered = allMonthAttendance.filter(record => {
        const hasDate = record.date === dateString;
        const hasStatus = record.status && record.status !== '';
        
        // 날짜가 일치하고, 상태가 확정된 경우만 반환
        return hasDate && hasStatus;
    });
    
    // 중복 제거: 같은 student_id가 있으면 가장 최신(updated_at 또는 created_at 기준) 기록만 유지
    const uniqueMap = new Map();
    filtered.forEach(record => {
        const key = record.student_id || record.student_name; // student_id가 없으면 이름으로 구분
        const existing = uniqueMap.get(key);
        
        if (!existing) {
            uniqueMap.set(key, record);
        } else {
            // 최신 기록 유지 (updated_at 또는 created_at 비교)
            const existingTime = existing.updated_at || existing.created_at || 0;
            const recordTime = record.updated_at || record.created_at || 0;
            
            if (recordTime > existingTime) {
                uniqueMap.set(key, record);
            }
        }
    });
    
    // Map에서 배열로 변환
    const uniqueRecords = Array.from(uniqueMap.values());
    
    // 입실시간 빠른순 정렬
    uniqueRecords.sort((a, b) => {
        const timeA = a.check_in_time || '23:59';
        const timeB = b.check_in_time || '23:59';
        return timeA.localeCompare(timeB);
    });
    
    if (uniqueRecords.length > 0) {
        console.log(`[getSchedulesForDate] ${dateString} 결과: ${uniqueRecords.length}개 (중복 제거, 입실시간 빠른순)`);
        uniqueRecords.forEach((record, index) => {
            console.log(`  ${index + 1}. ${record.check_in_time} - ${record.student_name}, 상태: ${record.status}, 퇴실: ${record.check_out_time}`);
        });
    }
    
    return uniqueRecords;
}

// 스케줄 아이템 렌더링 (pageType: 'check' 또는 'view')
function renderScheduleItem(schedule, pageType = 'check') {
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
        // 결석: "이름, 결석(사유)" - 검정색 + 가로선
        itemClass += ' absent';
        const reason = schedule.absence_reason ? `(${schedule.absence_reason})` : '';
        content = `${schedule.student_name} 결석${reason}`;
    } else if (schedule.status === '보강') {
        // 보강: "입실시간, 이름, 퇴실시간 (결석날짜)" - 빨간색
        itemClass += ' makeup';
        const makeupDateStr = schedule.makeup_date ? ` (${schedule.makeup_date.substring(5).replace('-', '/')})` : '';
        content = `${schedule.check_in_time || '-'} ${schedule.student_name} ${schedule.check_out_time || '-'}${makeupDateStr}`;
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
    
    // 보강 횟수
    const makeupCount = studentRecords.filter(r => r.status === '보강').length;
    
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
        alert(`${studentData.name} 출석이 등록되었습니다.`);
        
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
        
        // 데이터 다시 로드
        await loadAttendanceData();
        await renderMonthlyCalendar();
        
    } catch (error) {
        console.error('출석 등록 오류:', error);
        alert('출석 등록에 실패했습니다.');
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
            <div class="view-controls">
                <div class="controls-right">
                    ${Auth.isAdmin() || Auth.isSubAdmin() ? `
                    <select id="attendanceViewTeacherFilterSelect" class="form-select" style="width: 200px; margin-right: 0.5rem;" onchange="filterAttendanceViewByTeacher()">
                        <option value="all">전체 선생님</option>
                    </select>
                    ` : ''}
                    <select id="viewMonthSelect" class="form-select" onchange="loadAttendanceViewData()">
                        ${generateMonthDropdownOptions()}
                    </select>
                    
                    <button onclick="loadAttendanceViewData()" class="btn-primary">조회</button>
                    <button onclick="printAttendanceView()" class="btn-secondary">인쇄</button>
                </div>
            </div>
            
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
                
                <!-- 2단: 학생 정보 테이블 -->
                <div class="view-column-right">
                    <div class="student-info-section">
                        <h3>학생 정보</h3>
                        <div id="viewStudentInfoContainer">
                            <p style="text-align: center; color: #999;">조회된 학생이 없습니다.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 관리자/부관리자인 경우 선생님 목록 로드
    if (Auth.isAdmin() || Auth.isSubAdmin()) {
        await loadTeachersForAttendanceViewFilter();
    }

    // 초기 조회
    await loadAttendanceViewData();
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
    
    const titleElement = document.getElementById('viewCalendarMonthTitle');
    const calendarContainer = document.getElementById('viewMonthlyCalendarContainer');
    const studentInfoContainer = document.getElementById('viewStudentInfoContainer');
    
    if (!titleElement || !calendarContainer || !studentInfoContainer) {
        console.error('출결조회 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    titleElement.textContent = `${year}년 ${month}월`;
    calendarContainer.innerHTML = '<p style="text-align: center;">로딩 중...</p>';
    studentInfoContainer.innerHTML = '<p style="text-align: center;">로딩 중...</p>';
    
    try {
        // 해당 월의 출석 기록 로드 (출석조회 페이지)
        await loadMonthAttendance(year, month - 1, 'view'); // month는 0-based
        
        // 달력 렌더링
        renderViewMonthlyCalendar(year, month - 1);
        
        // 학생 정보 테이블 렌더링
        await renderViewStudentInfoTable();
        
    } catch (error) {
        console.error('출결조회 로드 실패:', error);
        calendarContainer.innerHTML = '<p style="text-align: center; color: red;">데이터 로드에 실패했습니다.</p>';
    }
}

// 출결조회 페이지의 월별 달력 렌더링
function renderViewMonthlyCalendar(year, month) {
    const container = document.getElementById('viewMonthlyCalendarContainer');
    if (!container) return;
    
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
    let calendarHTML = '<table class="monthly-calendar">';
    
    // 요일 헤더
    calendarHTML += '<thead><tr>';
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
                
                // 통계 계산 (출석체크와 동일)
                let attendanceCount = 0;
                let makeupCount = 0;
                let supplementCount = 0;
                let absenceCount = 0;
                
                schedules.forEach(schedule => {
                    if (schedule.status === '출석') attendanceCount++;
                    else if (schedule.status === '보강') makeupCount++;
                    else if (schedule.status === '보충') supplementCount++;
                    else if (schedule.status === '결석') absenceCount++;
                });
                
                // 통계 배지 표시 (출석체크와 동일)
                const statsText = schedules.length > 0 
                    ? ` <span style="background-color: #fff3cd; padding: 1px 4px; border-radius: 2px; font-size: 0.85rem;">${attendanceCount}(${makeupCount})명 / ${absenceCount}명</span>` 
                    : '';
                
                rowHTML += `<td class="${cellClass}">`;
                rowHTML += `<div class="date-number">${currentDate}${statsText}</div>`;
                
                if (schedules.length > 0) {
                    rowHTML += '<div class="schedule-list">';
                    schedules.forEach(schedule => {
                        rowHTML += renderScheduleItem(schedule, 'view');
                    });
                    rowHTML += '</div>';
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

// 학생 정보 테이블 렌더링
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
                const memo = student.view_memo || '';
                
                html += '<tr>';
                html += `<td class="student-name-cell" onclick="highlightViewStudent('${student.name}')">
                    <span class="student-name-text">${student.name}</span>
                    <span class="student-school-inline">(${shortSchoolName})</span>
                </td>`;
                html += `<td><textarea rows="1" data-student-id="${student.id}" onchange="saveStudentViewMemo('${student.id}', this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" placeholder="특이사항">${memo}</textarea></td>`;
                html += '</tr>';
            });
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('학생 정보 테이블 렌더링 실패:', error);
        container.innerHTML = '<p style="text-align: center; color: #f44336;">데이터 로드에 실패했습니다.</p>';
    }
}

// 학생 조회 메모 자동 저장
async function saveStudentViewMemo(studentId, memo) {
    try {
        await API.update('students', studentId, { view_memo: memo });
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
    // 가로 인쇄 안내
    alert('📄 인쇄 설정 안내\n\n인쇄 미리보기에서 "레이아웃"을 "가로"로 변경해주세요.\n\n또한 "배경 그래픽" 옵션을 체크하면 색상이 인쇄됩니다.');
    
    // 인쇄 실행
    window.print();
    
    // 인쇄 후 클래스 제거
    setTimeout(() => {
        document.body.classList.remove('hide-stats-print');
    }, 100);
}

function renderViewCalendar(year, month, attendanceRecords) {
    const container = document.getElementById('viewCalendarContainer');
    
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
                        html += renderScheduleItem(schedule);
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
        
        // 재직중인 선생님만 필터링
        const activeTeachers = teachers.filter(t => t.status === '재직');
        
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
