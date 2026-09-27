import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
type Entry={id:string;video:string;sha256:string;bytes:number;seconds:number;voice:string;audioSha256:string;voiceSha256:string;textSha256:string};
const manifest=JSON.parse(await readFile('data/media-manifest.json','utf8')) as {clips:Entry[];totalSeconds:number;tts:unknown};
const scenes=JSON.parse(await readFile('data/media-script.json','utf8')) as {id:string;video:string;text:string;characterId:string}[];
const config=JSON.parse(await readFile('data/tts-config.json','utf8')) as {model:string;revision:string;license:string;voices:Record<string,string>};
if(scenes.length!==manifest.clips.length||new Set(manifest.clips.map(c=>c.id)).size!==scenes.length)throw new Error('Script/media count mismatch');
if(JSON.stringify(manifest.tts)!==JSON.stringify(config)||config.license!=='Apache-2.0')throw new Error('Unverified TTS configuration');
for(const clip of manifest.clips){
 const scene=scenes.find(s=>s.id===clip.id&&s.video===clip.video);if(!scene)throw new Error('Unexpected clip: '+clip.id);
 if(clip.video!=='/media/clips/'+clip.id+'.mp4'||!/^[a-z0-9-]+$/.test(clip.id))throw new Error('Invalid clip path');
 const file=await readFile(join('public',clip.video.slice(1)));
 if(file.length!==clip.bytes||createHash('sha256').update(file).digest('hex')!==clip.sha256)throw new Error('Corrupt clip: '+clip.id);
 if(clip.seconds<=0||clip.seconds>61)throw new Error('Invalid duration');
 if(clip.voice!==config.voices[scene.characterId]||!/^[a-f0-9]{64}$/.test(clip.audioSha256)||!/^[a-f0-9]{64}$/.test(clip.voiceSha256)||clip.textSha256!==createHash('sha256').update(scene.text).digest('hex'))throw new Error('Unverified neural audio provenance: '+clip.id);
 const vtt=await readFile(join('public',clip.video.slice(1).replace(/\.mp4$/,'.vtt')),'utf8');
 if(!vtt.startsWith('WEBVTT')||!vtt.includes('-->'))throw new Error('Missing captions');
}
if(Math.abs(manifest.clips.reduce((total,c)=>total+c.seconds,0)-manifest.totalSeconds)>.002)throw new Error('Total duration mismatch');
console.log(JSON.stringify({ok:true,clips:manifest.clips.length,seconds:manifest.totalSeconds,model:config.model,revision:config.revision}));
