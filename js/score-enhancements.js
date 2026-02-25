// 시험점수 탭 추가 기능

// 전역 변수
let currentScoreFilter = 'all'; // 'all', 'school', 'academy'

// 1. 구분 필터 토글 (구분 → 학교 → 학원 → 구분)
window.toggleScoreFilter = function(studentId) {
    const header = document.getElementById(`score-category-header-${studentId}`);
    if (!header) return;
    
    // 필터 상태 변경
    if (currentScoreFilter === 'all') {
        currentScoreFilter = 'school';
        header.textContent = '학교';
        header.style.backgroundColor = '#FFF9C4';
    } else if (currentScoreFilter === 'school') {
        currentScoreFilter = 'academy';
        header.textContent = '학원';
        header.style.backgroundColor = '#FFF9C4';
    } else {
        currentScoreFilter = 'all';
        header.textContent = '구분';
        header.style.backgroundColor = '';
    }
    
    // 행 필터링 적용
    applyScoreFilter();
};

// 필터 적용
function applyScoreFilter() {
    const rows = document.querySelectorAll('.score-data-row');
    
    rows.forEach(row => {
        const category = row.getAttribute('data-category') || '';
        const scoreId = row.getAttribute('data-score-id');
        const retestRow = document.getElementById(`retest-row-${scoreId}`);
        
        if (currentScoreFilter === 'all') {
            // 모든 행 표시, 배경색 제거
            row.style.display = '';
            row.style.backgroundColor = '';
            if (retestRow) {
                retestRow.style.display = retestRow.classList.contains('retest-visible') ? '' : 'none';
            }
        } else if (currentScoreFilter === 'school') {
            // 학교만 표시, 연한 노란색
            if (category === '학교') {
                row.style.display = '';
                row.style.backgroundColor = '#FFFDE7';
                if (retestRow) {
                    retestRow.style.display = retestRow.classList.contains('retest-visible') ? '' : 'none';
                }
            } else {
                row.style.display = 'none';
                if (retestRow) {
                    retestRow.style.display = 'none';
                }
            }
        } else if (currentScoreFilter === 'academy') {
            // 학원만 표시, 연한 노란색
            if (category === '학원') {
                row.style.display = '';
                row.style.backgroundColor = '#FFFDE7';
                if (retestRow) {
                    retestRow.style.display = retestRow.classList.contains('retest-visible') ? '' : 'none';
                }
            } else {
                row.style.display = 'none';
                if (retestRow) {
                    retestRow.style.display = 'none';
                }
            }
        }
    });
}

// 필터 초기화 (탭 전환 시)
window.resetScoreFilter = function() {
    currentScoreFilter = 'all';
    
    // 헤더 초기화
    const headers = document.querySelectorAll('[id^="score-category-header-"]');
    headers.forEach(header => {
        header.textContent = '구분';
        header.style.backgroundColor = '';
    });
    
    // 행 초기화
    const rows = document.querySelectorAll('.score-data-row');
    rows.forEach(row => {
        row.style.display = '';
        row.style.backgroundColor = '';
    });
    
    // 재시험 행 숨기기
    const retestRows = document.querySelectorAll('.retest-row');
    retestRows.forEach(row => {
        row.style.display = 'none';
        row.classList.remove('retest-visible');
    });
};

// 2. 수정 모드 진입
window.enterScoreEditMode = function(scoreId) {
    const fields = ['category', 'type', 'range', 'value', 'notes'];
    
    fields.forEach(field => {
        const display = document.getElementById(`display-${field}-${scoreId}`);
        const input = document.getElementById(`edit-${field}-${scoreId}`);
        
        if (display && input) {
            display.style.display = 'none';
            input.style.display = 'block';
            
            // Enter 키 이벤트 추가 (전체 행 저장)
            input.onkeydown = function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    saveScoreRow(scoreId);
                }
            };
        }
    });
    
    // 첫 번째 필드에 포커스
    const firstInput = document.getElementById(`edit-category-${scoreId}`);
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
    }
};

// 수정 행 전체 저장
async function saveScoreRow(scoreId) {
    const fields = ['category', 'type', 'range', 'value', 'notes'];
    const row = document.getElementById(`score-row-${scoreId}`);
    if (!row) return;
    
    const studentId = row.closest('.tab-panel').querySelector('[id^="new-score-category-"]')?.id.split('-').pop();
    if (!studentId) return;
    
    // 모든 필드 저장
    for (const field of fields) {
        const input = document.getElementById(`edit-${field}-${scoreId}`);
        if (input && input.value) {
            await updateScoreField(studentId, scoreId, field, input.value);
        }
    }
    
    // 수정 모드 종료
    exitScoreEditMode(scoreId);
    
    console.log('✅ 행 전체 저장 완료');
}

// 수정 모드 종료
window.exitScoreEditMode = function(scoreId) {
    const fields = ['category', 'type', 'range', 'value', 'notes'];
    
    fields.forEach(field => {
        const display = document.getElementById(`display-${field}-${scoreId}`);
        const input = document.getElementById(`edit-${field}-${scoreId}`);
        
        if (display && input) {
            display.style.display = 'block';
            input.style.display = 'none';
            // 표시값 업데이트
            display.textContent = input.value;
            // 점수 색상 업데이트
            if (field === 'value') {
                display.style.color = getScoreColor(input.value);
            }
        }
    });
};

// 3. 재시험 행 토글 (70점 미만 더블클릭)
window.toggleRetestRow = function(studentId, scoreId) {
    const retestRow = document.getElementById(`retest-row-${scoreId}`);
    if (!retestRow) return;
    
    if (retestRow.style.display === 'none') {
        retestRow.style.display = '';
        retestRow.classList.add('retest-visible');
        
        // 재시험 점수 입력칸에 포커스
        const retestValueInput = document.getElementById(`retest-value-${scoreId}`);
        if (retestValueInput) {
            setTimeout(() => retestValueInput.focus(), 50);
        }
    } else {
        retestRow.style.display = 'none';
        retestRow.classList.remove('retest-visible');
    }
};

// 4. 재시험 필드 업데이트
window.updateRetestField = async function(studentId, scoreId, field, value) {
    try {
        // 학생 데이터 가져오기
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // 기존 scores 파싱
        let scores = [];
        try {
            if (student.scores && typeof student.scores === 'string' && student.scores.trim() !== '') {
                scores = JSON.parse(student.scores);
            } else if (Array.isArray(student.scores)) {
                scores = student.scores;
            }
        } catch (e) {
            scores = [];
        }
        
        // 해당 점수 찾기
        const score = scores.find(s => s.id === scoreId);
        if (!score) return;
        
        // 필드 업데이트
        score[field] = value;
        
        console.log(`[updateRetestField] ${field} 업데이트:`, value);
        
        // DB 저장
        await API.update('students', studentId, {
            scores: JSON.stringify(scores)
        });
        
        // allStudents 업데이트
        const studentIndex = allStudents.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
            allStudents[studentIndex].scores = JSON.stringify(scores);
        }
        
        console.log('✅ 재시험 정보 저장 완료');
        
    } catch (error) {
        console.error('❌ 재시험 정보 저장 실패:', error);
    }
};

// 5. 재시험 Enter 키 핸들러
window.handleRetestEnter = async function(event, studentId, scoreId, currentField) {
    if (event.key === 'Enter') {
        event.preventDefault();
        
        if (currentField === 'value') {
            // 점수 입력 후 Enter → 값 저장하고 오답유형으로 이동
            const valueInput = document.getElementById(`retest-value-${scoreId}`);
            if (valueInput && valueInput.value) {
                await updateRetestField(studentId, scoreId, 'retest_value', valueInput.value);
                console.log('✅ 재시험 점수 저장:', valueInput.value);
            }
            
            // 오답유형으로 포커스 이동
            const notesInput = document.getElementById(`retest-notes-${scoreId}`);
            if (notesInput) {
                setTimeout(() => notesInput.focus(), 50);
            }
        } else if (currentField === 'notes') {
            // 오답유형 입력 후 Enter → 값 저장하고 재시험 행 닫기
            const notesInput = document.getElementById(`retest-notes-${scoreId}`);
            if (notesInput && notesInput.value) {
                await updateRetestField(studentId, scoreId, 'retest_notes', notesInput.value);
                console.log('✅ 재시험 오답유형 저장:', notesInput.value);
            }
            
            // 재시험 행 닫기
            const retestRow = document.getElementById(`retest-row-${scoreId}`);
            if (retestRow) {
                retestRow.style.display = 'none';
                retestRow.classList.remove('retest-visible');
            }
            
            console.log('✅ 재시험 정보 저장 및 행 닫기 완료');
        }
    }
};

// 탭 전환 감지 (기존 switchStudentTab 함수 확장)
const originalSwitchStudentTab = window.switchStudentTab;
if (originalSwitchStudentTab) {
    window.switchStudentTab = async function(tab, studentId) {
        // 필터 초기화
        resetScoreFilter();
        
        // 원래 함수 호출
        await originalSwitchStudentTab(tab, studentId);
    };
}

// 페이지 전환 감지
const originalShowPage = window.showPage;
if (originalShowPage) {
    window.showPage = function(pageName) {
        // 필터 초기화
        resetScoreFilter();
        
        // 원래 함수 호출
        originalShowPage(pageName);
    };
}

// updateScoreField 확장 (수정 후 표시 모드로 전환)
const originalUpdateScoreField = window.updateScoreField;
if (originalUpdateScoreField) {
    window.updateScoreField = async function(studentId, scoreId, field, value) {
        await originalUpdateScoreField(studentId, scoreId, field, value);
        
        // 표시 모드로 전환
        const display = document.getElementById(`display-${field}-${scoreId}`);
        const input = document.getElementById(`edit-${field}-${scoreId}`);
        
        if (display && input) {
            display.textContent = value;
            display.style.display = 'block';
            input.style.display = 'none';
            
            // 점수 색상 업데이트
            if (field === 'value') {
                display.style.color = getScoreColor(value);
                // 70점 미만이면 커서 포인터로 변경
                display.style.cursor = parseInt(value) < 70 ? 'pointer' : 'default';
            }
            
            // 구분 필드가 변경되면 필터 다시 적용
            if (field === 'category') {
                const row = document.getElementById(`score-row-${scoreId}`);
                if (row) {
                    row.setAttribute('data-category', value);
                    applyScoreFilter();
                }
            }
        }
    };
}

console.log('✅ 시험점수 탭 추가 기능 로드 완료');
