const fs = require('fs'), path = require('path');

function glob(d) {
  const r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) r.push(...glob(p));
    else if (e.name.endsWith('.js') && e.name !== 'ecosystem.config.js') r.push(p);
  }
  return r;
}

for (const f of [...glob('server'), ...glob(path.join('public', 'js'))]) {
  const src = fs.readFileSync(f, 'utf8');
  if (!src.includes('/*')) continue;

  const lines = src.split('\n');
  const filtered = lines.filter(l => !l.includes('/*'));
  const result = filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  fs.writeFileSync(f, result, 'utf8');
  console.log('Fixed:', f);
}
console.log('Done');
