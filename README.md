# AquaCHAIN

MVP para hackatón universitaria: monitoreo y auditoría de infraestructura hídrica
simulando sensores IoT y anclando cada medición a una blockchain privada simplificada
(SHA-256, encadenada bloque a bloque).

## ⚠️ Estado actual del proyecto (importante leer antes de abrir en VS Code)

Este repo está **en migración activa** de una arquitectura local (Docker Compose +
polling) hacia una arquitectura cloud (Vercel + Render + Neon + Socket.io en tiempo real).

| Carpeta | Estado | Notas |
|---|---|---|
| `backend/` | 🟡 **Etapa 1 completa** | Config de entorno validada, seguridad HTTP (Helmet, CORS restringido, rate limiting), manejo centralizado de errores, validación Zod, modelos y schema SQL listos para Neon. **Todavía sin Socket.io** (hay un `TODO` explícito en `server.ts` marcando dónde se adjunta). El simulador y el servicio de blockchain funcionan pero aún no fueron revisados/extendidos para la Etapa 2 (verificación de integridad reforzada + auditoría de anomalías). |
| `frontend/` | 🔴 **Versión anterior (v1, polling)** | Construido para la arquitectura local original. Usa `usePolling` (HTTP GET cada 4s) en vez de Socket.io. **Va a romper o quedar desalineado** con los cambios de seguridad del backend (por ejemplo, el backend ya no expone `POST /api/measurements`, que esta versión del frontend no usa, así que en ese punto está OK — pero el frontend no sabe nada de Socket.io todavía). Se va a reconstruir en una etapa posterior (Etapa 5: Frontend realtime). |

### Próximas etapas (en orden, según lo acordado)

1. ~~Backend base (config, seguridad HTTP, DB, middlewares)~~ ✅
2. Blockchain Service (verificación de integridad reforzada + endpoint de estado)
3. Sensor Simulator (auditoría de anomalías, ejecución interna sin endpoint público)
4. Socket.io (servidor + emisión de eventos en tiempo real)
5. Frontend (cliente Socket.io reemplazando el polling, deploy en Vercel)
6. Configuración de deploy: `render.yaml`, variables de entorno en Render/Vercel/Neon

## Cómo correr el backend localmente (estado actual, Etapa 1)

```bash
cd backend
cp .env.example .env
# Editá .env si tu Postgres local tiene otras credenciales

npm install
npm run dev
```

Esto requiere un PostgreSQL corriendo localmente (o accesible vía `DATABASE_URL`)
con el esquema de `backend/src/db/schema.sql` ya aplicado:

```bash
psql "$DATABASE_URL" -f backend/src/db/schema.sql
```

El servidor expone (todas de solo lectura, según los requisitos de seguridad):

- `GET /health`
- `GET /api/dashboard/stats`
- `GET /api/measurements` y `GET /api/measurements/chart`
- `GET /api/alerts`
- `GET /api/blockchain` y `GET /api/blockchain/status`

> Nota: el simulador de sensores (`SensorSimulator`) arranca automáticamente al
> iniciar el servidor (`SENSOR_AUTOSTART=true` en `.env`), generando una medición
> cada 5 segundos y anclándola a la blockchain. No hay ningún endpoint para
> crear mediciones manualmente vía HTTP — esto es intencional (ver
> requisitos de seguridad de la API).

## Cómo correr el frontend localmente (versión v1, será reemplazada)

```bash
cd frontend
npm install
npm run dev
```

Por defecto apunta a `http://localhost:4000/api` (configurable vía `VITE_API_URL`
en un `.env` del frontend). Como todavía usa polling y no Socket.io, **funciona**
contra el backend actual, pero no vas a ver "tiempo real" instantáneo — vas a ver
un refresh cada 4 segundos.

## Stack

- **Backend:** Node.js, Express, TypeScript, PostgreSQL (`pg`), Zod, Helmet,
  express-rate-limit. (Socket.io ya está en `package.json`, pendiente de integrar.)
- **Frontend:** React, Vite, TypeScript, TailwindCSS, Recharts, Axios.
- **Blockchain:** implementación propia, sin librerías externas — `crypto` nativo
  de Node con SHA-256.

## Estructura

```
aquachain/
├── backend/    # API + Blockchain Service + Sensor Simulator
└── frontend/   # Dashboard (v1, pendiente de migrar a Socket.io)
```

Ver el detalle de cada subcarpeta en sus respectivos `src/`.