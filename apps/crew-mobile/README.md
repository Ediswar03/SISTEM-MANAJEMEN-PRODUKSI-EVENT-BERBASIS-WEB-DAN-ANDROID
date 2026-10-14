# Crew mobile (Tahap 6)

Paket ini menyimpan konfigurasi API bersama untuk aplikasi kru. **Aplikasi Expo/React Native belum di-bootstrap** pada Tahap 2 agar instalasi dependensi native yang berat tidak dijalankan sebelum toolchain Android (JDK, `ANDROID_HOME`, `adb`) siap.

Kode yang ada:

- `src/config.ts` — URL API dari environment, bukan koneksi MySQL.
- `app.json` — identitas Expo yang akan dipakai saat Tahap 6.

Aplikasi kru akan memakai REST API yang sama dengan dashboard admin. Jangan menghubungkan Android langsung ke MySQL.
