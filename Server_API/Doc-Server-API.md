# Spécification [Draft] - API IoT Device Management

**Auteur:** ELAIRAJ MOHAMED  
**Version:** 1.0  
**Date:** Octobre 2025

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Configuration de la base de données](#configuration-de-la-base-de-données)
4. [Modèles de données](#modèles-de-données)
5. [Schémas API](#schémas-api)
6. [Endpoints API](#endpoints-api)
7. [Configuration Docker](#configuration-docker)
8. [Déploiement](#déploiement)

---

## Vue d'ensemble

Cette application est une **API RESTful** développée avec **FastAPI** pour gérer un système IoT (Internet of Things). Elle permet de :

- Gérer des dispositifs IoT (création, lecture, mise à jour, suppression)
- Enregistrer et consulter des mesures provenant de ces dispositifs
- Maintenir une relation entre les dispositifs et leurs mesures
- Déployer l'application via Docker

---

## Architecture

### Stack Technologique

- **Framework Web:** FastAPI 
- **ORM:** SQLAlchemy
- **Validation:** Pydantic
- **Serveur ASGI:** Uvicorn
- **Base de données:** SQLite
- **Conteneurisation:** Docker

### Structure du Projet

```
.
├── Dockerfile              # Configuration Docker
├── server_api.py          # Code principal de l'API
└── iot.db                 # Base de données SQLite (générée au runtime)
```

---

## Configuration de la Base de Données

### Paramètres

- **Type:** SQLite
- **Fichier:** `./iot.db`
- **URL de connexion:** `sqlite:///./iot.db`
- **Configuration spéciale:** `check_same_thread=False` (pour FastAPI)

### Initialisation

La base de données est automatiquement créée au démarrage de l'application via :

```python
Base.metadata.create_all(bind=engine)
```

---

## Modèles de Données

### 1. Device (Dispositif)

Représente un dispositif IoT dans le système.

#### Table: `devices`

| Colonne      | Type     | Contraintes                    | Description                          |
|--------------|----------|--------------------------------|--------------------------------------|
| `id`         | Integer  | PRIMARY KEY, INDEX             | Identifiant unique du dispositif     |
| `nom`        | String   | NOT NULL                       | Nom du dispositif                    |
| `mac_address`| String   | UNIQUE, NOT NULL               | Adresse MAC du dispositif            |
| `location`   | String   | NULLABLE                       | Localisation du dispositif           |
| `created_at` | DateTime | DEFAULT: datetime.utcnow       | Date de création de l'enregistrement |

#### Relations

- **Un-à-plusieurs** avec `Measure` : Un dispositif peut avoir plusieurs mesures
- **Cascade:** `all, delete` - La suppression d'un dispositif supprime toutes ses mesures

---

### 2. Measure (Mesure)

Représente une mesure effectuée par un dispositif.

#### Table: `measures`

| Colonne         | Type     | Contraintes                    | Description                      |
|-----------------|----------|--------------------------------|----------------------------------|
| `id`            | Integer  | PRIMARY KEY, INDEX             | Identifiant unique de la mesure  |
| `type`          | String   | NOT NULL                       | Type de mesure (ex: température) |
| `date`          | DateTime | DEFAULT: datetime.utcnow       | Date de la mesure                |
| `device_id`     | Integer  | FOREIGN KEY → devices.id       | Référence au dispositif          |
| `mesure_value`  | Float    | NOT NULL                       | Valeur de la mesure              |

#### Relations

- **Plusieurs-à-un** avec `Device` : Plusieurs mesures appartiennent à un dispositif

---

## Schémas API

Les schémas Pydantic définissent la validation et la sérialisation des données.

### Device Schemas

#### `DeviceBase`
```python
{
  "nom": str,
  "mac_address": str,
  "location": str | null
}
```

#### `DeviceCreate` (hérite de DeviceBase)
Utilisé pour la création d'un dispositif.

#### `DeviceRead` (hérite de DeviceBase)
```python
{
  "id": int,
  "nom": str,
  "mac_address": str,
  "location": str | null,
  "created_at": datetime,
  "mesures": List[MeasureRead]
}
```

### Measure Schemas

#### `MeasureBase`
```python
{
  "type": str (avec strip_whitespace),
  "mesure_value": float
}
```

#### `MeasureCreate` (hérite de MeasureBase)
```python
{
  "type": str,
  "mesure_value": float,
  "device_id": int
}
```

#### `MeasureRead` (hérite de MeasureBase)
```python
{
  "id": int,
  "type": str,
  "mesure_value": float,
  "date": datetime
}
```

---

## Endpoints API

### Devices Endpoints

#### 1. **POST /devices/**
Crée un nouveau dispositif ou met à jour un dispositif existant.

**Comportement spécial:**
- Si un dispositif avec la même `mac_address` existe, il est mis à jour au lieu d'être créé
- Seules les valeurs non-nulles sont mises à jour lors d'une mise à jour

**Request Body:**
```json
{
  "nom": "Capteur Température",
  "mac_address": "00:1B:44:11:3A:B7",
  "location": "Bureau"
}
```

**Response:** `DeviceRead` (200)

---

#### 2. **GET /devices/**
Récupère la liste de tous les dispositifs.

**Response:** `List[DeviceRead]` (200)

---

#### 3. **GET /devices/{device_id}**
Récupère un dispositif spécifique par son ID.

**Paramètres:**
- `device_id` (path): ID du dispositif

**Response:** `DeviceRead` (200)  
**Erreur:** 404 si le dispositif n'existe pas

---

#### 4. **PUT /devices/{device_id}**
Met à jour un dispositif existant.

**Paramètres:**
- `device_id` (path): ID du dispositif

**Request Body:** `DeviceCreate`

**Response:** `DeviceRead` (200)  
**Erreur:** 404 si le dispositif n'existe pas

---

#### 5. **DELETE /devices/{device_id}**
Supprime un dispositif et toutes ses mesures associées.

**Paramètres:**
- `device_id` (path): ID du dispositif

**Response:**
```json
{
  "detail": "Device deleted successfully"
}
```

**Erreur:** 404 si le dispositif n'existe pas

---

### Measures Endpoints

#### 1. **POST /measures/**
Crée une nouvelle mesure pour un dispositif.

**Request Body:**
```json
{
  "type": "temperature",
  "mesure_value": 22.5,
  "device_id": 1
}
```

**Response:** `MeasureRead` (200)  
**Erreur:** 404 si le dispositif n'existe pas

---

#### 2. **GET /measures/**
Récupère toutes les mesures du système.

**Response:** `List[MeasureRead]` (200)

---

#### 3. **GET /measures/{measure_id}**
Récupère une mesure spécifique par son ID.

**Paramètres:**
- `measure_id` (path): ID de la mesure

**Response:** `MeasureRead` (200)  
**Erreur:** 404 si la mesure n'existe pas

---

#### 4. **PUT /measures/{measure_id}**
Met à jour une mesure existante.

**Paramètres:**
- `measure_id` (path): ID de la mesure

**Request Body:** `MeasureBase`

**Response:** `MeasureRead` (200)  
**Erreur:** 404 si la mesure n'existe pas

---

#### 5. **DELETE /measures/{measure_id}**
Supprime une mesure.

**Paramètres:**
- `measure_id` (path): ID de la mesure

**Response:**
```json
{
  "detail": "Measure deleted successfully"
}
```

**Erreur:** 404 si la mesure n'existe pas

---

## Configuration Docker

### Dockerfile

Le fichier Docker configure un environnement d'exécution pour l'application.

#### Image de Base
- **Python 3.11-slim** : Version légère de Python 3.11

#### Étapes de Build

1. **Définition du répertoire de travail**
   ```dockerfile
   WORKDIR /app
   ```

2. **Copie des fichiers**
   ```dockerfile
   COPY . /app
   ```

3. **Installation des dépendances**
   ```dockerfile
   RUN pip install --no-cache-dir fastapi sqlalchemy pydantic uvicorn
   ```

4. **Exposition du port**
   ```dockerfile
   EXPOSE 8000
   ```

5. **Commande de démarrage**
   ```dockerfile
   CMD ["uvicorn", "server_api:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

---

## Déploiement

### Déploiement avec Dokploy

**Dokploy** est une plateforme de déploiement open-source qui simplifie le déploiement d'applications conteneurisées. Cette application est configurée pour être déployée via Dokploy.

#### Prérequis
- Serveur avec Dokploy installé
- Accès au repository Git contenant le code
- Port 8000 disponible sur le serveur

#### Étapes de Déploiement

1. **Connexion à Dokploy**
   - Accédez à votre instance Dokploy via navigateur
   - Connectez-vous avec vos identifiants

2. **Création d'un Nouveau Projet**
   - Cliquez sur "New Project" ou "Nouveau Projet"
   - Nommez le projet : `iot-device-api`

3. **Configuration de l'Application**
   - **Type:** Docker / Dockerfile
   - **Repository:** Connectez votre repository Git
   - **Branch:** Sélectionnez la branche à déployer (ex: `main`)
   - **Dockerfile Path:** `./Dockerfile` (chemin par défaut)
   - **Build Context:** `.` (racine du projet)

4. **Configuration du Port**
   - **Port interne:** `8000` (défini dans le Dockerfile)
   - **Port externe:** `8000` ou selon votre configuration réseau
   - Dokploy mappera automatiquement le port

5. **Variables d'Environnement (optionnel)**
   Pour une configuration avancée, vous pouvez ajouter :
   ```env
   DATABASE_URL=sqlite:///./iot.db
   API_TITLE=IoT Device API
   API_VERSION=1.0
   ```

6. **Volume pour la Persistence (recommandé)**
   Pour conserver la base de données SQLite entre les redéploiements :
   - **Host Path:** `/var/dokploy/data/iot-api`
   - **Container Path:** `/app`
   - Cela garantit que `iot.db` n'est pas perdu lors des mises à jour

7. **Configuration du Domaine**
   - Ajoutez un domaine personnalisé (ex: `iot-api.votredomaine.com`)
   - Ou utilisez le domaine par défaut fourni par Dokploy
   - Activez HTTPS avec Let's Encrypt si disponible

8. **Déploiement**
   - Cliquez sur "Deploy" ou "Déployer"
   - Dokploy va :
     - Cloner le repository
     - Builder l'image Docker
     - Démarrer le conteneur
     - Configurer le reverse proxy

9. **Vérification**
   - Accédez à votre domaine configuré
   - Testez les endpoints :
     - Documentation: `https://banana-circuit.com/docs`
     - API Health: `https://banana-circuit.com/devices/`
sss
#### Configuration de Redéploiement Automatique

Dokploy peut redéployer automatiquement lors d'un push Git :

1. **Webhooks GitHub/GitLab**
   - Copiez l'URL du webhook fournie par Dokploy
   - Ajoutez-la dans les paramètres de votre repository
   - À chaque push, Dokploy redéploiera automatiquement

2. **Build Automatique**
   - Activez "Auto Deploy" dans les paramètres
   - Sélectionnez la branche à surveiller

#### Surveillance et Logs

- **Logs en temps réel:** Consultez les logs directement dans l'interface Dokploy
- **Métriques:** Surveillez l'utilisation CPU, mémoire et réseau
- **Redémarrage automatique:** Dokploy redémarre automatiquement le conteneur en cas d'erreur

---

### Déploiement Local (sans Docker)

Pour le développement local :

1. **Installation des dépendances:**
   ```bash
   pip install fastapi sqlalchemy pydantic uvicorn
   ```

2. **Lancement de l'application:**
   ```bash
   uvicorn server_api:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Accès:**
   - API: http://localhost:8000
   - Documentation interactive: http://localhost:8000/docs
   - Documentation alternative: http://localhost:8000/redoc

---

### Déploiement avec Docker (manuel)

Pour tester localement avant Dokploy :

1. **Build de l'image:**
   ```bash
   docker build -t iot-api .
   ```

2. **Exécution du conteneur:**
   ```bash
   docker run -d -p 8000:8000 --name iot-container iot-api
   ```

3. **Avec persistence des données:**
   ```bash
   docker run -d -p 8000:8000 \
     -v $(pwd)/data:/app \
     --name iot-container \
     iot-api
   ```

---

## Fonctionnalités Clés

### 1. Gestion Intelligente des Dispositifs
- **Upsert automatique** : La création d'un dispositif avec une MAC existante met à jour le dispositif au lieu de générer une erreur

### 2. Relations en Cascade
- La suppression d'un dispositif supprime automatiquement toutes ses mesures

### 3. Validation des Données
- Validation automatique via Pydantic
- Strip automatique des espaces blancs pour le type de mesure
- Contraintes d'unicité sur les adresses MAC

### 4. Horodatage Automatique
- Tous les dispositifs et mesures ont des timestamps automatiques

### 5. Documentation Automatique
- FastAPI génère automatiquement une documentation OpenAPI/Swagger

---

## Exemples d'Utilisation

### Créer un dispositif
```bash
curl -X POST "http://localhost:8000/devices/" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Capteur Température Salon",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "location": "Salon"
  }'
```

### Ajouter une mesure
```bash
curl -X POST "http://localhost:8000/measures/" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "temperature",
    "mesure_value": 21.5,
    "device_id": 1
  }'
```

### Récupérer tous les dispositifs avec leurs mesures
```bash
curl -X GET "http://localhost:8000/devices/"
```

---

## Notes Techniques

### Gestion des Sessions
- Utilisation de `Depends(get_db)` pour la gestion automatique des sessions
- Fermeture automatique des connexions après chaque requête

### Sécurité
- **Aucune authentification implémentée** : À ajouter pour un environnement de production
- Validation des entrées via Pydantic
- Vérification de l'existence des entités avant modification/suppression

### Performance
- SQLite avec `check_same_thread=False` pour le multithreading
- Index sur les clés primaires et la MAC address

---

## Améliorations Possibles

1. **Authentification et autorisation** (JWT, OAuth2)
2. **Migration vers une base de données production** (PostgreSQL, MySQL)
3. **Pagination** pour les listes de dispositifs/mesures
4. **Filtrage et recherche** avancés
5. **Validation de format** pour les adresses MAC
6. **Logging** structuré
7. **Tests unitaires et d'intégration**
8. **Rate limiting**
9. **CORS configuration**
10. **Variables d'environnement** pour la configuration