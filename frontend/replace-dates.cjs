const fs = require('fs');
const path = require('path');

const libPathRel = (filePath) => {
  const parts = filePath.split(path.sep);
  const srcIndex = parts.indexOf('src');
  if (srcIndex === -1) return '"../../lib/formatDate"'; // fallback
  const depth = parts.length - srcIndex - 2;
  const relPath = depth === 0 ? '"./lib/formatDate"' : '"' + '../'.repeat(depth) + 'lib/formatDate"';
  return relPath;
};

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (fullPath.includes('formatDate.ts')) continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We want to find patterns like `new Date(something).toLocaleDateString(...)`
      // Since `something` can be arbitrary, we use a regex:
      // /new\s+Date\(([^)]+)\)\.toLocaleDateString\(([^)]*)\)/g
      // Wait, sometimes it's like: `new Date().toLocaleDateString(...)`
      
      let changed = false;
      const regex1 = /new\s+Date\(([^)]*)\)\.toLocaleDateString\([^)]*\)/g;
      
      content = content.replace(regex1, (match, innerArgs) => {
        changed = true;
        return `formatDate(${innerArgs})`;
      });

      // What about `profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'`
      // Above regex will handle this.
      
      if (changed) {
        // add import at top
        const relImport = libPathRel(fullPath);
        const importStmt = `import { formatDate } from ${relImport};\n`;
        // find last import or start of file
        let lines = content.split('\n');
        let lastImportIdx = -1;
        for (let i=0; i<lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            lastImportIdx = i;
          }
        }
        if (lastImportIdx !== -1) {
          lines.splice(lastImportIdx + 1, 0, importStmt);
        } else {
          lines.unshift(importStmt);
        }
        
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
