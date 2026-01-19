// ============================================
// 선생님별 색상 관리
// ============================================

// 선생님 목록 캐시
let teachersList = [];

/**
 * 선생님 ID에 색상 반환 (선생님이 설정한 색상)
 * @param {string} teacherId - 선생님 ID
 * @returns {string} - 색상 코드 (예: '#FFE6F0') 또는 빈 문자열
 */
function getTeacherColorClass(teacherId) {
    // 담당 선생님이 없는 경우
    if (!teacherId || teacherId === '' || teacherId === 'null' || teacherId === 'undefined') {
        return '';
    }
    
    // 선생님 목록에서 해당 선생님 찾기
    const teacher = teachersList.find(t => t.id === teacherId);
    
    // 선생님이 설정한 색상 반환 (없으면 빈 문자열)
    return teacher && teacher.color ? teacher.color : '';
}

/**
 * 선생님 목록을 로드하고 캐싱
 */
async function initializeTeacherColors() {
    try {
        const response = await API.getList('teachers', { limit: 1000 });
        teachersList = Array.isArray(response) ? response : (response.data || []);
        
        console.log('[initializeTeacherColors] 선생님 목록 로드 완료:', teachersList.length, '명');
        
    } catch (error) {
        console.error('[initializeTeacherColors] 선생님 목록 로드 실패:', error);
    }
}

/**
 * 선생님 이름으로 색상 조회
 * @param {string} teacherName - 선생님 이름
 * @returns {string} - 색상 코드
 */
function getTeacherColorClassByName(teacherName) {
    if (!teacherName || teacherName === '-') {
        return '';
    }
    
    const teacher = teachersList.find(t => t.name === teacherName);
    if (teacher) {
        return getTeacherColorClass(teacher.id);
    }
    
    return '';
}
