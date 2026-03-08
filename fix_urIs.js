const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('/Users/dp/Documents/Playground/apps/console/src/app').concat(walk('/Users/dp/Documents/Playground/apps/console/src/components'));

let changedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;

  // Handle patterns like: ?org_id=${encodeURIComponent(orgId)}&limit=100
  // Handle patterns like: ?org_id=${orgId}
  // Remove them completely, or if there's an &, change it to ? if it was the first param.
  
  content = content.replace(/\?org_id=\$\{encodeURIComponent\(orgId\)\}&/g, '?');
  content = content.replace(/\?org_id=\$\{encodeURIComponent\(orgId\)\}/g, '');
  content = content.replace(/\?org_id=\$\{orgId\}&/g, '?');
  content = content.replace(/\?org_id=\$\{orgId\}/g, '');
  
  content = content.replace(/\?org_id=\$\{resolvedOrgId\}&/g, '?');
  content = content.replace(/\?org_id=\$\{resolvedOrgId\}/g, '');

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});
console.log(`Updated ${changedCount} files.`);
