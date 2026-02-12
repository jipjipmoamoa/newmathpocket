// 예정 스케줄 관리 모듈
console.log('[scheduled-schedule.js] 로드 시작');

let currentScheduledStudentId = null;
let currentScheduledSchedules = [];

// 예정 스케줄 모달 열기
window.openScheduledScheduleModal = async function(studentId) {
    console.log('[예정 스케줄] 모달 열기:', studentId);
    
    currentScheduledStudentId = studentId;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('scheduledScheduleModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 학생 정보 가져오기
    const student = await API.get('students', studentId);
    if (!student) {
        alert('학생 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 예정 스케줄 목록 로드
    await loadScheduledSchedules(studentId);
    
    // 모달 HTML
    const modalHTML = `
        <div id="scheduledScheduleModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; overflow-y: auto;">
            <div style="background: white; border-radius: 12px; padding: 2rem; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #333;">
                        ${student.name} - 예정 스케줄
                    </h3>
                    <button onclick="closeScheduledScheduleModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">✕</button>
                </div>
                
                <!-- 예정 스케줄 목록 -->
                <div id="scheduledScheduleList" style="margin-bottom: 2rem;">
                    <!-- 동적으로 채워짐 -->
                </div>
                
                <!-- 새 예정 스케줄 추가 -->
                <div style="border-top: 2px solid #E1E8ED; padding-top: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: #333;">새 예정 스케줄 추가</h4>
                    
                    <!-- 기간 설정 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">시작 날짜 <span style="color: #f44336;">*</span></label>
                            <input type="date" id="newScheduleStartDate" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">종료 날짜</label>
                            <input type="date" id="newScheduleEndDate" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            <small style="color: #666;">* 비워두면 무기한</small>
                        </div>
                    </div>
                    
                    <!-- 기존 스케줄 불러오기 -->
                    <div style="margin-bottom: 1rem;">
                        <button type="button" onclick="loadCurrentScheduleToNew()" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                            <i class="fas fa-copy"></i> 현재 스케줄 불러오기
                        </button>
                    </div>
                    
                    <!-- 주간 스케줄 테이블 -->
                    <table class="schedule-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 0.75rem; background: #f8f9fa;">요일</th>
                                <th style="border: 1px solid #ddd; padding: 0.75rem; background: #f8f9fa;">수업</th>
                                <th style="border: 1px solid #ddd; padding: 0.75rem; background: #f8f9fa;">입실시간</th>
                                <th style="border: 1px solid #ddd; padding: 0.75rem; background: #f8f9fa;">퇴실시간</th>
                                <th style="border: 1px solid #ddd; padding: 0.75rem; background: #f8f9fa;">재실시간(분)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${['월요일', '화요일', '수요일', '목요일', '금요일', '토요일'].map((dayLabel, idx) => {
                                const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                const dayKey = dayKeys[idx];
                                return `
                                    <tr>
                                        <td style="border: 1px solid #ddd; padding: 0.5rem; font-weight: 600;">${dayLabel}</td>
                                        <td style="border: 1px solid #ddd; padding: 0.5rem; text-align: center;">
                                            <input type="checkbox" id="newSch-${dayKey}-enabled">
                                        </td>
                                        <td style="border: 1px solid #ddd; padding: 0.5rem;">
                                            <input type="text" class="time-input" id="newSch-${dayKey}-checkin" 
                                                   placeholder="14:00" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                                                   onchange="calculateNewSchCheckout('${dayKey}')">
                                        </td>
                                        <td style="border: 1px solid #ddd; padding: 0.5rem;">
                                            <input type="text" class="time-input" id="newSch-${dayKey}-checkout" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                                        </td>
                                        <td style="border: 1px solid #ddd; padding: 0.5rem;">
                                            <input type="number" id="newSch-${dayKey}-duration" 
                                                   value="90" min="30" max="300" step="10" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                                                   onchange="calculateNewSchCheckout('${dayKey}')">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <!-- 버튼 -->
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button onclick="saveNewScheduledSchedule()" class="btn btn-primary" style="flex: 1; padding: 0.75rem; background: #FF6B35; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-save"></i> 저장
                        </button>
                        <button onclick="closeScheduledScheduleModal()" class="btn btn-secondary" style="flex: 1; padding: 0.75rem; background: #999; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 예정 스케줄 목록 렌더링
    renderScheduledScheduleList();
    
    console.log('[예정 스케줄] 모달 렌더링 완료');
};

// 예정 스케줄 목록 로드
async function loadScheduledSchedules(studentId) {
    try {
        const response = await API.getList('scheduled_schedules', { limit: 1000 });
        const allSchedules = Array.isArray(response) ? response : (response.data || []);
        
        currentScheduledSchedules = allSchedules.filter(s => s.student_id === studentId);
        
        // 시작 날짜 순으로 정렬
        currentScheduledSchedules.sort((a, b) => {
            return new Date(a.start_date) - new Date(b.start_date);
        });
        
        console.log('[예정 스케줄] 로드 완료:', currentScheduledSchedules.length);
        
    } catch (error) {
        console.error('[예정 스케줄] 로드 실패:', error);
        currentScheduledSchedules = [];
    }
}

// 예정 스케줄 목록 렌더링
function renderScheduledScheduleList() {
    const container = document.getElementById('scheduledScheduleList');
    if (!container) return;
    
    if (currentScheduledSchedules.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">등록된 예정 스케줄이 없습니다.</p>';
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
    
    currentScheduledSchedules.forEach(schedule => {
        const startDate = schedule.start_date;
        const endDate = schedule.end_date || '무기한';
        
        // 요일별 스케줄 표시
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayLabels = ['월', '화', '수', '목', '금', '토'];
        const scheduleSummary = days.map((day, idx) => {
            if (schedule[day]) {
                return `${dayLabels[idx]}(${schedule[day]})`;
            }
            return null;
        }).filter(s => s).join(', ');
        
        html += `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; background: #f8f9fa;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #333; margin-bottom: 0.5rem;">
                            ${startDate} ~ ${endDate}
                        </div>
                        <div style="font-size: 0.9rem; color: #666;">
                            ${scheduleSummary || '스케줄 없음'}
                        </div>
                    </div>
                    <button onclick="deleteScheduledSchedule('${schedule.id}')" style="padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// 현재 스케줄 불러오기
window.loadCurrentScheduleToNew = async function() {
    try {
        const student = await API.get('students', currentScheduledStudentId);
        if (!student || !student.schedule) {
            alert('현재 스케줄이 없습니다.');
            return;
        }
        
        const schedule = student.schedule;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        days.forEach(day => {
            const daySchedule = schedule[day];
            if (daySchedule && daySchedule.enabled) {
                document.getElementById(`newSch-${day}-enabled`).checked = true;
                document.getElementById(`newSch-${day}-checkin`).value = daySchedule.checkIn || '';
                document.getElementById(`newSch-${day}-checkout`).value = daySchedule.checkOut || '';
                document.getElementById(`newSch-${day}-duration`).value = daySchedule.duration || 90;
            }
        });
        
        console.log('[예정 스케줄] 현재 스케줄 불러오기 완료');
        
    } catch (error) {
        console.error('[예정 스케줄] 현재 스케줄 불러오기 실패:', error);
        alert('현재 스케줄을 불러오는데 실패했습니다.');
    }
};

// 퇴실시간 계산
window.calculateNewSchCheckout = function(dayKey) {
    const checkinInput = document.getElementById(`newSch-${dayKey}-checkin`);
    const checkoutInput = document.getElementById(`newSch-${dayKey}-checkout`);
    const durationInput = document.getElementById(`newSch-${dayKey}-duration`);
    
    if (!checkinInput.value) {
        checkoutInput.value = '';
        return;
    }
    
    try {
        const [hours, minutes] = checkinInput.value.split(':').map(Number);
        const duration = parseInt(durationInput.value) || 90;
        
        const checkinDate = new Date();
        checkinDate.setHours(hours, minutes, 0, 0);
        
        const checkoutDate = new Date(checkinDate.getTime() + duration * 60 * 1000);
        
        const checkoutHours = String(checkoutDate.getHours()).padStart(2, '0');
        const checkoutMinutes = String(checkoutDate.getMinutes()).padStart(2, '0');
        
        checkoutInput.value = `${checkoutHours}:${checkoutMinutes}`;
    } catch (error) {
        console.error('[퇴실시간 계산] 실패:', error);
    }
};

// 새 예정 스케줄 저장
window.saveNewScheduledSchedule = async function() {
    try {
        const startDate = document.getElementById('newScheduleStartDate').value;
        const endDate = document.getElementById('newScheduleEndDate').value || null;
        
        if (!startDate) {
            alert('시작 날짜를 입력해주세요.');
            return;
        }
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const scheduleData = {
            student_id: currentScheduledStudentId,
            start_date: startDate,
            end_date: endDate
        };
        
        days.forEach(day => {
            const enabled = document.getElementById(`newSch-${day}-enabled`).checked;
            const checkin = document.getElementById(`newSch-${day}-checkin`).value;
            const checkout = document.getElementById(`newSch-${day}-checkout`).value;
            
            if (enabled && checkin && checkout) {
                scheduleData[day] = `${checkin}-${checkout}`;
            } else {
                scheduleData[day] = '';
            }
        });
        
        console.log('[예정 스케줄] 저장 시도:', scheduleData);
        
        await API.create('scheduled_schedules', scheduleData);
        
        alert('예정 스케줄이 저장되었습니다.');
        
        // 목록 새로고침
        await loadScheduledSchedules(currentScheduledStudentId);
        renderScheduledScheduleList();
        
        // 폼 초기화
        document.getElementById('newScheduleStartDate').value = '';
        document.getElementById('newScheduleEndDate').value = '';
        days.forEach(day => {
            document.getElementById(`newSch-${day}-enabled`).checked = false;
            document.getElementById(`newSch-${day}-checkin`).value = '';
            document.getElementById(`newSch-${day}-checkout`).value = '';
            document.getElementById(`newSch-${day}-duration`).value = '90';
        });
        
    } catch (error) {
        console.error('[예정 스케줄] 저장 실패:', error);
        alert('예정 스케줄 저장에 실패했습니다.');
    }
};

// 예정 스케줄 삭제
window.deleteScheduledSchedule = async function(scheduleId) {
    if (!confirm('이 예정 스케줄을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await API.delete('scheduled_schedules', scheduleId);
        
        alert('예정 스케줄이 삭제되었습니다.');
        
        // 목록 새로고침
        await loadScheduledSchedules(currentScheduledStudentId);
        renderScheduledScheduleList();
        
    } catch (error) {
        console.error('[예정 스케줄] 삭제 실패:', error);
        alert('예정 스케줄 삭제에 실패했습니다.');
    }
};

// 모달 닫기
window.closeScheduledScheduleModal = function() {
    const modal = document.getElementById('scheduledScheduleModal');
    if (modal) {
        modal.remove();
    }
    currentScheduledStudentId = null;
    currentScheduledSchedules = [];
};

console.log('[scheduled-schedule.js] 로드 완료');
