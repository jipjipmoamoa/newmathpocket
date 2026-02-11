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
window.loadAnnualCalendar = async function() {
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
                    <h3 style="margin-bottom: 1rem; padding: 0.5rem; background: #FFB380; color: white; border-radius: 4px;">${month}월</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; min-width: 1200px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #333; padding: 0.5rem; background: #495057; color: #fff; width: 120px; position: sticky; left: 0; z-index: 10;">학교</th>
                                    ${Array.from({length: daysInMonth}, (_, i) => {
                                        const day = i + 1;
                                        const date = new Date(year, month - 1, day);
                                        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                                        const isSunday = date.getDay() === 0;
                                        const isSaturday = date.getDay() === 6;
                                        const bgColor = isSunday || isSaturday ? '#e8e8e8' : '#fff';
                                        return `<th style="border: 1px solid #333; padding: 0.3rem; background: ${bgColor}; font-size: 0.7rem;">${day}<br/>${dayOfWeek}</th>`;
                                    }).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${schoolList.map(school => `
                                    <tr>
                                        <td style="border: 1px solid #333; padding: 0.5rem; font-weight: 600; background: #f8f9fa; position: sticky; left: 0; z-index: 5;">${school}</td>
                                        ${Array.from({length: daysInMonth}, (_, i) => {
                                            const day = i + 1;
                                            const key = `${month}_${school}_${day}`;
                                            const isHoliday = calendarMap[key] && calendarMap[key].is_holiday;
                                            const date = new Date(year, month - 1, day);
                                            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const isSunday = date.getDay() === 0;
                                            const isSaturday = date.getDay() === 6;
                                            let bgColor = isSunday || isSaturday ? '#e8e8e8' : '#fff';
                                            
                                            // 해당 날짜의 일정 확인
                                            let eventHTML = '';
                                            const dayEvents = allEvents.filter(event => {
                                                const startDate = new Date(event.start_date.replace(/\./g, '-'));
                                                const endDate = new Date(event.end_date.replace(/\./g, '-'));
                                                const currentDate = new Date(dateString);
                                                // 학교 필터링
                                                const matchSchool = event.school === '전체' || event.school === school;
                                                return currentDate >= startDate && currentDate <= endDate && matchSchool;
                                            });
                                            
                                            if (dayEvents.length > 0) {
                                                const event = dayEvents[0];
                                                const EVENT_COLORS_MAP = {
                                                    'red': '#FFCDD2',
                                                    'blue': '#BBDEFB',
                                                    'yellow': '#FFF9C4',
                                                    'green': '#C8E6C9',
                                                    'purple': '#E1BEE7',
                                                    'orange': '#FFE0B2',
                                                    'pink': '#F8BBD0',
                                                    'gray': '#E0E0E0'
                                                };
                                                bgColor = EVENT_COLORS_MAP[event.background_color] || EVENT_COLORS_MAP.red;
                                                eventHTML = `<div style="font-size: 0.6rem; font-weight: 600; color: #333; cursor: pointer;" onclick="event.stopPropagation(); addScheduleEvent('${event.id}');">${event.title}</div>`;
                                            }
                                            
                                            return `
                                                <td style="border: 1px solid #dee2e6; padding: 0.2rem; text-align: center; background: ${bgColor}; cursor: pointer;" 
                                                    onclick="toggleHoliday(this, ${month}, '${school}', ${day})"
                                                    data-month="${month}" 
                                                    data-school="${school}" 
                                                    data-day="${day}"
                                                    data-holiday="${isHoliday ? 'true' : 'false'}">
                                                    ${eventHTML}${isHoliday ? '✓' : ''}
                                                </td>
                                            `;
                                        }).join('')}
                                    </tr>
                                `).join('')}
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

// 배경색 옵션
const EVENT_COLORS_ACADEMY = {
    'red': { name: '연빨강', color: '#FFCDD2' },
    'blue': { name: '연하늘', color: '#BBDEFB' },
    'yellow': { name: '연노랑', color: '#FFF9C4' },
    'green': { name: '연두색', color: '#C8E6C9' },
    'purple': { name: '연보라', color: '#E1BEE7' },
    'orange': { name: '연주황', color: '#FFE0B2' },
    'pink': { name: '연분홍', color: '#F8BBD0' },
    'gray': { name: '연회색', color: '#E0E0E0' }
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
