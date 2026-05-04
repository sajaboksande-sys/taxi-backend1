const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات
const db = new sqlite3.Database('./taxi_data.db');

// إنشاء جدول الرحلات
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passenger_name TEXT,
    phone_number TEXT,
    destination TEXT,
    status TEXT DEFAULT 'pending',
    driver_id INTEGER,
    cargo_details TEXT,
    rating INTEGER DEFAULT 0
  )`);
});

// بيانات السائقين المسجلين
const DRIVERS = [
  { id: 1, name: "أحمد", car: "كيا سيراتو", phone: "0910000000", code: "1010" },
  { id: 2, name: "محمد", car: "هيونداي إلنترا", phone: "0920000000", code: "2020" }
];

// تسجيل دخول السائق
app.post('/driver-login', (req, res) => {
  const driver = DRIVERS.find(d => d.code === req.body.code);
  driver ? res.json({ success: true, driver }) : res.json({ success: false });
});

// طلب رحلة جديدة
app.post('/book-trip', (req, res) => {
  const { passenger_name, phone_number, destination, cargo_details } = req.body;
  db.run(`INSERT INTO trips (passenger_name, phone_number, destination, cargo_details) VALUES (?,?,?,?)`,
    [passenger_name, phone_number, destination, cargo_details], function(err) {
      res.json({ tripId: this.lastID });
    });
});

// جلب الرحلات المتاحة
app.get('/available-trips', (req, res) => {
  db.all("SELECT * FROM trips WHERE status = 'pending' ORDER BY id DESC", [], (err, rows) => res.json(rows));
});

// جلب الرحلة النشطة للسائق
app.get('/my-active-trip/:driverId', (req, res) => {
  db.get("SELECT * FROM trips WHERE status = 'accepted' AND driver_id = ?", [req.params.driverId], (err, row) => {
    res.json(row || null);
  });
});

// قبول الرحلة
app.post('/accept-trip', (req, res) => {
  db.run("UPDATE trips SET status = 'accepted', driver_id = ? WHERE id = ?", [req.body.driverId, req.body.tripId], () => res.json({success: true}));
});

// إنهاء الرحلة
app.post('/complete-trip', (req, res) => {
  db.run("UPDATE trips SET status = 'completed' WHERE id = ?", [req.body.tripId], () => res.json({success: true}));
});

// حفظ التقييم
app.post('/rate-trip', (req, res) => {
  const { tripId, rating } = req.body;
  db.run("UPDATE trips SET rating = ? WHERE id = ?", [rating, tripId], () => res.json({ success: true }));
});

// فحص حالة الرحلة للزبون
app.get('/trip-status/:id', (req, res) => {
  db.get("SELECT * FROM trips WHERE id = ?", [req.params.id], (err, row) => {
    if (!row) return res.json({status: 'none'});
    const driver = DRIVERS.find(d => d.id === row.driver_id);
    res.json({ status: row.status, driver });
  });
});

app.listen(3000, '0.0.0.0', () => console.log("🚀 Server is running on port 3000"));