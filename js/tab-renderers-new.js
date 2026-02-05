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
                        <th style="width: 80px;">구분</th>
                        <th style="width: 150px;">종류</th>
                        <th style="width: 150px;">범위</th>
                        <th style="width: 80px;">점수</th>
                        <th>오답유형</th>
                        <th style="width: 90px;">관리</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 입력 행 (2행) -->
                    <tr class="input-row">
                        <td><input type="text" id="new-score-category-${student.id}" placeholder="교 또는 원" class="input-field" onblur="this.value = formatScoreCategory(this.value)"></td>
                        <td><input type="text" id="new-score-type-${student.id}" placeholder="단원 또는 11중" class="input-field" onblur="this.value = formatScoreType(this.value)"></td>
                        <td><input type="text" id="new-score-range-${student.id}" placeholder="중111 또는 초421" class="input-field" onblur="this.value = formatScoreRange(this.value)"></td>
                        <td><input type="text" id="new-score-value-${student.id}" placeholder="점수" class="input-field"></td>
                        <td><input type="text" id="new-score-notes-${student.id}" placeholder="오답유형" class="input-field"></td>
                        <td style="padding: 0.3rem;"><button class="btn-register" onclick="addScore('${student.id}')" style="font-size: 1.2rem; padding: 0.3rem 0.5rem;">✏️</button></td>
                    </tr>
                    
                    <!-- 데이터 행 (3행부터, 최신순) -->
                    ${scores.length === 0 ? '<tr><td colspan="6" class="empty-message">등록된 시험점수가 없습니다</td></tr>' : ''}
                    ${scores.map(score => `
                        <tr>
                            <td>${score.category || '-'}</td>
                            <td>${score.type || '-'}</td>
                            <td>${score.range || '-'}</td>
                            <td>${formatScoreWithColor(score.value || '0')}</td>
                            <td>${score.notes || '-'}</td>
                            <td style="padding: 0.3rem;">
                                <button class="btn-edit" onclick="editScore('${student.id}', '${score.id}')" style="font-size: 1.1rem; padding: 0.2rem 0.4rem;">✏️</button>
                                <button class="btn-delete" onclick="deleteScore('${student.id}', '${score.id}')" style="font-size: 1.1rem; padding: 0.2rem 0.4rem;">❌</button>
                            </td>
                        </tr>
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
