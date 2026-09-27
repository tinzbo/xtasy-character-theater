import { randomUUID } from 'node:crypto';
import type { Session, RouteResult, Action } from '../src/types';
import { findCharacter, findNode } from '../src/stories';
export function newSession(characterId: string): Session {
 const character=findCharacter(characterId); if(!character) throw new Error('角色不存在');
 const now=new Date().toISOString(); return {id:randomUUID(),characterId,nodeId:character.start,revision:0,memories:[],turns:[],createdAt:now,updatedAt:now};
}
export function advance(session:Session,actionId:string,text:string,route:RouteResult):Session {
 const character=findCharacter(session.characterId); if(!character) throw new Error('角色不存在');
 const node=findNode(character,session.nodeId); const action=node.actions.find(a=>a.id===actionId); if(!action) throw new Error('该行动不属于当前剧情');
 if(session.turns.length>=40) throw new Error('会话已达到行动上限，请重新开始');
 const now=new Date().toISOString();
 return {...session,nodeId:action.next,revision:session.revision+1,updatedAt:now,memories:[...session.memories,action.memory],turns:[...session.turns,{nodeId:node.id,text,action:action.label,at:now,engine:route.engine}]};
}
export function ruleRoute(text:string,actions:Action[]):RouteResult {
 const normalized=text.toLowerCase().trim();
 if(/不要|别|不想|不能|不愿|不去|不需要/.test(normalized)) return {actionId:null,engine:'rules',message:'这句话包含否定表达，关键词模式无法可靠理解。请直接选择当前行动。'};
 const exact=actions.find(a=>a.label===normalized);
 const scores=actions.map(a=>({a,score:a.keywords.filter(k=>normalized.includes(k.toLowerCase())).length})).sort((x,y)=>y.score-x.score);
 const match=exact??(scores[0]?.score>0 && scores[0]?.score !== scores[1]?.score ? scores[0].a : undefined);
 return {actionId:match?.id??null,engine:'rules',message:match?'已按关键词匹配行动；当前未使用 Jev 语义判断。':'这句话暂时无法对应当前行动。请补充具体意图，或直接选择下方行动。'};
}
