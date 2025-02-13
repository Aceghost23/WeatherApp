const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

const mongoURI = process.env.MONGO_URI || 'mongodb://mongodb:27017/ghcnd_database';
let db;

console.log("🌐 Starte Mongo-Verbindung mit:", mongoURI);
MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db("ghcnd_database");
    console.log("✅ Verbindung zu MongoDB erfolgreich! DB:", db.databaseName);
  })
  .catch(err => console.error("❌ Fehler bei der MongoDB-Verbindung:", err));

// Statische Dateien
const frontendPath = path.join(__dirname, '../Frontend');
app.use(express.static(frontendPath));

// index.html
app.get('/', (req, res) => {
  console.log("🔍 GET / -> index.html");
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ALLE Stationen (optional, falls du es brauchen solltest)
app.get('/stations', async (req, res) => {
  console.log("🔍 GET /stations");
  try {
    if (!db) {
      return res.status(500).json({ error: "Datenbank nicht verbunden" });
    }
    const stations = await db.collection('stations').find().toArray();
    console.log("🔍 Anzahl Stationen:", stations.length);
    res.json(stations);
  } catch (err) {
    console.error("❌ Fehler /stations:", err);
    res.status(500).send("Fehler beim Abrufen der Stationsdaten");
  }
});

// BBox
app.get('/stations_in_bounds', async (req, res) => {
  console.log("🔍 GET /stations_in_bounds ->", req.query);
  try {
    if (!db) {
      return res.status(500).json({ error: "Datenbank nicht verbunden" });
    }
    const { swLat, swLng, neLat, neLng } = req.query;
    if (!swLat || !swLng || !neLat || !neLng) {
      return res.status(400).json({ error: "Fehlende Parameter: swLat, swLng, neLat, neLng" });
    }

    const swLatNum = parseFloat(swLat);
    const swLngNum = parseFloat(swLng);
    const neLatNum = parseFloat(neLat);
    const neLngNum = parseFloat(neLng);

    const query = {
      latitude: { $gte: swLatNum, $lte: neLatNum },
      longitude: { $gte: swLngNum, $lte: neLngNum },
    };

    console.log("🔎 BBox-Query:", query);
    const stationsInBox = await db.collection('stations').find(query).toArray();
    console.log("🔍 Gefundene Stationen in BBox:", stationsInBox.length);

    res.json(stationsInBox);
  } catch (err) {
    console.error("❌ Fehler /stations_in_bounds:", err);
    res.status(500).send("Fehler beim BBox-Abruf.");
  }
});

// Koordinatensuche (Variante B: Toleranz)
app.get('/search_by_coords', async (req, res) => {
  console.log("🔍 GET /search_by_coords ->", req.query);
  try {
    if (!db) {
      return res.status(500).json({ error: "Datenbank nicht verbunden" });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid lat/lng" });
    }

    // ± Toleranz
    const epsilon = 0.0001;
    const query = {
      latitude: { $gte: lat - epsilon, $lte: lat + epsilon },
      longitude: { $gte: lng - epsilon, $lte: lng + epsilon },
    };

    console.log("🔎 Koordinatensuche. Epsilon:", epsilon, "Query:", query);
    const stations = await db.collection('stations').find(query).toArray();
    console.log("🔍 Gefundene Stationen:", stations.length);

    res.json(stations);
  } catch (err) {
    console.error("❌ Fehler /search_by_coords:", err);
    res.status(500).send("Fehler bei Koordinaten-Suche");
  }
});

app.listen(PORT, () => {
  console.log(`🌍 Server läuft auf http://localhost:${PORT}`);
});
