import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

process.env.TZ = 'UTC'; // Repeatable offline fixtures; runtime timezone still needs live validation.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['audio-queue','audio-assistant','call-stats','error-handler'];
const workflows=Object.fromEntries(files.map(f=>[f,JSON.parse(fs.readFileSync(path.join(root,'workflows',f+'.json'),'utf8'))]));
const node=(file,name)=>workflows[file].nodes.find(n=>n.name===name);
const run=(file,name,context)=>new vm.Script('(function(){\n'+node(file,name).parameters.jsCode+'\n})()').runInNewContext(context,{timeout:500});
const plain=v=>JSON.parse(JSON.stringify(v));
const edges=(file,name,type='main',output=0)=>(workflows[file].connections[name]?.[type]?.[output]??[]).map(e=>e.node);
const sample=JSON.parse(fs.readFileSync(path.join(root,'examples/analysis-response.json'),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'examples/queue-rows.json'),'utf8'));
const stats=(rows,startDate='2026-09-01',endDate='2026-10-01')=>plain(run('call-stats','Code in JavaScript',{$:name=>name==='Start'?{first:()=>({json:{startDate,endDate}})}:{all:()=>rows.map(json=>({json}))}}))[0].json;

for(const [file,expected] of [['audio-queue',14],['audio-assistant',4],['call-stats',4],['error-handler',2]]) {
  test(file+': node count, inactive and no pinned data',()=>{
    const w=workflows[file];assert.equal(w.nodes.length,expected);assert.equal(w.active,false);assert.deepEqual(w.pinData,{});
  });
  test(file+': no credentials, instance metadata or secret patterns',()=>{
    const w=workflows[file],raw=JSON.stringify(w);
    for(const n of w.nodes){assert.equal('credentials' in n,false);assert.equal('webhookId' in n,false);}
    for(const key of ['id','versionId','meta','tags','nodeGroups'])assert.equal(key in w,false);
    assert.doesNotMatch(raw,/sk-(?:proj-)?[A-Za-z0-9_-]{15,}|pk_[A-Za-z0-9_-]{15,}|gh[pousr]_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN .*PRIVATE KEY-----/);
    assert.doesNotMatch(raw,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });
  test(file+': graph targets and literal expression references exist',()=>{
    const w=workflows[file],names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);
    for(const [source,groups] of Object.entries(w.connections)){assert(names.has(source));for(const outputs of Object.values(groups))for(const entries of outputs)for(const edge of entries)assert(names.has(edge.node));}
    for(const m of JSON.stringify(w).matchAll(/\$\('([^']+)'\)/g))assert(names.has(m[1]));
  });
}
test('both model nodes are gpt-5-mini',()=>{
  for(const file of ['audio-queue','audio-assistant'])assert.equal(node(file,'OpenAI Chat Model').parameters.model.value,'gpt-5-mini');
  assert.deepEqual(edges('audio-queue','OpenAI Chat Model','ai_languageModel'),['Basic LLM Chain']);
  assert.deepEqual(edges('audio-assistant','OpenAI Chat Model','ai_languageModel'),['AI Agent']);
});
test('four source Code nodes compile',()=>{
  let count=0;for(const w of Object.values(workflows))for(const n of w.nodes)if(n.type==='n8n-nodes-base.code'){count++;new vm.Script('(function(){\n'+n.parameters.jsCode+'\n})');}assert.equal(count,4);
});
test('public chat disabled and cross-workflow references are placeholders',()=>{
  assert.equal(node('audio-assistant','When chat message received').parameters.public,false);
  assert.equal(node('audio-assistant',"Call '[tool] Get call stats'").parameters.workflowId.value,'REPLACE_WITH_STATS_WORKFLOW_ID');
  assert.equal(workflows['audio-queue'].settings.errorWorkflow,'REPLACE_WITH_ERROR_WORKFLOW_ID');
  assert.deepEqual(edges('audio-assistant',"Call '[tool] Get call stats'",'ai_tool'),['AI Agent']);
});
test('Calls resources shared by queue and stats, Errors separate',()=>{
  for(const file of files)for(const n of workflows[file].nodes)if(n.type==='n8n-nodes-base.googleSheets'){
    assert.equal(n.parameters.documentId.mode,'id');
    assert.equal(n.parameters.documentId.value,file==='error-handler'?'REPLACE_WITH_ERROR_SPREADSHEET_ID':'REPLACE_WITH_QUEUE_SPREADSHEET_ID');
    assert.equal(n.parameters.sheetName.value,file==='error-handler'?'Errors':'Calls');
    assert.equal('cachedResultUrl' in n.parameters.documentId,false);
  }
});
test('schedule reads one blank-status row every two minutes',()=>{
  assert.equal(node('audio-queue','Each 2 minutes').parameters.rule.interval[0].minutesInterval,2);
  const p=node('audio-queue','Get row(s) in sheet').parameters;assert.equal(p.options.returnFirstMatch,true);assert.equal(p.filtersUI.values[0].lookupColumn,'Status');assert.equal(p.filtersUI.values[0].lookupValue,undefined);
});
test('AssemblyAI request preserves Ukrainian configuration',()=>{
  const p=node('audio-queue','/transcript').parameters;assert.equal(p.method,'POST');assert.equal(p.url,'https://api.assemblyai.com/v2/transcript');assert.equal(p.genericAuthType,'httpHeaderAuth');
  const body=JSON.parse(p.jsonBody.slice(1));assert.deepEqual(body.speech_models,['universal-2']);assert.equal(body.language_code,'uk');assert.equal(body.speaker_labels,true);assert.equal(body.speakers_expected,2);
});
test('pending transcription loops and provider error terminates',()=>{
  const c=node('audio-queue','If completed or eror').parameters.conditions;assert.equal(c.combinator,'or');assert.deepEqual(c.conditions.map(x=>x.rightValue),['completed','error']);
  assert.deepEqual(edges('audio-queue','If completed or eror','main',1),['Wait 1 sec']);
  assert.deepEqual(edges('audio-queue','If completed','main',1),['Stop and Error']);
});
test('extractor maps a Google Drive URL and preserves row',()=>{
  const result=plain(run('audio-queue','Extract URL',{$input:{all:()=>[{json:fixtures[0]}]}}));
  assert.equal(result[0].json.downloadLink,'https://drive.google.com/uc?export=download&id=DEMO_AUDIO_ID');assert.equal(result[0].json.row_number,2);
});
test('extractor ignores rows already Done',()=>{
  assert.deepEqual(plain(run('audio-queue','Extract URL',{$input:{all:()=>[{json:fixtures[1]}]}})),[]);
});
test('extractor returns only first blank-status row',()=>{
  const result=run('audio-queue','Extract URL',{$input:{all:()=>[{json:fixtures[0]},{json:{...fixtures[0],row_number:9}}]}});
  assert.equal(result.length,1);assert.equal(result[0].json.row_number,2);
});
for(const bad of [undefined,'https://example.com/audio.mp3',''])test('known limitation: unsupported recording URL '+JSON.stringify(bad),()=>{
  assert.throws(()=>run('audio-queue','Extract URL',{$input:{all:()=>[{json:{Status:'','Recording URL':bad}}]}}));
});
test('transcript prefix covers whole text, not speaker isolation',()=>{
  const result=run('audio-queue','Code in JavaScript',{$json:{text:'Manager and customer',id:'DEMO'}});
  assert.equal(result[0].json.text,'Клієнт:\n\nManager and customer');assert.equal(result[0].json.id,'DEMO');
});
test('analysis parser returns source fields',()=>{
  assert.deepEqual(plain(run('audio-queue','Code in JavaScript1',{$json:{text:JSON.stringify(sample)}})),[{json:sample}]);
});
for(const bad of ['bad json','```json\n{}\n```',''])test('known limitation: model parser rejects '+JSON.stringify(bad),()=>{
  assert.throws(()=>run('audio-queue','Code in JavaScript1',{$json:{text:bad}}));
});
test('known limitation: parser accepts missing fields and arbitrary tone',()=>{
  const missing=run('audio-queue','Code in JavaScript1',{$json:{text:'{}'}});assert.equal(missing[0].json.tone,undefined);
  const unchecked=run('audio-queue','Code in JavaScript1',{$json:{text:'{"tone":"other"}'}});assert.equal(unchecked[0].json.tone,'other');
});
test('sheet update uses row number, stores Done/tone/category, not summary',()=>{
  const p=node('audio-queue','Update row in sheet').parameters;assert.equal(p.operation,'update');assert.deepEqual(p.columns.matchingColumns,['row_number']);assert.equal(p.columns.value.Status,'Done');assert.equal(p.columns.value.Tone,'={{ $json.tone }}');assert.equal(p.columns.value.Category,'={{ $json.category }}');assert.equal('Summary' in p.columns.value,false);
});
test('stats count exact Done and exact negative tone',()=>{
  const result=stats([fixtures[1],fixtures[2],{...fixtures[1],Status:''},{...fixtures[1],Tone:'negative'}]);assert.deepEqual(result,{totalCalls:3,negativeCalls:1,negativeCallPercent:33});
});
test('stats include end-of-day and exclude next day in UTC fixtures',()=>{
  const rows=['2026-09-30T00:00:00Z','2026-09-30T23:59:59.999Z','2026-10-01T00:00:00Z'].map(d=>({...fixtures[1],'Processed At':d}));
  assert.equal(stats(rows,'2026-09-30','2026-09-30').totalCalls,2);
});
test('stats round percentage to integer',()=>{
  assert.equal(stats([fixtures[1],fixtures[1],fixtures[2]]).negativeCallPercent,67);
});
test('stats return zero for no observations',()=>{
  assert.deepEqual(stats([]),{totalCalls:0,negativeCalls:0,negativeCallPercent:0});
});
test('known limitation: invalid dates yield zero rather than validation error',()=>{
  assert.equal(stats([fixtures[1]],'not-a-date','2026-10-01').totalCalls,0);
  assert.equal(stats([{...fixtures[1],'Processed At':'bad'}]).totalCalls,0);
});
test('known limitation: reversed range yields zero',()=>{
  assert.equal(stats([fixtures[1]],'2026-10-02','2026-09-01').totalCalls,0);
});
test('error handler maps time/message but not execution link',()=>{
  const p=node('error-handler','Append row in sheet').parameters;assert.equal(p.operation,'append');assert.equal(p.columns.value.Text,'={{ $json.execution.error.message }}');assert.equal('Execution link' in p.columns.value,false);
});
test('documentation relative links resolve',()=>{
  for(const relative of ['README.md','SECURITY.md','docs/SETUP.md','docs/LIMITATIONS.md','docs/VALIDATION.md']){
    const file=path.join(root,relative);
    for(const m of fs.readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)){if(/^(https?:|mailto:|#)/.test(m[1]))continue;assert(fs.existsSync(path.resolve(path.dirname(file),m[1].split('#')[0])),relative+': '+m[1]);}
  }
});
