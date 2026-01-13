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
                        <th>책 안내 날짜</th>
                        <th>선행개념</th>
                        <th>선행복습</th>
                        <th>현행심화</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 입력 행 (2행) -->
                    <tr class="input-row">
                        <td><input type="text" id="new-book-date-${student.id}" placeholder="2511" class="input-field"></td>
                        <td><input type="text" id="new-book-concept-${student.id}" placeholder="선행개념" class="input-field"></td>
                        <td><input type="text" id="new-book-review-${student.id}" placeholder="선행복습" class="input-field"></td>
                        <td><input type="text" id="new-book-advanced-${student.id}" placeholder="현행심화" class="input-field"></td>
                        <td><button class="btn-register" onclick="addBook('${student.id}')">등록</button></td>
                    </tr>
                    
                    <!-- 데이터 행 (3행부터, 최신순) -->
                    ${books.length === 0 ? '<tr><td colspan="5" class="empty-message">등록된 사용책 정보가 없습니다</td></tr>' : ''}
                    ${books.map(book => `
                        <tr>
                            <td>${book.date || '-'}</td>
                            <td>${book.concept || '-'}</td>
                            <td>${book.review || '-'}</td>
                            <td>${book.advanced || '-'}</td>
                            <td>
                                <button class="btn-edit" onclick="editBook('${student.id}', '${book.id}')"><i class="fas fa-pencil-alt"></i></button>
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
                        <th>상담 날짜</th>
                        <th>상담자</th>
                        <th>상담내용</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 입력 행 (2행) -->
                    <tr class="input-row">
                        <td><input type="text" id="new-consul-date-${student.id}" placeholder="2511" class="input-field"></td>
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
                        <tr>
                            <td>${consul.date || '-'}</td>
                            <td>${consul.person || '-'}</td>
                            <td>${consul.content || '-'}</td>
                            <td>
                                <button class="btn-edit" onclick="editConsultation('${student.id}', '${consul.id}')"><i class="fas fa-pencil-alt"></i></button>
                                <button class="btn-delete" onclick="deleteConsultation('${student.id}', '${consul.id}')"><i class="fas fa-times"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
