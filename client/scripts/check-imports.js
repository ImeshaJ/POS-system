const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const exts = ['.tsx', '.ts', '.jsx', '.js', '.d.ts'];
const indexExts = ['/index.tsx','/index.ts','/index.js','/index.jsx'];

function walk(dir){
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for(const ent of list){
    const p = path.join(dir, ent.name);
    if(ent.isDirectory()){
      results = results.concat(walk(p));
    } else if(/\.(ts|tsx|js|jsx|json)$/.test(ent.name)){
      results.push(p);
    }
  }
  return results;
}

function resolveTarget(importPath, fromFile){
  if(importPath.startsWith('@/')){
    const rel = importPath.replace(/^@\//, '');
    return path.join(src, rel);
  }
  if(importPath.startsWith('./') || importPath.startsWith('../')){
    return path.resolve(path.dirname(fromFile), importPath);
  }
  return null; // package
}

function existsTarget(base){
  if(!base) return true;
  for(const e of exts){
    if(fs.existsSync(base + e)) return base + e;
  }
  for(const ie of indexExts){
    if(fs.existsSync(base + ie)) return base + ie;
  }
  // also exact file
  if(fs.existsSync(base)) return base;
  return null;
}

const files = walk(src);
const importRegex = /from\s+["']([^"']+)["']/g;
const missing = {};
for(const f of files){
  const text = fs.readFileSync(f, 'utf8');
  let m;
  while((m = importRegex.exec(text)) !== null){
    const imp = m[1];
    const targetBase = resolveTarget(imp, f);
    if(targetBase){
      const found = existsTarget(targetBase);
      if(!found){
        if(!missing[imp]) missing[imp] = [];
        missing[imp].push(path.relative(root, f));
      }
    }
  }
}

console.log(JSON.stringify({missing}, null, 2));
