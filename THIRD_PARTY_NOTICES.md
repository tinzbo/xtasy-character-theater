# Third-party notices

## Kokoro Chinese neural text-to-speech

The public dialogue audio was synthesized locally from this project's original authored Chinese dialogue using **Kokoro-82M-v1.1-zh**, not a recording of an actor and not a cloned voice. The model weights are not distributed in this repository or its release archive.

- Model publisher: **hexgrad**.
- Official model: https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh
- Pinned revision: `01e7505bd6a7a2ac4975463114c3a7650a9f7218`.
- Model license declared by its publisher: **Apache License 2.0**.
- Weight file: `kokoro-v1_1-zh.pth`.
- Verified weight SHA-256: `b1d8410fa44dfb5c15471fd6c4225ea6b4e9ac7fa03c98e8bea47a9928476e2b`.
- Official inference library: https://github.com/hexgrad/kokoro (`kokoro==0.9.4`, Apache-2.0).
- Chinese phonemization: https://github.com/hexgrad/misaki (`misaki==0.9.4`, Apache-2.0).
- Full license copy: [licenses/Kokoro-Apache-2.0.txt](licenses/Kokoro-Apache-2.0.txt).

The model publisher states that its 100 Chinese speakers came from a professional LongMaoData dataset provided under permissive authorization. See the [official model card at the pinned revision](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh/blob/01e7505bd6a7a2ac4975463114c3a7650a9f7218/README.md). This is the publisher's provenance statement, not an independent audit of that dataset.

The selected Chinese voice packs are `zf_001` (Lin Lan), `zm_010` (Shen Yao), and `zf_018` (Xu Zhiqiu), depending on the characters in the project. Each rendered clip records the voice-pack checksum, generated WAV checksum, and source-dialogue checksum in `data/media-manifest.json`. The complete generation configuration is in `data/tts-config.json`.

The software, model and voice-pack licenses are distinct from the project's source-code license. No ownership in the third-party model is claimed or transferred. When redistributing the model or inference library separately, preserve the applicable license and notices. No model weights, virtual environments or raw audio intermediates are included here.

## Generated visual assets

Original fictional adult character artwork was generated for this project. Prompts and provenance are recorded in [docs/media-provenance.md](docs/media-provenance.md). The images are not based on a real named person. Videos combine those images, authored dialogue, synthesized narration and deterministic camera motion; they are not real-time lip-synced performances.

## Other software dependencies

Node and Python dependencies retain their own licenses. Node dependencies are installed from `package-lock.json`; the optional media-generation environment is recorded in `scripts/tts-requirements.txt` and `scripts/tts-lock.txt`. The archives do not contain node_modules or Python installations. The compiled frontend contains the necessary dependency code; its license notices are preserved in [licenses/frontend](licenses/frontend/README.md). FFmpeg is a separately installed build tool; its executable is not distributed here.
