/* Calculator — iOS Style */
(function () {
  'use strict';

  CP.register('calculator', {
    mount(root, cp) {
      let expr = '';
      let ans = 0;
      let deg = true; // DEG or RAD
      let justEq = false;
      let mode = 'basic'; // basic | scientific
      const history = [];

      // ---------- SVG Icons ----------
      const icons = {
        backspace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>',
        history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/></svg>',
        chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
      };

      function svg(name, size = 20) {
        const i = icons[name] || '';
        return i.replace('<svg', `<svg width="${size}" height="${size}"`);
      }

      // ---------- Math Parser (safe, no eval) ----------
      function tokenize(s) {
        const toks = [];
        let i = 0;
        while (i < s.length) {
          const c = s[i];
          if (/\s/.test(c)) { i++; continue; }
          if (/[0-9.]/.test(c)) {
            let j = i;
            while (j < s.length && /[0-9.]/.test(s[j])) j++;
            const v = parseFloat(s.slice(i, j));
            if (isNaN(v)) throw new Error('Invalid number');
            toks.push({ t: 'num', v });
            i = j;
            continue;
          }
          if (/[a-z]/.test(c)) {
            let j = i;
            while (j < s.length && /[a-z]/.test(s[j])) j++;
            toks.push({ t: 'id', v: s.slice(i, j) });
            i = j;
            continue;
          }
          if ('+-*/^%()!'.includes(c)) {
            toks.push({ t: c });
            i++;
            continue;
          }
          throw new Error('Invalid character: ' + c);
        }
        return toks;
      }

      function evaluate(expression, degMode, ansVal) {
        let exprStr = String(expression)
          .replace(/π/g, 'pi')
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/−/g, '-');
        
        const toks = tokenize(exprStr);
        const out = [];
        const ops = [];
        const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, 'neg': 3, '^': 4 };
        const RIGHT = { '^': 1, 'neg': 1 };
        const FN = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, log: 1, ln: 1, sqrt: 1, abs: 1, fact: 1 };
        let prev = null;

        for (const tk of toks) {
          if (tk.t === 'num') {
            out.push(tk);
            prev = 'val';
          } else if (tk.t === 'id') {
            if (tk.v === 'pi') { out.push({ t: 'num', v: Math.PI }); prev = 'val'; }
            else if (tk.v === 'e') { out.push({ t: 'num', v: Math.E }); prev = 'val'; }
            else if (tk.v === 'ans') { out.push({ t: 'num', v: ansVal }); prev = 'val'; }
            else if (FN[tk.v]) { ops.push({ t: 'fn', v: tk.v }); prev = 'op'; }
            else throw new Error('Unknown: ' + tk.v);
          } else if (tk.t === '(') {
            ops.push(tk);
            prev = 'op';
          } else if (tk.t === ')') {
            while (ops.length && ops[ops.length - 1].t !== '(') out.push(ops.pop());
            if (!ops.length) throw new Error('Parenthesis error');
            ops.pop();
            if (ops.length && ops[ops.length - 1].t === 'fn') out.push(ops.pop());
            prev = 'val';
          } else if (tk.t === '%' || tk.t === '!') {
            out.push({ t: 'op', v: tk.t });
            prev = 'val';
          } else {
            let op = tk.t;
            if (op === '-' && prev !== 'val') op = 'neg';
            while (ops.length) {
              const top = ops[ops.length - 1];
              if (top.t === '(') break;
              const tp = top.t === 'fn' ? 5 : (PREC[top.v] || 0);
              if (tp > PREC[op] || (tp === PREC[op] && !RIGHT[op])) out.push(ops.pop());
              else break;
            }
            ops.push({ t: 'op', v: op });
            prev = 'op';
          }
        }
        
        while (ops.length) {
          const o = ops.pop();
          if (o.t === '(') throw new Error('Parenthesis error');
          out.push(o);
        }

        const D2R = Math.PI / 180;
        const R2D = 180 / Math.PI;
        const F = {
          sin: x => Math.sin(degMode ? x * D2R : x),
          cos: x => Math.cos(degMode ? x * D2R : x),
          tan: x => Math.tan(degMode ? x * D2R : x),
          asin: x => degMode ? Math.asin(x) * R2D : Math.asin(x),
          acos: x => degMode ? Math.acos(x) * R2D : Math.acos(x),
          atan: x => degMode ? Math.atan(x) * R2D : Math.atan(x),
          log: Math.log10,
          ln: Math.log,
          abs: Math.abs,
          sqrt: x => { if (x < 0) throw new Error('Negative square root'); return Math.sqrt(x); },
          fact: n => {
            if (n < 0 || n > 170 || n % 1 !== 0) throw new Error('Invalid factorial');
            let r = 1;
            for (let i = 2; i <= n; i++) r *= i;
            return r;
          }
        };

        const st = [];
        for (const tk of out) {
          if (tk.t === 'num') st.push(tk.v);
          else if (tk.t === 'op') {
            if (tk.v === '%') { st.push(st.pop() / 100); continue; }
            if (tk.v === '!') { st.push(F.fact(st.pop())); continue; }
            if (tk.v === 'neg') { st.push(-st.pop()); continue; }
            if (st.length < 2) throw new Error('Syntax error');
            const b = st.pop();
            const a = st.pop();
            st.push(
              tk.v === '+' ? a + b :
              tk.v === '-' ? a - b :
              tk.v === '*' ? a * b :
              tk.v === '/' ? (b === 0 ? NaN : a / b) :
              Math.pow(a, b)
            );
          } else if (tk.t === 'fn') {
            st.push(F[tk.v](st.pop()));
          }
        }

        if (st.length !== 1 || !isFinite(st[0])) throw new Error('Math error');
        return st[0];
      }

      function fmt(n) {
        if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
        return String(parseFloat(n.toPrecision(12)));
      }

      // ---------- Render ----------
      root.innerHTML = `
        <div class="calc">
          <div class="c-topbar">
            <button class="c-top-btn" id="cModeBtn" title="Toggle mode">
              <span id="cModeIcon">${svg('grid', 18)}</span>
              <span id="cModeLabel">Basic</span>
            </button>
            <button class="c-top-btn c-deg" id="cDegBtn">DEG</button>
            <button class="c-top-btn" id="cHistBtn" title="History">
              ${svg('history', 18)}
            </button>
          </div>

          <div class="c-display">
            <div class="c-expr" id="cExpr" dir="ltr">&nbsp;</div>
            <div class="c-result" id="cResult" dir="ltr">0</div>
          </div>

          <div class="c-history" id="cHistory" hidden>
            <div class="c-hist-head">
              <span>History</span>
              <button class="c-hist-close" id="cHistClose">${svg('close', 18)}</button>
            </div>
            <div class="c-hist-list" id="cHistList">
              <div class="c-hist-empty">No calculations yet</div>
            </div>
          </div>

          <div class="c-keypad" id="cKeypad"></div>
        </div>`;

      const $ = s => root.querySelector(s);
      const exprEl = $('#cExpr');
      const resultEl = $('#cResult');
      const keypad = $('#cKeypad');
      const historyPanel = $('#cHistory');
      const histList = $('#cHistList');
      const modeBtn = $('#cModeBtn');
      const modeIcon = $('#cModeIcon');
      const modeLabel = $('#cModeLabel');
      const degBtn = $('#cDegBtn');

      // ---------- Keypad Definitions ----------
      const basicKeys = [
        ['AC', 'fn', 'clear'], ['±', 'fn', 'negate'], ['%', 'fn', 'percent'], ['÷', 'op', '/'],
        ['7', 'num'], ['8', 'num'], ['9', 'num'], ['×', 'op', '*'],
        ['4', 'num'], ['5', 'num'], ['6', 'num'], ['−', 'op', '-'],
        ['1', 'num'], ['2', 'num'], ['3', 'num'], ['+', 'op', '+'],
        ['0', 'num', 'zero'], ['.', 'num'], ['⌫', 'fn', 'back'], ['=', 'eq'],
      ];

      const sciKeys = [
        ['(', 'fn', 'paren'], [')', 'fn', 'paren'], ['AC', 'fn', 'clear'], ['⌫', 'fn', 'back'], ['÷', 'op', '/'],
        ['sin(', 'fn', 'sci'], ['cos(', 'fn', 'sci'], ['tan(', 'fn', 'sci'], ['%', 'fn', 'percent'], ['×', 'op', '*'],
        ['ln(', 'fn', 'sci'], ['log(', 'fn', 'sci'], ['√(', 'fn', 'sci'], ['x^y', 'fn', 'power'], ['−', 'op', '-'],
        ['x!', 'fn', 'fact'], ['π', 'fn', 'const'], ['e', 'fn', 'const'], ['Ans', 'fn', 'ans'], ['+', 'op', '+'],
        ['±', 'fn', 'negate'], ['7', 'num'], ['8', 'num'], ['9', 'num'], ['=', 'eq'],
        ['0', 'num', 'zero'], ['.', 'num'], ['(', 'fn', 'paren'], [')', 'fn', 'paren'], ['=', 'eq'],
      ];

      function renderKeypad() {
        const keys = mode === 'basic' ? basicKeys : sciKeys;
        keypad.className = `c-keypad ${mode === 'basic' ? 'c-keypad-basic' : 'c-keypad-sci'}`;
        keypad.innerHTML = keys.map(k => {
          const [label, type, action] = k;
          let cls = 'c-key';
          if (type === 'op') cls += ' c-key-op';
          else if (type === 'eq') cls += ' c-key-eq';
          else if (type === 'fn') cls += ' c-key-fn';
          else if (type === 'num') cls += ' c-key-num';
          if (action === 'zero' && mode === 'basic') cls += ' c-key-zero';
          if (action === 'sci') cls += ' c-key-sci';
          
          const icon = action === 'back' ? svg('backspace', 22) : label;
          return `<button class="${cls}" data-label="${label}" data-action="${action || ''}" data-type="${type}">${icon}</button>`;
        }).join('');

        keypad.querySelectorAll('.c-key').forEach(btn => {
          btn.addEventListener('click', () => handleKey(btn));
        });
      }

      function handleKey(btn) {
        const label = btn.dataset.label;
        const action = btn.dataset.action;
        const type = btn.dataset.type;

        // Flash animation
        btn.classList.add('flash');
        setTimeout(() => btn.classList.remove('flash'), 150);

        if (type === 'num') {
          if (justEq) { expr = ''; justEq = false; }
          if (action === 'back') {
            expr = expr.slice(0, -1);
          } else {
            expr += label;
          }
          render();
        } else if (type === 'op') {
          if (justEq) { expr = fmt(ans); justEq = false; }
          expr += label;
          render();
        } else if (type === 'eq') {
          calc();
        } else if (type === 'fn') {
          handleFn(action, label);
        }
      }

      function handleFn(action, label) {
        if (action === 'clear') {
          expr = '';
          resultEl.textContent = '0';
          render();
          return;
        }
        if (action === 'back') {
          expr = expr.slice(0, -1);
          render();
          return;
        }
        if (action === 'negate') {
          if (justEq) { expr = fmt(ans); justEq = false; }
          expr = `(-${expr || '0'})`;
          render();
          return;
        }
        if (action === 'percent') {
          if (justEq) { expr = fmt(ans); justEq = false; }
          expr += '%';
          render();
          return;
        }
        if (action === 'paren') {
          if (justEq) { expr = ''; justEq = false; }
          expr += label;
          render();
          return;
        }
        if (action === 'sci') {
          if (justEq) { expr = ''; justEq = false; }
          expr += label;
          render();
          return;
        }
        if (action === 'power') {
          if (justEq) { expr = fmt(ans); justEq = false; }
          expr += '^';
          render();
          return;
        }
        if (action === 'fact') {
          if (justEq) { expr = fmt(ans); justEq = false; }
          expr += '!';
          render();
          return;
        }
        if (action === 'const') {
          if (justEq) { expr = ''; justEq = false; }
          expr += label === 'π' ? 'π' : 'e';
          render();
          return;
        }
        if (action === 'ans') {
          if (justEq) { expr = ''; justEq = false; }
          expr += 'ans';
          render();
          return;
        }
      }

      function render() {
        exprEl.textContent = expr || '\u00A0';
        if (expr) {
          try {
            const r = evaluate(expr, deg, ans);
            resultEl.textContent = fmt(r);
            resultEl.classList.remove('error');
          } catch (e) {
            // Don't show error while typing, just keep last valid
          }
        } else {
          resultEl.textContent = '0';
        }
      }

      function calc() {
        if (!expr.trim()) return;
        try {
          const r = evaluate(expr, deg, ans);
          const resultStr = fmt(r);
          
          // Add to history
          history.unshift({ e: expr, r: resultStr });
          if (history.length > 30) history.pop();
          renderHistory();

          expr = resultStr;
          ans = r;
          justEq = true;
          exprEl.textContent = '';
          resultEl.textContent = resultStr;
          resultEl.classList.remove('error');
        } catch (err) {
          resultEl.textContent = 'Error';
          resultEl.classList.add('error');
          justEq = true;
        }
      }

      function renderHistory() {
        if (history.length === 0) {
          histList.innerHTML = '<div class="c-hist-empty">No calculations yet</div>';
          return;
        }
        histList.innerHTML = history.map((h, i) => `
          <div class="c-hist-item" data-i="${i}">
            <div class="c-hist-expr" dir="ltr">${esc(h.e)}</div>
            <div class="c-hist-res" dir="ltr">= ${esc(h.r)}</div>
          </div>
        `).join('');

        histList.querySelectorAll('.c-hist-item').forEach(item => {
          item.addEventListener('click', () => {
            const h = history[parseInt(item.dataset.i)];
            expr = h.r;
            justEq = false;
            render();
            historyPanel.hidden = true;
          });
        });
      }

      function esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
      }

      // ---------- Mode Toggle ----------
      modeBtn.addEventListener('click', () => {
        mode = mode === 'basic' ? 'scientific' : 'basic';
        modeLabel.textContent = mode === 'basic' ? 'Basic' : 'Scientific';
        modeIcon.innerHTML = svg(mode === 'basic' ? 'grid' : 'layers', 18);
        renderKeypad();
      });

      // ---------- DEG/RAD Toggle ----------
      degBtn.addEventListener('click', () => {
        deg = !deg;
        degBtn.textContent = deg ? 'DEG' : 'RAD';
        render();
      });

      // ---------- History Toggle ----------
      $('#cHistBtn').addEventListener('click', () => {
        historyPanel.hidden = !historyPanel.hidden;
      });
      $('#cHistClose').addEventListener('click', () => {
        historyPanel.hidden = true;
      });

      // ---------- Keyboard Support ----------
      const onKey = e => {
        const key = e.key;
        
        if (/^[0-9]$/.test(key)) {
          if (justEq) { expr = ''; justEq = false; }
          expr += key;
          render();
          e.preventDefault();
        } else if (key === '.') {
          if (justEq) { expr = ''; justEq = false; }
          expr += '.';
          render();
          e.preventDefault();
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
          if (justEq) { expr = fmt(ans); justEq = false; }
          expr += key === '*' ? '×' : key === '/' ? '÷' : key === '-' ? '−' : key;
          render();
          e.preventDefault();
        } else if (key === 'Enter' || key === '=') {
          calc();
          e.preventDefault();
        } else if (key === 'Backspace') {
          expr = expr.slice(0, -1);
          render();
          e.preventDefault();
        } else if (key === 'Escape' || key.toLowerCase() === 'c') {
          expr = '';
          resultEl.textContent = '0';
          render();
          e.preventDefault();
        } else if (key === '%') {
          expr += '%';
          render();
          e.preventDefault();
        } else if (key === '^') {
          expr += '^';
          render();
          e.preventDefault();
        } else if (key === '(' || key === ')') {
          expr += key;
          render();
          e.preventDefault();
        }
      };

      document.addEventListener('keydown', onKey);
      this._onKey = onKey;

      // Init
      renderKeypad();
      render();
    },

    unmount(root, cp) {
      if (this._onKey) {
        document.removeEventListener('keydown', this._onKey);
      }
    }
  });
})();