#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <WiFi.h>
#include <WebServer.h>


Adafruit_BMP280 bmp;
WebServer server(80);

const char* WIFI_SSID = "Bbox-AFDEC9DC";
const char* WIFI_PASS = "A1A4D12564176D79E19F1DA4DCF2E9";

unsigned long lastReadMs = 0;
float lastTemp = 0.0;
float lastPressure = 0.0;
// Basic index page served from PROGMEM
const char index_html[] PROGMEM = R"rawliteral(
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>BMP280 - ESP32 Monitoring</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:16px}
    .card{padding:16px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px}
    h1{margin-top:0}
    .value{font-size:1.6rem;font-weight:600}
    #chart{width:100%;height:200px;background:#fafafa;border-radius:6px;margin-top:12px;padding:8px}
    .row{display:flex;gap:12px;align-items:center}
  </style>
</head>
<body>
  <div class="card">
    <h1>BMP280 — Mesures</h1>
    <div class="row">
      <div>
        <div>Température</div>
        <div id="temperature" class="value">-- °C</div>
      </div>
      <div>
        <div>Pression</div>
        <div id="pressure" class="value">-- hPa</div>
      </div>
    </div>

    <div id="chart">
      <canvas id="tempChart" width="560" height="160"></canvas>
    </div>

    <p style="font-size:0.9rem;color:#666">Dernière mise à jour: <span id="updated">--</span></p>
    <p style="font-size:0.85rem;color:#444">Intervalle de mise à jour: <select id="interval">
      <option value="2000">2s</option>
      <option value="5000" selected>5s</option>
      <option value="10000">10s</option>
    </select></p>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    const tempEl = document.getElementById('temperature');
    const pressureEl = document.getElementById('pressure');
    const updatedEl = document.getElementById('updated');
    const intervalSelect = document.getElementById('interval');

    let intervalMs = parseInt(intervalSelect.value);
    intervalSelect.addEventListener('change', ()=> {
      intervalMs = parseInt(intervalSelect.value);
      clearInterval(loop);
      loop = setInterval(fetchData, intervalMs);
    });

    // Chart.js minimal setup
    const ctx = document.getElementById('tempChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Temp (°C)',
          data: [],
          tension: 0.25,
          fill: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { beginAtZero: false }
        },
        plugins:{ legend:{display:false} }
      }
    });

    async function fetchData() {
      try {
        const resp = await fetch('/sensor');
        if(!resp.ok) throw new Error('HTTP ' + resp.status);
        const j = await resp.json();
        tempEl.textContent = j.temperature.toFixed(2) + ' °C';
        pressureEl.textContent = j.pressure.toFixed(2) + ' hPa';
        updatedEl.textContent = new Date().toLocaleString();

        // push to chart
        chart.data.labels.push('');
        chart.data.datasets[0].data.push(j.temperature);
        if(chart.data.labels.length > 30) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
        }
        chart.update();
      } catch(err) {
        console.error('fetchData error', err);
      }
    }

    let loop = setInterval(fetchData, intervalMs);
    // initial fetch
    fetchData();
  </script>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send_P(200, "text/html", index_html);
}

void handleSensor() {
  // Respond with latest measurement as JSON
  char buf[128];
  // Make sure we have reasonably recent data (read if older than 2000ms)
  if (millis() - lastReadMs > 2000) {
    if (bmp.begin(0x76)) { // attempt quick read if needed
      lastTemp = bmp.readTemperature();
      lastPressure = bmp.readPressure() / 100.0F;
      lastReadMs = millis();
    }
  }
  snprintf(buf, sizeof(buf), "{\"temperature\":%.2f,\"pressure\":%.2f}", lastTemp, lastPressure);
  server.send(200, "application/json", buf);
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // Initialize BMP280
  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 non trouvé à l'adresse 0x76. Essayez 0x77 ou vérifiez le câblage.");
    // continue but values will be 0
  } else {
    // Optional sensor configuration
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                    Adafruit_BMP280::SAMPLING_X2, // temperature
                    Adafruit_BMP280::SAMPLING_X16, // pressure
                    Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
    Serial.println("BMP280 initialisé.");
  }

  // Connect to WiFi
  Serial.printf("Connexion au WiFi %s ...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connecté. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Impossible de se connecter au WiFi. Passe en mode AP.");
    // Fallback: start AP
    WiFi.softAP("ESP32-BMP280-AP");
    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());
  }

  server.on("/", handleRoot);
  server.on("/sensor", handleSensor);
  server.begin();
  Serial.println("Serveur web démarré.");

  // make a first sensor read
  if (bmp.begin(0x77)) {
    lastTemp = bmp.readTemperature();
    lastPressure = bmp.readPressure() / 100.0F;
    lastReadMs = millis();
  }
}

void loop() {
  server.handleClient();

  // periodic sensor read every 2s
  if (millis() - lastReadMs >= 2000) {
    if (bmp.begin(0x77)) {
      lastTemp = bmp.readTemperature();
      lastPressure = bmp.readPressure() / 100.0F;
      lastReadMs = millis();

      Serial.print("\nTemperature : ");
      Serial.print(lastTemp);
      Serial.print(" °C\n");

      Serial.print("Pression : ");
      Serial.print(lastPressure);
      Serial.print(" hPa\n");

      Serial.print("Altitude : ");
      Serial.print(bmp.readAltitude(1013.25));
      Serial.print(" m\n\n");

      lastReadMs = millis();
    }
  }
}