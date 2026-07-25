const fs = require('fs');
const p = 'c:/Users/HP/Desktop/RITI RAI/HSDA/STRUCTBAY/frontend/src/admin/pages/VendorManagement.tsx';
let txt = fs.readFileSync(p, 'utf8');

const fields = [
  'GST Number', 'Company Address', 'Warehouse Address',
  'Contact Person Name', 'Contact Person Phone',
  'Account Holder Name', 'Bank Name', 'Account Number',
  'IFSC Code', 'Branch Name', 'Cancelled Cheque Upload'
];

fields.forEach(f => {
  txt = txt.replace(new RegExp(f + ' \\\\\*</label>', 'g'), f + '</label>');
});

fields.forEach(f => {
  const re = new RegExp('(' + f + '</label>\\\\s*(?:\\\\n\\\\s*)+<[^>]+) required( />|>)', 'g');
  txt = txt.replace(re, '\\');
});

fs.writeFileSync(p, txt, 'utf8');
console.log('Fixed');
