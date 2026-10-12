'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'..');
const runDir=path.join(root,'tests/pm-behavior/artifacts',process.env.PM_REPLAY_RUN || 'controlled-20261011-isolated');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'tests/pm-behavior/scenarios.json'),'utf8')).scenarios;
const relative=p=>path.relative(root,p);
const save=(p,obj)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');};
function mirrorEvidence(rawPrefix,publicPrefix){for(const ext of ['input.json','stdout.jsonl','stderr.log','runtime.json']){const src=rawPrefix+'.'+ext;if(fs.existsSync(src)){const text=fs.readFileSync(src,'utf8').replaceAll(root,'[REPOSITORY]').replaceAll(require('os').homedir(),'[HOME]');fs.mkdirSync(path.dirname(publicPrefix),{recursive:true});fs.writeFileSync(publicPrefix+'.'+ext,text);}}}
function invoke(args,cwd,logPrefix,prompt,timeout=600000){return new Promise(resolve=>{
 save(logPrefix+'.input.json',{type:'controlled_agent_replay',args,cwd:relative(cwd),prompt});
 const attempt=(tryN)=>{
 const freshArgs=tryN===0?args:args.map((a,i)=>a==='--session-id'?crypto.randomUUID():a);
 const child=spawn('claude',freshArgs,{cwd,stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='',timedOut=false;
 const out=fs.createWriteStream(logPrefix+'.stdout.jsonl'),err=fs.createWriteStream(logPrefix+'.stderr.log');
 child.stdout.on('data',d=>{stdout+=d;out.write(d);});child.stderr.on('data',d=>{stderr+=d;err.write(d);});
 child.stdin.end(prompt);
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},timeout);
 child.on('error',error=>{stderr+=error.message;});
 child.on('close',(code,signal)=>{clearTimeout(timer);out.end();err.end();let events=[];for(const line of stdout.split('\n'))try{events.push(JSON.parse(line));}catch{}
 const result=events.findLast(e=>e.type==='result');
 const value={code,signal,timedOut,result:result?.result||'',session_id:result?.session_id,permission_denials:result?.permission_denials||[],is_error:result?.is_error,stderr,recorded_at:new Date().toISOString(),attempt:tryN};
 if((!result?.result||result.result==='')&&!result?.is_error&&!timedOut&&tryN<2){fs.rmSync(logPrefix+'.stdout.jsonl',{force:true});fs.rmSync(logPrefix+'.stderr.log',{force:true});attempt(tryN+1);return;}
 save(logPrefix+'.runtime.json',value);resolve(value);});
 };
 attempt(0);
 });}
function setup(def,variant){
 const base=path.join(runDir,def.id,variant),cwd=path.join(require('os').homedir(),'Downloads/pm-spark-validation-private',path.basename(runDir),def.id,variant,'fixture');fs.rmSync(cwd,{recursive:true,force:true});fs.mkdirSync(cwd,{recursive:true});
 fs.mkdirSync(path.join(cwd,'docs/requirements'),{recursive:true});
 fs.writeFileSync(path.join(cwd,'CLAUDE.md'),'本次会话仅使用当前目录 SKILL.md 和按需 references，不继承全局工作流程。用产品工作语言，不播报任务等级、角色、门禁、轨道或固定确认仪式。只操作当前本地 fixture。');
 for(const name of ['SKILL.md','references','scripts'])fs.cpSync(path.join(root,name),path.join(cwd,name),{recursive:true});
 fs.writeFileSync(path.join(cwd,'scripts/filter-product.cjs'),`const fs=require('fs'),path=require('path');const {filterDelivery,loadContract}=require('./delivery-contract.cjs');const file=path.resolve(process.argv[2]);if(!file.startsWith(process.cwd()+path.sep))throw Error('Outside fixture');const source=JSON.parse(fs.readFileSync(file,'utf8'));console.log(JSON.stringify(filterDelivery(source,'product',loadContract('references/delivery-contract.json'))));`);
 const cache=path.join(require('os').homedir(),'.npm/_npx');const browserModule=fs.readdirSync(cache).map(d=>path.join(cache,d,'node_modules/playwright')).find(p=>fs.existsSync(p));
 const template=fs.readFileSync(path.join(root,'demo/demo.html'),'utf8');const start=template.indexOf('  function renderAnnotation(ann){');const end=template.indexOf('\n  function renderDocs',start);const renderer=template.slice(start,end);let browserScript=fs.readFileSync(path.join(root,'scripts/check-replay-annotation-browser.cjs'),'utf8');browserScript=browserScript.replace("const cache=path.join(os.homedir(),'.npm/_npx');for(const d of fs.readdirSync(cache)){try{pw=require(path.join(cache,d,'node_modules/playwright'));if(pw.chromium)break;}catch{}}",'pw=require('+JSON.stringify(browserModule)+');');fs.writeFileSync(path.join(cwd,'scripts/check-replay-annotation-browser.cjs'),browserScript);fs.writeFileSync(path.join(cwd,'scripts/authoritative-renderer.js'),renderer);
 const initial={};
 const artifacts={...(def.initial_artifacts||{})};
 if(def.id==='pm-015-session-recovery'){
 artifacts['state.json']=JSON.stringify({status:'awaiting_user',confirmed:{recipient:'owner',frequency:'daily'},unfinished:['exception handling'],implementation_authorized:false,evidence:['prd.md']},null,2);
 artifacts['checkpoint.md']='# Checkpoint\n负责人每天一次提醒已确认；异常处理待确认；尚未实施。已有产物：prd.md。异常未定：发送失败后如何处理。';
 artifacts['prd.md']='# 待办提醒 PRD\n## 已确认\n仅提醒负责人；超时未完成待办每天最多一次；完成后停止提醒；不提醒主管，不增加人手。\n## 未完成\n异常处理待确认：发送失败后的恢复与可见提示。\n## 验收\nAC-01 每天最多一次；AC-02 完成后停止。\n尚未实施。';}
 if(def.id==='pm-006-annotation-boundary') artifacts['prototype.html']='<!doctype html><html lang="zh"><meta charset="utf-8"><title>投诉待办</title><body><h1>投诉待办</h1><form><label>投诉内容<textarea id="complaint"></textarea></label><button id="submit" type="submit">提交</button><p id="error" role="alert">提交失败，请重试</p></form><ul id="list"><li>客户投诉：待处理</li></ul></body></html>';
 if(['pm-008-depth-consistency','pm-009-stop-and-terms'].includes(def.id)) artifacts['context.md']='已确认：客服超时待办无提醒，目标减少漏处理，不能增加人手。两方案：负责人每天一次收到自己的超时未完成待办提醒；主管每天一次收到团队汇总。未确认负责人看到提醒后是否处理。没有已验证收益数据。';
 for(const [name,content]of Object.entries(artifacts)){fs.writeFileSync(path.join(cwd,name),content);fs.mkdirSync(path.join(base,'initial'),{recursive:true});fs.writeFileSync(path.join(base,'initial',name),content);initial[name]=relative(path.join(base,'initial',name));}
 return {base,cwd,initial};
}
const system='你是本地 PM Spark 产品工作助手。读取当前目录 SKILL.md 并依据请求读取对应 references。只允许在当前工作目录内读取、写入或校验本地文件；不访问网络或外部服务，不执行产品实施。用户已授权在本地工作目录生成所请求文档，输出路径为当前目录 docs/requirements；此目录已创建，所有产物直接置于此目录，不再创建子目录。产品过滤可先用 Write 保存 source.json，再执行 node scripts/filter-product.cjs source.json；校验可执行 node scripts/validate-prd.js、node scripts/validate-annotations.js；HTML 页面联动核对可执行 node scripts/check-replay-annotation-browser.cjs <HTML>，使用本机已有浏览器与模块，只访问本地页面并输出观察记录，需实际读取观察结果。禁止任意 shell、mkdir、node -e 或 heredoc。不要加载其他技能，不读取父目录、秘密配置、用户会话或测试标准。';
async function runVariant(def,variant,turns,layout,branch){
 const rawBase=path.join(require('os').homedir(),'Downloads/pm-spark-validation-private',path.basename(runDir),def.id,variant);fs.mkdirSync(rawBase,{recursive:true});
 const {base,cwd,initial}=setup(def,variant),session=crypto.randomUUID();const assistant=[],runtimes=[];
 for(let i=0;i<turns.length;i++){
 const allowed=[`Read(/${cwd}/**)`,`Glob(/${cwd}/**)`,`Grep(/${cwd}/**)`,`Write(/${cwd}/docs/requirements/**)`,`Edit(/${cwd}/docs/requirements/**)`,`Write(/${cwd}/*.json)`,`Edit(/${cwd}/prd.md)`,`Bash(node scripts/validate-prd.js:*)`,`Bash(node scripts/validate-annotations.js:*)`,`Bash(node scripts/filter-product.cjs:*)`,`Bash(node scripts/check-replay-annotation-browser.cjs:*)`].join(',');
 const args=['-p','--setting-sources','','--disable-slash-commands','--verbose','--output-format','stream-json','--no-chrome','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--tools','Read,Write,Edit,Glob,Grep,Bash','--allowedTools',allowed,'--system-prompt',system,...(i?['--resume',session]:['--session-id',session])];
 const prefix=path.join(rawBase,'turn-'+i);
 const context=i===0?'请读取本地 SKILL.md 和当前模式所需引用。工作目录中的已有 fixture 文件（若有）是本次用户提供的上下文，先按需核对。\n':'';
 const result=await invoke(args,cwd,prefix,context+turns[i]);mirrorEvidence(prefix,path.join(base,'turn-'+i));runtimes.push(relative(path.join(base,'turn-'+i+'.runtime.json')));assistant.push(result.result);
 console.log(def.id,variant,'turn',i,'exit',result.code,'chars',result.result.length);
 if(result.code!==0||result.timedOut||result.is_error)break;
 }
 fs.cpSync(cwd,path.join(base,'fixture'),{recursive:true});
 const conversation={user_turns:turns,assistant_turns:assistant};if(layout)conversation.layout=layout;if(branch)conversation.branch_id=branch;
 const transcript={scenario_id:def.id,evidence_type:'controlled_agent_replay',variant,conversation,runtime_paths:runtimes,initial_artifacts:initial,recorded_at:new Date().toISOString()};save(path.join(base,'transcript.json'),transcript);return relative(path.join(base,'transcript.json'));
}
async function runCase(def){const files=[];
 if(def.answer_branches)for(const branch of def.answer_branches){const turns=[...def.user_turns];turns[branch.turn_index]=branch.user_turn;files.push(await runVariant(def,branch.id,turns,null,branch.id));}
 else if(def.conversation_layout==='independent_pair'){
 const transcripts=[];for(let i=0;i<def.user_turns.length;i++){const file=await runVariant(def,'pair-'+i,[def.user_turns[i]]);files.push(file);transcripts.push(JSON.parse(fs.readFileSync(path.join(root,file))));}
 const conversation={user_turns:def.user_turns,assistant_turns:transcripts.map(t=>t.conversation.assistant_turns[0]||''),layout:'independent_pair'};const file=path.join(runDir,def.id,'transcript.json');save(file,{scenario_id:def.id,evidence_type:'controlled_agent_replay',conversation,independent_transcripts:files});files.push(relative(file));
 }else files.push(await runVariant(def,'main',def.user_turns));
 return {id:def.id,transcripts:files};}
async function main(){const selected=process.argv.slice(2);const queue=catalog.filter(def=>!selected.length||selected.includes(def.id));const indexFile=path.join(runDir,'run-index.json');const results=fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile,'utf8')).results.filter(r=>!queue.some(s=>s.id===r.id)):[];async function worker(){while(queue.length){const def=queue.shift();try{results.push(await runCase(def));}catch(e){results.push({id:def.id,error:e.stack});}save(indexFile,{type:'controlled_agent_replay',results,updated_at:new Date().toISOString()});}}
 await Promise.all([worker(),worker(),worker()]);}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={invoke,runDir,root,catalog,relative,save};
