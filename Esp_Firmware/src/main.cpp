#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <Preferences.h>

// Pour stocker l'ID du device de façon persistante
Preferences preferences;

// Configuration WiFi et API
const char* WIFI_SSID = "Bbox-AFDEC9DC";
const char* WIFI_PASS = "A1A4D12564176D79E19F1DA4DCF2E9";
const char* API_BASE_URL = "http://192.168.1.173:8000"; // À adapter selon votre serveur

// Configuration du device
const char* DEVICE_NAME = "ESP32-BMP280";
char DEVICE_MAC[18];  // Sera rempli automatiquement
const char* DEVICE_LOCATION = "Toulouse, France";
int device_id = -1;  // Sera obtenu après création du device

Adafruit_BMP280 bmp;  // Création de l'objet BMP280

unsigned long lastReadMs = 0;
float lastTemp = 0.0;
float lastPressure = 0.0;
float lastAltitude = 0.0;

// Fonction pour trouver ou créer le device sur l'API
bool createDevice() {
  // Obtenir l'adresse MAC
  uint8_t mac[6];
  WiFi.macAddress(mac);
  sprintf(DEVICE_MAC, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  
  HTTPClient http;
  
  // D'abord, chercher si le device existe déjà
  String getUrl = String(API_BASE_URL) + "/devices/";
  http.begin(getUrl);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    // Chercher notre MAC dans la liste des devices
    if (response.indexOf(String(DEVICE_MAC)) > 0) {
      // Device trouvé, extraire son ID
      int macStart = response.indexOf(String(DEVICE_MAC));
      int idStart = response.lastIndexOf("\"id\":", macStart);
      if (idStart > 0) {
        idStart += 5; // Longueur de "\"id\":"
        int idEnd = response.indexOf(",", idStart);
        if (idEnd == -1) idEnd = response.indexOf("}", idStart);
        device_id = response.substring(idStart, idEnd).toInt();
        if (device_id > 0) {
          preferences.putInt("device_id", device_id);
          Serial.printf("Device existant trouvé avec ID: %d\n", device_id);
          http.end();
          return true;
        }
      }
    }
  }
  
  // Si on n'a pas trouvé le device, le créer
  String postUrl = String(API_BASE_URL) + "/devices/";
  String payload = "{\"nom\":\"" + String(DEVICE_NAME) + "\",";
  payload += "\"mac_address\":\"" + String(DEVICE_MAC) + "\",";
  payload += "\"location\":\"" + String(DEVICE_LOCATION) + "\"}";

  http.begin(postUrl);
  http.addHeader("Content-Type", "application/json");
  
  httpCode = http.POST(payload);
  
  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    // Extraire l'ID du device de la réponse
    int idIdx = response.indexOf("\"id\":");
    if (idIdx > 0) {
      int start = idIdx + 5;
      int end = response.indexOf(",", start);
      if (end == -1) end = response.indexOf("}", start);
      device_id = response.substring(start, end).toInt();
      // Sauvegarder l'ID dans la mémoire persistante
      preferences.putInt("device_id", device_id);
      Serial.printf("Device créé avec ID: %d\n", device_id);
      http.end();
      return true;
    }
  }
  
  Serial.printf("Erreur création/recherche device: %d\n", httpCode);
  http.end();
  return false;
}

// Fonction pour envoyer une mesure
bool sendMeasure(const char* type, float value) {
  if (device_id < 0) return false;
  
  HTTPClient http;
  String url = String(API_BASE_URL) + "/measures/";
  
  // Créer le JSON pour la mesure
  String payload = "{\"type\":\"" + String(type) + "\",";
  payload += "\"mesure_value\":" + String(value, 2) + ",";
  payload += "\"device_id\":" + String(device_id) + "}";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(payload);
  bool success = (httpCode == 200 || httpCode == 201);
  
  if (!success) {
    Serial.printf("Erreur envoi %s: %d\n", type, httpCode);
  }
  
  http.end();
  return success;
}

// Fonction pour effacer les données stockées dans la NVM
void clearNVM() {
  preferences.begin("iot-device", false);
  preferences.clear();
  preferences.end();
  Serial.println("NVM effacée avec succès");
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // Effacer la NVM si le bouton BOOT est maintenu pendant le démarrage
  if (digitalRead(0) == LOW) { // Le bouton BOOT est sur le GPIO 0
    Serial.println("Bouton BOOT détecté - Effacement de la NVM...");
    clearNVM();
    delay(1000);
  }

  // Initialiser les préférences
  preferences.begin("iot-device", false);
  // Récupérer l'ID du device s'il existe déjà
  device_id = preferences.getInt("device_id", -1);
  if (device_id > 0) {
    Serial.printf("Device ID récupéré: %d\n", device_id);
  }

  // Initialisation du BMP280
  if (!bmp.begin(0x77)) {
    Serial.println("BMP280 non trouvé à l'adresse 0x76. Essayez 0x77 ou vérifiez le câblage.");
  } else {
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                    Adafruit_BMP280::SAMPLING_X2,    // température
                    Adafruit_BMP280::SAMPLING_X16,   // pression
                    Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
    Serial.println("BMP280 initialisé.");
  }

  // Connexion WiFi
  Serial.printf("Connexion au WiFi %s ...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  while (WiFi.status() != WL_CONNECTED && millis() < 20000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnecté au WiFi");
    Serial.print("Adresse IP: ");
    Serial.println(WiFi.localIP());
    
    // Créer le device sur l'API seulement si on n'a pas déjà un ID
    if (device_id < 0) {
      if (createDevice()) {
        Serial.println("Device enregistré avec succès");
      } else {
        Serial.println("Erreur lors de l'enregistrement du device");
      }
    } else {
      Serial.println("Device déjà enregistré, utilisation de l'ID existant");
    }
  } else {
    Serial.println("\nÉchec de connexion au WiFi");
  }
}

void loop() {
  // Lecture et envoi toutes les 10 secondes
  if (millis() - lastReadMs >= 10000) {
    if (bmp.begin(0x77)) {
      // Vérifier la connexion WiFi
      if (WiFi.status() == WL_CONNECTED && device_id > 0) {
        // Lecture des capteurs
        lastTemp = bmp.readTemperature();
        lastPressure = bmp.readPressure() / 100.0F;  // conversion en hPa
        lastAltitude = bmp.readAltitude(1013.25);    // altitude approximative

        // Affichage local
        Serial.printf("\nTempérature : %.2f °C\n", lastTemp);
        Serial.printf("Pression : %.2f hPa\n", lastPressure);
        Serial.printf("Altitude : %.2f m\n", lastAltitude);

        // Envoi des mesures
        bool tempOk = sendMeasure("temperature", lastTemp);
        bool pressOk = sendMeasure("pression", lastPressure);
        bool altOk = sendMeasure("altitude", lastAltitude);

        Serial.printf("Envoi des mesures: %s\n", 
          (tempOk && pressOk && altOk) ? "OK" : "Erreur partielle");
      }
      lastReadMs = millis();
    }
  }
}