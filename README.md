# dashboard.dev

Dashboard produktivitas untuk software engineer, dibangun dengan Next.js (App Router) dan SQLite (`better-sqlite3`).

## Fitur

- **Kanban board** (backlog → in progress → review → done) dengan drag-and-drop, priority, due date, estimasi waktu, link PR/branch, tag otomatis dari `#kata`, dan checklist/subtask per kartu.
- **Multi-board** — bikin board terpisah per project.
- **Pencarian & filter** — cari task, filter by priority, urutkan by priority/due date.
- **Spotify embed** — tempel link playlist/album/track, tersimpan otomatis. Untuk track, panel menampilkan hint preview embed sekitar 30 detik.
- **Pomodoro timer** — mode work/break, riwayat sesi, notifikasi + suara saat sesi selesai, heatmap 14 hari ala commit-graph, dan jam dunia (Jakarta/London/San Francisco/Tokyo).
- **Scratchpad** — mode teks biasa atau code mode dengan syntax highlighting ringan.
- **Command palette** (`Ctrl+K` / `Cmd+K`) untuk navigasi cepat: tambah task, pindah board, ganti tema, export database.
- **4 tema**: ink (default, gelap netral), dracula, monokai, solarized dark.
- **Export/import database SQLite** — unduh seluruh data sebagai file `.db`, atau impor file `.db` untuk menggantikan data saat ini.

Semua data disimpan lokal di `data/dashboard.db` (SQLite), tidak ada layanan eksternal selain embed Spotify.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Lalu buka [http://localhost:3000](http://localhost:3000).

> `better-sqlite3` adalah native module. Jika `npm install` gagal saat kompilasi, pastikan sudah ada Python 3 dan build tools (`build-essential` di Linux, Xcode Command Line Tools di macOS, atau `windows-build-tools`/Visual Studio Build Tools di Windows).
>

## Build untuk production

```bash
npm run build
npm start
```

## Struktur data

- `boards` — daftar board/project
- `tasks` — task dengan status, priority, due date, estimate, tag, git_link
- `subtasks` — checklist per task
- `notes` — satu scratchpad per board
- `pomodoro_sessions` — riwayat sesi fokus/istirahat
- `settings` — preferensi (tema, link spotify terakhir)

## Export & import database

- **Export**: klik "export database (.db)" di panel `data.io`, atau lewat command palette. File `.db` akan terunduh — ini adalah salinan penuh database SQLite kamu.
- **Import**: klik "import database (.db)" dan pilih file `.db` hasil export sebelumnya. Ini akan **mengganti seluruh data saat ini**, jadi akan ada konfirmasi sebelum dijalankan.

## Catatan pengembangan lanjutan

Beberapa ide lanjutan yang belum diimplementasikan tapi mudah ditambahkan di atas struktur ini: drag antar posisi di dalam satu kolom (reordering), multi-user/auth, widget cuaca, dan reminder/notifikasi due date H-1.
