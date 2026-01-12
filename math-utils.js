/**
 * 수학 공식 렌더링 유틸리티
 * KaTeX를 사용하여 LaTeX 문법을 HTML로 렌더링
 */

const MathUtils = {
    /**
     * 텍스트에서 LaTeX 수식을 찾아 렌더링
     * 형식: $inline math$ 또는 $$display math$$
     */
    renderMath(text) {
        if (!text || typeof text !== 'string') return text;
        
        // KaTeX가 로드되지 않았으면 원본 텍스트 반환
        if (typeof katex === 'undefined') {
            console.warn('KaTeX is not loaded');
            return text;
        }

        let html = text;

        try {
            // Display math ($$...$$) 처리
            html = html.replace(/\$\$(.*?)\$\$/g, (match, formula) => {
                try {
                    return katex.renderToString(formula, {
                        displayMode: true,
                        throwOnError: false
                    });
                } catch (e) {
                    console.error('KaTeX display render error:', e);
                    return match;
                }
            });

            // Inline math ($...$) 처리
            html = html.replace(/\$(.*?)\$/g, (match, formula) => {
                try {
                    return katex.renderToString(formula, {
                        displayMode: false,
                        throwOnError: false
                    });
                } catch (e) {
                    console.error('KaTeX inline render error:', e);
                    return match;
                }
            });
        } catch (e) {
            console.error('MathUtils.renderMath error:', e);
            return text;
        }

        return html;
    },

    /**
     * 수학 기호 삽입을 위한 버튼 패널 생성
     */
    createMathSymbolPanel() {
        const symbols = [
            { label: 'x²', latex: '^2' },
            { label: 'x³', latex: '^3' },
            { label: '√', latex: '\\sqrt{}' },
            { label: '∛', latex: '\\sqrt[3]{}' },
            { label: '분수', latex: '\\frac{}{}' },
            { label: '±', latex: '\\pm' },
            { label: '×', latex: '\\times' },
            { label: '÷', latex: '\\div' },
            { label: '≠', latex: '\\neq' },
            { label: '≤', latex: '\\leq' },
            { label: '≥', latex: '\\geq' },
            { label: '≈', latex: '\\approx' },
            { label: '∞', latex: '\\infty' },
            { label: 'π', latex: '\\pi' },
            { label: '∑', latex: '\\sum' },
            { label: '∫', latex: '\\int' },
            { label: 'α', latex: '\\alpha' },
            { label: 'β', latex: '\\beta' },
            { label: 'θ', latex: '\\theta' },
            { label: '°', latex: '^\\circ' }
        ];

        const panel = document.createElement('div');
        panel.className = 'math-symbol-panel';
        panel.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 0.3rem;
            padding: 0.5rem;
            background: #FFF8F0;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            margin-bottom: 0.5rem;
        `;

        symbols.forEach(symbol => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'math-symbol-btn';
            btn.textContent = symbol.label;
            btn.title = `삽입: $${symbol.latex}$`;
            btn.style.cssText = `
                padding: 0.3rem 0.5rem;
                background: white;
                border: 1px solid var(--border-color);
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.2s;
            `;
            
            btn.onclick = () => {
                const input = panel.nextElementSibling;
                if (input && input.tagName === 'INPUT') {
                    const cursorPos = input.selectionStart || input.value.length;
                    const textBefore = input.value.substring(0, cursorPos);
                    const textAfter = input.value.substring(cursorPos);
                    input.value = textBefore + '$' + symbol.latex + '$' + textAfter;
                    input.focus();
                    
                    // 커서를 수식 안쪽으로 이동 (}가 있으면 그 안으로)
                    const newPos = cursorPos + symbol.latex.indexOf('{') + 2;
                    if (symbol.latex.includes('{}')) {
                        input.setSelectionRange(newPos, newPos);
                    }
                }
            };

            btn.onmouseover = () => {
                btn.style.background = '#FFFBF5';
                btn.style.borderColor = 'var(--primary-color)';
            };

            btn.onmouseout = () => {
                btn.style.background = 'white';
                btn.style.borderColor = 'var(--border-color)';
            };

            panel.appendChild(btn);
        });

        return panel;
    },

    /**
     * 입력 필드에 수학 기호 패널 추가
     */
    addMathPanelToInput(inputElement) {
        if (!inputElement || inputElement.dataset.mathPanelAdded) return;
        
        const panel = this.createMathSymbolPanel();
        inputElement.parentElement.insertBefore(panel, inputElement);
        inputElement.dataset.mathPanelAdded = 'true';

        // 입력 필드 스타일 조정
        inputElement.style.fontFamily = 'monospace';
        inputElement.placeholder = '텍스트 또는 수식 입력 (예: $x^2 + 2x + 1$)';
    },

    /**
     * 수학 공식 미리보기 표시
     */
    showMathPreview(text, previewElement) {
        if (!previewElement) return;
        
        const rendered = this.renderMath(text);
        previewElement.innerHTML = rendered || '<span style="color: #999;">미리보기</span>';
    }
};

// 전역 노출
window.MathUtils = MathUtils;
