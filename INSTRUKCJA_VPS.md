# Instrukcja konfiguracji VPS — Sztab Wawaka
## Ubuntu 24.04 LTS — od zera do działającej strony

---

## Spis treści

1. [Wymagania minimalne](#1-wymagania-minimalne)
2. [Pierwsze logowanie i zabezpieczenie serwera](#2-pierwsze-logowanie-i-zabezpieczenie-serwera)
3. [Konfiguracja zapory sieciowej (UFW)](#3-konfiguracja-zapory-sieciowej-ufw)
4. [Instalacja Node.js przez NVM](#4-instalacja-nodejs-przez-nvm)
5. [Instalacja PM2 (menadżer procesów)](#5-instalacja-pm2-menad%C5%BCer-proces%C3%B3w)
6. [Instalacja Nginx (reverse proxy)](#6-instalacja-nginx-reverse-proxy)
7. [Wgranie plików projektu na serwer](#7-wgranie-plików-projektu-na-serwer)
8. [Konfiguracja zmiennych środowiskowych (.env)](#8-konfiguracja-zmiennych-%C5%9Brodowiskowych-env)
9. [Instalacja zależności i uruchomienie aplikacji](#9-instalacja-zale%C5%BCno%C5%9Bci-i-uruchomienie-aplikacji)
10. [Konfiguracja Nginx jako reverse proxy](#10-konfiguracja-nginx-jako-reverse-proxy)
11. [SSL / HTTPS z Let's Encrypt (Certbot)](#11-ssl--https-z-lets-encrypt-certbot)
12. [Autostart PM2 po restarcie serwera](#12-autostart-pm2-po-restarcie-serwera)
13. [Kopie zapasowe bazy danych](#13-kopie-zapasowe-bazy-danych)
14. [Komendy do zarządzania aplikacją](#14-komendy-do-zarz%C4%85dzania-aplikacj%C4%85)
15. [Rozwiązywanie problemów](#15-rozwi%C4%85zywanie-problem%C3%B3w)

---

## 1. Wymagania minimalne

| Komponent       | Minimum         | Zalecane       |
|-----------------|-----------------|----------------|
| System          | Ubuntu 24.04    | Ubuntu 24.04   |
| CPU             | 1 vCPU          | 2 vCPU         |
| RAM             | 1 GB            | 2 GB           |
| Dysk            | 10 GB SSD       | 20 GB SSD      |
| Dostęp          | SSH jako root   | SSH jako root  |

**Wymagane wcześniej:** zarejestrowana domena wskazująca na IP serwera (rekord A).

---

## 2. Pierwsze logowanie i zabezpieczenie serwera

### 2.1 Zaloguj się do serwera

```bash
ssh root@TWOJE_IP_SERWERA
```

### 2.2 Zaktualizuj system

```bash
apt update && apt upgrade -y
apt install -y curl wget git unzip nano ufw fail2ban
```

### 2.3 Utwórz dedykowanego użytkownika (nie używaj roota do aplikacji)

```bash
adduser wawaka
# Wpisz hasło i pozostałe dane – Enter przez resztę pól

# Nadaj uprawnienia sudo
usermod -aG sudo wawaka
```

### 2.4 Skonfiguruj klucze SSH (opcjonalne, ale zalecane)

Na **swoim komputerze** (Windows PowerShell / Git Bash):
```bash
ssh-keygen -t ed25519 -C "vps-sztab-wawaka"
```

Skopiuj klucz publiczny na serwer:
```bash
ssh-copy-id wawaka@TWOJE_IP_SERWERA
```

### 2.5 Wyłącz logowanie hasłem przez SSH (tylko jeśli ustawiłeś klucze!)

```bash
nano /etc/ssh/sshd_config
```

Znajdź i zmień:
```
PasswordAuthentication no
PermitRootLogin no
```

Zrestartuj SSH:
```bash
systemctl restart ssh
```

> ⚠️ **UWAGA:** Przed wylogowaniem sprawdź w osobnym oknie terminala, że możesz zalogować się kluczem: `ssh wawaka@TWOJE_IP_SERWERA`

---

## 3. Konfiguracja zapory sieciowej (UFW)

```bash
# Dozwól SSH (KONIECZNIE PRZED WŁĄCZENIEM UFW)
ufw allow OpenSSH

# Dozwól HTTP i HTTPS (potrzebne dla Nginx i Certbota)
ufw allow 80/tcp
ufw allow 443/tcp

# Włącz zaporę
ufw enable
# Wpisz: y

# Sprawdź status
ufw status verbose
```

Oczekiwany wynik:
```
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

> Port Aplikacji (3000) NIE jest otwarty na zewnątrz — Nginx będzie routował ruch wewnętrznie. To poprawna konfiguracja.

---

## 4. Instalacja Node.js przez NVM

Zaloguj się jako użytkownik `wawaka`:
```bash
su - wawaka
```

### 4.1 Zainstaluj NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Przeładuj konfigurację shella
source ~/.bashrc
```

### 4.2 Zainstaluj Node.js LTS

```bash
nvm install --lts
nvm use --lts
nvm alias default lts/*
```

### 4.3 Sprawdź wersje

```bash
node --version    # np. v22.x.x
npm --version     # np. 10.x.x
```

---

## 5. Instalacja PM2 (menadżer procesów)

PM2 uruchamia aplikację Node.js jako usługę systemową — restartuje ją przy awarii i po restarcie serwera.

```bash
npm install -g pm2
pm2 --version
```

---

## 6. Instalacja Nginx (reverse proxy)

Wróć do konta `root` lub użyj `sudo`:

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Sprawdź działanie:
```bash
sudo systemctl status nginx
```

Otwórz `http://TWOJE_IP_SERWERA` w przeglądarce — powinna pojawić się strona powitalna Nginx.

---

## 7. Wgranie plików projektu na serwer

### Metoda A: Przez Git (zalecana)

Jeśli masz repozytorium Git (GitHub, GitLab, Gitea):

```bash
# Zaloguj się jako wawaka
su - wawaka

# Przejdź do katalogu domowego
cd ~

# Sklonuj repozytorium
git clone https://github.com/TWOJ_UZYTKOWNIK/NAZWA_REPO.git sztab-wawaka

# Lub jeśli repo jest prywatne, użyj tokenu:
git clone https://TWOJ_TOKEN@github.com/TWOJ_UZYTKOWNIK/NAZWA_REPO.git sztab-wawaka
```

### Metoda B: Przez SCP (jeśli nie używasz Git)

Na **swoim komputerze** (Windows PowerShell / Git Bash), z folderu nadrzędnego projektu:

```bash
# Wgraj cały folder projektu
scp -r SztabWawaka wawaka@TWOJE_IP_SERWERA:~/sztab-wawaka
```

> **UWAGA:** Nie wgrywaj folderu `node_modules/` — zostanie zainstalowany na serwerze. Jeśli go masz, możesz wykluczyć:
> ```bash
> rsync -avz --exclude='node_modules' --exclude='.git' --exclude='data/*.db' \
>   SztabWawaka/ wawaka@TWOJE_IP_SERWERA:~/sztab-wawaka/
> ```

---

## 8. Konfiguracja zmiennych środowiskowych (.env)

```bash
cd ~/sztab-wawaka

# Skopiuj szablon
cp .env.example .env

# Edytuj plik
nano .env
```

Wypełnij plik:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=WKLEJ_TU_LOSOWY_CIAG_MINIMUM_64_ZNAKOW
```

Aby wygenerować bezpieczny JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Zabezpiecz plik .env (tylko właściciel może go czytać):
```bash
chmod 600 .env
```

---

## 9. Instalacja zależności i uruchomienie aplikacji

```bash
cd ~/sztab-wawaka

# Zainstaluj zależności produkcyjne
npm install --omit=dev

# Upewnij się, że foldery uploadów istnieją
mkdir -p public/uploads/avatars
mkdir -p public/uploads/announcements
mkdir -p public/uploads/gallery
mkdir -p public/uploads/staff
mkdir -p data
mkdir -p logs

# Ustaw odpowiednie uprawnienia
chmod 755 public/uploads
chmod 755 data
chmod 755 logs
```

### 9.1 Testowe uruchomienie

```bash
NODE_ENV=production node server/index.js
```

Powinno pojawić się:
```
✅ Database initialized
🚀 Sztab Wawaka uruchomiony na http://localhost:3000
```

Wciśnij `Ctrl+C` aby zatrzymać — teraz uruchomimy przez PM2.

### 9.2 Uruchomienie przez PM2

```bash
pm2 start ecosystem.config.js --env production

# Sprawdź status
pm2 status

# Sprawdź logi
pm2 logs sztab-wawaka
```

---

## 10. Konfiguracja Nginx jako reverse proxy

### 10.1 Utwórz konfigurację serwisu

```bash
sudo nano /etc/nginx/sites-available/sztab-wawaka
```

Wklej poniższą konfigurację (zamień `twoja-domena.pl` na swoją domenę):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name twoja-domena.pl www.twoja-domena.pl;

    # Maksymalny rozmiar wgranego pliku (dopasuj do ustawień multer)
    client_max_body_size 15M;

    # Nagłówki bezpieczeństwa
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logi dostępowe
    access_log /var/log/nginx/sztab-wawaka-access.log;
    error_log  /var/log/nginx/sztab-wawaka-error.log;

    # Pliki statyczne (Nginx serwuje bezpośrednio — szybciej niż Node.js)
    location /uploads/ {
        alias /home/wawaka/sztab-wawaka/public/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/wawaka/sztab-wawaka/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Reszta ruchu do Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }
}
```

### 10.2 Aktywuj konfigurację

```bash
# Utwórz dowiązanie symboliczne
sudo ln -s /etc/nginx/sites-available/sztab-wawaka /etc/nginx/sites-enabled/

# Usuń domyślną konfigurację Nginx (opcjonalnie)
sudo rm /etc/nginx/sites-enabled/default

# Sprawdź poprawność konfiguracji
sudo nginx -t

# Przeładuj Nginx
sudo systemctl reload nginx
```

Oczekiwany wynik `nginx -t`:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Strona powinna być teraz dostępna pod `http://twoja-domena.pl`.

---

## 11. SSL / HTTPS z Let's Encrypt (Certbot)

### 11.1 Zainstaluj Certbota

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 11.2 Wydaj certyfikat

```bash
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl
```

Certbot:
- zapyta o adres e-mail (dla powiadomień o odnowieniu),
- poprosi o akceptację warunków,
- automatycznie zmodyfikuje konfigurację Nginx,
- skonfiguruje przekierowanie HTTP → HTTPS.

### 11.3 Sprawdź automatyczne odnowienie

Certbot instaluje harmonogram cron automatycznie. Możesz to sprawdzić:

```bash
sudo certbot renew --dry-run
```

Powinno zakończyć się komunikatem: `Congratulations, all simulated renewals succeeded.`

---

## 12. Autostart PM2 po restarcie serwera

```bash
# Wygeneruj i uruchom skrypt startowy systemu
pm2 startup

# Skopiuj i wykonaj komendę, którą wypisze PM2,
# np.: sudo env PATH=$PATH:/home/wawaka/.nvm/versions/node/v22.x.x/bin ...

# Zapisz aktualną listę procesów PM2
pm2 save
```

### Weryfikacja

Zrestartuj serwer i sprawdź czy aplikacja startuje automatycznie:
```bash
sudo reboot
# Poczekaj chwilę, zaloguj się ponownie
ssh wawaka@TWOJE_IP_SERWERA
pm2 status
```

---

## 13. Kopie zapasowe bazy danych

Baza danych SQLite to jeden plik: `~/sztab-wawaka/data/sztab.db`

### 13.1 Ręczna kopia zapasowa

```bash
cp ~/sztab-wawaka/data/sztab.db ~/sztab-wawaka/data/sztab-backup-$(date +%Y%m%d-%H%M%S).db
```

### 13.2 Automatyczna kopia przez cron

```bash
crontab -e
```

Dodaj na końcu pliku (kopia każdej nocy o 3:00, przechowuj 7 dni):

```cron
0 3 * * * cp ~/sztab-wawaka/data/sztab.db ~/backups/sztab-$(date +\%Y\%m\%d).db && find ~/backups -name "sztab-*.db" -mtime +7 -delete
```

Utwórz folder na kopie:
```bash
mkdir -p ~/backups
```

### 13.3 Pobranie kopii bazy na swój komputer

Na **swoim komputerze**:
```bash
scp wawaka@TWOJE_IP_SERWERA:~/sztab-wawaka/data/sztab.db ./sztab-backup.db
```

---

## 14. Komendy do zarządzania aplikacją

### PM2 — aplikacja Node.js

```bash
pm2 status                    # Status wszystkich procesów
pm2 logs sztab-wawaka         # Logi w czasie rzeczywistym
pm2 logs sztab-wawaka --lines 100  # Ostatnie 100 linii logów
pm2 restart sztab-wawaka      # Restart aplikacji
pm2 stop sztab-wawaka         # Zatrzymanie aplikacji
pm2 start sztab-wawaka        # Uruchomienie aplikacji
pm2 reload sztab-wawaka       # Przeładowanie bez przestoju (zero-downtime)
pm2 monit                     # Monitor zasobów
```

### Nginx

```bash
sudo nginx -t                         # Test konfiguracji
sudo systemctl reload nginx           # Przeładuj konfigurację (bez przestoju)
sudo systemctl restart nginx          # Restart Nginx
sudo systemctl status nginx           # Status Nginx
sudo tail -f /var/log/nginx/sztab-wawaka-error.log  # Logi błędów
```

### Aktualizacja aplikacji (przez Git)

```bash
cd ~/sztab-wawaka
git pull                              # Pobierz zmiany
npm install --omit=dev                # Aktualizuj zależności (jeśli zmieniły się)
pm2 reload sztab-wawaka               # Przeładuj bez przestoju
```

### SSL

```bash
sudo certbot renew                    # Odnów certyfikat
sudo certbot certificates             # Lista certyfikatów i daty wygaśnięcia
```

---

## 15. Rozwiązywanie problemów

### Problem: Strona nie ładuje się

```bash
# 1. Sprawdź czy aplikacja działa
pm2 status

# 2. Sprawdź logi aplikacji
pm2 logs sztab-wawaka --lines 50

# 3. Sprawdź Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/sztab-wawaka-error.log

# 4. Sprawdź czy port 3000 jest zajęty
ss -tlnp | grep 3000
```

### Problem: Błąd 502 Bad Gateway

Nginx nie może się połączyć z Node.js. Sprawdź:
```bash
pm2 restart sztab-wawaka
pm2 logs sztab-wawaka
```

### Problem: Błąd uprawnień przy uploadzie plików

```bash
# Sprawdź właściciela folderów
ls -la ~/sztab-wawaka/public/uploads/

# Napraw uprawnienia
chmod -R 755 ~/sztab-wawaka/public/uploads/
chown -R wawaka:wawaka ~/sztab-wawaka/public/uploads/
```

### Problem: Baza danych zablokowana (SQLITE_BUSY)

```bash
# Sprawdź czy nie ma zduplikowanych procesów
pm2 status
pm2 delete sztab-wawaka
pm2 start ecosystem.config.js --env production
```

### Problem: PM2 nie startuje po restarcie

```bash
pm2 unstartup
pm2 startup
# Skopiuj i wykonaj wypisaną komendę
pm2 save
```

### Problem: Certfikrat SSL wygasł

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## Podsumowanie struktury na serwerze

```
/home/wawaka/
├── sztab-wawaka/          # Katalog aplikacji
│   ├── server/
│   ├── public/
│   ├── data/
│   │   └── sztab.db       # Baza danych SQLite
│   ├── logs/              # Logi PM2
│   ├── ecosystem.config.js
│   ├── .env               # Zmienne środowiskowe (chroniony!)
│   └── package.json
└── backups/               # Kopie zapasowe bazy danych
    └── sztab-20260306.db

/etc/nginx/
└── sites-available/
    └── sztab-wawaka       # Konfiguracja Nginx

/etc/letsencrypt/
└── live/twoja-domena.pl/  # Certyfikaty SSL
```

---

*Instrukcja przygotowana dla projektu Sztab Wawaka — Ubuntu 24.04 LTS — marzec 2026*
