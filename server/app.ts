import express from 'express';
import { z } from 'zod';
import { characters,findCharacter,findNode } from '../src/stories';
import { newSession,advance } from './engine';
import { routeAction } from './router';
import type { SessionStore } from './store';
import type { RouteResult } from '../src/types';
export function createApp(store:SessionStore){
 const app=express();app.disable('x-powered-by');app.use(express.json({limit:'8kb'}));
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');if(req.path.startsWith('/api/')) res.setHeader('Cache-Control','no-store');
 if(req.method==='POST'&&req.headers.origin){const host=req.get('host');if(req.headers.origin!==`http://${host}`&&req.headers.origin!==`https://${host}`){res.status(403).json({error:'请求来源不受信任'});return;}} next();});
 const requests=new Map<string,{count:number,reset:number}>(); const busy=new Set<string>();
 app.use('/api',(req,res,next)=>{const now=Date.now();for(const[key,val]of requests){if(val.reset<now)requests.delete(key);}const key=req.ip||'local';const bucket=requests.get(key)??{count:0,reset:now+60000};bucket.count++;requests.set(key,bucket);if(bucket.count>90){res.status(429).json({error:'操作有些频繁，请一分钟后再试。'});return;}next();});
 app.get('/api/health',(_req,res)=>res.json({ok:true,mode:process.env.TYPESAFE_API_KEY?'jev':'rules',version:'0.1.0'}));
 app.get('/api/characters',(_req,res)=>res.json(characters));
 app.post('/api/sessions',async(req,res)=>{const input=z.object({characterId:z.enum(['linlan','shenyao','xuzhiqiu'])}).safeParse(req.body);if(!input.success){res.status(400).json({error:'请选择有效角色'});return;}const session=newSession(input.data.characterId);await store.put(session);res.status(201).json({session});});
 app.get('/api/sessions/:id',(req,res)=>{if(!z.uuid().safeParse(req.params.id).success){res.status(400).json({error:'会话编号无效'});return;}const session=store.get(req.params.id);if(!session){res.status(404).json({error:'没有找到这段故事，它可能已被清理。请重新开始。'});return;}res.json({session});});
 const actionInput=z.object({revision:z.number().int().nonnegative(),text:z.string().trim().max(600).optional(),actionId:z.string().max(40).optional()}).refine(i=>Boolean(i.text)||Boolean(i.actionId));
 app.post('/api/sessions/:id/actions',async(req,res)=>{
 const input=actionInput.safeParse(req.body);const id=req.params.id;
 if(!z.uuid().safeParse(id).success||!input.success){res.status(400).json({error:'行动内容无效，请输入 1–600 个字。'});return;}
 const session=store.get(id);if(!session){res.status(404).json({error:'故事不存在，请重新开始。'});return;}
 if(busy.has(id)||session.revision!==input.data.revision){res.status(409).json({error:'故事进度已变化，请刷新后再继续。'});return;}
 const character=findCharacter(session.characterId)!;const node=findNode(character,session.nodeId);if(node.ending){res.status(409).json({error:'本段故事已结束，可以重开探索另一个结局。'});return;}
 busy.add(id);
 try{
 let route:RouteResult;
 if(input.data.actionId){if(!node.actions.some(a=>a.id===input.data.actionId)){res.status(400).json({error:'这个行动不属于当前场景。'});return;}route={actionId:input.data.actionId,engine:'choice',message:'已选择明确行动'};}
 else route=await routeAction(input.data.text!,session,node,character);
 if(!route.actionId){res.json({session,route});return;}
 const updated=advance(session,route.actionId,input.data.text||node.actions.find(a=>a.id===route.actionId)!.label,route);
 await store.put(updated);res.json({session:updated,route});
 }finally{busy.delete(id);}
 });
 app.use('/api',(_req,res)=>res.status(404).json({error:'接口不存在'}));
 app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{const status=(error as {status?:number}).status;res.status(status===413?413:status===400?400:500).json({error:status===413?'请求内容过长':status===400?'请求内容格式无效':'暂时无法保存故事，请稍后重试。'});});
 return app;
}
