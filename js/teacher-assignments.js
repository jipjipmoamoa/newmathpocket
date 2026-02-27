// ===== 담당 선생님 이력 관리 =====

// 담당 선생님 탭 렌더링
async function renderTeacherHistoryTab(student, teachers) {
    // 담당 선생님 이력 로드
    let assignments = [];
    try {
        const result = await API.getList('teacher_assignments', { limit: 1000 });
        const allAssignments = Array.isArray(result) ? result : (result.data || []);
        
        // 해당 학생의 이력만 필터링 및 최신순 정렬
        assignments = allAssignments
            .filter(a => a.student_id === student.id)
            .sort((a, b) => {
                const dateA = a.start_date || '';
                const dateB = b.start_date || '';
                return dateB.localeCompare(dateA); // 최신순
            });
    } catch (error) {
        console.error('[renderTeacherHistoryTab] 담당 이력 로드 실패:', error);
    }
    
    // 재직 중인 선생님 목록 (퇴사 제외)
    const activeTeachers = teachers.filter(t => t.status !== '퇴사');
    
    // 현재 담당 선생님 정보 추가 (등록 날짜부터 ~ 미정)
    const currentTeacher = teachers.find(t => t.id === student.teacher_id);
    const studentEnrollDate = student.enroll_date || student.created_at || '-';
    
    // 현재 담당 선생님을 이력 목록 맨 위에 추가
    const allAssignments = [];
    
    if (currentTeacher) {
        allAssignments.push({
            id: 'current',
            teacher_id: currentTeacher.id,
            start_date: studentEnrollDate,
            end_date: null,
            is_current: true,
            isSynthetic: true // 합성된 레코드임을 표시
        });
    }
    
    // 기존 이력 추가 (current가 아닌 것만)
    allAssignments.push(...assignments.filter(a => !a.is_current));
    
    return `
        <div class="tab-panel">
            <table class="data-table teacher-history-table">
                <thead>
                    <tr>
                        <th style="width: 150px;">시작 날짜</th>
                        <th style="width: 150px;">종료 날짜</th>
                        <th style="width: 150px;">담당 선생님</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 데이터 행 (2행부터, 최신순) -->
                    ${allAssignments.length === 0 ? '<tr><td colspan="3" class="empty-message">담당 선생님 이력이 없습니다</td></tr>' : ''}
                    ${allAssignments.map((assign, index) => {
                        const teacher = teachers.find(t => t.id === assign.teacher_id);
                        const teacherName = teacher ? teacher.name : '(미지정)';
                        const isCurrent = assign.is_current;
                        const startDate = assign.start_date ? assign.start_date.replace(/-/g, '.') : '-';
                        const endDate = assign.end_date ? assign.end_date.replace(/-/g, '.') : '미정';
                        
                        return `
                        <tr id="assign-row-${assign.id}" class="data-row ${isCurrent ? 'current-assignment' : ''}">
                            <td class="assign-start-cell" data-assign-id="${assign.id}">
                                <span class="display-value">${startDate}</span>
                            </td>
                            <td class="assign-end-cell" data-assign-id="${assign.id}">
                                <span class="display-value">${endDate}</span>
                            </td>
                            <td class="assign-teacher-cell" data-assign-id="${assign.id}">
                                <span class="display-value">${teacherName}${isCurrent ? ' 📌' : ''}</span>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 담당 선생님 변경 감지 (드롭다운 변경 시)
async function handleTeacherChange(studentId) {
    const selectEl = document.getElementById(`new-teacher-${studentId}`);
    const newTeacherId = selectEl.value;
    
    if (!newTeacherId) return;
    
    // 학생 정보 로드
    const students = await API.getList('students', { limit: 1000 });
    const student = (Array.isArray(students) ? students : students.data).find(s => s.id === studentId);
    
    if (!student) {
        console.error('[handleTeacherChange] 학생을 찾을 수 없습니다:', studentId);
        return;
    }
    
    // 현재 담당 선생님과 같으면 무시
    if (student.teacher_id === newTeacherId) {
        return;
    }
    
    // 알림: 담당 선생님이 변경됨을 안내
    const teachers = await API.getList('teachers', { limit: 1000 });
    const teachersArr = Array.isArray(teachers) ? teachers : teachers.data;
    const newTeacher = teachersArr.find(t => t.id === newTeacherId);
    
    if (newTeacher) {
        const confirmMsg = `담당 선생님을 "${newTeacher.name}"으로 변경하시겠습니까?\n\n변경 시 이력이 자동으로 기록됩니다.`;
        if (!confirm(confirmMsg)) {
            // 취소 시 원래 선생님으로 복원
            selectEl.value = student.teacher_id || '';
            return;
        }
    }
}

// 담당 선생님 이력 추가
async function addTeacherAssignment(studentId) {
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다');
        return;
    }
    
    const teacherId = document.getElementById(`new-teacher-${studentId}`).value;
    const startDate = document.getElementById(`new-assign-start-${studentId}`).value;
    const notes = document.getElementById(`new-assign-notes-${studentId}`).value.trim();
    
    if (!teacherId) {
        alert('담당 선생님을 선택해주세요');
        return;
    }
    
    if (!startDate) {
        alert('담당 시작일을 입력해주세요');
        return;
    }
    
    try {
        // 학생 정보 로드
        const students = await API.getList('students', { limit: 1000 });
        const student = (Array.isArray(students) ? students : students.data).find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다');
            return;
        }
        
        // 선생님 정보 로드
        const teachers = await API.getList('teachers', { limit: 1000 });
        const teachersArr = Array.isArray(teachers) ? teachers : teachers.data;
        const teacher = teachersArr.find(t => t.id === teacherId);
        
        if (!teacher) {
            alert('선생님 정보를 찾을 수 없습니다');
            return;
        }
        
        // 기존 현재 담당 이력 종료 처리
        const assignments = await API.getList('teacher_assignments', { limit: 1000 });
        const allAssignments = Array.isArray(assignments) ? assignments : assignments.data;
        const currentAssignment = allAssignments.find(a => a.student_id === studentId && a.is_current === true);
        
        if (currentAssignment) {
            // 종료일을 오늘 이전으로 설정 (새 시작일 하루 전)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() - 1);
            const endDateStr = endDate.toISOString().split('T')[0];
            
            await API.update('teacher_assignments', currentAssignment.id, {
                ...currentAssignment,
                end_date: endDateStr,
                is_current: false
            });
            
            console.log(`[addTeacherAssignment] 기존 담당 종료: ${currentAssignment.teacher_name} (${endDateStr})`);
        }
        
        // 새 담당 이력 추가
        const newAssignment = {
            student_id: studentId,
            student_name: student.name,
            teacher_id: teacherId,
            teacher_name: teacher.name,
            start_date: startDate,
            end_date: '',
            is_current: true,
            notes: notes
        };
        
        await API.create('teacher_assignments', newAssignment);
        console.log(`[addTeacherAssignment] 새 담당 등록: ${teacher.name} (${startDate})`);
        
        // 학생 정보의 teacher_id 업데이트
        await API.update('students', studentId, {
            ...student,
            teacher_id: teacherId
        });
        
        // 입력 필드 초기화
        document.getElementById(`new-assign-start-${studentId}`).value = Utils.today();
        document.getElementById(`new-assign-notes-${studentId}`).value = '';
        
        // 화면 새로고침
        showStudentDetail(studentId);
        
        alert('담당 선생님이 등록되었습니다');
    } catch (error) {
        console.error('[addTeacherAssignment] 등록 실패:', error);
        alert('담당 선생님 등록에 실패했습니다');
    }
}

// 담당 이력 수정 토글
function toggleEditAssignment(studentId, assignId) {
    const row = document.getElementById(`assign-row-${assignId}`);
    if (!row) return;
    
    const notesCell = row.querySelector('.assign-notes-cell');
    const displayValue = notesCell.querySelector('.display-value');
    const editInput = notesCell.querySelector('.edit-input');
    const editBtn = row.querySelector('.btn-edit');
    
    const isEditing = editInput.style.display !== 'none';
    
    if (isEditing) {
        // 저장
        const newNotes = editInput.value.trim();
        saveAssignmentEdit(studentId, assignId, newNotes);
    } else {
        // 편집 모드
        displayValue.style.display = 'none';
        editInput.style.display = 'block';
        editInput.focus();
        editBtn.innerHTML = '<i class="fas fa-save"></i>';
    }
}

// 담당 이력 수정 저장
async function saveAssignmentEdit(studentId, assignId, notes) {
    try {
        const assignments = await API.getList('teacher_assignments', { limit: 1000 });
        const allAssignments = Array.isArray(assignments) ? assignments : assignments.data;
        const assignment = allAssignments.find(a => a.id === assignId);
        
        if (!assignment) {
            alert('담당 이력을 찾을 수 없습니다');
            return;
        }
        
        await API.update('teacher_assignments', assignId, {
            ...assignment,
            notes: notes
        });
        
        console.log(`[saveAssignmentEdit] 수정 완료: ${assignId}`);
        
        // 화면 새로고침
        showStudentDetail(studentId);
    } catch (error) {
        console.error('[saveAssignmentEdit] 수정 실패:', error);
        alert('수정에 실패했습니다');
    }
}

// 담당 이력 삭제
async function deleteTeacherAssignment(studentId, assignId) {
    if (!confirm('이 담당 이력을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await API.delete('teacher_assignments', assignId);
        console.log(`[deleteTeacherAssignment] 삭제 완료: ${assignId}`);
        
        // 화면 새로고침
        showStudentDetail(studentId);
    } catch (error) {
        console.error('[deleteTeacherAssignment] 삭제 실패:', error);
        alert('삭제에 실패했습니다');
    }
}

// 전역 노출
window.renderTeacherHistoryTab = renderTeacherHistoryTab;
window.handleTeacherChange = handleTeacherChange;
window.addTeacherAssignment = addTeacherAssignment;
window.toggleEditAssignment = toggleEditAssignment;
window.saveAssignmentEdit = saveAssignmentEdit;
window.deleteTeacherAssignment = deleteTeacherAssignment;
