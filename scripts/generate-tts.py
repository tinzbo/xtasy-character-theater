"""Generate original Chinese dialogue using a pinned, Apache-2.0 Kokoro model.
No Apple System Voices, cloned voices, remote synthesis API, or eSpeak audio.
Only public model downloads use the network; inference runs locally.
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, sys, time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from kokoro import KModel, KPipeline

def digest(path: str | Path) -> str:
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''): h.update(part)
    return h.hexdigest()

parser=argparse.ArgumentParser()
parser.add_argument('--root',action='append',required=True)
parser.add_argument('--only',default='',help='Optional scene ID for a listening check')
args=parser.parse_args()
roots=[Path(p).resolve() for p in args.root]
configs=[json.loads((root/'data/tts-config.json').read_text()) for root in roots]
config=configs[0]
if any(c!=config for c in configs): raise RuntimeError('All projects must use the same pinned TTS configuration')
cache=os.environ.get('HF_HOME',str(roots[0]/'.local/tts-cache'))
os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN']='1'
torch.set_num_threads(4)
torch.manual_seed(config['seed'])
np.random.seed(config['seed'])
print(json.dumps({'stage':'download','model':config['model'],'revision':config['revision']}),flush=True)
assets={}
for filename in ['config.json',config['weightsFile'],*[f'voices/{v}.pt' for v in sorted(set(config['voices'].values()))]]:
    assets[filename]=hf_hub_download(config['model'],filename,revision=config['revision'],cache_dir=cache,token=False)
weights=assets[config['weightsFile']]
if digest(weights)!=config['weightsSha256']: raise RuntimeError('Pinned model weight checksum mismatch')
model=KModel(repo_id=config['model'],config=assets['config.json'],model=weights).to('cpu').eval()
pipeline=KPipeline(lang_code='z',repo_id=config['model'],model=model)
print(json.dumps({'stage':'ready','device':'cpu','voices':config['voices']}),flush=True)
for root in roots:
    scenes=json.loads((root/'data/media-script.json').read_text())
    work=root/'.local/kokoro-build'
    work.mkdir(parents=True,exist_ok=True)
    rendered=[]
    for scene in scenes:
        if args.only and scene['id']!=args.only: continue
        if not re.fullmatch(r'[a-z0-9-]+',scene['id']): raise RuntimeError('Invalid scene ID')
        text=scene['text']; voice=config['voices'][scene['characterId']]
        if re.search(r'[A-Za-z]',text): raise RuntimeError('This configured Chinese-only pipeline requires explicit phonemes for Latin words')
        voice_path=assets[f'voices/{voice}.pt']
        phrases=re.findall(r'[^。！？；]+[。！？；]?',text)
        if ''.join(phrases)!=text: raise RuntimeError('Text split lost source content')
        chunks=[]; cues=[]; position=0.0
        began=time.monotonic()
        for phrase in phrases:
            outputs=list(pipeline(phrase,voice=voice_path,speed=config['speed']))
            parts=[out.audio.detach().cpu().numpy().astype(np.float32) for out in outputs if out.audio is not None]
            if not parts: raise RuntimeError(f'No generated audio for {scene["id"]}')
            audio=np.concatenate(parts)
            if not np.isfinite(audio).all() or np.max(np.abs(audio))<.01: raise RuntimeError('Invalid or silent audio')
            duration=len(audio)/config['sampleRate']
            cues.append({'start':round(position,3),'end':round(position+duration,3),'text':phrase})
            chunks.append(audio); position+=duration
            pause=np.zeros(round(config['sentencePauseSeconds']*config['sampleRate']),dtype=np.float32)
            chunks.append(pause); position+=len(pause)/config['sampleRate']
        waveform=np.concatenate(chunks)
        if len(waveform)/config['sampleRate']<2 or len(waveform)/config['sampleRate']>60: raise RuntimeError('Unexpected dialogue duration')
        peak=float(np.max(np.abs(waveform)))
        if peak>.98: waveform*=.98/peak
        destination=work/f'{scene["id"]}.wav'
        sf.write(destination,waveform,config['sampleRate'],subtype='PCM_16')
        rendered.append({'id':scene['id'],'textSha256':hashlib.sha256(text.encode()).hexdigest(),'voice':voice,'voiceSha256':digest(voice_path),'wavSha256':digest(destination),'seconds':round(len(waveform)/config['sampleRate'],3),'cues':cues})
        print(json.dumps({'project':root.name,'id':scene['id'],'voice':voice,'seconds':round(position,2),'computeSeconds':round(time.monotonic()-began,2)}),flush=True)
    (work/'audio-manifest.json').write_text(json.dumps({'config':config,'clips':rendered},ensure_ascii=False,indent=2)+'\n')
