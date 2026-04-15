import { readFileSync } from 'fs';
const code = readFileSync('d:/versuch wurfel/main.js', 'utf8');
const lines = code.split('\n');
let b=0, p=0, k=0;
let inStr=false, sc='', inC=false, inBC=false;

for (let ln = 0; ln < lines.length; ln++) {
  const line = lines[ln];
  const prevB = b, prevP = p, prevK = k;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const pr = i > 0 ? line[i-1] : '';
    if (inBC) { if (c === '/' && pr === '*') inBC = false; continue; }
    if (inC) { continue; }
    if (c === '/' && line[i+1] === '/') { inC = true; continue; }
    if (c === '/' && line[i+1] === '*') { inBC = true; continue; }
    if (inStr) { if (c === sc && pr !== '\\') inStr = false; continue; }
    if (c === "'" || c === '"') { inStr = true; sc = c; continue; }
    if (c === '{') b++;
    if (c === '}') b--;
    if (c === '(') p++;
    if (c === ')') p--;
    if (c === '[') k++;
    if (c === ']') k--;
  }
  inC = false; // reset line comment at end of line
  
  if (b !== prevB || p !== prevP || k !== prevK) {
    const dB = b - prevB;
    const dP = p - prevP;
    const dK = k - prevK;
    if (Math.abs(dB) > 1 || Math.abs(dP) > 1 || Math.abs(dK) > 1 || b < 0 || p < 0 || k < 0) {
      console.log(`LINE ${ln+1}: b=${b}(${dB>0?'+':''}${dB}) p=${p}(${dP>0?'+':''}${dP}) k=${k}(${dK>0?'+':''}${dK}) | ${line.trim().substring(0,80)}`);
    }
  }
}
console.log(`\nFINAL: braces=${b} parens=${p} brackets=${k}`);
