# empresa

Ajustes de la empresa (marca, datos legales, país, locale, zona horaria), monedas y tipos de cambio nombrados con historial, integraciones activables.

## Entra y sale

- Entra: formulario de Configuración › Empresa, carga de logo, cambios de tipo de cambio, interruptores de integraciones.
- Sale: `getAjustes()` (cacheado por request), `getTiposCambio()`, `integracionActiva('apibara')`, `<Marca>`. Lo consumen `cotizaciones` (TC congelados), `web`, `vehiculos` (apibara), `app/` (tema, locale).
- Depende de: ningún otro módulo.

## Archivos clave

- `entities/ajustes.ts` — schema Zod de `ajustes_empresa`; `entities/tipos-cambio.ts` — regla «un valor vigente por clave».
- `infra/queries/ajustes.ts`, `infra/integraciones.ts` — secretos vía Vault por RPC, nunca en columnas legibles.
- `features/empresa/`, `features/tipos-cambio/`, `features/integraciones/`.

## Tablas

`ajustes_empresa` (fila única), `monedas`, `tipos_cambio`, `tipos_cambio_historial`, `integraciones`.

## No se rompe

- Un cambio de tipo de cambio escribe historial por trigger (`tipos_cambio_historial_trg`) y **no** altera cotizaciones guardadas (ellas tienen su snapshot).
- `registro_abierto = false` lo aplica la base (trigger en `auth.users`), no sólo la UI.
- La moneda base no se cambia con datos cargados: la UI lo deshabilita y lo dice.

## Ojo

- El secreto de apibara (y de push) se guarda con RPC hacia Vault; `integraciones.config` sólo lleva lo no secreto.
- Logo y color primario alimentan `design/tokens.css` en runtime (variables en `<html>`): los íconos de `public/` son neutros hasta que se cargue uno.
