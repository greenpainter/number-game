"""Offline only. Requires supertonic==1.3.1 and ffmpeg; model directory argument."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import numpy as np
from supertonic import TTS

folder = Path(__file__).resolve().parents[1] / 'audio' / 'ko'
manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
tts = TTS(model_dir=Path(sys.argv[1]), auto_download=False, intra_op_num_threads=4)
style = tts.get_voice_style(manifest['voice'])
for i, clip in enumerate(manifest['clips']):
    if '--missing-only' in sys.argv and (folder / clip['file']).exists() and clip.get('sha256'):
        continue
    np.random.seed(manifest['seed'] + i)
    wav, duration = tts.synthesize(clip['text'], voice_style=style, lang=manifest['language'], total_steps=manifest['steps'], speed=manifest['speed'])
    with tempfile.TemporaryDirectory(prefix='village-voice-') as temp:
        source = str(Path(temp) / 'speech.wav')
        tts.save_audio(wav, source)
        target = folder / clip['file']
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', str(target)], check=True)
    clip['durationSeconds'] = round(float(duration[0]), 3)
    clip['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
    print(f"{i+1}/{len(manifest['clips'])} {clip['file']} {clip['durationSeconds']}s", flush=True)
(folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
