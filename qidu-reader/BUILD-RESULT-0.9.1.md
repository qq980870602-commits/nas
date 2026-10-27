# Qidu 0.9.1 build result

Built from commit `ef633c5089d1fc65c16cb88583be85b68d4ab13d`.

[Successful iOS and Android workflow](https://github.com/qq980870602-commits/nas/actions/runs/40444355889).

- 44 automated checks passed.
- iOS: com.qidu.reader, 0.9.1, iPhoneOS arm64, unsigned, 7,292,192 bytes; SHA-256 `5ee8c966ecee4dca218194508f5a50cb2d321646494cd37dbe3aae75a9a605a0`.
- Android: com.qidu.reader, 0.9.1, arm64-v8a, min SDK 24 / target SDK 36, APK signing block present, 25,682,191 bytes; SHA-256 `ac13b339c2d3fecf769baed70b88f1b09f0f74b9595d42c7e3019396282a3a4b`.
- No microphone usage description in the iOS package; no RECORD_AUDIO permission in the Android manifest.
- Browser checks covered all five reading modes, reflow, initial progress, line highlighting, saved theme restoration and card controls.

No physical device or paid account validation is claimed. HTTP TTS and WebDAV clients were checked with controlled responses; users provide their own services. See 完整功能与验证范围-v0.9.1.md for scope and limitations.
