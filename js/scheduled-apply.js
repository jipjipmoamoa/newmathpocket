// ===== 예정 스케줄/상태 자동 반영 시스템 =====

// 오늘 날짜 이전의 예정 스케줄/상태를 실제 학생 데이터에 반영
window.applyScheduledChanges = async function() {
    console.log('[applyScheduledChanges] 예정 변경사항 자동 반영 시작...');
    
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        console.log('[applyScheduledChanges] 오늘 날짜:', today);
        
        // 1. 모든 학생 로드
        const studentsResponse = await API.getList('students', { limit: 1000 });
        const students = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        console.log('[applyScheduledChanges] 학생 수:', students.length);
        
        // 2. 예정 상태 변경 로드
        const statusResponse = await API.getList('student_status_schedules');
        const allStatusSchedules = Array.isArray(statusResponse) ? statusResponse : (statusResponse.data || []);
        console.log('[applyScheduledChanges] 예정 상태 변경 수:', allStatusSchedules.length);
        
        // 3. 예정 스케줄 변경 로드
        const scheduleResponse = await API.getList('scheduled_schedules');
        const allScheduledSchedules = Array.isArray(scheduleResponse) ? scheduleResponse : (scheduleResponse.data || []);
        console.log('[applyScheduledChanges] 예정 스케줄 변경 수:', allScheduledSchedules.length);
        
        let statusUpdateCount = 0;
        let scheduleUpdateCount = 0;
        
        // 4. 각 학생별로 예정된 변경사항 적용
        for (const student of students) {
            let needsUpdate = false;
            let updateData = {};
            
            // 4-1. 예정 상태 변경 확인
            const studentStatusSchedules = allStatusSchedules
                .filter(s => s.student_id === student.id && s.is_active && s.start_date <= today)
                .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
            
            if (studentStatusSchedules.length > 0) {
                const latestStatus = studentStatusSchedules[0];
                const newStatus = latestStatus.scheduled_status;
                
                if (newStatus && newStatus !== student.status) {
                    console.log(`[applyScheduledChanges] ${student.name}: 상태 변경 ${student.status} → ${newStatus} (${latestStatus.start_date})`);
                    updateData.status = newStatus;
                    needsUpdate = true;
                    statusUpdateCount++;
                    
                    // 예약 레코드 비활성화 (이미 반영됨)
                    await API.update('student_status_schedules', latestStatus.id, { is_active: false });
                }
            }
            
            // 4-2. 예정 스케줄 변경 확인
            const studentScheduledSchedules = allScheduledSchedules
                .filter(s => s.student_id === student.id && s.start_date <= today)
                .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
            
            if (studentScheduledSchedules.length > 0) {
                const latestSchedule = studentScheduledSchedules[0];
                
                // 헬퍼 함수: 요일 스케줄 파싱
                const parseDay = (dayStr) => {
                    if (!dayStr || dayStr.trim() === '') {
                        return { enabled: false, checkIn: '', checkOut: '' };
                    }
                    const parts = dayStr.split('-');
                    return {
                        enabled: true,
                        checkIn: parts[0] || '',
                        checkOut: parts[1] || ''
                    };
                };
                
                // 새 스케줄 구성
                const newSchedule = {
                    monday: parseDay(latestSchedule.monday),
                    tuesday: parseDay(latestSchedule.tuesday),
                    wednesday: parseDay(latestSchedule.wednesday),
                    thursday: parseDay(latestSchedule.thursday),
                    friday: parseDay(latestSchedule.friday),
                    saturday: parseDay(latestSchedule.saturday),
                    sunday: { enabled: false, checkIn: '', checkOut: '' }
                };
                
                console.log(`[applyScheduledChanges] ${student.name}: 스케줄 변경 적용 (${latestSchedule.start_date})`);
                console.log('[applyScheduledChanges] 새 스케줄:', newSchedule);
                updateData.schedule = JSON.stringify(newSchedule);
                needsUpdate = true;
                scheduleUpdateCount++;
                
                // 예약 레코드 삭제 (이미 반영됨)
                await API.delete('scheduled_schedules', latestSchedule.id);
            }
            
            // 4-3. DB 업데이트
            if (needsUpdate) {
                await API.update('students', student.id, updateData);
                console.log(`[applyScheduledChanges] ${student.name} 업데이트 완료:`, updateData);
            }
        }
        
        console.log(`[applyScheduledChanges] 완료 - 상태: ${statusUpdateCount}건, 스케줄: ${scheduleUpdateCount}건`);
        
        return {
            success: true,
            statusUpdates: statusUpdateCount,
            scheduleUpdates: scheduleUpdateCount
        };
        
    } catch (error) {
        console.error('[applyScheduledChanges] 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 페이지 로드 시 자동 실행
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[scheduled-apply] DOMContentLoaded - 예정 변경사항 자동 반영');
    
    // 로그인 확인 (Auth 모듈 로드 대기)
    const checkAuth = setInterval(async () => {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            clearInterval(checkAuth);
            console.log('[scheduled-apply] 로그인 확인 완료, 변경사항 반영 시작');
            await applyScheduledChanges();
        }
    }, 100);
    
    // 10초 후 타임아웃
    setTimeout(() => {
        clearInterval(checkAuth);
    }, 10000);
});
