// ===== 시험점수 탭 렌더링 =====

function renderScoresTab(student) {
    let scores = [];
    
    // JSON 파싱
    try {
        if (student.scores && typeof student.scores === 'string' && student.scores.trim() !== '') {
            scores = JSON.parse(student.scores);
        } else if (Array.isArray(student.scores)) {
            scores = student.scores;
        }
    } catch (e) {
        console.error('시험점수 파싱 오류:', e);
        scores = [];
    }
    
    // 최신 날짜순 정렬
    scores.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
    });
    
    return `
        <div class="tab-panel">
            <table class="data-table scores-table">
                <thead>
                    <tr>
                        <th style="width: 80px; cursor: pointer; user-select: none;" 
                            onclick="toggleScoreFilter('${student.id}')" 
                            id="score-category-header-${student.id}">구분</th>
                        <th style="width: 150px;">종류</th>
                        <th style="width: 150px;">범위</th>
                        <th style="width: 80px;">점수</th>
                        <th>오답유형</th>
                        <th style="width: 120px;">관리</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 입력 행 (2행) -->
                    <tr class="input-row">
                        <td><input type="text" id="new-score-category-${student.id}" placeholder="교 또는 원" class="input-field" 
                            onblur="this.value = formatScoreCategory(this.value)" 
                            onkeydown="handleScoreEnter(event, 'new', '${student.id}', 'category')"></td>
                        <td><input type="text" id="new-score-type-${student.id}" placeholder="단원 또는 11중" class="input-field" 
                            onblur="this.value = formatScoreType(this.value)"
                            onkeydown="handleScoreEnter(event, 'new', '${student.id}', 'type')"></td>
                        <td><input type="text" id="new-score-range-${student.id}" placeholder="중111 또는 초421" class="input-field" 
                            onblur="this.value = formatScoreRange(this.value)"
                            onkeydown="handleScoreEnter(event, 'new', '${student.id}', 'range')"></td>
                        <td><input type="text" id="new-score-value-${student.id}" placeholder="점수" class="input-field"
                            onkeydown="handleScoreEnter(event, 'new', '${student.id}', 'value')"></td>
                        <td><input type="text" id="new-score-notes-${student.id}" placeholder="오답유형" class="input-field"
                            onkeydown="handleScoreEnter(event, 'new', '${student.id}', 'notes')"></td>
                        <td style="padding: 0.3rem; text-align: center;"></td>
                    </tr>
                    
                    <!-- 데이터 행 (3행부터, 최신순) -->
                    ${scores.length === 0 ? '<tr><td colspan="6" class="empty-message">등록된 시험점수가 없습니다</td></tr>' : ''}
                    ${scores.map(score => `
                        <tr id="score-row-${score.id}" class="score-data-row" data-category="${score.category || ''}" data-score-id="${score.id}">
                            <td>
                                <span class="score-display" id="display-category-${score.id}">${score.category || ''}</span>
                                <input type="text" class="input-field score-edit-field" 
                                    id="edit-category-${score.id}"
                                    data-score-id="${score.id}" 
                                    data-student-id="${student.id}" 
                                    data-field="category" 
                                    value="${score.category || ''}" 
                                    style="display: none;"
                                    onblur="this.value = formatScoreCategory(this.value); updateScoreField('${student.id}', '${score.id}', 'category', this.value)"
                                    onkeydown="handleScoreEnter(event, 'edit', '${student.id}', 'category', '${score.id}')">
                            </td>
                            <td>
                                <span class="score-display" id="display-type-${score.id}">${score.type || ''}</span>
                                <input type="text" class="input-field score-edit-field" 
                                    id="edit-type-${score.id}"
                                    data-score-id="${score.id}" 
                                    data-student-id="${student.id}" 
                                    data-field="type" 
                                    value="${score.type || ''}" 
                                    style="display: none;"
                                    onblur="this.value = formatScoreType(this.value); updateScoreField('${student.id}', '${score.id}', 'type', this.value)"
                                    onkeydown="handleScoreEnter(event, 'edit', '${student.id}', 'type', '${score.id}')">
                            </td>
                            <td>
                                <span class="score-display" id="display-range-${score.id}">${score.range || ''}</span>
                                <input type="text" class="input-field score-edit-field" 
                                    id="edit-range-${score.id}"
                                    data-score-id="${score.id}" 
                                    data-student-id="${student.id}" 
                                    data-field="range" 
                                    value="${score.range || ''}" 
                                    style="display: none;"
                                    onblur="this.value = formatScoreRange(this.value); updateScoreField('${student.id}', '${score.id}', 'range', this.value)"
                                    onkeydown="handleScoreEnter(event, 'edit', '${student.id}', 'range', '${score.id}')">
                            </td>
                            <td>
                                <span class="score-display score-value" 
                                    id="display-value-${score.id}" 
                                    style="color: ${getScoreColor(score.value)}; cursor: ${parseInt(score.value) < 70 ? 'pointer' : 'default'};"
                                    ondblclick="${parseInt(score.value) < 70 ? `toggleRetestRow('${student.id}', '${score.id}')` : ''}">${score.value || ''}</span>
                                <input type="text" class="input-field score-edit-field" 
                                    id="edit-value-${score.id}"
                                    data-score-id="${score.id}" 
                                    data-student-id="${student.id}" 
                                    data-field="value" 
                                    value="${score.value || ''}" 
                                    style="display: none; color: ${getScoreColor(score.value)};"
                                    onblur="updateScoreField('${student.id}', '${score.id}', 'value', this.value)"
                                    onkeydown="handleScoreEnter(event, 'edit', '${student.id}', 'value', '${score.id}')">
                            </td>
                            <td>
                                <span class="score-display" id="display-notes-${score.id}">${score.notes || ''}</span>
                                <input type="text" class="input-field score-edit-field" 
                                    id="edit-notes-${score.id}"
                                    data-score-id="${score.id}" 
                                    data-student-id="${student.id}" 
                                    data-field="notes" 
                                    value="${score.notes || ''}" 
                                    style="display: none;"
                                    onblur="updateScoreField('${student.id}', '${score.id}', 'notes', this.value)"
                                    onkeydown="handleScoreEnter(event, 'edit', '${student.id}', 'notes', '${score.id}')">
                            </td>
                            <td style="padding: 0.3rem; text-align: center;">
                                <button onclick="enterScoreEditMode('${score.id}')" 
                                    title="수정"
                                    style="background: none; border: none; color: #FF6B35; font-size: 1.2rem; cursor: pointer; padding: 0 0.3rem; line-height: 1;">✏️</button>
                                <button onclick="deleteScore('${student.id}', '${score.id}')" 
                                    title="삭제"
                                    style="background: none; border: none; color: #FF6B35; font-size: 1.2rem; cursor: pointer; padding: 0 0.3rem; line-height: 1;">🗑️</button>
                            </td>
                        </tr>
                        ${parseInt(score.value) < 70 ? `
                        <tr id="retest-row-${score.id}" class="retest-row" style="display: none;" data-parent-score="${score.id}">
                            <td colspan="2" style="text-align: right; padding: 0.5rem; background: #FFF9E6; font-weight: 600;">재시험</td>
                            <td style="background: #FFF9E6;"></td>
                            <td style="background: #FFF9E6;">
                                <input type="text" class="input-field" 
                                    id="retest-value-${score.id}"
                                    placeholder="점수"
                                    value="${score.retest_value || ''}"
                                    style="background: white;"
                                    onblur="updateRetestField('${student.id}', '${score.id}', 'retest_value', this.value)">
                            </td>
                            <td style="background: #FFF9E6;">
                                <input type="text" class="input-field" 
                                    id="retest-notes-${score.id}"
                                    placeholder="오답유형"
                                    value="${score.retest_notes || ''}"
                                    style="background: white;"
                                    onblur="updateRetestField('${student.id}', '${score.id}', 'retest_notes', this.value)">
                            </td>
                            <td style="background: #FFF9E6;"></td>
                        </tr>
                        ` : ''}
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 시험점수 입력값 변환 함수들 =====

// 구분 변환: "교" → "학교", "원" → "학원"
window.formatScoreCategory = function(value) {
    if (!value) return '';
    value = value.trim();
    if (value === '교') return '학교';
    if (value === '원') return '학원';
    return value;
}

// 종류 변환: "단원" → "단원평가", "11중" → "1-1 중간고사", "22기" → "2-2 기말고사"
window.formatScoreType = function(value) {
    if (!value) return '';
    value = value.trim();
    
    if (value === '단원') return '단원평가';
    
    // 패턴: 숫자숫자 + 중/기 (예: "11중", "22기")
    const match = value.match(/^(\d)(\d)(중|기)$/);
    if (match) {
        const grade = match[1];
        const semester = match[2];
        const type = match[3] === '중' ? '중간고사' : '기말고사';
        return `${grade}-${semester} ${type}`;
    }
    
    return value;
}

// 범위 변환: "중111" → "중등 1-1-1", "초421" → "초등 4-2-1"
window.formatScoreRange = function(value) {
    if (!value) return '';
    value = value.trim();
    
    // 패턴: 중/초 + 숫자 3개 (예: "중111", "초421")
    const match = value.match(/^(중|초)(\d)(\d)(\d)$/);
    if (match) {
        const level = match[1] === '중' ? '중등' : '초등';
        const grade = match[2];
        const semester = match[3];
        const unit = match[4];
        return `${level} ${grade}-${semester}-${unit}`;
    }
    
    return value;
}

// 점수 색상 반환: 100점=파랑, 70점 미만=빨강
window.getScoreColor = function(value) {
    const numScore = parseInt(value);
    if (isNaN(numScore)) return '#000';
    if (numScore === 100) return '#2196F3'; // 파란색
    if (numScore < 70) return '#f44336'; // 빨간색
    return '#000'; // 기본 검은색
}

// 엔터키 핸들러: 다음 필드로 이동 또는 저장
window.handleScoreEnter = async function(event, mode, studentId, currentField, scoreId = null) {
    if (event.key === 'Enter') {
        event.preventDefault();
        
        const fieldOrder = ['category', 'type', 'range', 'value', 'notes'];
        const currentIndex = fieldOrder.indexOf(currentField);
        
        if (mode === 'new') {
            // 2행 (입력 행)
            if (currentField === 'notes') {
                // 마지막 필드에서 엔터: 저장 후 3행으로 이동
                await addScore(studentId);
                
                // 저장 후 3행의 첫 번째 필드로 포커스 이동
                setTimeout(() => {
                    const tbody = document.querySelector('.scores-table tbody');
                    if (tbody) {
                        const thirdRow = tbody.rows[2]; // 0=헤더, 1=빈칸?, 2=입력행, 3=첫 데이터
                        if (thirdRow && thirdRow.id.startsWith('score-row-')) {
                            const firstInput = thirdRow.querySelector('input');
                            if (firstInput) {
                                firstInput.focus();
                            }
                        } else {
                            // 데이터가 없으면 입력행의 첫 칸으로
                            const categoryInput = document.getElementById(`new-score-category-${studentId}`);
                            if (categoryInput) categoryInput.focus();
                        }
                    }
                }, 300); // 화면 갱신 대기
            } else {
                // 다음 필드로 이동
                const nextField = fieldOrder[currentIndex + 1];
                const nextInput = document.getElementById(`new-score-${nextField}-${studentId}`);
                if (nextInput) nextInput.focus();
            }
        } else if (mode === 'edit') {
            // 3행 이후 (수정 행)
            if (currentField === 'notes') {
                // 마지막 필드에서 엔터: blur 이벤트 발생 (자동 저장)
                event.target.blur();
                
                // 다음 행의 첫 번째 필드로 이동
                const currentRow = document.getElementById(`score-row-${scoreId}`);
                if (currentRow) {
                    const nextRow = currentRow.nextElementSibling;
                    if (nextRow && nextRow.id.startsWith('score-row-')) {
                        const firstInput = nextRow.querySelector('input');
                        if (firstInput) {
                            setTimeout(() => firstInput.focus(), 50);
                        }
                    } else {
                        // 마지막 행이면 2행 (입력 행)으로 이동
                        const newCategoryInput = document.getElementById(`new-score-category-${studentId}`);
                        if (newCategoryInput) {
                            setTimeout(() => newCategoryInput.focus(), 50);
                        }
                    }
                }
            } else {
                // 같은 행의 다음 필드로 이동
                const nextField = fieldOrder[currentIndex + 1];
                const nextInput = event.target.closest('tr').querySelector(`input[data-field="${nextField}"]`);
                if (nextInput) nextInput.focus();
            }
        }
    }
}

// 실시간 필드 업데이트
window.updateScoreField = async function(studentId, scoreId, field, value) {
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
        
        // 해당 점수 찾아서 업데이트
        const scoreIndex = scores.findIndex(s => s.id === scoreId);
        if (scoreIndex !== -1) {
            scores[scoreIndex][field] = value;
            
            // DB 업데이트
            await API.update('students', studentId, {
                scores: JSON.stringify(scores)
            });
            
            // allStudents 배열 업데이트
            const studentIndex = allStudents.findIndex(s => s.id === studentId);
            if (studentIndex !== -1) {
                allStudents[studentIndex].scores = JSON.stringify(scores);
            }
            
            console.log(`[updateScoreField] ${field} 업데이트 완료:`, value);
            
            // 점수 필드 업데이트 시 색상 변경
            if (field === 'value') {
                const input = event.target || document.querySelector(`input[data-score-id="${scoreId}"][data-field="value"]`);
                if (input) {
                    input.style.color = getScoreColor(value);
                }
            }
        }
    } catch (error) {
        console.error('필드 업데이트 오류:', error);
    }
}

// ===== 사용책 탭 렌더링 =====

function renderBooksTab(student) {
    let books = [];
    
    // JSON 파싱
    try {
        if (student.books && typeof student.books === 'string' && student.books.trim() !== '') {
            books = JSON.parse(student.books);
        } else if (Array.isArray(student.books)) {
            books = student.books;
        }
    } catch (e) {
        console.error('사용책 파싱 오류:', e);
        books = [];
    }
    
    // 최신 날짜순 정렬
    books.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
    });
    
    return `
        <div class="tab-panel">
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.9rem;">
                <i class="fas fa-info-circle" style="color: #856404; margin-right: 0.5rem;"></i>
                <strong>입력 방법:</strong> 
                <span style="color: #856404;">
                    선행개념, 선행복습, 현행심화 칸에 <strong>0</strong>을 입력하면 해당 항목을 비워둡니다. 
                    비워둔 항목은 회원정보나 전체회원관리에서 이전 행의 기록을 표시하지 않습니다.
                </span>
            </div>
            <table class="data-table books-table">
                <thead>
                    <tr>
                        <th>안내 날짜</th>
                        <th>선행개념</th>
                        <th>선행복습</th>
                        <th>현행심화</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 입력 행 (2행) -->
                    <tr class="input-row">
                        <td><input type="text" id="new-book-date-${student.id}" placeholder="2511" class="input-field" onblur="this.value = formatDateInput(this.value)"></td>
                        <td><input type="text" id="new-book-concept-${student.id}" placeholder="선행개념 (0 입력 시 비워둠)" class="input-field"></td>
                        <td><input type="text" id="new-book-review-${student.id}" placeholder="선행복습 (0 입력 시 비워둠)" class="input-field"></td>
                        <td><input type="text" id="new-book-advanced-${student.id}" placeholder="현행심화 (0 입력 시 비워둠)" class="input-field"></td>
                        <td><button class="btn-register" onclick="addBook('${student.id}')">등록</button></td>
                    </tr>
                    
                    <!-- 데이터 행 (3행부터, 최신순) -->
                    ${books.length === 0 ? '<tr><td colspan="5" class="empty-message">등록된 사용책 정보가 없습니다</td></tr>' : ''}
                    ${books.map(book => `
                        <tr id="book-row-${book.id}" class="data-row">
                            <td class="book-date-cell" data-book-id="${book.id}">
                                <span class="display-value">${book.date ? formatDateInput(book.date) : '-'}</span>
                                <input type="text" class="edit-input" value="${book.date || ''}" style="display:none;" placeholder="2511" onblur="this.value = formatDateInput(this.value)">
                            </td>
                            <td class="book-concept-cell" data-book-id="${book.id}">
                                <span class="display-value">${book.concept || '-'}</span>
                                <input type="text" class="edit-input" value="${book.concept || ''}" style="display:none;" placeholder="선행개념">
                            </td>
                            <td class="book-review-cell" data-book-id="${book.id}">
                                <span class="display-value">${book.review || '-'}</span>
                                <input type="text" class="edit-input" value="${book.review || ''}" style="display:none;" placeholder="선행복습">
                            </td>
                            <td class="book-advanced-cell" data-book-id="${book.id}">
                                <span class="display-value">${book.advanced || '-'}</span>
                                <input type="text" class="edit-input" value="${book.advanced || ''}" style="display:none;" placeholder="현행심화">
                            </td>
                            <td class="action-buttons">
                                <button class="btn-edit" onclick="toggleEditBook('${student.id}', '${book.id}')"><i class="fas fa-pencil-alt"></i></button>
                                <button class="btn-delete" onclick="deleteBook('${student.id}', '${book.id}')"><i class="fas fa-times"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 상담내용 탭 렌더링 =====

function renderConsultationTab(student) {
    let consultations = [];
    
    // JSON 파싱
    try {
        if (student.consultations && typeof student.consultations === 'string' && student.consultations.trim() !== '') {
            consultations = JSON.parse(student.consultations);
        } else if (Array.isArray(student.consultations)) {
            consultations = student.consultations;
        }
    } catch (e) {
        console.error('상담내용 파싱 오류:', e);
        consultations = [];
    }
    
    // 최신 날짜순 정렬
    consultations.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
    });
    
    return `
        <div class="tab-panel">
            <table class="data-table consultation-table">
                <thead>
                    <tr>
                        <th style="width: 120px;">상담 날짜</th>
                        <th style="width: 100px;">상담자</th>
                        <th>상담내용</th>
                        <th style="width: 100px;">관리</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 입력 행 (2행) -->
                    <tr class="input-row">
                        <td><input type="text" id="new-consul-date-${student.id}" placeholder="2511" class="input-field" onblur="this.value = formatDateInput(this.value)"></td>
                        <td>
                            <select id="new-consul-person-${student.id}" class="input-field">
                                <option value="모">모</option>
                                <option value="부">부</option>
                                <option value="가족">가족</option>
                            </select>
                        </td>
                        <td><textarea id="new-consul-content-${student.id}" placeholder="상담 내용 (엔터로 행 구분 가능)" class="input-field" rows="3" style="resize: vertical;"></textarea></td>
                        <td><button class="btn-register" onclick="addConsultation('${student.id}')">등록</button></td>
                    </tr>
                    
                    <!-- 데이터 행 (3행부터, 최신순) -->
                    ${consultations.length === 0 ? '<tr><td colspan="4" class="empty-message">등록된 상담 내용이 없습니다</td></tr>' : ''}
                    ${consultations.map(consul => `
                        <tr id="consul-row-${consul.id}" class="data-row">
                            <td class="consul-date-cell" data-consul-id="${consul.id}">
                                <span class="display-value">${consul.date || '-'}</span>
                                <input type="text" class="edit-input" value="${consul.date || ''}" style="display:none;" onblur="this.value = formatDateInput(this.value)">
                            </td>
                            <td class="consul-person-cell" data-consul-id="${consul.id}">
                                <span class="display-value">${consul.person || '-'}</span>
                                <select class="edit-input" style="display:none;">
                                    <option value="모" ${consul.person === '모' ? 'selected' : ''}>모</option>
                                    <option value="부" ${consul.person === '부' ? 'selected' : ''}>부</option>
                                    <option value="가족" ${consul.person === '가족' ? 'selected' : ''}>가족</option>
                                </select>
                            </td>
                            <td class="consul-content-cell" data-consul-id="${consul.id}">
                                <span class="display-value" style="white-space: pre-wrap;">${consul.content || '-'}</span>
                                <textarea class="edit-input" style="display:none; resize: vertical;" rows="3">${consul.content || ''}</textarea>
                            </td>
                            <td class="action-buttons">
                                <button class="btn-edit" onclick="toggleEditConsultation('${student.id}', '${consul.id}')"><i class="fas fa-pencil-alt"></i></button>
                                <button class="btn-delete" onclick="deleteConsultation('${student.id}', '${consul.id}')"><i class="fas fa-times"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
