const fs = require('fs');
const p = 'c:/Users/HP/Desktop/RITI RAI/HSDA/STRUCTBAY/frontend/src/admin/pages/VendorManagement.tsx';
let txt = fs.readFileSync(p, 'utf8');

const inputVars = [
  'gstNumber', 'companyAddress', 'warehouseAddress',
  'contactPersonName', 'contactPersonPhone',
  'accountHolderName', 'bankName', 'accountNumber',
  'ifscCode', 'branchName'
];

inputVars.forEach(v => {
  const addRe = new RegExp('onChange={e => setAddForm\\(f => \\(\\{ ...f, ' + v + ': e.target.value \\}\\)\\)}(.*?) required', 'g');
  txt = txt.replace(addRe, 'onChange={e => setAddForm(f => ({ ...f, ' + v + ': e.target.value }))}$1');
  
  const editRe = new RegExp('onChange={e => setEditForm\\(f => \\(\\{ ...f, ' + v + ': e.target.value \\}\\)\\)}(.*?) required', 'g');
  txt = txt.replace(editRe, 'onChange={e => setEditForm(f => ({ ...f, ' + v + ': e.target.value }))}$1');
});

txt = txt.replace(/<input type="file" accept="image\/\*,application\/pdf" onChange=\{e => setAddFile\(e.target.files\?\.\[0\] \|\| null\)\} className="w-full text-xs text-sb-ink\/60" required \/>/g, '<input type="file" accept="image/*,application/pdf" onChange={e => setAddFile(e.target.files?.[0] || null)} className="w-full text-xs text-sb-ink/60" />');

fs.writeFileSync(p, txt, 'utf8');
console.log('Fixed inputs');
