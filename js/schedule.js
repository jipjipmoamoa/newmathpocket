// 스케줄 관리 모듈

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
let currentTeacherFilter = 'all'; // 현재 선생님 필터

// 이번달 스케줄표 페이지
window.showScheduleCurrentPage = async function() {
    const mainContent = document.getElementById('mainContent');
    
    // 스케줄 인쇄 CSS 추가
    let schedulePrintCSS = document.getElementById('schedulePrintCSS');
    if (!schedulePrintCSS) {
        schedulePrintCSS = document.createElement('link');
        schedulePrintCSS.id = 'schedulePrintCSS';
        schedulePrintCSS.rel = 'stylesheet';
        schedulePrintCSS.href = 'css/schedule-print.css';
        document.head.appendChild(schedulePrintCSS);
    }
    
    mainContent.innerHTML = `
        <div class="page-container" id="schedulePageContainer" style="max-width: 98%; margin: 0 auto;">
            <div class="page-header" style="display: flex; justify-content: flex-end; gap: 1rem; margin-bottom: 1rem;">
                <select id="teacherFilter" onchange="filterByTeacher()" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    <option value="all">전체 선생님</option>
                </select>
                <button class="btn btn-primary" onclick="printScheduleTable()">
                    <i class="fas fa-print"></i> 인쇄
                </button>
            </div>
            <div id="weeklyScheduleTable" style="transform-origin: top left;"></div>
        </div>
    `;
    
    await loadTeachersForFilter();
    await loadWeeklySchedule();
    
    // 테이블 크기에 맞춰 자동 스케일 조정
    adjustTableScale();
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

// 선생님 필터 목록 로드
async function loadTeachersForFilter() {
    try {
        const result = await API.getList('teachers', { limit: 1000 });
        const allTeachers = Array.isArray(result) ? result : (result.data || []);
        const teachers = allTeachers.filter(t => (t.status || '재직') === '재직');
        
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
function filterByTeacher() {
    const selectElement = document.getElementById('teacherFilter');
    currentTeacherFilter = selectElement.value;
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
        
        // 선생님 필터 적용
        if (currentTeacherFilter !== 'all') {
            students = students.filter(s => s.teacher_id === currentTeacherFilter);
            console.log('[loadWeeklySchedule] 필터링 후 학생 수:', students.length);
        }
        
        // 🔥 관리자/부관리자인 경우 선생님별로 그룹화하여 표시
        if (Auth.isAdminOrSubAdmin() && currentTeacherFilter === 'all') {
            await renderScheduleByTeachers(students);
        } else {
            // 선생님이거나 필터가 적용된 경우 기존 방식으로 표시
            // 학생들에게 색상 할당
            assignStudentColors(students);
            
            // 요일별 스케줄 데이터 구성
            const scheduleData = buildScheduleData(students);
            
            // 테이블 렌더링
            renderWeeklyScheduleTable(scheduleData);
        }
        
    } catch (error) {
        console.error('스케줄 로드 실패:', error);
        document.getElementById('weeklyScheduleTable').innerHTML = 
            '<div class="alert alert-danger">스케줄을 불러오는데 실패했습니다.</div>';
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
    
    // 학생들의 스케줄을 열에 배치
    days.forEach((day) => {
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
                    
                    // 사용 가능한 열 찾기
                    let assignedCol = -1;
                    for (let col = 0; col < scheduleData[day].columns.length; col++) {
                        const column = scheduleData[day].columns[col];
                        // 이 열에서 시간이 겹치는 수업이 있는지 확인
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
                    
                    // 사용 가능한 열이 없으면 새 열 추가
                    if (assignedCol === -1) {
                        assignedCol = scheduleData[day].columns.length;
                        scheduleData[day].columns.push([]);
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
                }
            }
        });
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
    
    // 요일 헤더 (실제 열 개수만큼)
    days.forEach(day => {
        const colCount = Math.max(maxColumnsPerDay[day], 1);
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
            const colCount = Math.max(columns.length, 1);
            
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
                    
                    html += `
                        <td rowspan="${slots}" class="student-cell ${isLastColOfDay ? 'last-col' : ''}" style="background: ${color}; vertical-align: top; padding: 0.4rem;">
                            <div style="font-weight: 600; color: #333; font-size: 0.85rem;">${student.name}</div>
                            <div style="font-size: 0.7rem; color: #555; margin-top: 0.2rem;">(${checkIn}-${checkOut})</div>
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
        const activeTeachers = allTeachers.filter(t => (t.status || '재직') === '재직');
        
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
        let html = '';
        
        // 선생님별로 순회하면서 스케줄 테이블 생성
        activeTeachers.forEach(teacher => {
            const teacherStudents = studentsByTeacher[teacher.id] || [];
            
            if (teacherStudents.length === 0) return; // 담당 학생이 없으면 건너뛰기
            
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
        document.getElementById('weeklyScheduleTable').innerHTML = 
            '<div class="alert alert-danger">스케줄을 불러오는데 실패했습니다.</div>';
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
    
    // 요일 헤더 (실제 열 개수만큼)
    days.forEach(day => {
        const colCount = Math.max(maxColumnsPerDay[day], 1);
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
            const colCount = Math.max(columns.length, 1);
            
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
                    
                    html += `
                        <td rowspan="${slots}" class="student-cell ${isLastColOfDay ? 'last-col' : ''}" style="background: ${color}; vertical-align: top; padding: 0.4rem;">
                            <div style="font-weight: 600; color: #333; font-size: 0.85rem;">${student.name}</div>
                            <div style="font-size: 0.7rem; color: #555; margin-top: 0.2rem;">(${checkIn}-${checkOut})</div>
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

// 스케줄표 인쇄
function printScheduleTable() {
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
