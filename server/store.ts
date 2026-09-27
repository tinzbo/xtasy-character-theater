import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Session } from '../src/types';
import { findCharacter, findNode } from '../src/stories';
const sessionSchema=z.object({id:z.uuid(),characterId:z.string(),nodeId:z.string(),revision:z.number().int().nonnegative(),memories:z.array(z.string().max(300)).max(40),turns:z.array(z.object({nodeId:z.string(),text:z.string().max(600),action:z.string(),at:z.iso.datetime(),engine:z.enum(['choice','jev','rules'])})).max(40),createdAt:z.iso.datetime(),updatedAt:z.iso.datetime()});
export class SessionStore {
 private sessions=new Map<string,Session>(); private queue=Promise.resolve();
 constructor(private directory:string){}
 async initialize(){
 await mkdir(this.directory,{recursive:true,mode:0o700});
 try { const stored=z.array(sessionSchema).max(500).parse(JSON.parse(await readFile(path.join(this.directory,'sessions.json'),'utf8')));
 for(const s of stored){const c=findCharacter(s.characterId);if(!c)throw new Error('持久化数据引用了未知角色');findNode(c,s.nodeId);this.sessions.set(s.id,s);}
 } catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 }
 get(id:string):Session|undefined{return this.sessions.get(id);}
 async put(session:Session){
 const job=this.queue.then(async()=>{
 const next=new Map(this.sessions);next.set(session.id,session);
 if(next.size>500){ const sorted=[...next.values()].sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));next.delete(sorted[0].id); }
 const temp=path.join(this.directory,'sessions.tmp');await writeFile(temp,JSON.stringify([...next.values()]),{mode:0o600});await rename(temp,path.join(this.directory,'sessions.json'));this.sessions=next;
 }); this.queue=job.catch(()=>{});await job;
 }
}
