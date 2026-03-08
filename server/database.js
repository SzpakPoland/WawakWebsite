const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const BetterSqlite = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'sztab.db');

let _db = null;

function getDb() {
  return _db;
}

async function initializeDatabase() {
  _db = new BetterSqlite(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  createTables();
  seedData();
  return _db;
}

function createTables() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL,
      description TEXT, created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL,
      description TEXT, category TEXT
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
      role_id INTEGER, avatar_url TEXT, is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id INTEGER NOT NULL, permission_id INTEGER NOT NULL,
      granted INTEGER DEFAULT 1, PRIMARY KEY (user_id, permission_id)
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      content TEXT NOT NULL, excerpt TEXT, author_id INTEGER, image_url TEXT,
      image_alt TEXT, image_position TEXT DEFAULT 'top', image_size TEXT DEFAULT 'full',
      is_pinned INTEGER DEFAULT 0, color TEXT DEFAULT '#1D4ED8',
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL,
      original_name TEXT, description TEXT, sort_order INTEGER DEFAULT 0,
      uploaded_by INTEGER, uploaded_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      role_title TEXT, description TEXT, photo_url TEXT,
      sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
      username TEXT, action TEXT NOT NULL, category TEXT,
      details TEXT, ip_address TEXT, created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL,
      category TEXT DEFAULT 'inne', is_anonymous INTEGER DEFAULT 1,
      author_name TEXT, author_contact TEXT, status TEXT DEFAULT 'nowe',
      admin_note TEXT, created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);
  const migrations = [
    'ALTER TABLE announcements ADD COLUMN excerpt TEXT',
    'ALTER TABLE announcements ADD COLUMN image_alt TEXT',
    "ALTER TABLE announcements ADD COLUMN image_position TEXT DEFAULT 'top'",
    "ALTER TABLE announcements ADD COLUMN image_size TEXT DEFAULT 'full'",
    'ALTER TABLE announcements ADD COLUMN is_pinned INTEGER DEFAULT 0',
  ];
  for (const sql of migrations) { try { _db.exec(sql); } catch (e) {} }
}

function seedData() {
  const permsData = [
    ['manage_users','Zarządzanie użytkownikami','users'],
    ['manage_roles','Zarządzanie rolami','users'],
    ['manage_permissions','Zarządzanie uprawnieniami','users'],
    ['view_logs','Wgląd w logi systemowe','system'],
    ['view_logs_ip','Widoczność adresów IP w logach','system'],
    ['create_announcements','Tworzenie ogłoszeń','announcements'],
    ['edit_announcements','Edycja ogłoszeń','announcements'],
    ['delete_announcements','Usuwanie ogłoszeń','announcements'],
    ['manage_gallery','Zarządzanie galerią','gallery'],
    ['manage_staff','Zarządzanie plakietkami sztabu','staff'],
    ['view_suggestions','Przeglądanie skrzynki sugestii','suggestions'],
    ['manage_suggestions','Zarządzanie sugestiami','suggestions'],
  ];
  const insertPerm = _db.prepare('INSERT OR IGNORE INTO permissions (name, description, category) VALUES (?, ?, ?)');
  for (const p of permsData) insertPerm.run(...p);

  const rolesData = [
    ['superadmin','Pełne uprawnienia administracyjne'],
    ['admin','Administrator z szerokimi uprawnieniami'],
    ['redaktor','Może tworzyć i edytować treści'],
    ['moderator','Może moderować treści'],
  ];
  const insertRole = _db.prepare('INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)');
  for (const r of rolesData) insertRole.run(...r);

  const superadminRole = _db.prepare("SELECT id FROM roles WHERE name = 'superadmin'").get();
  const allPerms = _db.prepare('SELECT id FROM permissions').all();
  if (superadminRole) {
    const ins = _db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const p of allPerms) ins.run(superadminRole.id, p.id);
  }

  const adminRole = _db.prepare("SELECT id FROM roles WHERE name = 'admin'").get();
  if (adminRole) {
    const adminPerms = _db.prepare("SELECT id FROM permissions WHERE name != 'manage_permissions'").all();
    const ins = _db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const p of adminPerms) ins.run(adminRole.id, p.id);
  }

  const redaktorRole = _db.prepare("SELECT id FROM roles WHERE name = 'redaktor'").get();
  if (redaktorRole) {
    const rPerms = _db.prepare("SELECT id FROM permissions WHERE category IN ('announcements', 'gallery')").all();
    const ins = _db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const p of rPerms) ins.run(redaktorRole.id, p.id);
  }

  const existingAdmin = _db.prepare("SELECT id FROM users WHERE username = 'superadmin'").get();
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('Admin@2026', 10);
    const saRole = _db.prepare("SELECT id FROM roles WHERE name = 'superadmin'").get();
    if (saRole) {
      _db.prepare('INSERT INTO users (username, display_name, password_hash, role_id) VALUES (?, ?, ?, ?)')
        .run('superadmin', 'Super Administrator', hash, saRole.id);
    }
  }

  const staffCount = _db.prepare('SELECT COUNT(*) as cnt FROM staff_members').get();
  if (!staffCount || staffCount.cnt === 0) {
    const ins = _db.prepare('INSERT INTO staff_members (name, role_title, sort_order) VALUES (?, ?, ?)');
    [['Wawaka','Kandydat na Przewodniczącego',0],['Anna Kowalska','Koordynator Kampanii',1],
     ['Marek Nowak','Rzecznik Prasowy',2],['Zuzanna Wiśniewska','Odpowiadza za Social Media',3]]
    .forEach(([n,r,s]) => ins.run(n,r,s));
  }

  const annCount = _db.prepare('SELECT COUNT(*) as cnt FROM announcements').get();
  if (!annCount || annCount.cnt === 0) {
    const adminUser = _db.prepare("SELECT id FROM users WHERE username = 'superadmin'").get();
    const ins = _db.prepare('INSERT INTO announcements (title, content, author_id, color) VALUES (?, ?, ?, ?)');
    [['Witamy na stronie Sztabu Wawaka!','Oficjalny start kampanii wyborczej. Razem zmieńmy naszą szkołę na lepsze!','#1D4ED8'],
     ['Program wyborczy','Przygotowaliśmy ambitny program reform.','#DC2626'],
     ['Spotkanie informacyjne','Zapraszamy na spotkanie w przyszłym tygodniu!','#16a34a']]
    .forEach(([t,c,col]) => ins.run(t,c,adminUser ? adminUser.id : null,col));
  }
}

module.exports = { getDb, initializeDatabase };
