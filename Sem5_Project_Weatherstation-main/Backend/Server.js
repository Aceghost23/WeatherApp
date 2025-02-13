const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

const mongoURI = process.env.MONGO_URI || 'mongodb://mongodb:27017';
let db = null;

// Verbindung zu MongoDB
MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db("ghcnd_database");
    console.log("✅ Verbindung zu MongoDB erfolgreich! DB:", db.databaseName);
  })
  .catch(err => console.error("❌ Fehler bei der MongoDB-Verbindung:", err));

// Statische Dateien (Frontend)
const frontendPath = path.join(__dirname, '../Frontend');
app.use(express.static(frontendPath));

// index.html
app.get('/', (req, res) => {
  console.log("🔍 GET / -> index.html");
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// BBox
app.get('/stations_in_bounds', async (req, res) => {
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

// Koordinatensuche mit Radius & Limit
app.get('/search_by_coords', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Datenbank nicht verbunden" });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 50;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Ungültige Koordinaten" });
    }

    // Alle Stationen laden
    const allStations = await db.collection('stations').find().toArray();
    // Filtern, Distanz berechnen
    const filtered = [];
    for (const st of allStations) {
      const stLat = parseFloat(st.latitude);
      const stLng = parseFloat(st.longitude);
      if (!isNaN(stLat) && !isNaN(stLng)) {
        const dist = haversine(lat, lng, stLat, stLng);
        if (dist <= radius) {
          filtered.push({
            ...st,
            distance: dist
          });
        }
      }
    }
    // Sortieren nach Distanz
    filtered.sort((a, b) => a.distance - b.distance);

    // limit kappen
    const limited = filtered.slice(0, limit);

    console.log(`🔎 /search_by_coords: lat=${lat}, lng=${lng}, radius=${radius}, limit=${limit}`);
    console.log("   Gefundene Stationen:", limited.length);
    res.json(limited);
  } catch (err) {
    console.error("❌ Fehler in /search_by_coords:", err);
    res.status(500).send("Fehler bei Koordinaten-Suche");
  }
});

// Haversine
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Erdradius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180) *
            Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

app.listen(PORT, () => {
  console.log(`🌍 Server läuft auf http://localhost:${PORT}`);
});
