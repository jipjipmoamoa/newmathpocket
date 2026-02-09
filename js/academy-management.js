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
                                            const isSunday = date.getDay() === 0;
                                            const isSaturday = date.getDay() === 6;
                                            const bgColor = isSunday || isSaturday ? '#e8e8e8' : '#fff';
                                            return `
                                                <td style="border: 1px solid #dee2e6; padding: 0.2rem; text-align: center; background: ${bgColor}; cursor: pointer;" 
                                                    onclick="toggleHoliday(this, ${month}, '${school}', ${day})"
                                                    data-month="${month}" 
                                                    data-school="${school}" 
                                                    data-day="${day}"
                                                    data-holiday="${isHoliday ? 'true' : 'false'}">
                                                    ${isHoliday ? '✓' : ''}
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

// 일정 등록 (추후 구현)
window.addScheduleEvent = function() {
    alert('일정 등록 기능은 추후 구현 예정입니다.');
}
