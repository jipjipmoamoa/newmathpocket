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
                        <th>시험명</th>
                        <th>점수</th>
                        <th>시험 범위</th>
                        <th>오답 내용</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 입력 행 (2행) -->
                    <tr class="input-row">
                        <td><input type="text" id="new-score-name-${student.id}" placeholder="11중" class="input-field"></td>
                        <td><input type="text" id="new-score-value-${student.id}" placeholder="점수" class="input-field"></td>
                        <td><input type="text" id="new-score-range-${student.id}" placeholder="중111" class="input-field"></td>
                        <td><input type="text" id="new-score-notes-${student.id}" placeholder="오답 내용" class="input-field"></td>
                        <td><button class="btn-register" onclick="addScore('${student.id}')">등록</button></td>
                    </tr>
                    
                    <!-- 데이터 행 (3행부터, 최신순) -->
                    ${scores.length === 0 ? '<tr><td colspan="5" class="empty-message">등록된 시험점수가 없습니다</td></tr>' : ''}
                    ${scores.map(score => `
                        <tr>
                            <td>${score.name || '-'}</td>
                            <td>${formatScoreWithColor(score.value || '0')}</td>
                            <td>${score.range || '-'}</td>
                            <td>${score.notes || '-'}</td>
                            <td>
                                <button class="btn-edit" onclick="editScore('${student.id}', '${score.id}')"><i class="fas fa-pencil-alt"></i></button>
                                <button class="btn-delete" onclick="deleteScore('${student.id}', '${score.id}')"><i class="fas fa-times"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
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
                        <td><input type="text" id="new-book-concept-${student.id}" placeholder="선행개념" class="input-field"></td>
                        <td><input type="text" id="new-book-review-${student.id}" placeholder="선행복습" class="input-field"></td>
                        <td><input type="text" id="new-book-advanced-${student.id}" placeholder="현행심화" class="input-field"></td>
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
                        <td><input type="text" id="new-consul-content-${student.id}" placeholder="상담 내용" class="input-field"></td>
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
                                <span class="display-value">${consul.content || '-'}</span>
                                <input type="text" class="edit-input" value="${consul.content || ''}" style="display:none;">
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
