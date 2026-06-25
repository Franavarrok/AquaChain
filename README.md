# 💧 AquaCHAIN

**Monitoreo y auditoría de infraestructura hídrica mediante IoT y Blockchain, en tiempo real.**

AquaCHAIN simula una red de sensores de caudal y nivel de agua, persiste cada
medición en PostgreSQL y la ancla a una blockchain privada propia (SHA-256,
encadenada bloque a bloque), de modo que cualquier persona pueda verificar
que el historial de mediciones no fue alterado. El dashboard se actualiza
en vivo vía Socket.io a medida que el simulador genera nuevos datos.

MVP desarrollado para hackatón universitaria (eje Blockchain y
Sustentabilidad), tomando como caso de uso al **Departamento General de
Irrigación (DGI) de Mendoza**.

> ⚠️ Los sensores son **simulados**: no hay hardware físico conectado. Toda
> la generación de datos ocurre dentro de `SensorSimulator`, un servicio que
> corre en el propio proceso del backend.

---

## 📑 Tabla de contenidos

- [Arquitectura general](#-arquitectura-general)
- [Stack tecnológico](#-stack-tecnológico)
- [Cómo funciona la integración con la blockchain](#-cómo-funciona-la-integración-con-la-blockchain)
- [Flujo de datos end-to-end](#-flujo-de-datos-end-to-end)
- [Seguridad](#-seguridad)
- [Estructura de carpetas](#-estructura-de-carpetas)
- [Instalación y uso local](#-instalación-y-uso-local)
- [Variables de entorno](#-variables-de-entorno)
- [API REST](#-api-rest)
- [Eventos de Socket.io](#-eventos-de-socketio)
- [Estado actual del proyecto](#-estado-actual-del-proyecto)
- [Roadmap](#-roadmap)
- [Licencia](#-licencia)

---

## 🏗️ Arquitectura general

```
┌──────────────────────┐
│   SensorSimulator      │  Corre DENTRO del proceso del backend.
│   (servicio interno)   │  Genera una medición cada 5s (caudal + nivel).
└──────────┬────────────┘  Nunca se expone como endpoint HTTP.
           │
           v
┌──────────────────────┐
│   MeasurementService    │  Valida (Zod), persiste, orquesta todo
│   (orquestador)         │  lo que ocurre con cada medición nueva.
└──────────┬────────────┘
           │
   ┌───────┼────────┬─────────────┐
   v       v        v             v
┌──────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────┐
│ DB     │ │ Alert     │ │ Blockchain   │ │ Realtime      │
│Postgres│ │ Service   │ │ Service      │ │ Service        │
│ (Neon) │ │(umbrales) │ │(SHA-256)     │ │(Socket.io)     │
└──────┘ └──────────┘ └─────────────┘ └──────┬───────┘
                                              │ emite eventos
                                              v
                                   ┌──────────────────────┐
                                   │   Dashboard React        │
                                   │   (Vite + TS + Tailwind) │
                                   │   Vercel (deploy estático)│
                                   └──────────────────────┘
```

**Por qué está organizado así:** `MeasurementService` es el único punto de
entrada para registrar una medición, y es quien decide en qué orden ocurren
las cosas (persistir → evaluar alertas → anclar a la blockchain → emitir por
socket). Ni `SensorSimulator` ni `BlockchainService` saben que existe
Socket.io — esa dependencia vive aislada en `RealtimeService`, así que la
lógica de negocio no está acoplada al mecanismo de transporte en tiempo real.

## 🧰 Stack tecnológico

**Frontend**

| Tecnología | Uso |
|---|---|
| React 18 | Librería de UI |
| Vite | Bundler y dev server |
| TypeScript | Tipado estático en todo el frontend |
| TailwindCSS | Estilado utilitario |
| Recharts | Gráficos de caudal y nivel |
| Axios | Cliente HTTP para el snapshot inicial (REST) |
| **socket.io-client** | Conexión WebSocket para las actualizaciones en tiempo real |

**Backend**

| Tecnología | Uso |
|---|---|
| Node.js | Runtime |
| Express | Framework HTTP |
| TypeScript | Tipado estático en todo el backend |
| **Socket.io** | Servidor WebSocket, emite eventos al frontend |
| **Zod** | Validación de query params, path params y datos del simulador |
| **Helmet** | Cabeceras HTTP seguras |
| **express-rate-limit** | Rate limiting sobre la API pública |
| `pg` | Driver de PostgreSQL (consultas parametrizadas) |
| `crypto` (nativo de Node) | SHA-256 para el encadenamiento de bloques |

**Base de datos**

| Tecnología | Uso |
|---|---|
| PostgreSQL | Motor relacional |
| Neon | Postgres serverless para el deploy en la nube |

**Infraestructura (deploy)**

| Servicio | Rol |
|---|---|
| Vercel | Deploy del frontend (estático/CDN) |
| Render | Deploy del backend (servicio web Node, expone HTTP + WebSocket) |
| Neon | Base de datos en la nube |

## ⛓️ Cómo funciona la integración con la blockchain

Esta es la pieza central del proyecto, así que vale explicarla con detalle.

### 1. ¿Qué problema resuelve?

PostgreSQL ya garantiza consistencia, pero **no garantiza que nadie con
acceso a la base haya editado un registro pasado**. Si alguien cambia un
valor de `flow_rate` directamente en la tabla `measurements`, la base de
datos no tiene forma de notarlo por sí misma. La blockchain agrega una capa
de **evidencia criptográfica** sobre esos datos: cada medición queda
"sellada" en un bloque, y ese sello es matemáticamente verificable por
cualquiera, sin necesidad de confiar en quien administra el sistema.

No es una blockchain pública: no hay minería, no hay consenso distribuido,
no hay smart contracts. Es una implementación propia y deliberadamente
simple (`backend/src/services/blockchain.service.ts`), porque el objetivo no
es descentralizar la escritura (sigue siendo el DGI quien opera el sistema),
sino dar **auditabilidad verificable** a esos datos.

### 2. Estructura de un bloque

Cada fila de la tabla `blocks` tiene:

| Campo | Tipo | Descripción |
|---|---|---|
| `index` | `number` | Posición del bloque en la cadena (0 = génesis) |
| `measurementId` | `number` | FK a la medición que este bloque ancla |
| `previousHash` | `string` (64 hex) | Hash del bloque anterior |
| `dataHash` | `string` (64 hex) | Hash de los datos de la medición + `previousHash` |
| `hash` | `string` (64 hex) | Hash final: `SHA256(index:dataHash:previousHash)` |
| `timestamp` | `string ISO` | Momento de creación del bloque |

### 3. Cómo se genera cada bloque (`BlockchainService.addBlock`)

```text
dataHash = SHA256({ sensorId, flowRate, waterLevel, timestamp, previousHash })
hash     = SHA256(`${index}:${dataHash}:${previousHash}`)
```

El primer bloque usa como `previousHash` un valor fijo de génesis (64 ceros).
Cada bloque siguiente toma como `previousHash` el `hash` real del bloque
anterior — eso es lo que forma la cadena: alterar cualquier bloque pasado
invalida (matemáticamente) el `hash` de todos los bloques posteriores.

### 4. Cómo se verifica la integridad (`BlockchainService.verifyChain`)

La verificación recorre la cadena de principio a fin y, para cada bloque,
comprueba **tres cosas**:

1. **Encadenamiento:** ¿el `previousHash` de este bloque coincide con el
   `hash` real del bloque anterior?
2. **Integridad del bloque:** ¿el `hash` almacenado puede recalcularse a
   partir de `(index, dataHash, previousHash)`?
3. **Integridad de los datos:** ¿el `dataHash` almacenado puede recalcularse
   a partir de la **medición real** que sigue existiendo en la tabla
   `measurements`?

El tercer chequeo es el que cierra el hueco más sutil: si alguien editara
`measurements` y `blocks` a la vez, de forma "consistente entre sí" pero
distinta del momento original, los dos primeros chequeos no lo detectarían
—pero el tercero sí, porque recalcula el hash contra el dato que está
*hoy* en la base, no contra lo que el bloque dice que debería ser.

Si algún bloque falla alguno de los tres chequeos, la verificación se
detiene ahí y reporta el índice exacto del bloque comprometido junto con la
razón específica (`PREVIOUS_HASH_MISMATCH`, `BLOCK_HASH_MISMATCH`,
`DATA_HASH_MISMATCH` o `MEASUREMENT_NOT_FOUND`).

**Optimización relevante:** en vez de hacer una consulta SQL por cada bloque
para traer su medición asociada (lo que escalaría mal con cientos de
bloques), `verifyChain()` trae todas las mediciones referenciadas en **una
sola consulta batch** (`MeasurementModel.findByIds`) y verifica todo en
memoria.

### 5. Cuándo se verifica

- **Al iniciar el backend** (`server.ts`): si la cadena ya tiene bloques de
  una sesión anterior, se verifica completa antes de aceptar tráfico.
- **Bajo demanda**, vía `GET /api/blockchain/status`.
- **De forma "optimista" en cada escritura:** cuando `addBlock()` crea un
  bloque nuevo, ya sabe que es válido (lo acaba de construir correctamente a
  partir del último hash real), así que emite ese resultado por Socket.io
  sin tener que re-verificar toda la cadena en cada tick del simulador. La
  verificación exhaustiva sigue siendo la que corre al iniciar el servidor y
  la que se expone en `/status`.

### 6. Trazabilidad: de una medición a su bloque

`GET /api/blockchain/trace/:measurementId` toma el id de cualquier medición
(la que se ve en la tabla del dashboard) y devuelve el bloque exacto que la
ancla, junto con el resultado de verificar puntualmente ese bloque. Es la
forma de demostrar, para un dato cualquiera, "esto es lo que prueba que no
fue alterado".

## 🔄 Flujo de datos end-to-end

```
1. SensorSimulator genera una lectura (cada 5s, con probabilidad de anomalía)
2. Se valida con Zod (rangos físicos, formato de sensorId)
3. MeasurementModel.create() → INSERT parametrizado en measurements
4. RealtimeService.emitNewMeasurement() → Socket.io: "measurement:new"
5. AlertService.evaluate() → si corresponde, AlertModel.create() → INSERT en alerts
   RealtimeService.emitNewAlert() → Socket.io: "alert:new" (por cada alerta)
6. BlockchainService.addBlock() → calcula hash, BlockModel.create() → INSERT en blocks
   RealtimeService.emitNewBlock() → Socket.io: "block:new"
   RealtimeService.emitBlockchainStatus() → Socket.io: "blockchain:status"
7. Frontend (useRealtimeDashboard) recibe los eventos y actualiza en memoria:
   - tabla de últimas mediciones, gráficos de caudal/nivel
   - panel de alertas
   - Blockchain Explorer e indicador de estado de la cadena
   Todo sin volver a pedir nada por HTTP.
```

El frontend solo usa REST para el **snapshot inicial** (la primera carga de
cada sección del dashboard); todo lo que ocurre después de esa carga llega
exclusivamente por WebSocket.

## 🔐 Seguridad

- **API de solo lectura:** no existe ningún endpoint público para crear,
  modificar o eliminar datos. La única vía de escritura es
  `SensorSimulator`, que llama directamente a `MeasurementService` desde
  dentro del proceso del backend, sin pasar por HTTP.
- **Validación con Zod:** todos los query params, path params, y los datos
  generados por el simulador se validan antes de tocar la base de datos.
- **Helmet:** cabeceras HTTP seguras por defecto.
- **CORS restringido:** tanto la API REST como Socket.io aceptan únicamente
  los orígenes listados en `CORS_ALLOWED_ORIGINS` — una sola whitelist para
  ambos, no dos listas que puedan desincronizarse.
- **Rate limiting:** límite configurable de requests por IP sobre `/api`.
- **Consultas parametrizadas:** toda interacción con PostgreSQL usa
  placeholders (`$1`, `$2`...) del driver `pg`; no se concatena input en
  ninguna query.
- **Manejo centralizado de errores:** ningún error inesperado expone stack
  traces al cliente en producción.
- **Variables de entorno:** credenciales y configuración sensible se leen
  exclusivamente de variables de entorno, validadas al boot
  (`config/env.ts` falla rápido si falta algo crítico en producción).
- **Auditoría:** eventos de negocio relevantes (medición creada, bloque
  creado, anomalía detectada, alerta creada, verificación de cadena,
  conexión/desconexión de sockets) se loguean de forma estructurada vía
  `logger.audit(...)`.

## 📁 Estructura de carpetas

```
aquachain/
├── backend/
│   └── src/
│       ├── server.ts                 # bootstrap: DB → Socket.io → HTTP → simulador
│       ├── app.ts                    # Express app (Helmet, CORS, rate limit, rutas)
│       ├── socket.ts                 # servidor Socket.io + nombres de eventos
│       ├── config/env.ts             # validación de variables de entorno
│       ├── db/{pool.ts,schema.sql}   # conexión Postgres + esquema
│       ├── models/                   # acceso a datos (measurement, block, alert)
│       ├── services/
│       │   ├── sensorSimulator.service.ts   # generación de mediciones
│       │   ├── measurement.service.ts       # orquestador central
│       │   ├── alert.service.ts             # reglas de alerta
│       │   ├── blockchain.service.ts        # hashing, encadenamiento, verificación
│       │   └── realtime.service.ts          # wrapper de emisión Socket.io
│       ├── controllers/ + routes/    # API REST (solo GET)
│       ├── middlewares/              # errorHandler, rateLimiter, validate, notFound
│       ├── validators/               # esquemas Zod
│       └── scripts/migrate.ts        # aplica schema.sql sin depender de psql
│
└── frontend/
    └── src/
        ├── api/client.ts             # cliente REST (snapshot inicial)
        ├── realtime/socket.ts        # cliente Socket.io
        ├── hooks/useRealtimeDashboard.ts   # snapshot REST + sincronización por socket
        ├── components/dashboard/     # StatsPanel, FlowChart, LevelChart, etc.
        ├── components/blockchain/    # BlockchainStatus, BlockExplorer
        └── pages/Dashboard.tsx
```

## ▶️ Instalación y uso local

### Requisitos

- Node.js ≥ 18
- Una base PostgreSQL (local o en [Neon](https://neon.tech))

### Backend

```bash
cd backend
cp .env.example .env
# Editá .env con tu DATABASE_URL

npm install
npm run dev
```

El simulador arranca automáticamente (`SENSOR_AUTOSTART=true`) y empieza a
generar una medición cada 5 segundos.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Por defecto consume el backend en `http://localhost:4000`. El cliente de
Socket.io deriva su URL de la misma variable `VITE_API_URL` — no hace falta
configurar nada aparte.

## 🔑 Variables de entorno

**`backend/.env`**

```bash
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://aquachain:aquachain@localhost:5432/aquachain

# Whitelist compartida por la API REST y por Socket.io
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://aqua-chain.vercel.app

SENSOR_INTERVAL_MS=5000
ANOMALY_PROBABILITY=0.15
SENSOR_AUTOSTART=true

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
```

**`frontend/.env`**

```bash
VITE_API_URL=http://localhost:4000/api
```

## 🔌 API REST

Todos los endpoints son de **solo lectura** (`GET`).

| Endpoint | Descripción |
|---|---|
| `GET /api/measurements?limit=20` | Últimas mediciones |
| `GET /api/measurements/chart?limit=50` | Serie para graficar caudal/nivel |
| `GET /api/alerts?limit=20` | Últimas alertas + umbrales configurados |
| `GET /api/blockchain?limit=100` | Bloques de la cadena |
| `GET /api/blockchain/status` | Verificación completa de integridad |
| `GET /api/blockchain/trace/:measurementId` | Bloque que ancla una medición específica |
| `GET /api/dashboard/stats` | Estadísticas agregadas para el panel superior |
| `GET /health` | Health check |

## 📡 Eventos de Socket.io

Emitidos por el servidor, sin necesidad de que el cliente envíe nada (canal
de solo difusión):

| Evento | Payload | Cuándo se emite |
|---|---|---|
| `measurement:new` | `Measurement` | Al persistir cada medición nueva |
| `alert:new` | `Alert` | Por cada alerta generada (puede ser más de una por medición) |
| `block:new` | `Block` | Al anclar la medición a un bloque nuevo |
| `blockchain:status` | `{ valid, brokenAtIndex, reason, totalBlocksChecked }` | Tras crear cada bloque (resultado optimista) |

## 🚧 Estado actual del proyecto

| Componente | Estado |
|---|---|
| Backend: seguridad HTTP, validación, manejo de errores, config de entorno | ✅ |
| Blockchain Service: encadenamiento, verificación profunda, trazabilidad | ✅ |
| Sensor Simulator: generación periódica, anomalías, defensa en profundidad | ✅ |
| Socket.io: servidor + emisión de eventos en tiempo real | ✅ |
| Frontend: cliente Socket.io reemplazando el polling original | ✅ |
| Deploy en Vercel / Render / Neon (`render.yaml`, variables en cada plataforma) | 🔴 Pendiente |
| UI de trazabilidad medición → bloque (el endpoint ya existe, falta el botón/modal) | 🔴 Pendiente |

## 🗺️ Roadmap

- [ ] Configuración de deploy (Vercel + Render + Neon) con `render.yaml`.
- [ ] UI de trazabilidad: clic en una medición → ver su bloque y verificación.
- [ ] Integración con sensores físicos reales.
- [ ] Predicción de caudales mediante modelos de IA sobre la serie histórica.
- [ ] Integración directa con organismos públicos de control.

## 📄 Licencia

MIT.
