# 한국어 안내 음성

이 폴더의 MP3는 **AI로 생성한 음성**입니다. Supertonic 3의 기본 여성 음색 F1을 사용했습니다. 실제 인물의 목소리를 복제하거나 녹음하지 않았습니다.

- 도구: https://github.com/supertone-oss-archive/supertonic-py (MIT, supertonic 1.3.1)
- 모델: https://huggingface.co/supertone-oss-archive/supertonic-3
- 모델 라이선스: BigScience Open RAIL-M. 원문은 `MODEL-LICENSE.txt`.
- 모델 버전, 문장, 설정, 길이, 파일별 SHA-256: `manifest.json`.
- 저장 형식: MP3, 모노, 44.1kHz, 96kbps. 음량 -18 LUFS, 최대 피크 -2dBTP 기준으로 정리했습니다.

모델 자체와 실행 환경은 배포하지 않습니다. 게임에서는 음성 파일만 재생하며 음성 API, 계정, 별도 요금이 필요하지 않습니다. 라이선스의 사용 제한이 적용되며, 생성 음성임을 게임 도움말에도 표시합니다. 현재 공식 저장소는 보관 상태입니다.

## 다시 만들기

별도 Python 가상 환경에 `supertonic==1.3.1`을 설치하고 FFmpeg를 준비합니다. 위 모델 저장소의 `manifest.json`에 기록된 revision에서 `onnx/`, `voice_styles/`, `config.json`을 내려받습니다.

```sh
python tools/generate-narration.py /path/to/downloaded/model
```

문구를 추가하면 `manifest.json`과 `catalog.js`를 함께 갱신합니다. 게임에서 말하는 문장과 catalog의 키가 같아야 합니다.
