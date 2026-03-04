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
    const student = await API.getOne('students', studentId);
    if (!student) {
        alert('학생 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 예정 스케줄 목록 로드
    await loadScheduledSchedules(studentId);
    
    // 현재 스케줄 데이터 미리 로드
    let currentSchedule = null;
    if (student.schedule) {
        currentSchedule = student.schedule;
    }
    
    console.log('[예정 스케줄] 학생 정보:', student);
    console.log('[예정 스케줄] 현재 스케줄:', currentSchedule);
    console.log('[예정 스케줄] schedule 타입:', typeof currentSchedule);
    
    // schedule이 문자열인 경우 파싱 시도
    if (typeof currentSchedule === 'string') {
        try {
            currentSchedule = JSON.parse(currentSchedule);
            console.log('[예정 스케줄] JSON 파싱 후:', currentSchedule);
        } catch (e) {
            console.error('[예정 스케줄] JSON 파싱 실패:', e);
            currentSchedule = null;
        }
    }
    
    // 주간 스케줄 테이블 HTML 생성 (현재 스케줄 반영)
    const dayLabels = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    let scheduleTableRows = '';
    dayLabels.forEach((dayLabel, idx) => {
        const dayKey = dayKeys[idx];
        
        // 현재 스케줄에서 해당 요일 데이터 가져오기
        let isEnabled = false;
        let checkIn = '';
        let checkOut = '';
        let duration = 90;
        
        if (currentSchedule && currentSchedule[dayKey]) {
            const daySchedule = currentSchedule[dayKey];
            isEnabled = daySchedule.enabled || false;
            checkIn = daySchedule.checkIn || '';
            checkOut = daySchedule.checkOut || '';
            duration = daySchedule.duration || 90;
        }
        
        console.log(`[${dayKey}] enabled:${isEnabled}, checkIn:${checkIn}, checkOut:${checkOut}, duration:${duration}`);
        
        scheduleTableRows += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 0.5rem; font-weight: 600;">${dayLabel}</td>
                <td style="border: 1px solid #ddd; padding: 0.5rem; text-align: center;">
                    <input type="checkbox" id="newSch-${dayKey}-enabled" ${isEnabled ? 'checked' : ''}>
                </td>
                <td style="border: 1px solid #ddd; padding: 0.5rem;">
                    <input type="text" class="time-input" id="newSch-${dayKey}-checkin" 
                           value="${checkIn}" placeholder="1400 또는 14:00" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                           oninput="formatAndCalculateTime('${dayKey}')"
                           onchange="calculateNewSchCheckout('${dayKey}')">
                </td>
                <td style="border: 1px solid #ddd; padding: 0.5rem;">
                    <input type="text" class="time-input" id="newSch-${dayKey}-checkout" value="${checkOut}" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                </td>
                <td style="border: 1px solid #ddd; padding: 0.5rem;">
                    <input type="number" id="newSch-${dayKey}-duration" 
                           value="${duration}" min="30" max="300" step="10" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                           onchange="calculateNewSchCheckout('${dayKey}')">
                </td>
            </tr>
        `;
    });
    
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
                    
                    <!-- 주간 스케줄 테이블 (현재 스케줄이 기본으로 표시됨) -->
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">
                        * 현재 스케줄이 기본으로 표시됩니다. 수정하여 저장하세요.
                    </p>
                    
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
                            ${scheduleTableRows}
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
        
        // 삭제 버튼 권한 체크
        const canDelete = Auth.isAdmin() || Auth.isSubAdmin();
        const deleteButton = canDelete 
            ? `<button onclick="deleteScheduledSchedule('${schedule.id}', '${schedule.student_id}')" style="padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">
                <i class="fas fa-trash"></i> 삭제
               </button>`
            : `<span style="color: #999; font-size: 0.85rem;">관리자 전용</span>`;
        
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
                    ${deleteButton}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// 현재 스케줄 다시 불러오기 (필요시 사용)
window.loadCurrentScheduleToNew = async function() {
    try {
        const student = await API.getOne('students', currentScheduledStudentId);
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
            } else {
                document.getElementById(`newSch-${day}-enabled`).checked = false;
                document.getElementById(`newSch-${day}-checkin`).value = '';
                document.getElementById(`newSch-${day}-checkout`).value = '';
                document.getElementById(`newSch-${day}-duration`).value = '90';
            }
        });
        
        console.log('[예정 스케줄] 현재 스케줄 불러오기 완료');
        
    } catch (error) {
        console.error('[예정 스케줄] 현재 스케줄 불러오기 실패:', error);
        alert('현재 스케줄을 불러오는데 실패했습니다.');
    }
};

// 시간 입력 포맷팅 및 퇴실시간 자동 계산 (실시간)
window.formatAndCalculateTime = function(dayKey) {
    const checkinInput = document.getElementById(`newSch-${dayKey}-checkin`);
    const checkoutInput = document.getElementById(`newSch-${dayKey}-checkout`);
    const durationInput = document.getElementById(`newSch-${dayKey}-duration`);
    
    let value = checkinInput.value.replace(/[^0-9]/g, ''); // 숫자만 추출
    
    if (value.length === 0) {
        checkoutInput.value = '';
        return;
    }
    
    // 4자리 숫자 입력 시 자동 포맷팅 (예: 1530 -> 15:30)
    if (value.length === 4) {
        const hours = value.substring(0, 2);
        const minutes = value.substring(2, 4);
        checkinInput.value = `${hours}:${minutes}`;
        
        // 자동으로 퇴실시간 계산
        calculateNewSchCheckout(dayKey);
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
        // 입력값에서 숫자만 추출
        let timeValue = checkinInput.value.replace(/[^0-9]/g, '');
        
        // 4자리가 아니면 계산 중단
        if (timeValue.length !== 4) {
            return;
        }
        
        const hours = parseInt(timeValue.substring(0, 2));
        const minutes = parseInt(timeValue.substring(2, 4));
        
        // 유효성 검사
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            console.error('[퇴실시간 계산] 잘못된 시간 형식:', timeValue);
            return;
        }
        
        const duration = parseInt(durationInput.value) || 90;
        
        const checkinDate = new Date();
        checkinDate.setHours(hours, minutes, 0, 0);
        
        const checkoutDate = new Date(checkinDate.getTime() + duration * 60 * 1000);
        
        const checkoutHours = String(checkoutDate.getHours()).padStart(2, '0');
        const checkoutMinutes = String(checkoutDate.getMinutes()).padStart(2, '0');
        
        checkoutInput.value = `${checkoutHours}:${checkoutMinutes}`;
        
        console.log(`[퇴실시간 계산] ${dayKey}: ${hours}:${minutes} + ${duration}분 = ${checkoutHours}:${checkoutMinutes}`);
        
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
window.deleteScheduledSchedule = async function(scheduleId, studentId) {
    // 권한 확인
    if (!Auth.isAdmin() && !Auth.isSubAdmin()) {
        alert('⚠️ 권한이 없습니다.\n\n관리자만 예정 스케줄을 삭제할 수 있습니다.');
        return;
    }
    
    try {
        // 예정 스케줄 정보 가져오기
        const schedule = await API.getOne('scheduled_schedules', scheduleId);
        if (!schedule) {
            alert('예정 스케줄을 찾을 수 없습니다.');
            return;
        }
        
        // 확정된 스케줄이 있는지 확인
        const startDate = schedule.start_date;
        const today = new Date().toISOString().split('T')[0];
        
        if (startDate <= today) {
            // 시작일이 오늘이거나 과거인 경우, 해당 기간의 출석 기록 확인
            const attendanceRecords = await API.getList('attendance', { limit: 10000 });
            const records = Array.isArray(attendanceRecords) ? attendanceRecords : (attendanceRecords.data || []);
            
            // 해당 학생의 시작일 이후 출석 기록이 있는지 확인
            const hasConfirmedSchedule = records.some(record => 
                record.student_id === studentId && record.date >= startDate
            );
            
            if (hasConfirmedSchedule) {
                const confirmDelete = confirm(
                    '⚠️ 경고: 이 예정 스케줄에는 이미 확정된 출석 기록이 있습니다.\n\n' +
                    '삭제하면 해당 기간의 출석 현황에 영향을 줄 수 있습니다.\n' +
                    '정말 삭제하시겠습니까?'
                );
                
                if (!confirmDelete) {
                    return;
                }
            }
        }
        
        if (!confirm('이 예정 스케줄을 삭제하시겠습니까?')) {
            return;
        }
        
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
