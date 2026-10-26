# Qidu 0.7.0 native build

Successful macOS build: https://github.com/qq980870602-commits/nas/actions/runs/40421714667

27 tests passed. Real Sudugu site checks verified title search, metadata, a 2512-chapter paginated catalog, merged first-chapter text, and discovery recommendations. The JSON URL provided by the user was not directly retrievable in this environment; the adapter targets the site shown in the user's screenshot and does not execute imported source scripts.

IPA verification:
- Bundle ID: com.qidu.reader
- Version: 0.7.0
- Device platform: iPhoneOS / arm64
- Contains main application JavaScript bundle
- No embedded provisioning profile; user signing required
- Size: 6480393 bytes
- SHA-256: 3bf3e9680ec271d8715655b33df64c336026fb821e0fb469080f23fadc462dc3

Physical-device behavior and a real paid-source session were not tested.
