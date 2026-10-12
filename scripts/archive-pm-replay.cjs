'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'tests/pm-behavior/artifacts/controlled-20261011');
const privateRoot=path.join(os.homedir(),'Downloads/pm-spark-validation-private/controlled-20261011');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=[];
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){visit(file);continue;}if(entry.name==='private-evidence-manifest.json')continue;const rel=path.relative(source,file),bytes=fs.readFileSync(file),dest=path.join(privateRoot,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest)&&sha(fs.readFileSync(dest))!==sha(bytes))throw Error('Refusing to overwrite original '+rel);if(!fs.existsSync(dest))fs.writeFileSync(dest,bytes);const text=bytes.toString('utf8');const clean=text.replaceAll(root,'[REPOSITORY]').replaceAll(os.homedir(),'[HOME]');const sanitized=Buffer.from(clean);fs.writeFileSync(file,sanitized);manifest.push({repository_path:path.relative(root,file),private_relative_path:rel,original_sha256:sha(bytes),sanitized_sha256:sha(sanitized),redacted:!bytes.equals(sanitized)});}}
visit(source);
fs.writeFileSync(path.join(source,'private-evidence-manifest.json'),JSON.stringify({type:'controlled_agent_replay',private_directory:'Downloads/pm-spark-validation-private/controlled-20261011',transform:'Replace repository absolute prefix with [REPOSITORY], home prefix with [HOME]; originals retained byte-for-byte.',files:manifest},null,2)+'\n');
console.log('Archived and sanitized',manifest.length,'files');
