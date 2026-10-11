# empresa

Ajustes de la empresa (marca, datos legales, país, locale, zona horaria), monedas y tipos de cambio nombrados con historial, integraciones activables.

## Entra y sale

- Entra: formulario de Configuración › Empresa, carga de logo, cambios de tipo de cambio, interruptores de integraciones.
- Sale (hoy): `getAjustes()` — mínimo y de sólo lectura (nombre, logo, locale, moneda base, registro abierto, primer registro), una lectura por request, funciona sin sesión; `registroDisponible()`. Lo consumen `app/` (marca, formato regional, pantallas de acceso) y `equipo` (registro).
- Sale (parte 3 de la fase 1 en adelante): formularios de configuración, `getTiposCambio()`, `integracionActiva('apibara')`. Los consumirán `cotizaciones` (TC congelados), `web`, `vehiculos` (apibara).
- Depende de: ningún otro módulo.

## Archivos clave

- `entities/ajustes.ts` — tipo `Ajustes`, `ajustesDesde()` (fila de la RPC, validada con Zod), `registroDisponible()`, `AJUSTES_POR_DEFECTO`.
- `infra/queries/ajustes.ts` — `getAjustes()` sobre la RPC `web.ajustes_acceso()`.
- Pendiente: `entities/tipos-cambio.ts` (regla «un valor vigente por clave»), `infra/integraciones.ts`, `features/empresa/`, `features/tipos-cambio/`, `features/integraciones/`.

## Tablas

`ajustes_empresa` (fila única), `monedas`, `tipos_cambio`, `tipos_cambio_historial`, `integraciones`.
RPC: `web.ajustes_acceso` (lo único de la empresa que lee `anon`).

## No se rompe

- Un cambio de tipo de cambio escribe historial por trigger (`tipos_cambio_historial_trg`) y **no** altera cotizaciones guardadas (ellas tienen su snapshot).
- `registro_abierto = false` lo aplica la base (trigger en `auth.users`), no sólo la UI.
- `registroDisponible()` repite la condición del trigger: registro abierto **o** todavía no hay nadie (la primera cuenta nace siempre, y nace dueña).
- La moneda base no se cambia con datos cargados: la UI lo deshabilita y lo dice.
- `getAjustes()` nunca tumba una pantalla: si la base no responde devuelve la identidad neutra con el registro cerrado y deja el error en el log.

## Ojo

- `ajustes_empresa` sólo la lee `authenticated`; las pantallas de acceso corren como `anon`. Por eso `getAjustes()` va por `web.ajustes_acceso()`, con las columnas contadas. Una columna nueva que haga falta antes de ingresar se suma ahí, no con un grant a `anon`.
- `<Marca>` vive en `src/shared/ui/marca.tsx` y recibe nombre y logo por props: `shared` no importa este módulo.
- El secreto de apibara (y de push) no se guarda en columnas legibles; `integraciones.config` sólo lleva lo no secreto. Vault o variables de entorno: pendiente de decidir (docs/ESTADO.md).
- Logo y color primario alimentarán `design/tokens.css` en runtime (variables en `<html>`): los íconos de `public/` son neutros hasta que se cargue uno.
