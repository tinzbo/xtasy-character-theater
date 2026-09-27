import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characters,findNode } from '../src/stories';
import { newSession,advance,ruleRoute } from '../server/engine';
import { readFile } from 'node:fs/promises';

test('each original story has reachable endings, at least six scenes, and no broken or circular routes',()=>{
 for(const c of characters){assert.equal(c.nodes.filter(n=>n.ending).length,2);assert.ok(c.nodes.filter(n=>!n.ending).length>=6);assert.ok(c.age>=18);assert.equal(new Set(c.nodes.map(n=>n.id)).size,c.nodes.length);
 const visited=new Set<string>();const walk=(id:string,stack:string[])=>{assert.ok(!stack.includes(id),'cycle in '+c.id);const node=findNode(c,id);visited.add(id);if(node.ending)assert.equal(node.actions.length,0);else assert.ok(node.actions.length>=2);assert.equal(new Set(node.actions.map(a=>a.id)).size,node.actions.length);for(const a of node.actions)walk(a.next,[...stack,id]);};walk(c.start,[]);assert.equal(visited.size,c.nodes.length);
 }
});
test('every node has a matching media script without substituted dialogue',async()=>{const media=JSON.parse(await readFile('data/media-script.json','utf8')) as {id:string;text:string;characterId:string}[];assert.equal(media.length,24);for(const c of characters)for(const node of c.nodes){const row=media.find(m=>m.id===node.id);assert.ok(row);assert.equal(row.text,node.text);assert.equal(row.characterId,c.id);}});
test('explicit action changes exactly one step and preserves observed memory',()=>{const s=newSession('linlan');const next=advance(s,'ask','为什么关店',{actionId:'ask',engine:'choice',message:''});assert.equal(s.nodeId,'linlan-1');assert.equal(next.nodeId,'linlan-2');assert.equal(next.revision,1);assert.deepEqual(next.memories,['你先关心林岚的决定']);assert.equal(next.turns[0].text,'为什么关店');assert.throws(()=>advance(s,'reopen','',{actionId:'reopen',engine:'choice',message:''}),/不属于/);});
test('rule routing rejects unrelated text and tied keyword evidence',()=>{const actions=characters[0].nodes[0].actions;assert.equal(ruleRoute('我来帮你收拾吧台',actions).actionId,'help');assert.equal(ruleRoute('明天股票能涨吗',actions).actionId,null);assert.equal(ruleRoute('不要帮她收拾吧台',actions).actionId,null);assert.equal(ruleRoute('为什么，帮',actions).actionId,null);assert.equal(ruleRoute(actions[0].label,actions).actionId,'ask');});
test('all six endings can be completed through application state transitions',()=>{for(const c of characters){const endings=new Set<string>();const walk=(s:ReturnType<typeof newSession>)=>{const node=findNode(c,s.nodeId);if(node.ending){endings.add(node.id);assert.ok(s.turns.length>=3);return;}for(const action of node.actions){walk(advance(s,action.id,action.label,{engine:'choice',actionId:action.id,message:''}));}};walk(newSession(c.id));assert.equal(endings.size,2);}});
