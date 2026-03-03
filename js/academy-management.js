// 학원 정보 페이지
window.showAcademyInfoPage = function() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2><i class="fas fa-building"></i> 학원 정보</h2>
            </div>
            
            <div class="form-container" style="max-width: 800px; margin: 0 auto;">
                <div class="form-group">
                    <label>학원명</label>
                    <input type="text" id="academyName" class="form-control" placeholder="학원 이름을 입력하세요">
                </div>
                
                <div class="form-group">
                    <label>원장명</label>
                    <input type="text" id="directorName" class="form-control" placeholder="원장 이름을 입력하세요">
                </div>
                
                <div class="form-group">
                    <label>연락처</label>
                    <input type="text" id="academyPhone" class="form-control" placeholder="연락처를 입력하세요">
                </div>
                
                <div class="form-group">
                    <label>주소</label>
                    <input type="text" id="academyAddress" class="form-control" placeholder="주소를 입력하세요">
                </div>
                
                <div class="form-group">
                    <label>사업자번호</label>
                    <input type="text" id="businessNumber" class="form-control" placeholder="사업자번호를 입력하세요">
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="saveAcademyInfo()">
                        <i class="fas fa-save"></i> 저장
                    </button>
                </div>
            </div>
        </div>
    `;
    
    loadAcademyInfo();
}

// 학원 정보 로드
async function loadAcademyInfo() {
    try {
        const response = await API.getList('academy_info', { limit: 1 });
        const academyInfo = Array.isArray(response) ? response[0] : (response.data && response.data[0]);
        
        if (academyInfo) {
            document.getElementById('academyName').value = academyInfo.name || '';
            document.getElementById('directorName').value = academyInfo.director_name || '';
            document.getElementById('academyPhone').value = academyInfo.phone || '';
            document.getElementById('academyAddress').value = academyInfo.address || '';
            document.getElementById('businessNumber').value = academyInfo.business_number || '';
        }
    } catch (error) {
        console.error('학원 정보 로드 실패:', error);
    }
}

// 학원 정보 저장
window.saveAcademyInfo = async function() {
    const academyInfo = {
        name: document.getElementById('academyName').value,
        director_name: document.getElementById('directorName').value,
        phone: document.getElementById('academyPhone').value,
        address: document.getElementById('academyAddress').value,
        business_number: document.getElementById('businessNumber').value
    };
    
    try {
        // 기존 정보 확인
        const response = await API.getList('academy_info', { limit: 1 });
        const existing = Array.isArray(response) ? response[0] : (response.data && response.data[0]);
        
        if (existing) {
            await API.update('academy_info', existing.id, academyInfo);
        } else {
            await API.create('academy_info', academyInfo);
        }
        
        alert('학원 정보가 저장되었습니다.');
    } catch (error) {
        console.error('학원 정보 저장 실패:', error);
        alert('저장에 실패했습니다.');
    }
}

// 연간 달력 페이지
window.showAnnualCalendarPage = async function() {
    const mainContent = document.getElementById('mainContent');
    
    // 학원관리는 연간 달력 페이지
    mainContent.innerHTML = `
        <div class="page-container" style="max-width: 100%; padding: 1rem;">
            <div class="page-header">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <button class="btn btn-success" onclick="addScheduleEvent()">
                        <i class="fas fa-plus"></i> 일정 등록
                    </button>
                    <select id="calendarYear" onchange="loadAnnualCalendar()" style="padding: 0.5rem; font-size: 1rem;">
                        ${generateYearOptions()}
                    </select>
                    <button class="btn btn-primary" onclick="saveAnnualCalendar()">
                        <i class="fas fa-save"></i> 저장
                    </button>
                    <button class="btn btn-secondary" onclick="printAnnualCalendar()">
                        <i class="fas fa-print"></i> 인쇄
                    </button>
                </div>
            </div>
            
            <div id="annualCalendarContainer"></div>
        </div>
    `;
    
    await loadAnnualCalendar();
}

// 연도 옵션 생성
function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    let html = '';
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
        html += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}년</option>`;
    }
    return html;
}

// 연간 달력 로드
window.loadAnnualCalendar = async function(scrollToToday = true) {
    const container = document.getElementById('annualCalendarContainer');
    const year = document.getElementById('calendarYear').value;
    
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">로딩 중...</p>';
    
    try {
        // 학생 목록에서 학교 추출
        const studentsResponse = await API.getList('students', { limit: 1000 });
        const students = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        const activeStudents = students.filter(s => s.status === '재원');
        
        // 학교 목록 추출 (초등 > 중등 > 고등 순)
        const schools = new Set();
        activeStudents.forEach(s => {
            if (s.school) schools.add(s.school);
        });
        
        const schoolList = Array.from(schools).sort((a, b) => {
            // 초등 < 중 < 고 순서
            const getOrder = (school) => {
                if (school.includes('초')) return 1;
                if (school.includes('중')) return 2;
                if (school.includes('고')) return 3;
                return 4;
            };
            return getOrder(a) - getOrder(b) || a.localeCompare(b);
        });
        
        console.log('[loadAnnualCalendar] 학교 목록:', schoolList);
        
        // 일정 데이터 로드
        const allEvents = await loadSchoolEventsInAcademy();
        console.log('[loadAnnualCalendar] 일정 데이터 로드 완료:', allEvents.length);
        
        // 기존 달력 데이터 로드 (로컬 스토리지)
        const calendarData = JSON.parse(localStorage.getItem('annualCalendar') || '[]');
        const calendarMap = {};
        calendarData.forEach(c => {
            if (c.year === parseInt(year)) {
                const key = `${c.month}_${c.school}_${c.day}`;
                calendarMap[key] = c;
            }
        });
        
        console.log('[loadAnnualCalendar] 기존 달력 데이터:', calendarData.filter(c => c.year === parseInt(year)).length);
        
        // 12개월 달력 생성
        let html = '';
        for (let month = 1; month <= 12; month++) {
            const daysInMonth = new Date(year, month, 0).getDate();
            
            html += `
                <div style="margin-bottom: 3rem;">
                    <h3 style="margin-bottom: 1rem; padding: 0.75rem; background: #e9ecef; color: #5D4037; border-radius: 4px; font-weight: 700; font-size: 1.1rem;">${month}월</h3>
                    <div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; table-layout: fixed;">
                            <colgroup>
                                <col style="width: 60px;">
                                ${Array.from({length: daysInMonth}, () => '<col>').join('')}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #ddd; padding: 0.5rem; background: #e9ecef; color: #333; position: sticky; left: 0; z-index: 10; font-weight: 600;">학교</th>
                                    ${Array.from({length: daysInMonth}, (_, i) => {
                                        const day = i + 1;
                                        const date = new Date(year, month - 1, day);
                                        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                                        const isSunday = date.getDay() === 0;
                                        const isSaturday = date.getDay() === 6;
                                        const bgColor = isSunday || isSaturday ? '#e8e8e8' : '#fff';
                                        // 오늘 날짜 확인
                                        const today = new Date();
                                        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                        const isToday = dateString === todayString;
                                        const todayClass = isToday ? ' class="today-column"' : '';
                                        return `<th${todayClass} data-date="${dateString}" style="border: 1px solid #ddd; padding: 0.3rem; background: ${bgColor}; font-size: 0.7rem;">${day}<br/>${dayOfWeek}</th>`;
                                    }).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${schoolList.map(school => {
                                    // 이 학교의 이번 달에 걸쳐있는 모든 일정 찾기
                                    const schoolEvents = allEvents.filter(event => {
                                        const startDate = new Date(event.start_date.replace(/\./g, '-'));
                                        const endDate = new Date(event.end_date.replace(/\./g, '-'));
                                        const monthStart = new Date(year, month - 1, 1);
                                        const monthEnd = new Date(year, month, 0);
                                        const matchSchool = event.school === '전체' || event.school === school;
                                        
                                        // 일정이 이번 달과 겹치는지 확인
                                        return matchSchool && !(endDate < monthStart || startDate > monthEnd);
                                    });
                                    
                                    // 이미 렌더링된 날짜 추적
                                    const renderedDays = new Set();
                                    
                                    let rowHTML = '<tr style="position: relative;">';
                                    rowHTML += `<td style="border: 1px solid #ddd; padding: 0.5rem; font-weight: 600; background: #f8f9fa; position: sticky; left: 0; z-index: 5;">${school}</td>`;
                                    
                                    for (let i = 0; i < daysInMonth; i++) {
                                        const day = i + 1;
                                        
                                        // 이미 렌더링된 날짜는 건너뛰기
                                        if (renderedDays.has(day)) {
                                            continue;
                                        }
                                        
                                        const key = `${month}_${school}_${day}`;
                                        const isHoliday = calendarMap[key] && calendarMap[key].is_holiday;
                                        const date = new Date(year, month - 1, day);
                                        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const currentDate = new Date(dateString);
                                        const isSunday = date.getDay() === 0;
                                        const isSaturday = date.getDay() === 6;
                                        let bgColor = isSunday || isSaturday ? '#e8e8e8' : '#fff';
                                        
                                        // 오늘 날짜 확인
                                        const today = new Date();
                                        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                        const isToday = dateString === todayString;
                                        
                                        // 이 날짜에 시작하거나 걸쳐있는 일정 찾기
                                        let eventForThisDay = null;
                                        let isEventStart = false;
                                        
                                        for (const event of schoolEvents) {
                                            const startDate = new Date(event.start_date.replace(/\./g, '-'));
                                            const endDate = new Date(event.end_date.replace(/\./g, '-'));
                                            
                                            // 이 날짜가 일정 기간에 포함되는지 확인
                                            if (currentDate >= startDate && currentDate <= endDate) {
                                                eventForThisDay = event;
                                                
                                                // 이번 달에서 일정이 시작하는 날인지 확인
                                                const eventStartMonth = startDate.getMonth() + 1;
                                                const eventStartDay = startDate.getDate();
                                                
                                                if (eventStartMonth === month && eventStartDay === day) {
                                                    isEventStart = true;
                                                } else if (eventStartMonth < month && day === 1) {
                                                    // 이전 달에 시작된 일정이 이번 달까지 이어지는 경우, 1일부터 시작
                                                    isEventStart = true;
                                                }
                                                break;
                                            }
                                        }
                                        
                                        if (eventForThisDay && isEventStart) {
                                            // 일정이 시작하거나 이어지는 날짜
                                            const startDate = new Date(eventForThisDay.start_date.replace(/\./g, '-'));
                                            const endDate = new Date(eventForThisDay.end_date.replace(/\./g, '-'));
                                            
                                            // 이번 달에서 일정이 차지하는 일수 계산
                                            let colspan = 1;
                                            let currentDay = day;
                                            const lastDayOfMonth = daysInMonth;
                                            
                                            while (currentDay < lastDayOfMonth) {
                                                const nextDay = currentDay + 1;
                                                const nextDateString = `${year}-${String(month).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
                                                const nextDate = new Date(nextDateString);
                                                
                                                if (nextDate <= endDate) {
                                                    colspan++;
                                                    renderedDays.add(nextDay);
                                                    currentDay++;
                                                } else {
                                                    break;
                                                }
                                            }
                                            
                                            const EVENT_COLORS_MAP = {
                                                'red': '#FFE5E5',
                                                'blue': '#E3F2FD',
                                                'yellow': '#FFFDE7',
                                                'green': '#E8F5E9',
                                                'purple': '#F3E5F5',
                                                'orange': '#FFF3E0',
                                                'pink': '#FCE4EC',
                                                'gray': '#F5F5F5'
                                            };
                                            bgColor = EVENT_COLORS_MAP[eventForThisDay.background_color] || EVENT_COLORS_MAP.red;
                                            
                                            // 이번 달에서의 기간 표시 (mm/dd 형식)
                                            let displayStartDate, displayEndDate;
                                            
                                            if (day === 1 && startDate.getMonth() + 1 < month) {
                                                // 이전 달에 시작된 일정
                                                displayStartDate = `${String(month).padStart(2, '0')}/01`;
                                            } else {
                                                const startMonth = eventForThisDay.start_date.split('.')[1];
                                                const startDay = eventForThisDay.start_date.split('.')[2];
                                                displayStartDate = `${startMonth}/${startDay}`;
                                            }
                                            
                                            if (currentDay === lastDayOfMonth && endDate.getMonth() + 1 > month) {
                                                // 다음 달까지 이어지는 일정
                                                displayEndDate = `${String(month).padStart(2, '0')}/${String(lastDayOfMonth).padStart(2, '0')}`;
                                            } else {
                                                const endMonth = eventForThisDay.end_date.split('.')[1];
                                                const endDay = eventForThisDay.end_date.split('.')[2];
                                                displayEndDate = `${endMonth}/${endDay}`;
                                            }
                                            
                                            rowHTML += `
                                                <td colspan="${colspan}" data-date="${dateString}" style="border: 1px solid #ddd; padding: 0; text-align: left; background: ${bgColor}; cursor: pointer; vertical-align: middle; position: relative; overflow: visible;" 
                                                    onclick="addScheduleEvent('${eventForThisDay.id}')">
                                                    <div style="position: absolute; left: 0.5rem; top: 50%; transform: translateY(-50%); z-index: 2; white-space: nowrap; font-weight: 600;">
                                                        <span style="font-size: 0.75rem; color: #333;">${eventForThisDay.title}</span>
                                                        <span style="font-size: 0.65rem; color: #666; margin-left: 0.3rem;">(${displayStartDate} ~ ${displayEndDate})</span>
                                                    </div>
                                                </td>
                                            `;
                                        } else {
                                            // 일정이 없는 날짜 - 일반 셀
                                            rowHTML += `
                                                <td data-date="${dateString}" style="border: 1px solid #dee2e6; padding: 0.2rem; text-align: center; background: ${bgColor}; cursor: pointer;" 
                                                    onclick="toggleHoliday(this, ${month}, '${school}', ${day})"
                                                    data-month="${month}" 
                                                    data-school="${school}" 
                                                    data-day="${day}"
                                                    data-holiday="${isHoliday ? 'true' : 'false'}">
                                                    ${isHoliday ? '✓' : ''}
                                                </td>
                                            `;
                                        }
                                    }
                                    
                                    rowHTML += '</tr>';
                                    return rowHTML;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        if (schoolList.length === 0) {
            html = '<p style="text-align: center; color: #999; padding: 2rem;">재원생이 없습니다.</p>';
        }
        
        container.innerHTML = html;
        
        // 오늘 날짜 열에 빨간 테두리 적용 (data-date 기반)
        setTimeout(() => {
            const today = new Date();
            const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            // 오늘 날짜 헤더 찾기
            const todayHeaders = container.querySelectorAll(`thead th[data-date="${todayString}"]`);
            
            todayHeaders.forEach(header => {
                // 헤더에 테두리 적용
                header.style.borderLeft = '3px solid #ff0000';
                header.style.borderRight = '3px solid #ff0000';
                header.style.borderTop = '3px solid #ff0000';
                
                // 같은 테이블 찾기
                const table = header.closest('table');
                if (table) {
                    // 오늘 날짜 셀 모두 찾기 (data-date로)
                    const todayCells = table.querySelectorAll(`tbody td[data-date="${todayString}"]`);
                    
                    todayCells.forEach(cell => {
                        cell.style.borderLeft = '3px solid #ff0000';
                        cell.style.borderRight = '3px solid #ff0000';
                        cell.classList.add('today-column-cell');
                    });
                    
                    // 마지막 행의 오늘 날짜 셀에 아래쪽 테두리 추가
                    const lastRow = table.querySelector('tbody tr:last-child');
                    if (lastRow) {
                        const lastTodayCell = lastRow.querySelector(`td[data-date="${todayString}"]`);
                        if (lastTodayCell) {
                            lastTodayCell.style.borderBottom = '3px solid #ff0000';
                        }
                    }
                }
            });
            
            console.log('[loadAnnualCalendar] 오늘 날짜 열에 빨간 테두리 적용 완료:', todayString);
        }, 50);
        
        // 오늘 날짜로 스크롤 (옵션)
        if (scrollToToday) {
            setTimeout(() => {
                const todayColumn = document.querySelector('.today-column');
                if (todayColumn) {
                    todayColumn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    console.log('[loadAnnualCalendar] 오늘 날짜로 스크롤 완료');
                }
            }, 150);
        }
        
    } catch (error) {
        console.error('[loadAnnualCalendar] 로드 실패:', error);
        container.innerHTML = `<p style="text-align: center; color: #f44336; padding: 2rem;">데이터 로드에 실패했습니다.<br/>에러: ${error.message}</p>`;
    }
}

// 휴일 토글
window.toggleHoliday = function(cell, month, school, day) {
    const isHoliday = cell.dataset.holiday === 'true';
    cell.dataset.holiday = isHoliday ? 'false' : 'true';
    cell.innerHTML = isHoliday ? '' : '✓';
}

// 연간 달력 저장
window.saveAnnualCalendar = async function() {
    const year = parseInt(document.getElementById('calendarYear').value);
    const cells = document.querySelectorAll('td[data-holiday]');
    
    try {
        // 기존 데이터 로드
        const allData = JSON.parse(localStorage.getItem('annualCalendar') || '[]');
        
        // 현재 연도 데이터 제거
        const filteredData = allData.filter(c => c.year !== year);
        
        // 새 데이터 추가
        cells.forEach(cell => {
            if (cell.dataset.holiday === 'true') {
                filteredData.push({
                    year: year,
                    month: parseInt(cell.dataset.month),
                    school: cell.dataset.school,
                    day: parseInt(cell.dataset.day),
                    is_holiday: true
                });
            }
        });
        
        // 로컬 스토리지에 저장
        localStorage.setItem('annualCalendar', JSON.stringify(filteredData));
        
        console.log('[saveAnnualCalendar] 저장 완료:', filteredData.filter(c => c.year === year).length);
        alert('연간 달력이 저장되었습니다.');
    } catch (error) {
        console.error('[saveAnnualCalendar] 저장 실패:', error);
        alert('저장에 실패했습니다.');
    }
}

// 전역 변수
let currentEditingEventId = null;
let allSchoolEvents = [];

// 배경색 옵션 (채도 낮은 파스텔톤)
const EVENT_COLORS_ACADEMY = {
    'red': { name: '연빨강', color: '#FFE5E5' },
    'blue': { name: '연하늘', color: '#E3F2FD' },
    'yellow': { name: '연노랑', color: '#FFFDE7' },
    'green': { name: '연두색', color: '#E8F5E9' },
    'purple': { name: '연보라', color: '#F3E5F5' },
    'orange': { name: '연주황', color: '#FFF3E0' },
    'pink': { name: '연분홍', color: '#FCE4EC' },
    'gray': { name: '연회색', color: '#F5F5F5' }
};

// 일정 등록 모달 열기
window.addScheduleEvent = function(eventId) {
    console.log('[일정 모달] 열기:', eventId);
    
    if (eventId === undefined) {
        eventId = null;
    }
    
    currentEditingEventId = eventId;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('eventModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 색상 드롭다운 옵션 생성
    let colorOptions = '';
    for (const key in EVENT_COLORS_ACADEMY) {
        colorOptions += '<option value="' + key + '">' + EVENT_COLORS_ACADEMY[key].name + '</option>';
    }
    
    // 모달 HTML
    const modalHTML = '<div id="eventModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">' +
        '<div style="background: white; border-radius: 12px; padding: 2rem; width: 90%; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">' +
            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">' +
                '<h3 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #333;">' + (eventId ? '일정 수정' : '일정 등록') + '</h3>' +
                '<button onclick="closeEventModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">✕</button>' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 1.2rem;">' +
                '<div>' +
                    '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">제목</label>' +
                    '<input type="text" id="eventTitle" placeholder="일정 제목을 입력하세요" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;">' +
                '</div>' +
                '<div>' +
                    '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">배경색</label>' +
                    '<select id="eventColor" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;">' +
                        colorOptions +
                    '</select>' +
                '</div>' +
                '<div>' +
                    '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">학교</label>' +
                    '<select id="eventSchool" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;">' +
                        '<option value="전체">전체</option>' +
                    '</select>' +
                '</div>' +
                '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">' +
                    '<div>' +
                        '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">시작일</label>' +
                        '<input type="date" id="eventStartDate" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;">' +
                    '</div>' +
                    '<div>' +
                        '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">종료일</label>' +
                        '<input type="date" id="eventEndDate" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;">' +
                    '</div>' +
                '</div>' +
                '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                    '<input type="checkbox" id="eventMarkAbsent" style="width: 18px; height: 18px; cursor: pointer;">' +
                    '<label for="eventMarkAbsent" style="font-weight: 600; color: #555; cursor: pointer;">해당 날짜에 결석 처리</label>' +
                '</div>' +
                '<div style="display: flex; gap: 1rem; margin-top: 1rem;">' +
                    (eventId ? '<button onclick="deleteEventInAcademy()" class="btn-danger" style="flex: 1; padding: 0.75rem; background: #f44336; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer;">삭제</button>' : '') +
                    '<button onclick="saveEventInAcademy()" class="btn-primary" style="flex: 1; padding: 0.75rem; background: #FF6B35; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer;">' + (eventId ? '수정' : '등록') + '</button>' +
                    '<button onclick="closeEventModal()" class="btn-secondary" style="flex: 1; padding: 0.75rem; background: #999; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer;">취소</button>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 학교 드롭다운 로드
    loadSchoolsForEventModalInAcademy();
    
    // 수정 모드인 경우 데이터 로드
    if (eventId) {
        loadEventDataInAcademy(eventId);
    }
    
    console.log('[일정 모달] 렌더링 완료');
};

// 학교 목록 로드
async function loadSchoolsForEventModalInAcademy() {
    try {
        const students = await API.getList('students', { limit: 10000 });
        const studentList = Array.isArray(students) ? students : (students.data || []);
        
        const activeStudents = studentList.filter(function(s) { return s.status === '재원'; });
        
        const schools = new Set();
        activeStudents.forEach(function(student) {
            if (student.school) {
                schools.add(student.school);
            }
        });
        
        const sortedSchools = Array.from(schools).sort(function(a, b) {
            const getOrder = function(school) {
                if (school.includes('초')) return 0;
                if (school.includes('중')) return 1;
                if (school.includes('고')) return 2;
                return 3;
            };
            return getOrder(a) - getOrder(b);
        });
        
        const schoolSelect = document.getElementById('eventSchool');
        if (schoolSelect) {
            schoolSelect.innerHTML = '<option value="전체">전체</option>';
            sortedSchools.forEach(function(school) {
                schoolSelect.innerHTML += '<option value="' + school + '">' + school + '</option>';
            });
        }
        
        console.log('[일정 모달] 학교 목록 로드 완료:', sortedSchools.length);
        
    } catch (error) {
        console.error('[일정 모달] 학교 목록 로드 실패:', error);
    }
}

// 일정 데이터 로드 (수정 모드)
async function loadEventDataInAcademy(eventId) {
    try {
        const event = allSchoolEvents.find(function(e) { return e.id === eventId; });
        if (!event) {
            console.error('[일정 로드] 일정을 찾을 수 없습니다:', eventId);
            return;
        }
        
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventColor').value = event.background_color || 'red';
        document.getElementById('eventSchool').value = event.school || '전체';
        
        if (event.start_date) {
            const startDate = event.start_date.replace(/\./g, '-');
            document.getElementById('eventStartDate').value = startDate;
        }
        if (event.end_date) {
            const endDate = event.end_date.replace(/\./g, '-');
            document.getElementById('eventEndDate').value = endDate;
        }
        
        document.getElementById('eventMarkAbsent').checked = event.mark_absent || false;
        
        console.log('[일정 로드] 데이터 로드 완료:', event);
        
    } catch (error) {
        console.error('[일정 로드] 실패:', error);
        alert('일정 데이터를 불러오는데 실패했습니다.');
    }
}

// 일정 저장
window.saveEventInAcademy = async function() {
    try {
        const title = document.getElementById('eventTitle').value.trim();
        const color = document.getElementById('eventColor').value;
        const school = document.getElementById('eventSchool').value;
        const startDate = document.getElementById('eventStartDate').value;
        const endDate = document.getElementById('eventEndDate').value;
        const markAbsent = document.getElementById('eventMarkAbsent').checked;
        
        if (!title) {
            alert('제목을 입력해주세요.');
            return;
        }
        if (!startDate) {
            alert('시작일을 선택해주세요.');
            return;
        }
        if (!endDate) {
            alert('종료일을 선택해주세요.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('종료일은 시작일 이후여야 합니다.');
            return;
        }
        
        const formattedStartDate = startDate.replace(/-/g, '.');
        const formattedEndDate = endDate.replace(/-/g, '.');
        
        const eventData = {
            title: title,
            background_color: color,
            school: school,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            mark_absent: markAbsent
        };
        
        console.log('[일정 저장] 시도:', eventData);
        
        if (currentEditingEventId) {
            await API.update('school_events', currentEditingEventId, eventData);
            console.log('[일정 수정] 완료:', currentEditingEventId);
        } else {
            await API.create('school_events', eventData);
            console.log('[일정 등록] 완료');
        }
        
        alert(currentEditingEventId ? '일정이 수정되었습니다.' : '일정이 등록되었습니다.');
        closeEventModal();
        
        // 연간 달력 새로고침
        await loadAnnualCalendar();
        
    } catch (error) {
        console.error('[일정 저장] 실패:', error);
        alert('일정 저장에 실패했습니다.');
    }
};

// 일정 삭제
window.deleteEventInAcademy = async function() {
    if (!currentEditingEventId) return;
    
    if (!confirm('이 일정을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await API.delete('school_events', currentEditingEventId);
        console.log('[일정 삭제] 완료:', currentEditingEventId);
        
        alert('일정이 삭제되었습니다.');
        closeEventModal();
        
        // 연간 달력 새로고침
        await loadAnnualCalendar();
        
    } catch (error) {
        console.error('[일정 삭제] 실패:', error);
        alert('일정 삭제에 실패했습니다.');
    }
};

// 모달 닫기
window.closeEventModal = function() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.remove();
    }
    currentEditingEventId = null;
};

// 일정 데이터 로드
async function loadSchoolEventsInAcademy() {
    try {
        const response = await API.getList('school_events', { limit: 10000 });
        allSchoolEvents = Array.isArray(response) ? response : (response.data || []);
        
        console.log('[일정 로드] 완료:', allSchoolEvents.length);
        return allSchoolEvents;
        
    } catch (error) {
        console.error('[일정 로드] 실패:', error);
        return [];
    }
}

// 연간 달력 인쇄
window.printAnnualCalendar = function() {
    console.log('[연간 달력 인쇄] 시작');
    
    // 인쇄용 스타일이 없으면 추가
    let printStyle = document.getElementById('annualCalendarPrintStyle');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'annualCalendarPrintStyle';
        printStyle.innerHTML = `
            @media print {
                /* 기본 요소 숨기기 */
                header, 
                nav, 
                .sub-menu-container,
                .page-header {
                    display: none !important;
                }
                
                /* body 설정 */
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                /* 메인 컨텐츠 */
                #mainContent {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                
                /* 페이지 컨테이너 */
                .page-container {
                    max-width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                
                /* 캘린더 컨테이너 */
                #annualCalendarContainer {
                    display: block !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                /* 페이지 설정 - 가로 인쇄, 한 페이지에 모두 */
                @page {
                    size: A4 landscape;
                    margin: 4mm;
                }
                
                /* 각 월 컨테이너 - 간격 최소화, 페이지 나눔 방지 */
                #annualCalendarContainer > div {
                    margin-bottom: 1mm !important;
                    page-break-inside: avoid;
                    page-break-after: avoid !important;
                }
                
                /* 6월 이후 페이지 나눔 제거 */
                #annualCalendarContainer > div:nth-child(6) {
                    page-break-after: avoid !important;
                    margin-bottom: 1mm !important;
                }
                
                /* 월 헤더 - 크기 최소화 */
                #annualCalendarContainer h3 {
                    font-size: 6pt !important;
                    padding: 1px 3px !important;
                    margin: 0 0 0.5mm 0 !important;
                    background: #e9ecef !important;
                    color: #5D4037 !important;
                    font-weight: 700 !important;
                    border-radius: 1px !important;
                }
                
                /* 테이블 외부 div (스크롤 컨테이너) */
                #annualCalendarContainer > div > div {
                    overflow-x: visible !important;
                    min-width: auto !important;
                }
                
                /* 테이블 - 크기 최소화 */
                #annualCalendarContainer table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    font-size: 3pt !important;
                    table-layout: fixed !important;
                }
                
                /* 테이블 헤더 - 크기 최소화 */
                #annualCalendarContainer table thead th {
                    border: 0.2px solid #ddd !important;
                    padding: 0.5px !important;
                    font-size: 3pt !important;
                    line-height: 1 !important;
                    background: #f8f9fa !important;
                    height: 8px !important;
                }
                
                /* 테이블 셀 - 크기 최소화 */
                #annualCalendarContainer table tbody th,
                #annualCalendarContainer table tbody td {
                    border: 0.2px solid #ddd !important;
                    padding: 0.5px !important;
                    font-size: 2.5pt !important;
                    line-height: 1 !important;
                    vertical-align: top !important;
                    height: 10px !important;
                    max-height: 10px !important;
                }
                
                /* 학교명 열 (첫 번째 열) - 크기 최소화 */
                #annualCalendarContainer table tbody td:first-child {
                    background: #f8f9fa !important;
                    font-weight: 600 !important;
                    width: 20px !important;
                    font-size: 3pt !important;
                }
                
                /* 일정 텍스트 div - 크기 최소화 */
                #annualCalendarContainer table td > div {
                    font-size: 2pt !important;
                    padding: 0px 0.5px !important;
                    white-space: nowrap !important;
                    overflow: visible !important;
                    position: relative !important;
                    z-index: 1 !important;
                    line-height: 1.1 !important;
                }
                
                /* 주말 배경색 유지 */
                #annualCalendarContainer table th[style*="background"],
                #annualCalendarContainer table td[style*="background"] {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                /* 휴일 체크박스 숨기기 */
                #annualCalendarContainer input[type="checkbox"] {
                    display: none !important;
                }
                
                /* colgroup 유지 */
                #annualCalendarContainer colgroup {
                    display: table-column-group !important;
                }
                
                #annualCalendarContainer col {
                    display: table-column !important;
                }
            }
        `;
        document.head.appendChild(printStyle);
    }
    
    console.log('[연간 달력 인쇄] 스타일 적용 완료');
    
    // 인쇄
    setTimeout(() => {
        window.print();
    }, 100);
};
