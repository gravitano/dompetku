---
project: DompetKu
project_code: DMK
client: Personal
doc_type: pep
status: draft
language: id
created: 2026-09-30
updated: 2026-09-30
---

# PROJECT EXECUTION PLAN
## DompetKu

---

| Attribute | Value |
|-----------|-------|
| Document ID | PEP-DMK-001 |
| Version | 1.0 |
| Status | Draft |
| Author | Warsono |
| Created | 2026-09-30 |
| Last Updated | 2026-09-30 |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-30 | Warsono | Versi awal |

---

## 1. Project Overview

### 1.1 Project Snapshot

| Attribute | Value |
|-----------|-------|
| Project Name | DompetKu |
| Project Code | DMK-2026 |
| Project Type | Project Based (personal) |
| Start Date | 2026-10-05 |
| End Date | 2026-11-04 |
| Duration | ±1 bulan (Sprint 0 selama 3 hari + 2 sprint) |
| Methodology | Scrum (disederhanakan untuk tim solo) |
| Sprint Duration | 2 minggu |
| Total Sprints | 2 sprint pengembangan + Sprint 0 |

### 1.2 Reference Documents

| Document | Location |
|----------|----------|
| BRD | `docs/project/01-BRD.md` |
| ITA | `docs/project/03-ITA.md` |
| Contract | Tidak ada (project personal) |

---

## 2. Project Team

### 2.1 Client Team

| Role | Name | Responsibility |
|------|------|----------------|
| Project Sponsor & Business Owner | Warsono | Menetapkan requirement, prioritas, dan menerima hasil (UAT) |

### 2.2 Delivery Team

Project dikerjakan secara solo oleh Warsono dengan bantuan AI (Claude + HAIE).

| Role | Name | Allocation | Responsibility |
|------|------|------------|----------------|
| Project Manager | Warsono | Part-time | Perencanaan sprint, backlog, laporan progres |
| Tech Lead / Developer | Warsono (+ Claude) | Part-time | Arsitektur, implementasi frontend & backend |
| UI/UX Designer | Warsono (+ Claude) | Part-time (fokus di Sprint 0) | Wireframe dan alur UI |
| QA Engineer | Warsono (+ Claude) | Part-time | Test spec, test otomatis, eksekusi test |
| AI Assistant | Claude (HAIE) | On-demand | Penyusunan dokumen, spec, kode, dan test script |

### 2.3 RACI Matrix

Semua peran dijalankan oleh Warsono, sehingga Warsono adalah **A** (Accountable) untuk semua deliverable. Matriks di bawah menunjukkan keterlibatan AI.

| Deliverable | Warsono | Claude (AI) |
|-------------|---------|-------------|
| Requirements (BRD) | A, R | C (menyusun draft) |
| Execution Plan (PEP) | A, R | C (menyusun draft) |
| Architecture (ITA) | A, R | C (rekomendasi) |
| Design (wireframe) | A, R | C |
| Development | A, R | R (pair programming) |
| Testing | A, R | R (generate & jalankan test) |
| UAT | A, R | I |
| Go-Live | A, R | C |

*R=Responsible, A=Accountable, C=Consulted, I=Informed*

---

## 3. Scope

### 3.1 In Scope

| # | Module/Feature | Priority | Reference |
|---|----------------|----------|-----------|
| 1 | Akun & Keamanan | Must Have | EPIC-001 |
| 2 | Pencatatan Transaksi | Must Have | EPIC-002 |
| 3 | Anggaran | Must Have | EPIC-003 |
| 4 | Laporan & Grafik | Must Have | EPIC-004 |

Rincian fitur per epic ada di BRD bagian 5.2.

### 3.2 Out of Scope

| # | Item | Reason | Future Phase? |
|---|------|--------|---------------|
| 1 | Multi dompet/akun (kas, bank, e-wallet) | Bukan inti masalah MVP | Phase 2 |
| 2 | Target tabungan | Bukan inti masalah MVP | Phase 2 |
| 3 | Ekspor data (CSV/Excel) & backup manual | Tidak dipilih untuk MVP | Phase 2 |
| 4 | Berbagi dengan keluarga/pasangan | Target MVP adalah pengguna individu | TBD |
| 5 | Aplikasi mobile native | MVP berupa web responsive | TBD |
| 6 | Integrasi bank/e-wallet | Kompleksitas tinggi, di luar timeline | TBD |

### 3.3 Change Control

Karena project dikerjakan solo, proses change control dibuat ringan tapi tetap tertulis supaya scope creep terkendali:
1. Ide fitur baru dicatat sebagai change request dengan `/pm:change` (`docs/project/change-requests/`), bukan langsung dikerjakan.
2. Setiap CR dinilai dampaknya terhadap effort dan timeline.
3. Selama MVP (sampai 4 Nov 2026), CR hanya diterima jika **menggantikan** fitur lain dengan effort setara, atau jika merupakan perbaikan bug/keamanan.
4. CR lainnya masuk backlog Phase 2.
5. Jika CR disetujui, PEP dan SPEC terkait diperbarui.

---

## 4. Timeline & Milestones

### 4.1 Project Timeline

```
5 Okt   8 Okt                21 Okt   22 Okt               4 Nov
|-------|--------------------|--------|--------------------|
[S0]    [ Sprint 1: Akun & Transaksi ][ Sprint 2: Anggaran & Laporan + UAT ]
 ▲       ▲                            ▲                     ▲
 M1      M2                           M3                    M4/M5
```

### 4.2 Milestones

| ID | Milestone | Target Date | Deliverables | Status |
|----|-----------|-------------|--------------|--------|
| M1 | Kickoff Complete | 2026-10-05 | BRD & PEP disetujui, repo siap | Pending |
| M2 | Design Complete | 2026-10-07 | ITA disetujui, wireframe layar utama, spec fitur Sprint 1 | Pending |
| M3 | Core Recording Ready | 2026-10-21 | Login dan pencatatan transaksi berjalan di staging | Pending |
| M4 | UAT Complete | 2026-11-03 | Semua fitur Must Have lolos UAT | Pending |
| M5 | Go-Live | 2026-11-04 | Aplikasi live di production | Pending |

---

## 5. Sprint Planning

> Story point di bawah adalah **estimasi awal** dan akan disesuaikan saat story dibuat melalui `/pm:feature`. Fitur **Should Have** menjadi buffer: dikerjakan terakhir dan boleh digeser ke Phase 2 jika waktu tidak cukup.

### Sprint 0: Setup & Discovery
**Duration:** 2026-10-05 – 2026-10-07 (3 hari)

| # | Activity | Owner | Status |
|---|----------|-------|--------|
| 1 | Finalisasi BRD & PEP | Warsono | |
| 2 | Susun ITA (stack, hosting, data model) via `/haie:ita` | Warsono + Claude | |
| 3 | Wireframe layar utama (dashboard, form transaksi, anggaran) | Warsono + Claude | |
| 4 | Setup repo, environment, CI, dan staging | Warsono | |
| 5 | Buat spec fitur Sprint 1 via `/pm:feature` | Warsono + Claude | |

---

### Sprint 1: Akun & Pencatatan Transaksi
**Duration:** 2026-10-08 – 2026-10-21

| Feature ID | Feature | Story Points | Owner | Status |
|------------|---------|--------------|-------|--------|
| FEAT-001 | Registrasi akun | 3 | Warsono | Planned |
| FEAT-002 | Login & logout | 3 | Warsono | Planned |
| FEAT-003 | Catat pemasukan & pengeluaran | 5 | Warsono | Planned |
| FEAT-004 | Daftar transaksi dengan filter | 3 | Warsono | Planned |
| FEAT-005 | Ubah & hapus transaksi | 3 | Warsono | Planned |
| FEAT-006 | Kelola kategori *(Should Have — buffer)* | 3 | Warsono | Planned |
| | **Total** | **20** | | |

**Sprint Goals:**
- [ ] Pengguna bisa mendaftar, login, dan hanya melihat datanya sendiri
- [ ] Pengguna bisa mencatat transaksi dalam waktu < 15 detik dari HP

**Deliverables:**
- [ ] Fitur akun dan pencatatan transaksi berjalan di staging
- [ ] Test otomatis (smoke) untuk login dan catat transaksi

---

### Sprint 2: Anggaran, Laporan & UAT
**Duration:** 2026-10-22 – 2026-11-04

| Feature ID | Feature | Story Points | Owner | Status |
|------------|---------|--------------|-------|--------|
| FEAT-007 | Atur anggaran bulanan per kategori | 5 | Warsono | Planned |
| FEAT-008 | Indikator pemakaian anggaran | 3 | Warsono | Planned |
| FEAT-010 | Dashboard ringkasan bulanan | 5 | Warsono | Planned |
| FEAT-011 | Grafik pengeluaran per kategori | 3 | Warsono | Planned |
| FEAT-009 | Peringatan anggaran ≥ 80% / terlampaui *(Should Have — buffer)* | 2 | Warsono | Planned |
| FEAT-012 | Grafik tren antar bulan *(Should Have — buffer)* | 3 | Warsono | Planned |
| | **Total** | **21** | | |

**Sprint Goals:**
- [ ] Pengguna bisa mengatur anggaran dan melihat sisa anggaran per kategori
- [ ] Pengguna bisa melihat ringkasan dan grafik pengeluaran bulanan
- [ ] UAT selesai (3 Nov) dan aplikasi live (4 Nov)

**Deliverables:**
- [ ] Fitur anggaran dan laporan berjalan di staging
- [ ] Laporan UAT (`/qa:report`)
- [ ] Deployment ke production

---

## 6. Communication Plan

Karena tim solo, rapat Scrum diganti dengan ritual singkat untuk evaluasi diri.

### 6.1 Regular Meetings

| Meeting | Frequency | Participants | Day/Time | Output |
|---------|-----------|--------------|----------|--------|
| Daily check-in | Setiap hari kerja | Warsono | Awal sesi kerja | Rencana hari itu (`/pm:sprint`) |
| Sprint Planning | Awal sprint | Warsono | Hari pertama sprint | Sprint backlog |
| Sprint Review + Retro | Akhir sprint | Warsono | Hari terakhir sprint | Demo, sprint report (`/pm:report`), action items |
| Weekly status | Mingguan | Warsono | Jumat | Update PROJECT-STATUS |

### 6.2 Communication Channels

| Purpose | Channel | Participants |
|---------|---------|--------------|
| Catatan harian | Git commit & sprint report | Warsono |
| Issue tracking | `docs/issues/` (dan PM tool jika sudah terhubung via `haie setup`) | Warsono |
| Documentation | Git Repository (`docs/`) | Warsono |

---

## 7. Risk Management

### 7.1 Risk Register

| ID | Risk | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|-------------|--------|-------|------------|-------|--------|
| R01 | Waktu terbatas: project dikerjakan paruh waktu, sehingga sprint bisa molor | H | H | 9 | Blok waktu kerja tetap tiap minggu; kerjakan Must Have lebih dulu; Should Have menjadi buffer yang bisa digeser; pantau progres di tengah sprint | Warsono | Open |
| R02 | Scope creep: tergoda menambah fitur di luar MVP (multi dompet, tabungan, ekspor) | H | M | 6 | Semua ide baru dicatat sebagai CR (§3.3) dan masuk backlog Phase 2; tidak ada fitur baru tanpa menggantikan fitur lain | Warsono | Open |
| R03 | Setup hosting/deploy memakan waktu lebih lama dari perkiraan | L | M | 2 | Setup staging dan pipeline deploy sudah selesai di Sprint 0, bukan di akhir | Warsono | Open |

*Probability: L=1, M=2, H=3 | Impact: L=1, M=2, H=3, Critical=4*

### 7.2 Dependencies

| ID | Dependency | Owner | Due Date | Status | Impact if Delayed |
|----|------------|-------|----------|--------|-------------------|
| D01 | ITA disetujui (stack & hosting ditentukan) | Warsono | 2026-10-07 | Pending | Blocking Sprint 1 |
| D02 | Spec fitur Sprint 1 selesai (`/pm:feature`) | Warsono | 2026-10-07 | Pending | Blocking Sprint 1 |
| D03 | Spec fitur Sprint 2 selesai | Warsono | 2026-10-21 | Pending | Blocking Sprint 2 |
| D04 | Akun hosting/domain production tersedia | Warsono | 2026-10-28 | Pending | Blocking Go-Live |

---

## 8. Quality Assurance

### 8.1 Definition of Done

**Story Level:**
- [ ] Kode selesai dan di-commit
- [ ] Unit test lulus
- [ ] Self-review (dibantu `/code-review`)
- [ ] Deploy ke staging
- [ ] Skenario di testing spec lulus

**Sprint Level:**
- [ ] Semua story Must Have berstatus Done
- [ ] Demo/review sprint selesai
- [ ] Tidak ada bug critical yang masih terbuka
- [ ] Dokumentasi (`docs/`) diperbarui

### 8.2 Testing Strategy

| Test Type | Responsibility | When | Tools |
|-----------|----------------|------|-------|
| Unit Test | Warsono + Claude | Selama development | Ditentukan di ITA |
| E2E Test | Warsono + Claude | Setelah deploy ke staging | Playwright (`/qa:script`, `/qa:run`) |
| Smoke Test | Warsono | Setiap deploy | Playwright (`test/web/smoke/`) |
| UAT | Warsono (sebagai pengguna) | 2–3 Nov 2026 | Manual, berdasarkan UAT scenarios |

---

## 9. Deliverables Tracker

| # | Deliverable | Owner | Due Date | Status |
|---|-------------|-------|----------|--------|
| 1 | BRD Approved | Warsono | 2026-10-05 | Draft |
| 2 | PEP Approved | Warsono | 2026-10-05 | Draft |
| 3 | ITA Approved | Warsono | 2026-10-07 | |
| 4 | Wireframe layar utama | Warsono | 2026-10-07 | |
| 5 | Sprint 1 increment (Akun & Transaksi) | Warsono | 2026-10-21 | |
| 6 | Sprint 2 increment (Anggaran & Laporan) | Warsono | 2026-11-02 | |
| 7 | UAT Sign-off | Warsono | 2026-11-03 | |
| 8 | Production Deployment | Warsono | 2026-11-04 | |

---

## 10. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor / Business Owner | Warsono | | |
| Project Manager | Warsono | | |

---

<!--
LIVING DOCUMENT:
- Update sprint status at every sprint review
- Update risk register weekly
- Update deliverables tracker at every milestone
-->
