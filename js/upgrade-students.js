// 학생 승급 기능

// 모든 학생 승급 (재원, 휴원, 퇴원 모두)
async function upgradeAllStudents() {
    // 확인 메시지
    const confirmed = confirm(
        '모든 학생(재원/휴원/퇴원)의 학년을 한 단계 올립니다.\n\n' +
        '예시:\n' +
        '- 초5 → 초6\n' +
        '- 초6 → 중1\n' +
        '- 중3 → 고1\n' +
        '- 고3 → 고3 (유지)\n\n' +
        '계속하시겠습니까?'
    );
    
    if (!confirmed) return;
    
    try {
        // 모든 학생 로드
        const result = await API.getList('students', { limit: 1000 });
        const allStudents = result.data || [];
        
        console.log(`총 ${allStudents.length}명의 학생을 승급 처리합니다.`);
        
        let successCount = 0;
        let failCount = 0;
        let unchangedCount = 0;
        
        // 각 학생에 대해 승급 처리
        for (const student of allStudents) {
            try {
                const currentGrade = student.grade;
                const schoolType = student.school_type;
                
                // 승급 로직
                const upgraded = upgradeGrade(schoolType, currentGrade);
                
                if (upgraded.grade === currentGrade && upgraded.schoolType === schoolType) {
                    // 변경사항 없음 (고3 등)
                    unchangedCount++;
                    console.log(`${student.name} (${schoolType} ${currentGrade}) - 변경 없음`);
                    continue;
                }
                
                // 시스템 필드 제외하고 복사
                const { gs_project_id, gs_table_name, created_at, updated_at, deleted, ...studentData } = student;
                
                // 업데이트할 데이터
                const updatedStudent = {
                    ...studentData,
                    school_type: upgraded.schoolType,
                    grade: upgraded.grade
                };
                
                // 업데이트 실행
                await API.update('students', student.id, updatedStudent);
                
                successCount++;
                console.log(`✅ ${student.name}: ${schoolType} ${currentGrade} → ${upgraded.schoolType} ${upgraded.grade}`);
                
            } catch (error) {
                failCount++;
                console.error(`❌ ${student.name} 승급 실패:`, error);
            }
        }
        
        // 결과 메시지
        alert(
            `승급 처리 완료!\n\n` +
            `✅ 성공: ${successCount}명\n` +
            `⏸️ 변경 없음: ${unchangedCount}명\n` +
            `❌ 실패: ${failCount}명`
        );
        
        // 학생 목록 새로고침
        await loadStudents();
        
    } catch (error) {
        console.error('승급 처리 실패:', error);
        alert('승급 처리 중 오류가 발생했습니다: ' + error.message);
    }
}

// 학년 승급 로직
function upgradeGrade(schoolType, currentGrade) {
    // 학년을 숫자로 변환
    const gradeNum = parseInt(currentGrade);
    
    if (schoolType === '초') {
        // 초등학생
        if (gradeNum < 6) {
            // 초1~5 → 한 학년 올림
            return { schoolType: '초', grade: String(gradeNum + 1) };
        } else if (gradeNum === 6) {
            // 초6 → 중1
            return { schoolType: '중', grade: '1' };
        }
    } else if (schoolType === '중') {
        // 중학생
        if (gradeNum < 3) {
            // 중1~2 → 한 학년 올림
            return { schoolType: '중', grade: String(gradeNum + 1) };
        } else if (gradeNum === 3) {
            // 중3 → 고1
            return { schoolType: '고', grade: '1' };
        }
    } else if (schoolType === '고') {
        // 고등학생
        if (gradeNum < 3) {
            // 고1~2 → 한 학년 올림
            return { schoolType: '고', grade: String(gradeNum + 1) };
        } else {
            // 고3 → 변경 없음
            return { schoolType: '고', grade: '3' };
        }
    }
    
    // 기본값: 변경 없음
    return { schoolType, grade: currentGrade };
}
