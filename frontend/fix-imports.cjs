const fs = require('fs');
const path = require('path');

const libPathRel = (filePath) => {
  const parts = filePath.split(path.sep);
  const srcIndex = parts.indexOf('src');
  if (srcIndex === -1) return '"../../lib/formatDate"';
  const depth = parts.length - srcIndex - 2;
  return depth === 0 ? '"./lib/formatDate"' : '"' + '../'.repeat(depth) + 'lib/formatDate"';
};

function fix(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      fix(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      if (p.includes('formatDate.ts')) continue;
      let content = fs.readFileSync(p, 'utf8');
      
      if (content.includes('import { formatDate } from')) {
        // Remove all instances of the import
        const lines = content.split('\n');
        const cleanLines = lines.filter(l => !l.startsWith('import { formatDate } from'));
        
        // Add it to the top
        const rel = libPathRel(p);
        cleanLines.unshift(`import { formatDate } from ${rel};`);
        
        fs.writeFileSync(p, cleanLines.join('\n'), 'utf8');
        console.log('Fixed', p);
      }
    }
  }
}

fix(path.join(__dirname, 'src'));
