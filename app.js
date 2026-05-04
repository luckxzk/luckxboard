'use strict';

require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const path     = require('path');
const os       = require('os');
const cors     = require('cors');

const app = express(); // ✅ CRIA PRIMEIRO

app.use(cors()); // ✅ USA DEPOIS
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── MONGODB ──────────────────────────────────────────────────────

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro MongoDB:', err));

// ── MODEL ────────────────────────────────────────────────────────

const PlayerSchema = new mongoose.Schema({
  id:           Number,
  deviceId:     String,
  stumbleId:    String,
  username:     String,
  country:      String,
  region:       String,
  version:      String,
  createdAt:    Date,
  lastLogin:    Date,
  skillRating:  Number,
  experience:   Number,
  crowns:       Number,
  hiddenRating: Number,
  isBanned:     Boolean,
  hasBattlePass: Boolean,
}, { collection: 'Users', timestamps: false });

const Player = mongoose.model('Player', PlayerSchema);

// ── ROTAS ────────────────────────────────────────────────────────

app.get('/api/stats', async (req, res) => {
  try {
    const [total, banned] = await Promise.all([
      Player.countDocuments(),
      Player.countDocuments({ isBanned: true }),
    ]);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const online = await Player.countDocuments({ lastLogin: { $gte: oneHourAgo } });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const peak = await Player.countDocuments({ lastLogin: { $gte: startOfDay } });

    res.json({ total, banned, online, peak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    const players = await Player.find()
      .sort({ lastLogin: -1 })
      .limit(20)
      .select('username id country region isBanned createdAt lastLogin skillRating experience crowns');

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/server-info', (req, res) => {
  const uptime = process.uptime();
  const h      = Math.floor(uptime / 3600);
  const m      = Math.floor((uptime % 3600) / 60);
  const mem    = process.memoryUsage().heapUsed / 1024 / 1024;
  const cpu    = os.loadavg()[0];

  res.json({
    nodeVersion: process.version,
    uptime:      `${h}h ${m}m`,
    memory:      `${mem.toFixed(1)} MB`,
    cpu:         `${(cpu * 100).toFixed(1)}%`,
    ping:        '--',
    region:      'SA-East (BR)',
  });
});

app.get('/api/history', async (req, res) => {
  try {
    const range = req.query.range || '1h';
    const now   = new Date();
    const from  = new Date();

    if (range === '1h')  from.setHours(now.getHours() - 1);
    if (range === '6h')  from.setHours(now.getHours() - 6);
    if (range === '24h') from.setDate(now.getDate() - 1);
    if (range === '7d')  from.setDate(now.getDate() - 7);

    const data = await Player.aggregate([
      { $match: { createdAt: { $gte: from, $lte: now } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: range === '7d' ? '%Y-%m-%d' : '%H:%M',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      labels: data.map(d => d._id),
      values: data.map(d => d.count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START ────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
