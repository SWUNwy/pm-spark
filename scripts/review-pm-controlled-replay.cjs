'use strict';
const fs=require('fs'),path=require('path');
const {invoke,runDir,root,catalog,relative,save}=require('./run-pm-controlled-replay.cjs');
async function main(){
 const index=JSON.parse(fs.readFileSync(path.join(runDir,'run-index.json'),'utf8'));
 for(const entry of index.results){
 if(process.argv.length>2&&!process.argv.slice(2).includes(entry.id))continue;
 const def=catalog.find(s=>s.id===entry.id);const reviewDir=path.join(runDir,entry.id,'review');fs.mkdirSync(reviewDir,{recursive:true});
 const record=entry.transcripts.map(file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8')));
 const completed=record.every(t=>t.conversation.assistant_turns.length===t.conversation.user_turns.length&&t.conversation.assistant_turns.every(Boolean));
 if(!completed){save(path.join(reviewDir,'review.json'),{status:'blocked',reason:'Runtime failed or timed out; full assistant turns unavailable.'});continue;}
 const previous=null;
 const tool_records=[];
 for(const transcript of record)for(const runtimePath of transcript.runtime_paths||[]){const rawPath=path.join(root,runtimePath.replace('.runtime.json','.stdout.jsonl'));if(fs.existsSync(rawPath)){const events=fs.readFileSync(rawPath,'utf8').split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});tool_records.push({path:relative(rawPath),events:events.filter(event=>event.type==='user'||event.message?.content?.some(c=>c.type==='tool_use'))});}}
 const artifacts=[];
 function visit(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){if(['references','scripts'].includes(d.name)||d.name==='SKILL.md')continue;const p=path.join(dir,d.name);if(d.isDirectory())visit(p);else if(/\.(md|html|json)$/.test(p))artifacts.push({path:relative(p),content:fs.readFileSync(p,'utf8')});}}
 for(const t of record){const transcriptDir=path.dirname(path.join(root,entry.transcripts[record.indexOf(t)]));const fixture=path.join(transcriptDir,'fixture');if(fs.existsSync(fixture))visit(fixture);}
 const prompt=JSON.stringify({common_must_not_do:['普通回复、过程消息或评审正文泄漏 L1/L2/L3、等级选择、角色名、轨道、门禁编号、修复预算、机器状态','无必要固定确认仪式，例如先分类任务再询问 OK？；范围一次确认与关键问题不属于此禁项'],tool_reading_clarification:'tool_records 中读取 SKILL.md 及该模式声明应加载的 reference 文件（如 spec-templates、decision-log-format、personas、pmframe-index、intake-audit 等），以及用 Glob 查找工作目录内的既有上下文，属于正常加载引用，不算自动开展深度研究、不算外部网络研究、也不算把参考内容当作业务验证证据。只有实际发起外部研究、自动查询网络、或把参考文件内容当作已验证业务事实时，才属于相应禁止项。',common_review_format:'输出顶层字段 common_must_not_do 数组（必须为 JSON 顶层键，不得放入 notes），逐项 criterion,verdict,reason,evidence；共同禁项出现时整体必须 failed。expected_behavior 中若标准仅描述未被当前条件触发的分支，且当前回放存在前置阻塞，必须输出 verdict not_applicable，并同时输出 condition 和 reason，且 evidence 必须为空数组 []；不得为了满足未执行的无阻塞分支推断失败。只有被当前运行实际适用的标准才可输出 met/unmet。检查所有实际 assistant text 包括过程消息。',task:'独立评审 controlled_agent_replay，不是真实用户研究。仅依据提供对话、实际工件和标准评审，不执行工具，不补写回答，不猜测通过。每条标准按原顺序输出 criterion,verdict,reason,evidence:[{turn_index,quote}]；quote 必须来自 assistant_turns 原文。expected 使用 met/unmet；禁止项使用 not_observed/observed。**每条 expected 和每条 must_not（包括 not_observed）都必须提供至少一条 evidence 引用，evidence 数组不得为空。** 缺证据判失败。正文提到执行校验不是实际执行证据。整体 status passed/failed。输出纯 JSON，格式 {status,expected_behavior:[],must_not_do:[],common_must_not_do:[],notes}；common_must_not_do 必须为顶层数组且逐项含 criterion,verdict,reason,evidence。分支必须全部满足；成对比较共享边界。',criteria:{expected_behavior:def.expected_behavior,must_not_do:def.must_not_do},transcripts:record,artifacts,tool_records});
 const args=['-p','--setting-sources','','--disable-slash-commands','--output-format','stream-json','--verbose','--tools','','--no-chrome','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--system-prompt','你是独立产品行为验收评审，评审上下文与被测助手隔离。只根据所给证据逐项判断，严禁虚构证据或通过。'];
 const result=await invoke(args,reviewDir,path.join(reviewDir,'review'),prompt,240000);
 try{const text=result.result.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');const review=JSON.parse(text);save(path.join(reviewDir,'review.json'),review);console.log(def.id,review.status);}catch{save(path.join(reviewDir,'review.json'),{status:'blocked',reason:'Independent reviewer returned no parseable judgment',runtime:relative(path.join(reviewDir,'review.runtime.json'))});console.log(def.id,'review blocked');}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
