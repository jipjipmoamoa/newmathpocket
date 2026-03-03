// ===== 사용책 탭 엔터 키 처리 =====

function handleBookEnter(event, studentId, field) {
    if (event.key === 'Enter') {
        event.preventDefault();
        
        const fieldOrder = ['date', 'concept', 'review', 'advanced'];
        const currentIndex = fieldOrder.indexOf(field);
        
        // 마지막 필드(advanced)에서 엔터를 누르면 저장
        if (currentIndex === fieldOrder.length - 1) {
            addBook(studentId);
        } else {
            // 다음 필드로 이동
            const nextField = fieldOrder[currentIndex + 1];
            const nextInput = document.getElementById(`new-book-${nextField}-${studentId}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    }
}
