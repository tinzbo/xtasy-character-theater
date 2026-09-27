import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
type Scene = { id:string; characterId:string; text:string; image:string; video:string };
type AudioClip = { id:string; textSha256:string; voice:string; voiceSha256:string; wavSha256:string; seconds:number; cues:{start:number;end:number;text:string}[] };
const root=process.cwd();
const run=(bin:string,args:string[],timeoutMs=120000):Promise<string>=>new Promise((resolve,reject)=>{
 const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let output='',errors='';
 const timer=setTimeout(()=>child.kill('SIGKILL'),timeoutMs);
 child.stdout.on('data',chunk=>{output+=String(chunk);if(bin.includes('python'))process.stdout.write(chunk);});
 child.stderr.on('data',chunk=>{errors=(errors+String(chunk)).slice(-12000);});
 child.on('error',error=>{clearTimeout(timer);reject(error);});
 child.on('close',code=>{clearTimeout(timer);code===0?resolve(output):reject(new Error(bin+' failed ('+code+'): '+errors));});
});
const stamp=(seconds:number,decimal=',')=>{const ms=Math.round(seconds*1000);return [Math.floor(ms/3600000),Math.floor(ms/60000)%60,Math.floor(ms/1000)%60].map(n=>String(n).padStart(2,'0')).join(':')+decimal+String(ms%1000).padStart(3,'0');};
const sha=(data:Buffer|string)=>createHash('sha256').update(data).digest('hex');
const scenes=JSON.parse(await readFile(join(root,'data/media-script.json'),'utf8')) as Scene[];
const config=JSON.parse(await readFile(join(root,'data/tts-config.json'),'utf8')) as Record<string,unknown>;
if(process.env.TTS_REUSE_AUDIO!=='1'){
 const python=process.env.TTS_PYTHON||join(root,'.venv-tts',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 await run(python,[join(root,'scripts/generate-tts.py'),'--root',root],1800000);
}
const audio=JSON.parse(await readFile(join(root,'.local/kokoro-build/audio-manifest.json'),'utf8')) as {config:Record<string,unknown>;clips:AudioClip[]};
if(JSON.stringify(audio.config)!==JSON.stringify(config))throw new Error('Audio configuration differs from the pinned TTS configuration');
if(audio.clips.length!==scenes.length)throw new Error('Incomplete neural audio generation');
await mkdir(join(root,'public/media/clips'),{recursive:true});
const metadata:{id:string;video:string;seconds:number;sha256:string;bytes:number;voice:string;audioSha256:string;voiceSha256:string;textSha256:string}[]=[];
for(const scene of scenes){
 if(!/^[a-z0-9-]+$/.test(scene.id)||!/^\/media\/[a-z0-9-]+\.png$/.test(scene.image)||scene.video!=='/media/clips/'+scene.id+'.mp4')throw new Error('Invalid media path');
 const spoken=audio.clips.find(c=>c.id===scene.id);if(!spoken||spoken.textSha256!==sha(scene.text))throw new Error('Audio does not match source dialogue: '+scene.id);
 const work=join(root,'.local/kokoro-build',scene.id),wav=work+'.wav',srt=work+'.srt';
 if(sha(await readFile(wav))!==spoken.wavSha256)throw new Error('Audio checksum mismatch: '+scene.id);
 const actualSeconds=Number((await run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',wav])).trim());
 if(Math.abs(actualSeconds-spoken.seconds)>.01)throw new Error('Audio duration mismatch');
 const seconds=actualSeconds+.35;const destination=join(root,'public',scene.video.slice(1));
 const cues=spoken.cues.map((cue,i)=>String(i+1)+'\n'+stamp(cue.start)+' --> '+stamp(cue.end)+'\n'+cue.text+'\n').join('\n');
 await writeFile(srt,cues);await writeFile(destination.replace(/\.mp4$/,'.srt'),cues);await writeFile(destination.replace(/\.mp4$/,'.vtt'),'WEBVTT\n\n'+cues.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g,'$1.$2'));
 await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-loop','1','-framerate','24','-i',join(root,'public',scene.image.slice(1)),'-i',wav,'-i',srt,'-map','0:v:0','-map','1:a:0','-map','2:s:0','-vf',"scale=1600:-2,zoompan=z='min(1+on*0.00009,1.035)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1280x720:fps=24,format=yuv420p",'-af','apad=pad_dur=0.35','-t',seconds.toFixed(3),'-c:v','libx264','-preset','medium','-crf','22','-threads','2','-c:a','aac','-b:a','128k','-c:s','mov_text','-movflags','+faststart',destination]);
 const bytes=await readFile(destination);metadata.push({id:scene.id,video:scene.video,seconds:Number(seconds.toFixed(3)),sha256:sha(bytes),bytes:bytes.length,voice:spoken.voice,audioSha256:spoken.wavSha256,voiceSha256:spoken.voiceSha256,textSha256:spoken.textSha256});
 console.log(JSON.stringify({id:scene.id,engine:'Kokoro-82M-v1.1-zh',voice:spoken.voice,seconds:Number(seconds.toFixed(2)),bytes:bytes.length}));
}
await writeFile(join(root,'data/media-manifest.json'),JSON.stringify({format:'1280x720 / 24 fps / H.264 / AAC / embedded Chinese subtitles',type:'Illustrated narrative video with camera motion and local Kokoro neural speech; not lip-synced performance',tts:config,generatedAt:new Date().toISOString(),totalSeconds:Number(metadata.reduce((a,m)=>a+m.seconds,0).toFixed(3)),clips:metadata},null,2)+'\n');
