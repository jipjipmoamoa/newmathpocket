// 스케줄 관리 모듈

// 학생별 고유 색상 (연한 파스텔톤)
const studentColors = [
    '#FFE5E5', // 연분홍
    '#FFF4CC', // 연노랑
    '#E5F5E5', // 연두
    '#E5F2FF', // 연하늘
    '#F0E5FF', // 연보라
    '#FFE5F0', // 연핑크
    '#E5FFE5', // 연민트
    '#FFEEE5', // 연주황
    '#F5F5F5', // 연회색
    '#E5F9FF', // 연청록
];

let studentColorMap = {}; // 학생 ID -> 색상 매핑
let currentTeacherFilter = 'all'; // 현재 선생님 필터

// 이번달 스케줄표 페이지
async function showScheduleCurrentPage() {
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
        const teachers = (result.data || []).filter(t => (t.status || '재직') === '재직');
        
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
        console.log('[loadWeeklySchedule] 전체 학생 수:', studentsResult.data?.length);
        
        let students = (studentsResult.data || []).filter(s => s.status === '재원');
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
        
        // 학생들에게 색상 할당
        assignStudentColors(students);
        
        // 요일별 스케줄 데이터 구성
        const scheduleData = buildScheduleData(students);
        
        // 테이블 렌더링
        renderWeeklyScheduleTable(scheduleData);
        
    } catch (error) {
        console.error('스케줄 로드 실패:', error);
        document.getElementById('weeklyScheduleTable').innerHTML = 
            '<div class="alert alert-danger">스케줄을 불러오는데 실패했습니다.</div>';
    }
}

// 학생들에게 고유 색상 할당
function assignStudentColors(students) {
    students.forEach((student, index) => {
        if (!studentColorMap[student.id]) {
            studentColorMap[student.id] = studentColors[index % studentColors.length];
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
    
    days.forEach((day, dayIndex) => {
        scheduleData[day] = {
            label: dayLabels[dayIndex],
            timeSlots: {}
        };
        
        // 14:00부터 19:30까지 30분 단위로 초기화
        for (let hour = 14; hour < 20; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const timeKey = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                if (hour === 19 && min === 30) break; // 19:30까지만
                scheduleData[day].timeSlots[timeKey] = [];
            }
        }
        scheduleData[day].timeSlots['19:30'] = []; // 19:30 추가
        
        maxColumnsPerDay[day] = 0;
        
        // 학생들의 스케줄 배치
        students.forEach(student => {
            // schedule이 JSON 문자열이면 파싱
            let schedule = student.schedule;
            
            console.log(`[buildScheduleData] === ${student.name} 스케줄 확인 ===`);
            console.log(`[buildScheduleData] 원본 schedule:`, schedule);
            console.log(`[buildScheduleData] schedule 타입:`, typeof schedule);
            
            if (typeof schedule === 'string' && schedule.trim() !== '') {
                try {
                    schedule = JSON.parse(schedule);
                    console.log(`[buildScheduleData] 파싱 후 schedule:`, schedule);
                } catch (e) {
                    console.error('[buildScheduleData] 스케줄 파싱 오류:', e, 'student:', student.name);
                    schedule = null;
                }
            }
            
            console.log(`[buildScheduleData] 학생: ${student.name}, 요일: ${day}, schedule:`, schedule);
            
            if (schedule && schedule[day]) {
                console.log(`[buildScheduleData] ${student.name} ${day} 스케줄:`, schedule[day]);
                console.log(`[buildScheduleData] enabled:`, schedule[day].enabled);
            }
            
            if (schedule && schedule[day] && schedule[day].enabled) {
                const daySchedule = schedule[day];
                const checkIn = daySchedule.checkIn; // "14:30"
                const duration = parseInt(daySchedule.duration) || 90;
                
                console.log(`[buildScheduleData] ✅ ${student.name} ${day} - checkIn: ${checkIn}, duration: ${duration}`);
                
                if (checkIn) {
                    // 토요일 스케줄이 있으면 표시
                    if (day === 'saturday') {
                        hasSaturday = true;
                    }
                    
                    // 해당 시간대에 학생 추가
                    if (scheduleData[day].timeSlots[checkIn]) {
                        scheduleData[day].timeSlots[checkIn].push({
                            student: student,
                            duration: duration,
                            checkIn: checkIn,
                            checkOut: daySchedule.checkOut
                        });
                        
                        console.log(`[buildScheduleData] ✅ ${student.name} ${day} ${checkIn}에 추가됨`);
                        
                        // 최대 열 개수 업데이트
                        const currentLength = scheduleData[day].timeSlots[checkIn].length;
                        if (currentLength > maxColumnsPerDay[day]) {
                            maxColumnsPerDay[day] = currentLength;
                        }
                    } else {
                        console.warn(`[buildScheduleData] ⚠️ ${student.name} ${day} ${checkIn} - 해당 시간대 없음`);
                    }
                }
            } else {
                console.log(`[buildScheduleData] ❌ ${student.name} ${day} - 스케줄 없음 또는 비활성`);
            }
        });
    });
    
    return { scheduleData, hasSaturday, maxColumnsPerDay };
}

// 주간 스케줄 테이블 렌더링
function renderWeeklyScheduleTable(data) {
    const { scheduleData, hasSaturday, maxColumnsPerDay } = data;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (hasSaturday) {
        days.push('saturday');
    }
    
    const container = document.getElementById('weeklyScheduleTable');
    
    // 시간대 배열 (14:00 ~ 19:30, 30분 단위)
    const times = [];
    for (let hour = 14; hour <= 19; hour++) {
        for (let min = 0; min < 60; min += 30) {
            if (hour === 19 && min > 30) break; // 19:30까지만
            times.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
        }
    }
    
    // 각 요일/열/시간의 셀이 이미 렌더링되었는지 추적
    const renderedCells = {};
    
    // 요일당 고정 열 수: 4열
    const COLS_PER_DAY = 4;
    
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
    
    // 요일 헤더 (각 요일당 4열)
    days.forEach(day => {
        html += `<th colspan="${COLS_PER_DAY}" class="day-header">${dayLabelsShort[day]}</th>`;
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
            const studentsAtTime = scheduleData[day].timeSlots[time] || [];
            
            for (let col = 0; col < COLS_PER_DAY; col++) {
                const cellKey = `${dayIndex}-${col}-${timeIndex}`;
                
                // 요일의 마지막 열인지 확인
                const isLastColOfDay = (col === COLS_PER_DAY - 1);
                
                // 이미 rowspan으로 렌더링된 셀이면 건너뛰기
                if (renderedCells[cellKey]) {
                    continue;
                }
                
                const studentSchedule = studentsAtTime[col];
                
                if (studentSchedule) {
                    const { student, duration, checkIn, checkOut } = studentSchedule;
                    
                    // 해당 시간이 학생의 입실 시간인 경우
                    if (checkIn === time) {
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
                    }
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

// 스케줄표 인쇄
function printScheduleTable() {
    window.print();
}

// 스케줄 조회 페이지 (기존 코드 유지)
async function showScheduleViewPage() {
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
        const schedules = result.data || [];
        
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
