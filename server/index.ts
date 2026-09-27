import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { createApp } from './app';
import { SessionStore } from './store';
const store=new SessionStore(path.resolve(process.env.DATA_DIR||'.data'));await store.initialize();
const app=createApp(store);
if(process.env.NODE_ENV==='production'){app.use(express.static(path.resolve('dist')));app.get('/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));}
else {const {createServer:createViteServer}=await import('vite');const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const port=Number(process.env.PORT||4312);const host=process.env.HOST||'127.0.0.1';
app.listen(port,host,()=>console.log(`Xtasy Theatre ready at http://${host}:${port}`));
