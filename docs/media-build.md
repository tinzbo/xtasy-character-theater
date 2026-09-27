# Rebuilding the public media

Ordinary playback needs only Node.js: the compiled MP4/SRT/VTT files are committed. Media regeneration is optional and uses a local neural TTS model, without a paid API.

## Environment

Verified on Python 3.11.13, Kokoro 0.9.4 and PyTorch 2.8.0 on an Apple Silicon CPU. Install FFmpeg / ffprobe for your platform, then create an isolated Python environment:

```bash
uv venv --python 3.11 .venv-tts
uv pip install --python .venv-tts/bin/python -r scripts/tts-lock.txt
npm run media:build
```

On Windows, use `.venv-tts/Scripts/python.exe` as the Python path. `scripts/build-media.ts` automatically selects that path on Windows. You can set `TTS_PYTHON` to another compatible environment's interpreter. No system speech-synthesis command is used.

The first generation downloads the model and selected voices from the official public Hugging Face repository. All files are pinned to `data/tts-config.json`'s immutable revision; the main weight file must also pass the recorded SHA-256 check. The default model cache lives in `.local/tts-cache`; `HF_HOME` can point it outside the repository. No key or account token is required or used.

## Deterministic inputs and traceability

- Source: `data/media-script.json`, unchanged original dialogue.
- Model: `hexgrad/Kokoro-82M-v1.1-zh`, immutable revision `01e7505bd6a7a2ac4975463114c3a7650a9f7218`.
- Voices: female `zf_001` / male `zm_010` / female `zf_018`, selected by character.
- Inference: CPU, 4 threads, seed `20260927`, speed `1.0`, 24,000 Hz, PCM16 intermediate audio.
- A `0.16 s` pause follows each sentence; subtitle timings use measured sentence output lengths.
- Container: 1280×720, 24 fps, H.264, AAC, embedded Chinese subtitle track plus SRT/VTT.
- Each MP4 manifest entry contains MP4 SHA-256, WAV SHA-256, source-text SHA-256 and voice-pack SHA-256.

This configured pipeline is Chinese only. It rejects Latin-letter input rather than silently omitting words; multilingual scripts require an explicit phonemization integration. Runtime warnings from the upstream model about one-layer dropout and deprecated weight normalization do not alter the configured model.

Intermediate WAV files and `audio-manifest.json` are generated into **`.local/kokoro-build`**, separate from any earlier local experiments. Normal builds regenerate every audio file. For a local retry of video encoding only, `TTS_REUSE_AUDIO=1 npm run media:build` reuses the neural audio only after configuration, dialogue hash, WAV hash and duration checks; it cannot reuse unrelated earlier audio.

`npm run media:check` checks every published MP4, caption and provenance entry against the pinned configuration. Python environments, model caches and audio intermediates are ignored and must stay out of release archives.

Neural inference is deterministic within the recorded environment; exact floating point samples can vary across platforms or library releases. The committed media hashes identify the release artifacts exactly.
