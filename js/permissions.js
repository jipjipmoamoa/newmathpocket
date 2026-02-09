// 권한 관리 유틸리티

const Permissions = {
    // 학생 필터링: 선생님은 담당 학생만 반환
    filterStudentsByTeacher(students) {
        if (!Auth.isLoggedIn()) return [];
        
        // 관리자 또는 부관리자는 모든 학생 조회 가능
        if (Auth.isAdminOrSubAdmin()) {
            return students;
        }
        
        // 선생님은 담당 학생만 필터링
        if (Auth.isTeacher()) {
            const teacherId = Auth.getUserId();
            return students.filter(s => s.teacher_id === teacherId);
        }
        
        return students;
    },
    
    // 페이지 접근 권한 체크
    canAccessPage(pageId) {
        if (!Auth.isLoggedIn()) return false;
        
        // 관리자는 모든 페이지 접근 가능
        if (Auth.isAdmin()) return true;
        
        // 부관리자 권한: 설정 페이지만 접근 불가, 나머지 모두 접근 가능
        if (Auth.isSubAdmin()) {
            const blockedPages = ['settings'];
            return !blockedPages.includes(pageId);
        }
        
        // 선생님 권한: 학생관리, 전체회원관리, 출석체크, 출석조회, 스케줄표, 교육과정, 수업관리, 학원관리 접근 가능 (담당학생만)
        if (Auth.isTeacher()) {
            const allowedPages = [
                'students',          // 학생관리 (담당학생만)
                'all-members',       // 전체회원관리 (담당학생만)
                'attendance-check',  // 출석체크 (담당학생만)
                'attendance-view',   // 출석조회 (담당학생만)
                'schedule-current',  // 이번달 스케줄표 (담당학생만) - 하위 호환
                'schedule-view',     // 스케줄표 조회 (담당학생만) - 하위 호환
                'schedule-weekly',   // 주간 스케줄표 (담당학생만)
                'schedule-monthly',  // 월간 스케줄표 (담당학생만)
                'curriculum',        // 교육과정 (조회 + 편집)
                'classManagement',   // 수업 관리 (대시보드)
                'academyManagement', // 학원 관리 (연간 달력 조회)
                'welcome'            // 웰컴 페이지
            ];
            return allowedPages.includes(pageId);
        }
        
        return false;
    },
    
    // 학생 수정/삭제 권한 체크
    canEditStudent(studentId) {
        if (!Auth.isLoggedIn()) return false;
        
        // 관리자/부관리자는 모든 학생 수정 가능
        if (Auth.isAdminOrSubAdmin()) return true;
        
        // 선생님은 담당 학생만 수정 가능
        if (Auth.isTeacher()) {
            if (typeof allStudents === 'undefined' || !allStudents) {
                console.warn('[Permissions] allStudents가 정의되지 않음');
                return false;
            }
            const student = allStudents.find(s => s.id === studentId);
            return student && student.teacher_id === Auth.getUserId();
        }
        
        return false;
    },
    
    // 학생 삭제 권한 체크
    canDeleteStudent(studentId) {
        // 학생 삭제는 관리자/부관리자만 가능
        if (Auth.isAdminOrSubAdmin()) return true;
        
        // 선생님은 담당 학생 삭제 가능
        if (Auth.isTeacher()) {
            if (typeof allStudents === 'undefined' || !allStudents) {
                console.warn('[Permissions] allStudents가 정의되지 않음');
                return false;
            }
            const student = allStudents.find(s => s.id === studentId);
            return student && student.teacher_id === Auth.getUserId();
        }
        
        return false;
    },
    
    // 출석 수정/삭제 권한 체크
    canEditAttendance(studentId) {
        if (!Auth.isLoggedIn()) return false;
        
        // 관리자/부관리자는 모든 출석 수정 가능
        if (Auth.isAdminOrSubAdmin()) return true;
        
        // 선생님은 담당 학생 출석만 수정 가능
        if (Auth.isTeacher()) {
            if (typeof allStudents === 'undefined' || !allStudents) {
                console.warn('[Permissions] allStudents가 정의되지 않음');
                return false;
            }
            const student = allStudents.find(s => s.id === studentId);
            return student && student.teacher_id === Auth.getUserId();
        }
        
        return false;
    },
    
    // 전체회원관리 편집 권한 (선생님은 인쇄만 가능)
    canEditInAllMembers() {
        return Auth.isAdminOrSubAdmin();
    },
    
    // 교육과정 편집 권한 (관리자/부관리자/선생님 모두 가능)
    canEditCurriculum() {
        return Auth.isAdmin() || Auth.isSubAdmin() || Auth.isTeacher();
    },
    
    // 메뉴 표시 여부
    shouldShowMenuItem(pageId) {
        return this.canAccessPage(pageId);
    }
};
