// ============================================
// 예약 스케줄 및 상태 헬퍼 함수
// ============================================
console.log('[schedule-status-helper.js] 로드 시작');

/**
 * 특정 날짜에 학생의 실제 상태를 반환
 * @param {Object} student - 학생 객체
 * @param {string} dateString - 날짜 (YYYY-MM-DD)
 * @param {Array} allStatusSchedules - 모든 student_status_schedules 데이터
 * @returns {string} '재원', '휴원', '퇴원' 중 하나
 */
window.getStudentStatusOnDate = function(student, dateString, allStatusSchedules = []) {
    if (!student || !dateString) return student?.status || '퇴원';
    
    // 해당 학생의 예약 상태 찾기
    const studentSchedules = allStatusSchedules.filter(schedule => 
        schedule.student_id === student.id && 
        schedule.is_active !== false // 활성화된 예약만
    );
    
    // 날짜 순으로 정렬 (과거 -> 미래)
    studentSchedules.sort((a, b) => {
        const dateA = a.start_date || '9999-12-31';
        const dateB = b.start_date || '9999-12-31';
        return dateA.localeCompare(dateB);
    });
    
    // 적용되는 예약 상태 찾기 (시작일이 조회일 이하인 것 중 가장 최신)
    let effectiveStatus = null;
    for (const schedule of studentSchedules) {
        if (schedule.start_date && schedule.start_date <= dateString) {
            effectiveStatus = schedule;
        } else {
            break; // 미래 예약은 무시
        }
    }
    
    // 예약 상태가 있으면 그것을 반환, 없으면 현재 상태 반환
    if (effectiveStatus && effectiveStatus.new_status) {
        console.log(`[getStudentStatusOnDate] ${student.name} on ${dateString}: ${effectiveStatus.new_status} (예약 적용)`);
        return effectiveStatus.new_status;
    }
    
    console.log(`[getStudentStatusOnDate] ${student.name} on ${dateString}: ${student.status} (기본 상태)`);
    return student.status;
};

/**
 * 특정 날짜에 학생의 실제 스케줄을 반환
 * @param {Object} student - 학생 객체
 * @param {string} dateString - 날짜 (YYYY-MM-DD)
 * @param {Array} allScheduledSchedules - 모든 scheduled_schedules 데이터
 * @returns {Object} 스케줄 객체 (monday, tuesday, ... 포함)
 */
window.getStudentScheduleOnDate = function(student, dateString, allScheduledSchedules = []) {
    if (!student || !dateString) return student?.schedule || {};
    
    // 현재 스케줄 파싱
    let currentSchedule = student.schedule;
    if (typeof currentSchedule === 'string' && currentSchedule.trim() !== '') {
        try {
            currentSchedule = JSON.parse(currentSchedule);
        } catch (e) {
            console.error('[getStudentScheduleOnDate] 스케줄 파싱 오류:', e);
            currentSchedule = {};
        }
    } else if (!currentSchedule) {
        currentSchedule = {};
    }
    
    // 해당 학생의 예약 스케줄 찾기
    const studentSchedules = allScheduledSchedules.filter(schedule => 
        schedule.student_id === student.id &&
        schedule.is_active !== false // 활성화된 예약만
    );
    
    // 날짜 순으로 정렬 (과거 -> 미래)
    studentSchedules.sort((a, b) => {
        const dateA = a.start_date || '9999-12-31';
        const dateB = b.start_date || '9999-12-31';
        return dateA.localeCompare(dateB);
    });
    
    // 적용되는 예약 스케줄 찾기 (시작일이 조회일 이하인 것 중 가장 최신)
    let effectiveSchedule = null;
    for (const schedule of studentSchedules) {
        if (schedule.start_date && schedule.start_date <= dateString) {
            effectiveSchedule = schedule;
        } else {
            break; // 미래 예약은 무시
        }
    }
    
    // 예약 스케줄이 있으면 그것을 반환
    if (effectiveSchedule && effectiveSchedule.new_schedule) {
        let newSchedule = effectiveSchedule.new_schedule;
        if (typeof newSchedule === 'string' && newSchedule.trim() !== '') {
            try {
                newSchedule = JSON.parse(newSchedule);
                console.log(`[getStudentScheduleOnDate] ${student.name} on ${dateString}: 예약 스케줄 적용`, newSchedule);
                return newSchedule;
            } catch (e) {
                console.error('[getStudentScheduleOnDate] 예약 스케줄 파싱 오류:', e);
            }
        }
    }
    
    console.log(`[getStudentScheduleOnDate] ${student.name} on ${dateString}: 기본 스케줄 사용`);
    return currentSchedule;
};

/**
 * 학생 목록을 날짜 기준으로 필터링 및 상태/스케줄 적용
 * @param {Array} students - 원본 학생 목록
 * @param {string} dateString - 날짜 (YYYY-MM-DD)
 * @param {Array} allStatusSchedules - 모든 student_status_schedules
 * @param {Array} allScheduledSchedules - 모든 scheduled_schedules
 * @returns {Array} 필터링 및 업데이트된 학생 목록
 */
window.getActiveStudentsOnDate = async function(students, dateString, allStatusSchedules = null, allScheduledSchedules = null) {
    console.log(`[getActiveStudentsOnDate] 날짜: ${dateString}, 원본 학생 수: ${students.length}`);
    
    // 예약 데이터 로드 (캐시되지 않은 경우)
    if (!allStatusSchedules) {
        try {
            const statusResponse = await API.getList('student_status_schedules', { limit: 1000 });
            allStatusSchedules = Array.isArray(statusResponse) ? statusResponse : (statusResponse.data || []);
            console.log('[getActiveStudentsOnDate] 예약 상태 로드:', allStatusSchedules.length);
        } catch (e) {
            console.error('[getActiveStudentsOnDate] 예약 상태 로드 실패:', e);
            allStatusSchedules = [];
        }
    }
    
    if (!allScheduledSchedules) {
        try {
            const scheduleResponse = await API.getList('scheduled_schedules', { limit: 1000 });
            allScheduledSchedules = Array.isArray(scheduleResponse) ? scheduleResponse : (scheduleResponse.data || []);
            console.log('[getActiveStudentsOnDate] 예약 스케줄 로드:', allScheduledSchedules.length);
        } catch (e) {
            console.error('[getActiveStudentsOnDate] 예약 스케줄 로드 실패:', e);
            allScheduledSchedules = [];
        }
    }
    
    // 각 학생의 상태 및 스케줄 업데이트
    const updatedStudents = students.map(student => {
        const effectiveStatus = window.getStudentStatusOnDate(student, dateString, allStatusSchedules);
        const effectiveSchedule = window.getStudentScheduleOnDate(student, dateString, allScheduledSchedules);
        
        return {
            ...student,
            effectiveStatus: effectiveStatus, // 해당 날짜의 실제 상태
            effectiveSchedule: effectiveSchedule, // 해당 날짜의 실제 스케줄
            // 원본 유지
            originalStatus: student.status,
            originalSchedule: student.schedule
        };
    });
    
    // 재원생만 필터링 (effectiveStatus 기준)
    const activeStudents = updatedStudents.filter(s => s.effectiveStatus === '재원');
    
    console.log(`[getActiveStudentsOnDate] 재원생 수: ${activeStudents.length}`);
    activeStudents.forEach(s => {
        console.log(`  - ${s.name}: ${s.originalStatus} → ${s.effectiveStatus}`);
    });
    
    return activeStudents;
};

console.log('[schedule-status-helper.js] 로드 완료');
