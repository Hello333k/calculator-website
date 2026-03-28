/* Scientific calculator (offline, no eval) */

const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const errorEl = document.getElementById('error');
const hintEl = document.getElementById('hint');

/** @type {string} */
let expression = '';

function setError(message) {
  errorEl.textContent = message || '';
}

function setExpression(next) {
  expression = next;
  expressionEl.textContent = expression;
  hintEl.style.display = expression.trim() ? 'none' : 'block';
}

function setResult(text) {
  resultEl.textContent = text;
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isAlpha(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) === 0) return '0';

  // Compact but readable; avoid scientific notation for moderate values.
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-9) return n.toPrecision(12).replace(/\.0+(e|$)/, '$1');
  return n
    .toLocaleString(undefined, {
      maximumFractionDigits: 12,
      useGrouping: false,
    })
    .replace(/\.?0+$/, '');
}

class CalcError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CalcError';
  }
}

/**
 * Supported tokens: numbers, identifiers, parentheses, operators.
 * Operators: + - * / % ^ !
 */
function tokenize(input) {
  /** @type {{type: string, value: string}[]} */
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    if (isDigit(ch) || ch === '.') {
      let j = i;
      let dotCount = 0;
      while (j < input.length) {
        const c = input[j];
        if (isDigit(c)) {
          j++;
          continue;
        }
        if (c === '.') {
          dotCount++;
          if (dotCount > 1) break;
          j++;
          continue;
        }
        break;
      }
      const num = input.slice(i, j);
      if (num === '.' || num === '+.' || num === '-.') {
        throw new CalcError('Invalid number');
      }
      tokens.push({ type: 'number', value: num });
      i = j;
      continue;
    }

    if (isAlpha(ch)) {
      let j = i;
      while (j < input.length && (isAlpha(input[j]) || isDigit(input[j]) || input[j] === '_')) {
        j++;
      }
      const ident = input.slice(i, j);
      tokens.push({ type: 'ident', value: ident });
      i = j;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    if ('+-*/%^!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new CalcError(`Unsupported character: ${ch}`);
  }

  return tokens;
}

const FUNCTIONS = {
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  sqrt: (x) => {
    if (x < 0) throw new CalcError('sqrt() domain error');
    return Math.sqrt(x);
  },
  log: (x) => {
    if (x <= 0) throw new CalcError('log() domain error');
    return Math.log10(x);
  },
  ln: (x) => {
    if (x <= 0) throw new CalcError('ln() domain error');
    return Math.log(x);
  },
  abs: (x) => Math.abs(x),
  round: (x) => Math.round(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
};

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
};

function factorial(n) {
  if (!Number.isFinite(n)) throw new CalcError('factorial() invalid');
  if (n < 0) throw new CalcError('factorial() domain error');
  if (Math.floor(n) !== n) throw new CalcError('factorial() only supports integers');
  if (n > 170) throw new CalcError('factorial() too large');
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

const OP_INFO = {
  '+': { prec: 1, assoc: 'L', arity: 2 },
  '-': { prec: 1, assoc: 'L', arity: 2 },
  '*': { prec: 2, assoc: 'L', arity: 2 },
  '/': { prec: 2, assoc: 'L', arity: 2 },
  '%': { prec: 2, assoc: 'L', arity: 2 },
  '^': { prec: 4, assoc: 'R', arity: 2 },
  'u-': { prec: 3, assoc: 'R', arity: 1 },
  '!': { prec: 5, assoc: 'L', arity: 1, postfix: true },
};

function toRpn(tokens) {
  /** @type {{type: string, value: string}[]} */
  const output = [];
  /** @type {{type: string, value: string}[]} */
  const stack = [];

  /** @type {{type: string, value: string} | null} */
  let prev = null;

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];

    if (t.type === 'number') {
      output.push(t);
      prev = t;
      continue;
    }

    if (t.type === 'ident') {
      const name = t.value.toLowerCase();
      // If next token is '(', treat as function, else constant
      const next = tokens[idx + 1];
      if (next && next.type === 'paren' && next.value === '(') {
        stack.push({ type: 'func', value: name });
      } else {
        output.push({ type: 'const', value: name });
      }
      prev = t;
      continue;
    }

    if (t.type === 'paren' && t.value === '(') {
      stack.push(t);
      prev = t;
      continue;
    }

    if (t.type === 'paren' && t.value === ')') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type === 'paren' && top.value === '(') break;
        output.push(stack.pop());
      }
      if (!stack.length) throw new CalcError('Mismatched parentheses');
      stack.pop(); // pop '('

      // if there is a function on stack, pop it too
      if (stack.length && stack[stack.length - 1].type === 'func') {
        output.push(stack.pop());
      }

      prev = t;
      continue;
    }

    if (t.type === 'op') {
      let op = t.value;

      // unary minus detection
      if (op === '-') {
        const isUnary =
          prev == null ||
          (prev.type === 'op' && prev.value !== '!') ||
          (prev.type === 'paren' && prev.value === '(') ||
          prev.type === 'func';
        if (isUnary) op = 'u-';
      }

      if (op === '+') {
        // unary plus is a no-op; treat as binary unless unary context.
        const isUnary =
          prev == null ||
          (prev.type === 'op' && prev.value !== '!') ||
          (prev.type === 'paren' && prev.value === '(') ||
          prev.type === 'func';
        if (isUnary) {
          prev = t;
          continue;
        }
      }

      const info = OP_INFO[op];
      if (!info) throw new CalcError(`Unsupported operator: ${op}`);

      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== 'op') break;
        const topInfo = OP_INFO[top.value];

        const shouldPop =
          (info.assoc === 'L' && info.prec <= topInfo.prec) ||
          (info.assoc === 'R' && info.prec < topInfo.prec);

        if (!shouldPop) break;
        output.push(stack.pop());
      }

      stack.push({ type: 'op', value: op });
      prev = { type: 'op', value: op };
      continue;
    }

    if (t.type === 'func') {
      // never produced by tokenizer
      stack.push(t);
      prev = t;
      continue;
    }

    throw new CalcError('Unexpected token');
  }

  while (stack.length) {
    const top = stack.pop();
    if (top.type === 'paren') throw new CalcError('Mismatched parentheses');
    output.push(top);
  }

  return output;
}

function evalRpn(rpn) {
  /** @type {number[]} */
  const stack = [];

  for (const t of rpn) {
    if (t.type === 'number') {
      const n = Number(t.value);
      if (!Number.isFinite(n)) throw new CalcError('Invalid number');
      stack.push(n);
      continue;
    }

    if (t.type === 'const') {
      const name = t.value.toLowerCase();
      if (!(name in CONSTANTS)) throw new CalcError(`Unknown constant: ${t.value}`);
      stack.push(CONSTANTS[name]);
      continue;
    }

    if (t.type === 'func') {
      const name = t.value.toLowerCase();
      const fn = FUNCTIONS[name];
      if (!fn) throw new CalcError(`Unknown function: ${t.value}`);
      if (stack.length < 1) throw new CalcError(`${t.value}() missing argument`);
      const a = stack.pop();
      const v = fn(a);
      if (!Number.isFinite(v)) throw new CalcError('Result is not finite');
      stack.push(v);
      continue;
    }

    if (t.type === 'op') {
      const op = t.value;
      if (op === 'u-') {
        if (stack.length < 1) throw new CalcError('Missing operand');
        stack.push(-stack.pop());
        continue;
      }

      if (op === '!') {
        if (stack.length < 1) throw new CalcError('Missing operand');
        const a = stack.pop();
        stack.push(factorial(a));
        continue;
      }

      if (stack.length < 2) throw new CalcError('Missing operand');
      const b = stack.pop();
      const a = stack.pop();

      let v;
      switch (op) {
        case '+':
          v = a + b;
          break;
        case '-':
          v = a - b;
          break;
        case '*':
          v = a * b;
          break;
        case '/':
          if (b === 0) throw new CalcError('Division by zero');
          v = a / b;
          break;
        case '%':
          if (b === 0) throw new CalcError('Division by zero');
          v = a % b;
          break;
        case '^':
          v = Math.pow(a, b);
          break;
        default:
          throw new CalcError(`Unsupported operator: ${op}`);
      }

      if (!Number.isFinite(v)) throw new CalcError('Result is not finite');
      stack.push(v);
      continue;
    }

    throw new CalcError('Unexpected RPN token');
  }

  if (stack.length !== 1) throw new CalcError('Invalid expression');
  return stack[0];
}

function evaluateExpression(expr) {
  const tokens = tokenize(expr);
  const rpn = toRpn(tokens);
  return evalRpn(rpn);
}

function tryPreview() {
  const trimmed = expression.trim();
  setError('');
  if (!trimmed) {
    setResult('0');
    return;
  }

  try {
    const value = evaluateExpression(trimmed);
    setResult(formatNumber(value));
  } catch (e) {
    if (e instanceof CalcError) {
      setError(e.message);
      // keep last good result
      return;
    }
    setError('Unexpected error');
  }
}

function insertText(text) {
  setExpression(expression + text);
  tryPreview();
}

function clearAll() {
  setExpression('');
  setResult('0');
  setError('');
}

function backspace() {
  if (!expression) return;
  setExpression(expression.slice(0, -1));
  tryPreview();
}

function toggleSign() {
  // If expression empty, insert unary '-'
  const t = expression.trim();
  if (!t) {
    insertText('-');
    return;
  }

  // Wrap current expression in -(...) to avoid complex cursor logic
  setExpression(`-(${expression})`);
  tryPreview();
}

function equals() {
  const trimmed = expression.trim();
  setError('');
  if (!trimmed) return;

  try {
    const value = evaluateExpression(trimmed);
    const formatted = formatNumber(value);
    setExpression(formatted);
    setResult(formatted);
  } catch (e) {
    if (e instanceof CalcError) {
      setError(e.message);
      return;
    }
    setError('Unexpected error');
  }
}

function normalizeKeyToInsert(key) {
  if (isDigit(key)) return key;
  if (key === '.') return '.';
  if ('+-*/%^()'.includes(key)) return key;
  if (key === '!') return '!';
  if (key === 'x' || key === 'X' || key === '×') return '*';
  if (key === '÷') return '/';

  // Allow typing function/constant names directly (sin, cos, pi, etc.)
  if (/^[a-zA-Z_]$/.test(key)) return key;
  return null;
}

function onKeyDown(e) {
  // Avoid hijacking browser shortcuts
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    equals();
    return;
  }

  if (e.key === 'Backspace') {
    e.preventDefault();
    backspace();
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    clearAll();
    return;
  }

  const toInsert = normalizeKeyToInsert(e.key);
  if (toInsert != null) {
    e.preventDefault();
    insertText(toInsert);
    return;
  }
}

function onClickKey(btn) {
  const insert = btn.getAttribute('data-insert');
  const action = btn.getAttribute('data-action');

  if (insert) {
    insertText(insert);
    return;
  }

  if (!action) return;

  switch (action) {
    case 'clear':
      clearAll();
      break;
    case 'back':
      backspace();
      break;
    case 'toggle-sign':
      toggleSign();
      break;
    case 'equals':
      equals();
      break;
  }
}

function init() {
  setExpression('');
  setResult('0');
  setError('');

  document.querySelectorAll('button.key').forEach((btn) => {
    btn.addEventListener('click', () => onClickKey(btn));
  });

  window.addEventListener('keydown', onKeyDown);
}

init();
