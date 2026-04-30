export type EvalResult = { ok: true; value: number } | { ok: false };

// Grammar:
// expr   := term (('+' | '-') term)*
// term   := unary (('*' | '/') unary)*
// unary  := '-' unary | primary
// primary:= number | '(' expr ')'

export function evaluate(input: string): EvalResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false };

  let pos = 0;
  const src = trimmed;

  const peek = () => src[pos];
  const eat = () => src[pos++];
  const skip = () => {
    while (pos < src.length && src[pos] === " ") pos++;
  };

  function parseNumber(): number | null {
    skip();
    const start = pos;
    while (pos < src.length && /[0-9.]/.test(src[pos])) pos++;
    if (start === pos) return null;
    const n = Number.parseFloat(src.slice(start, pos));
    return Number.isFinite(n) ? n : null;
  }

  function parsePrimary(): number | null {
    skip();
    if (peek() === "(") {
      eat();
      const v = parseExpr();
      skip();
      if (eat() !== ")") return null;
      return v;
    }
    return parseNumber();
  }

  function parseUnary(): number | null {
    skip();
    if (peek() === "-") {
      eat();
      const v = parseUnary();
      return v === null ? null : -v;
    }
    if (peek() === "+") {
      eat();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parseTerm(): number | null {
    let left = parseUnary();
    if (left === null) return null;
    while (true) {
      skip();
      const op = peek();
      if (op !== "*" && op !== "/") return left;
      eat();
      const right = parseUnary();
      if (right === null) return null;
      if (op === "/") {
        if (right === 0) return null;
        left /= right;
      } else {
        left *= right;
      }
    }
  }

  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (true) {
      skip();
      const op = peek();
      if (op !== "+" && op !== "-") return left;
      eat();
      const right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
  }

  const value = parseExpr();
  skip();
  if (value === null || pos !== src.length) return { ok: false };
  if (!Number.isFinite(value)) return { ok: false };
  // Round to 2 decimal places to absorb float drift like 26.200000000000003
  return { ok: true, value: Math.round(value * 100) / 100 };
}
