// 상태 예약 시스템

// 날짜 입력 포맷팅 (yyyy.mm.dd)
function formatDateInput(input) {
    let value = input.value.replace(/[^\d]/g, ''); // 숫자만 남김
    if (value.length > 8) value = value.slice(0, 8);
    
    if (value.length >= 5) {
        value = value.slice(0, 4) + '.' + value.slice(4, 6) + '.' + value.slice(6);
    } else if (value.length >= 3) {
        value = value.slice(0, 4) + '.' + value.slice(4);
    }
    
    input.value = value;
}

// 상태 변경 예약
async function scheduleStatusChange(studentId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const startInput = document.getElementById('statusScheduleStart').value.trim();
    const endInput = document.getElementById('statusScheduleEnd').value.trim();
    const status = document.getElementById('statusScheduleStatus').value;
    
    // 최소한 시작날짜 또는 종료날짜 중 하나는 필요
    if (!startInput && !endInput) {
        alert('시작날짜 또는 종료날짜를 입력해주세요');
        return;
    }
    
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    try {
        // 날짜 변환 (yyyy.mm.dd → yyyy-mm-dd)
        const startDate = startInput ? startInput.replace(/\./g, '-') : null;
        const endDate = endInput ? endInput.replace(/\./g, '-') : null;
        
        // 날짜 유효성 검사
        if (startDate && !isValidDate(startDate)) {
            alert('시작날짜 형식이 올바르지 않습니다 (yyyy.mm.dd)');
            return;
        }
        if (endDate && !isValidDate(endDate)) {
            alert('종료날짜 형식이 올바르지 않습니다 (yyyy.mm.dd)');
            return;
        }
        
        // 시작 > 종료 검사
        if (startDate && endDate && startDate > endDate) {
            alert('시작날짜가 종료날짜보다 늦을 수 없습니다');
            return;
        }
        
        // 예약 생성
        const schedule = {
            student_id: studentId,
            student_name: student.name,
            start_date: startDate,
            end_date: endDate,
            scheduled_status: status,
            is_active: true,
            created_at: new Date().toISOString()
        };
        
        await API.create('student_status_schedules', schedule);
        
        console.log('✅ 상태 예약 생성:', schedule);
        alert(`${status} 상태가 예약되었습니다`);
        
        // 입력 필드 초기화
        document.getElementById('statusScheduleStart').value = '';
        document.getElementById('statusScheduleEnd').value = '';
        document.getElementById('statusScheduleStatus').value = '재원';
        
        // 예약 목록 새로고침
        await loadStatusSchedules(studentId);
        
    } catch (error) {
        console.error('❌ 상태 예약 실패:', error);
        alert('상태 예약에 실패했습니다');
    }
}

// 날짜 유효성 검사
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// 상태 예약 목록 로드
async function loadStatusSchedules(studentId) {
    try {
        const response = await API.getList('student_status_schedules', 1, 1000);
        const allSchedules = response.data || response || [];
        
        // 해당 학생의 활성 예약만 필터링
        const schedules = allSchedules.filter(s => 
            s.student_id === studentId && s.is_active
        );
        
        // 시작날짜 순 정렬
        schedules.sort((a, b) => {
            const dateA = a.start_date || '9999-12-31';
            const dateB = b.start_date || '9999-12-31';
            return dateA.localeCompare(dateB);
        });
        
        const container = document.getElementById(`statusScheduleList-${studentId}`);
        if (!container) return;
        
        if (schedules.length === 0) {
            container.innerHTML = '<p style="color: #999; margin: 0;">예약된 상태 변경이 없습니다</p>';
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f0f0f0;">';
        html += '<th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">시작</th>';
        html += '<th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">종료</th>';
        html += '<th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">상태</th>';
        html += '<th style="padding: 0.5rem; text-align: center; border: 1px solid #ddd; width: 80px;">삭제</th>';
        html += '</tr></thead><tbody>';
        
        schedules.forEach(schedule => {
            const startDisplay = schedule.start_date ? schedule.start_date.replace(/-/g, '.') : '-';
            const endDisplay = schedule.end_date ? schedule.end_date.replace(/-/g, '.') : '계속';
            const statusColor = schedule.scheduled_status === '재원' ? '#4CAF50' : 
                               schedule.scheduled_status === '휴원' ? '#FF9800' : '#F44336';
            
            html += '<tr>';
            html += `<td style="padding: 0.5rem; border: 1px solid #ddd;">${startDisplay}</td>`;
            html += `<td style="padding: 0.5rem; border: 1px solid #ddd;">${endDisplay}</td>`;
            html += `<td style="padding: 0.5rem; border: 1px solid #ddd; color: ${statusColor}; font-weight: 600;">${schedule.scheduled_status}</td>`;
            html += `<td style="padding: 0.5rem; border: 1px solid #ddd; text-align: center;">
                        <button class="btn-danger-small" onclick="deleteStatusSchedule('${schedule.id}', '${studentId}')" 
                                style="padding: 0.3rem 0.8rem; font-size: 0.85rem;">삭제</button>
                     </td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ 상태 예약 목록 로드 실패:', error);
    }
}

// 상태 예약 삭제
async function deleteStatusSchedule(scheduleId, studentId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    if (!confirm('예약을 삭제하시겠습니까?')) return;
    
    try {
        await API.delete('student_status_schedules', scheduleId);
        console.log('✅ 상태 예약 삭제:', scheduleId);
        
        // 목록 새로고침
        await loadStatusSchedules(studentId);
        
    } catch (error) {
        console.error('❌ 상태 예약 삭제 실패:', error);
        alert('삭제에 실패했습니다');
    }
}

// 학생 상세 표시 시 예약 목록 로드
const originalShowStudentDetail = window.showStudentDetail;
if (originalShowStudentDetail) {
    window.showStudentDetail = async function(studentId) {
        await originalShowStudentDetail(studentId);
        // 정보 탭이 활성화되면 예약 목록 로드
        if (currentStudentTab === 'info') {
            setTimeout(() => loadStatusSchedules(studentId), 100);
        }
    };
}

// 탭 전환 시 예약 목록 로드
const originalSwitchStudentTab = window.switchStudentTab;
if (originalSwitchStudentTab) {
    window.switchStudentTab = async function(tab, studentId) {
        await originalSwitchStudentTab(tab, studentId);
        if (tab === 'info') {
            setTimeout(() => loadStatusSchedules(studentId), 100);
        }
    };
}

// 상태 예약에 따른 학생 상태 자동 업데이트 (매일 자동 실행)
async function applyScheduledStatusChanges() {
    try {
        const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
        console.log('[applyScheduledStatusChanges] 오늘 날짜:', today);
        
        const response = await API.getList('student_status_schedules', 1, 1000);
        const allSchedules = response.data || response || [];
        
        // 활성화된 예약만 필터링
        const activeSchedules = allSchedules.filter(s => s.is_active);
        
        for (const schedule of activeSchedules) {
            const startDate = schedule.start_date;
            const endDate = schedule.end_date;
            
            let shouldApply = false;
            
            // 시작날짜만 있는 경우: 오늘이 시작날짜 이후면 적용
            if (startDate && !endDate) {
                shouldApply = today >= startDate;
            }
            // 종료날짜만 있는 경우: 오늘이 종료날짜 이전이면 적용
            else if (!startDate && endDate) {
                shouldApply = today <= endDate;
            }
            // 시작+종료 모두 있는 경우: 오늘이 범위 내에 있으면 적용
            else if (startDate && endDate) {
                shouldApply = today >= startDate && today <= endDate;
            }
            
            if (shouldApply) {
                console.log(`✅ [${schedule.student_name}] 상태 변경: ${schedule.scheduled_status}`);
                
                // 학생 상태 업데이트
                const updateData = { status: schedule.scheduled_status };
                
                // 휴원/퇴원으로 변경 시 withdrawal_date 설정
                if (schedule.scheduled_status === '휴원' || schedule.scheduled_status === '퇴원') {
                    if (startDate) {
                        updateData.withdrawal_date = new Date(startDate).getTime();
                    } else {
                        updateData.withdrawal_date = new Date().getTime();
                    }
                }
                // 재원으로 복귀 시 withdrawal_date 제거
                else if (schedule.scheduled_status === '재원') {
                    updateData.withdrawal_date = null;
                }
                
                await API.update('students', schedule.student_id, updateData);
                
                // 종료날짜가 지났으면 예약 비활성화
                if (endDate && today > endDate) {
                    await API.update('student_status_schedules', schedule.id, { is_active: false });
                    console.log(`⏹ [${schedule.student_name}] 예약 종료`);
                }
            }
        }
        
        console.log('✅ 상태 예약 자동 적용 완료');
        
    } catch (error) {
        console.error('❌ 상태 예약 자동 적용 실패:', error);
    }
}

// 페이지 로드 시 자동 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(applyScheduledStatusChanges, 2000);
    });
} else {
    setTimeout(applyScheduledStatusChanges, 2000);
}

// 매일 자동 실행 (24시간마다)
setInterval(applyScheduledStatusChanges, 24 * 60 * 60 * 1000);
