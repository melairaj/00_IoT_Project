# Spécification [Draft] - Client IoT ESP32 BMP280
---
**Auteur:** ELAIRAJ MOHAMED  
**Version:** 1.0  
**Date:** Octobre 2025
**Plateforme:** ESP32  
**Capteur:** BMP280 (Température, Pression, Altitude)  
**Langage:** C++ / Arduino Framework
**Release:** v1.0.0.0

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture matérielle](#architecture-matérielle)
3. [Bibliothèques requises](#bibliothèques-requises)
4. [Configuration](#configuration)
5. [Fonctionnement du système](#fonctionnement-du-système)
6. [Fonctions principales](#fonctions-principales)
7. [Cycle de vie](#cycle-de-vie)
8. [Gestion de la persistance](#gestion-de-la-persistance)
9. [Communication API](#communication-api)
10. [Schéma de câblage](#schéma-de-câblage)
11. [Déploiement](#déploiement)
12. [Dépannage](#dépannage)

---

## Vue d'ensemble

Ce firmware transforme un **ESP32** en station météorologique IoT connectée. Il :

- Lit des données environnementales (température, pression, altitude) via un capteur **BMP280**
- Se connecte à un réseau WiFi
- S'enregistre automatiquement auprès d'une API REST
- Envoie périodiquement les mesures vers le serveur
- Stocke son identifiant de manière persistante en mémoire NVM
- Permet la réinitialisation via le bouton BOOT

---

## Architecture Matérielle

### Composants Requis

| Composant | Modèle/Type | Quantité | Description |
|-----------|-------------|----------|-------------|
| Microcontrôleur | ESP32 | 1 | Module WiFi intégré |
| Capteur | BMP280 | 1 | Capteur de pression et température |
| Câbles | Dupont | 4 | Pour connexion I2C |

### Spécifications du BMP280

- **Interface:** I2C
- **Adresse I2C:** 0x77 (peut être 0x76 selon le module)
- **Mesures:**
  - Température: -40°C à +85°C (±1°C)
  - Pression: 300 hPa à 1100 hPa (±1 hPa)
  - Altitude: Calculée à partir de la pression

---

## Bibliothèques Requises

Toutes les bibliothèques doivent être installées via PlatformIO ou Arduino IDE :

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    Wire
    WiFi
    HTTPClient
    adafruit/Adafruit Unified Sensor@^1.1.14
    adafruit/Adafruit BMP280 Library@^2.6.8
    Preferences
```

### Détail des Bibliothèques

| Bibliothèque | Version | Usage |
|--------------|---------|-------|
| `Wire.h` | Built-in | Communication I2C |
| `WiFi.h` | Built-in | Connexion WiFi |
| `HTTPClient.h` | Built-in | Requêtes HTTP REST |
| `Adafruit_Sensor.h` | 1.1.14+ | Interface capteurs Adafruit |
| `Adafruit_BMP280.h` | 2.6.8+ | Driver BMP280 |
| `Preferences.h` | Built-in | Stockage persistant NVM |

---

## Configuration

### Paramètres WiFi

```cpp
const char* WIFI_SSID = "Bbox-AFDEC9DC";
const char* WIFI_PASS = "A1A4D12564176D79E19F1DA4DCF2E9";
```

⚠️ **Important:** Modifier ces valeurs selon votre réseau WiFi.

---

### Paramètres API

```cpp
const char* API_BASE_URL = "http://192.168.1.173:8000";
```

⚠️ **Important:** Remplacer par l'URL de votre serveur API IoT.

---

### Paramètres du Device

```cpp
const char* DEVICE_NAME = "ESP32-BMP280";
const char* DEVICE_LOCATION = "Toulouse, France";
```

- **DEVICE_NAME:** Nom identifiant le capteur
- **DEVICE_LOCATION:** Localisation géographique
- **DEVICE_MAC:** Généré automatiquement à partir de l'adresse MAC WiFi

---

### Configuration du Capteur BMP280

```cpp
bmp.setSampling(
    Adafruit_BMP280::MODE_NORMAL,        // Mode de fonctionnement
    Adafruit_BMP280::SAMPLING_X2,        // Suréchantillonnage température
    Adafruit_BMP280::SAMPLING_X16,       // Suréchantillonnage pression
    Adafruit_BMP280::FILTER_X16,         // Filtre IIR
    Adafruit_BMP280::STANDBY_MS_500      // Temps de veille entre mesures
);
```

---

## Fonctionnement du Système

### Diagramme de Flux

```
┌─────────────────┐
│   Démarrage     │
│   ESP32         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Bouton BOOT     │◄─── Maintenu? ──┐
│ pressé?         │                  │
└────────┬────────┘                  │
         │ Non                       │ Oui
         ▼                           │
┌─────────────────┐           ┌─────▼──────┐
│ Charger ID      │           │ Effacer    │
│ depuis NVM      │           │ NVM        │
└────────┬────────┘           └────────────┘
         │
         ▼
┌─────────────────┐
│ Init BMP280     │
│ (I2C 0x77)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Connexion WiFi  │
│ (timeout 20s)   │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ ID > 0?│
    └───┬────┘
        │ Non
        ▼
┌─────────────────┐
│ Recherche       │
│ Device API      │
│ (par MAC)       │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Trouvé? │
    └────┬────┘
         │ Non
         ▼
┌─────────────────┐
│ POST /devices/  │
│ Créer device    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sauvegarder ID  │
│ dans NVM        │
└────────┬────────┘
         │
         ▼
╔═════════════════╗
║   BOUCLE        ║
║   PRINCIPALE    ║
╚════════┬════════╝
         │
    ┌────▼────────┐
    │ Attente     │
    │ 10 secondes │
    └────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lire BMP280     │
│ - Température   │
│ - Pression      │
│ - Altitude      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /measures/ │
│ (3 mesures)     │
└────────┬────────┘
         │
         └──────────┐
                    │
                    ▼
              ┌──────────┐
              │ Répéter  │
              └──────────┘
```

---

## Fonctions Principales

### 1. `createDevice()`

Recherche ou crée le device sur l'API REST.

#### Comportement

1. **Génération de l'adresse MAC**
   ```cpp
   WiFi.macAddress(mac);
   sprintf(DEVICE_MAC, "%02X:%02X:%02X:%02X:%02X:%02X", ...);
   ```

2. **Recherche du device existant**
   - Envoie `GET /devices/`
   - Parse la réponse JSON pour trouver la MAC address
   - Si trouvé, extrait l'ID et le sauvegarde

3. **Création si non trouvé**
   - Envoie `POST /devices/` avec le payload :
     ```json
     {
       "nom": "ESP32-BMP280",
       "mac_address": "AA:BB:CC:DD:EE:FF",
       "location": "Toulouse, France"
     }
     ```
   - Extrait l'ID de la réponse
   - Sauvegarde l'ID dans la NVM

#### Retour

- `true` : Device trouvé ou créé avec succès
- `false` : Erreur de communication

---

### 2. `sendMeasure()`

Envoie une mesure vers l'API.

#### Paramètres

```cpp
bool sendMeasure(const char* type, float value)
```

- **type:** Type de mesure (`"temperature"`, `"pression"`, `"altitude"`)
- **value:** Valeur numérique de la mesure

#### Payload HTTP

```json
{
  "type": "temperature",
  "mesure_value": 22.50,
  "device_id": 1
}
```

#### Requête HTTP

- **Méthode:** POST
- **URL:** `http://API_BASE_URL/measures/`
- **Content-Type:** `application/json`

#### Retour

- `true` : Mesure envoyée avec succès (HTTP 200 ou 201)
- `false` : Erreur d'envoi

---

### 3. `clearNVM()`

Efface toutes les données persistantes stockées en mémoire NVM.

#### Usage

Appelée automatiquement si le bouton BOOT (GPIO 0) est maintenu au démarrage.

```cpp
preferences.begin("iot-device", false);
preferences.clear();
preferences.end();
```

---

### 4. `setup()`

Fonction d'initialisation exécutée une seule fois au démarrage.

#### Étapes

1. **Initialisation Serial** (115200 bauds)
2. **Vérification bouton BOOT** → Effacement NVM si pressé
3. **Chargement des préférences** depuis la NVM
4. **Initialisation BMP280**
   - Adresse I2C: 0x77
   - Configuration du mode de sampling
5. **Connexion WiFi**
   - Timeout: 20 secondes
   - Affichage de l'IP locale
6. **Enregistrement du device**
   - Si `device_id < 0`, appel de `createDevice()`

---

### 5. `loop()`

Boucle principale exécutée en continu.

#### Comportement

**Toutes les 10 secondes (10000 ms) :**

1. **Vérification de la connexion**
   - WiFi connecté
   - `device_id > 0`

2. **Lecture des capteurs**
   ```cpp
   lastTemp = bmp.readTemperature();              // °C
   lastPressure = bmp.readPressure() / 100.0F;    // hPa
   lastAltitude = bmp.readAltitude(1013.25);      // m
   ```

3. **Affichage local** (Serial)
   ```
   Température : 22.50 °C
   Pression : 1013.25 hPa
   Altitude : 150.00 m
   ```

4. **Envoi des mesures**
   - `sendMeasure("temperature", lastTemp)`
   - `sendMeasure("pression", lastPressure)`
   - `sendMeasure("altitude", lastAltitude)`

5. **Feedback de statut**
   - "OK" si toutes les mesures sont envoyées
   - "Erreur partielle" si au moins une échoue

---

## Cycle de Vie

### Premier Démarrage

```
1. ESP32 démarre
2. Aucun ID stocké en NVM
3. Connexion WiFi
4. Récupération de la MAC address
5. Appel GET /devices/ pour chercher le device
6. Si non trouvé → POST /devices/ pour créer
7. Sauvegarde de l'ID reçu dans la NVM
8. Début des mesures périodiques
```

### Démarrages Suivants

```
1. ESP32 démarre
2. Chargement de l'ID depuis la NVM
3. Connexion WiFi
4. Pas de création/recherche de device
5. Début direct des mesures périodiques
```

### Réinitialisation

```
1. Maintenir le bouton BOOT pendant le démarrage
2. Détection du bouton (GPIO 0 = LOW)
3. Effacement de la NVM
4. Redémarrage normal (comme premier démarrage)
```

---

## Gestion de la Persistance

### Namespace NVM

```cpp
preferences.begin("iot-device", false);
```

- **Namespace:** `"iot-device"`
- **Read-only:** `false` (lecture/écriture)

### Données Stockées

| Clé | Type | Description | Valeur par défaut |
|-----|------|-------------|-------------------|
| `device_id` | `int` | ID du device sur l'API | `-1` (non enregistré) |

### Opérations

**Lecture:**
```cpp
device_id = preferences.getInt("device_id", -1);
```

**Écriture:**
```cpp
preferences.putInt("device_id", device_id);
```

**Effacement:**
```cpp
preferences.clear();
```

---

## Communication API

### Endpoints Utilisés

#### 1. GET /devices/

**Usage:** Recherche d'un device existant par MAC address

**Requête:**
```http
GET http://192.168.1.173:8000/devices/
```

**Réponse (exemple):**
```json
[
  {
    "id": 1,
    "nom": "ESP32-BMP280",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "location": "Toulouse, France",
    "created_at": "2025-10-09T10:30:00",
    "mesures": []
  }
]
```

**Parsing:**
- Recherche de la chaîne `DEVICE_MAC` dans la réponse
- Si trouvée, extraction de l'`"id"` associé

---

#### 2. POST /devices/

**Usage:** Création d'un nouveau device

**Requête:**
```http
POST http://192.168.1.173:8000/devices/
Content-Type: application/json

{
  "nom": "ESP32-BMP280",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "location": "Toulouse, France"
}
```

**Réponse (exemple):**
```json
{
  "id": 1,
  "nom": "ESP32-BMP280",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "location": "Toulouse, France",
  "created_at": "2025-10-09T10:30:00",
  "mesures": []
}
```

**Parsing:**
- Extraction de l'`"id"` depuis la réponse JSON

---

#### 3. POST /measures/

**Usage:** Envoi d'une mesure

**Requête (température):**
```http
POST http://192.168.1.173:8000/measures/
Content-Type: application/json

{
  "type": "temperature",
  "mesure_value": 22.50,
  "device_id": 1
}
```

**Requête (pression):**
```json
{
  "type": "pression",
  "mesure_value": 1013.25,
  "device_id": 1
}
```

**Requête (altitude):**
```json
{
  "type": "altitude",
  "mesure_value": 150.00,
  "device_id": 1
}
```

**Réponse:**
```json
{
  "id": 42,
  "type": "temperature",
  "mesure_value": 22.50,
  "date": "2025-10-09T10:35:00"
}
```

---

## Schéma de Câblage

### Connexion I2C BMP280 ↔ ESP32

```
BMP280          ESP32
──────────────────────
VCC     ────►   3.3V
GND     ────►   GND
SCL     ────►   GPIO 22 (SCL)
SDA     ────►   GPIO 21 (SDA)
```

### Diagramme Visuel

```
┌─────────────────┐
│     ESP32       │
│                 │
│  GPIO 22 (SCL)  ├────┐
│  GPIO 21 (SDA)  ├───┐│
│  3.3V           ├──┐││
│  GND            ├─┐│││
└─────────────────┘ ││││
                    ││││
                    ││││
┌─────────────────┐ ││││
│    BMP280       │ ││││
│                 │ ││││
│  SCL            ├─┘│││
│  SDA            ├──┘││
│  VCC            ├───┘│
│  GND            ├────┘
└─────────────────┘
```

### Notes de Câblage

⚠️ **Important:**
- Utiliser impérativement **3.3V** (le BMP280 n'est pas tolérant au 5V)
- Certains modules BMP280 ont l'adresse **0x76** au lieu de **0x77**
- Vérifier l'adresse I2C avec un scanner si le capteur n'est pas détecté

---

## Déploiement

### Prérequis

1. **PlatformIO** ou **Arduino IDE** installé
2. **Driver USB-Serial** pour ESP32 (CP210x ou CH340)
3. **Câble USB** Micro-USB ou USB-C selon le modèle ESP32

---

### Configuration PlatformIO

**Fichier `platformio.ini` :**

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps = 
    adafruit/Adafruit Unified Sensor@^1.1.14
    adafruit/Adafruit BMP280 Library@^2.6.8
```

---

### Personnalisation du Code

**1. Modifier les identifiants WiFi:**

```cpp
const char* WIFI_SSID = "VotreSSID";
const char* WIFI_PASS = "VotreMotDePasse";
```

**2. Modifier l'URL de l'API:**

```cpp
const char* API_BASE_URL = "http://votre-serveur.com:8000";
```

**3. Personnaliser le device:**

```cpp
const char* DEVICE_NAME = "Mon-Capteur-Meteo";
const char* DEVICE_LOCATION = "Salon, Maison";
```

---

### Compilation et Upload

**Via PlatformIO CLI:**

```bash
# Compiler
pio run

# Uploader vers l'ESP32
pio run --target upload

# Ouvrir le moniteur série
pio device monitor
```

**Via Arduino IDE:**

1. Ouvrir `main.cpp` (renommer en `.ino`)
2. Sélectionner la carte : **ESP32 Dev Module**
3. Sélectionner le port COM approprié
4. Cliquer sur **Téléverser**
5. Ouvrir le **Moniteur série** (115200 bauds)

---

### Sortie Console Attendue

**Premier démarrage:**

```
Connexion au WiFi Bbox-AFDEC9DC ...
.....
Connecté au WiFi
Adresse IP: 192.168.1.100
Device créé avec ID: 1
Device enregistré avec succès

Température : 22.50 °C
Pression : 1013.25 hPa
Altitude : 150.00 m
Envoi des mesures: OK
```

**Démarrages suivants:**

```
Device ID récupéré: 1
Connexion au WiFi Bbox-AFDEC9DC ...
Connecté au WiFi
Adresse IP: 192.168.1.100
Device déjà enregistré, utilisation de l'ID existant

Température : 22.45 °C
Pression : 1013.30 hPa
Altitude : 149.50 m
Envoi des mesures: OK
```

---

## Dépannage

### Problèmes Courants

#### 1. BMP280 non détecté

**Symptôme:**
```
BMP280 non trouvé à l'adresse 0x77. Essayez 0x76 ou vérifiez le câblage.
```

**Solutions:**
- Vérifier le câblage (SDA, SCL, VCC, GND)
- Essayer l'adresse **0x76** :
  ```cpp
  if (!bmp.begin(0x76)) {
  ```
- Utiliser un scanner I2C pour détecter l'adresse
- Vérifier que le module est alimenté en **3.3V**

---

#### 2. Échec de connexion WiFi

**Symptôme:**
```
Échec de connexion au WiFi
```

**Solutions:**
- Vérifier SSID et mot de passe
- S'assurer que l'ESP32 est à portée du routeur
- Vérifier que le WiFi est en 2.4 GHz (l'ESP32 ne supporte pas le 5 GHz)
- Redémarrer le routeur

---

#### 3. Erreur d'envoi de mesures

**Symptôme:**
```
Erreur envoi temperature: 404
Envoi des mesures: Erreur partielle
```

**Solutions:**
- Vérifier que l'API est accessible : `curl http://192.168.1.173:8000/devices/`
- Vérifier que `device_id` est valide (> 0)
- Vérifier les logs du serveur API
- Tester manuellement l'endpoint avec Postman

---

#### 4. Device recréé à chaque démarrage

**Symptôme:**
Un nouveau device est créé à chaque redémarrage au lieu de réutiliser l'existant.

**Solutions:**
- La NVM n'est pas sauvegardée correctement
- Effacer la NVM et laisser le système se réenregistrer :
  - Maintenir BOOT au démarrage
- Vérifier que `preferences.putInt()` est bien appelé

---

#### 5. Valeurs de capteur aberrantes

**Symptôme:**
Température à 85°C ou pression à 0 hPa

**Solutions:**
- Le capteur n'est pas correctement initialisé
- Vérifier le câblage et l'alimentation
- Ajouter un délai après `bmp.begin()` :
  ```cpp
  bmp.begin(0x77);
  delay(100);
  ```

---

## Améliorations Possibles

### Fonctionnalités

1. **Mode Deep Sleep**
   - Réduire la consommation énergétique
   - Réveil périodique pour les mesures

2. **Gestion de la reconnexion WiFi**
   - Reconnexion automatique en cas de perte
   - Mise en buffer des mesures hors ligne

3. **Authentification API**
   - Ajouter un token Bearer dans les headers HTTP
   - Sécuriser les communications

4. **Configuration via WiFi Portal**
   - Interface web pour configurer WiFi et API
   - Pas besoin de recompiler pour changer les paramètres

5. **LED de statut**
   - Vert: Fonctionnement normal
   - Rouge: Erreur de connexion
   - Bleu: Envoi de données

6. **Watchdog Timer**
   - Redémarrage automatique en cas de blocage

7. **OTA (Over-The-Air) Updates**
   - Mise à jour du firmware à distance

8. **Calibration de l'altitude**
   - Ajustement de la pression de référence
   - Stockage en NVM

9. **Moyennage des mesures**
   - Prendre plusieurs mesures et calculer la moyenne
   - Réduire le bruit des capteurs

10. **Logging SD Card**
    - Sauvegarde locale des mesures
    - Backup en cas de perte de connexion

---

## Spécifications Techniques

### Performances

| Métrique | Valeur |
|----------|--------|
| Fréquence de mesure | 10 secondes |
| Timeout WiFi | 20 secondes |
| Baud rate Serial | 115200 |
| Consommation (actif) | ~80-100 mA |
| Consommation (WiFi TX) | ~160-260 mA |
| Temps de boot | ~3-5 secondes |

### Limites

- **Mémoire RAM:** ~520 KB (ESP32)
- **Mémoire Flash:** 4 MB (typique)
- **NVM (Preferences):** ~1 KB utilisé
- **Portée WiFi:** ~50-100m (selon environnement)
- **Durée de vie NVM:** ~100,000 cycles d'écriture

---

## Licence et Crédits

Ce firmware utilise les bibliothèques open-source suivantes :

- **Adafruit BMP280 Library** - MIT License
- **Adafruit Unified Sensor** - Apache License 2.0
- **ESP32 Arduino Core** - LGPL 2.1

---

## Support et Contact

Pour toute question ou problème :

1. Vérifier la section [Dépannage](#dépannage)
2. Consulter les logs série (115200 bauds)
3. Vérifier la connectivité réseau et API
4. Tester les composants individuellement

---

## Changelog

### Version 1.0 (Octobre 2025)
- Implémentation initiale
- Support BMP280 (I2C)
- Connexion WiFi
- Intégration API REST
- Persistance NVM
- Reset via bouton BOOT