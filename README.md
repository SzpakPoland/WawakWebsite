# Sztab Wawaka – Strona kampanii wyborczej

## Uruchomienie

### Wymagania
- Node.js 18+ (zalecane: LTS)

### Instalacja i start

```bash
npm install
npm start
```

Otwórz przeglądarkę na: **http://localhost:3000**

## Dane logowania (superadmin)

| Login       | Hasło        |
|-------------|--------------|
| `superadmin` | `Admin@2026` |

> **UWAGA:** Zmień hasło po pierwszym logowaniu!

---

## Architektura

```
SztabWawaka/
├── server/
│   ├── index.js              # Serwer Express (wejście)
│   ├── database.js           # Inicjalizacja bazy + wrapper sql.js
│   ├── middleware/
│   │   └── auth.js           # JWT, uprawnienia, logowanie
│   └── routes/
│       ├── auth.js           # /api/auth/*
│       ├── users.js          # /api/users/* + role
│       ├── announcements.js  # /api/announcements/*
│       ├── gallery.js        # /api/gallery/*
│       ├── staff.js          # /api/staff/*
│       └── logs.js           # /api/logs/*
├── public/
│   ├── index.html            # SPA shell
│   ├── css/style.css         # Wszystkie style
│   ├── js/
│   │   ├── api.js            # Fetch helpers
│   │   ├── auth.js           # Zarządzanie stanem użytkownika
│   │   ├── router.js         # Hash-based router
│   │   ├── pages/            # Strony publiczne
│   │   └── admin/            # Panel administracyjny
│   └── uploads/              # Przesłane pliki
└── data/
    └── sztab.db              # Baza danych SQLite
```

## Role i uprawnienia

| Rola        | Opis                                        |
|-------------|---------------------------------------------|
| superadmin  | Pełne uprawnienia                           |
| admin       | Zarządza treścią i użytkownikami            |
| redaktor    | Tworzy ogłoszenia, zarządza galerią         |
| moderator   | Moderuje treści                             |

### Uprawnienia

- `manage_users` – zarządzanie kontami
- `manage_roles` – tworzenie/usuwanie ról
- `manage_permissions` – zmiana uprawnień
- `view_logs` – wgląd w logi
- `create_announcements` – tworzenie ogłoszeń
- `edit_announcements` – edycja ogłoszeń
- `delete_announcements` – usuwanie ogłoszeń
- `manage_gallery` – zarządzanie galerią
- `manage_staff` – zarządzanie plakietkami sztabu

## Technologie

- **Backend:** Node.js + Express.js
- **Baza danych:** SQLite (via sql.js — czyste JS, bez kompilacji)
- **Autentykacja:** JWT + bcrypt
- **Upload plików:** Multer
- **Frontend:** Vanilla JS SPA z hash-routingiem
- **Typografia:** Inter (Google Fonts)
