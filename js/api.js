// API 통신 모듈 - Supabase 연동
const API = {
    baseURL: 'https://umfwzifjkkflofcmpaks.supabase.co/rest/v1',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZnd6aWZqa2tmbG9mY21wYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTkxNTYsImV4cCI6MjA4MzY5NTE1Nn0.dacIMxqCSps_IlGpresZzHlgDWHrTGeDE9LeVb-HrjY',
    
    // GET - 목록 조회
    async getList(table, params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = queryString ? `${this.baseURL}/${table}?${queryString}` : `${this.baseURL}/${table}`;
            const response = await fetch(url, {
                headers: {
                    'apikey': this.apiKey,
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (!response.ok) throw new Error('데이터 조회 실패');
            return await response.json();
        } catch (error) {
            console.error('API getList error:', error);
            throw error;
        }
    },
    
    // GET - 단일 항목 조회
    async getOne(table, id) {
        try {
            const response = await fetch(`${this.baseURL}/${table}?id=eq.${id}`, {
                headers: {
                    'apikey': this.apiKey,
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (!response.ok) throw new Error('데이터 조회 실패');
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error('API getOne error:', error);
            throw error;
        }
    },
    
    // POST - 생성
    async create(table, data) {
        try {
            // id 필드 제거 (Supabase가 자동 생성)
            const { id, ...cleanData } = data;
            
            console.log('Creating data:', cleanData);
            
            const response = await fetch(`${this.baseURL}/${table}`, {
                method: 'POST',
                headers: {
                    'apikey': this.apiKey,
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(cleanData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`데이터 생성 실패: ${errorText}`);
            }
            
            const result = await response.json();
            return result[0];
        } catch (error) {
            console.error('API create error:', error);
            throw error;
        }
    },

    
    // PUT - 전체 업데이트
    async update(table, id, data) {
        try {
            const response = await fetch(`${this.baseURL}/${table}?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.apiKey,
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('데이터 수정 실패');
            const result = await response.json();
            return result[0];
        } catch (error) {
            console.error('API update error:', error);
            throw error;
        }
    },
    
    // PATCH - 부분 업데이트
    async patch(table, id, data) {
        try {
            const response = await fetch(`${this.baseURL}/${table}?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.apiKey,
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('데이터 수정 실패');
            const result = await response.json();
            return result[0];
        } catch (error) {
            console.error('API patch error:', error);
            throw error;
        }
    },
    
    // DELETE - 삭제
    async delete(table, id) {
        try {
            const response = await fetch(`${this.baseURL}/${table}?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': this.apiKey,
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (!response.ok) throw new Error('데이터 삭제 실패');
            return true;
        } catch (error) {
            console.error('API delete error:', error);
            throw error;
        }
    }
};

// 유틸리티 함수
const Utils = {
    // 날짜 포맷팅
    formatDate(timestamp, format = 'YYYY-MM-DD') {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        } else if (format === 'YYYY-MM-DD HH:mm') {
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        return `${year}-${month}-${day}`;
    },
    
    // 오늘 날짜
    today() {
        return this.formatDate(Date.now());
    },
    
    // 금액 포맷팅
    formatMoney(amount) {
        if (!amount) return '0원';
        return `${Number(amount).toLocaleString()}원`;
    },
    
    // 전화번호 포맷팅
    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        return phone;
    },
    
    // 알림 표시
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                               type === 'warning' ? 'exclamation-triangle' : 
                               type === 'danger' ? 'times-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        const container = document.querySelector('.page-container') || document.querySelector('.main-content');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            setTimeout(() => alertDiv.remove(), 3000);
        }
    },
    
    // 확인 대화상자
    confirm(message) {
        return window.confirm(message);
    },
    
    // UUID 생성 (간단한 버전)
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};
