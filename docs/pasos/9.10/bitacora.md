## 9.10 · PWA: instalar la app, parte 1 (2026-11-12)

«Instalar la app» en el menú del usuario: regla pura `ofrecerInstalacion()` (`src/shared/lib/instalacion.ts`, con su test), `useInstalacion()`
que guarda el `beforeinstallprompt` desde que se evalúa el módulo, y `<InstalarApp>`; en iOS un aviso con «Compartir › Agregar a inicio».
El manifest gana `id: '/'` y los atajos «Nuevo lead» y «Cotizar». `public/sw.js` no cambió (sin caché; `push` y `notificationclick` son del
7.04). `e2e/pwa.spec.ts` (6 casos, escritorio y móvil, 12 en verde): manifest, service worker activo y sin caché, instalar llama a `prompt()`
una vez, sin evento no se ofrece, iOS, y el clic de una notificación con el service worker real navega a su ruta. Queda **9.10-2**: el logo oscuro.

- e2e completo: no (9.10, Nivel 2: lo prueba el CI del PR; dirigidos: pwa, roles-niveles y rueda-por-rol en escritorio y móvil)

## 9.10 · PWA, parte 2: el logo oscuro (2026-11-12)

«Logo para el tema oscuro» en Configuración › Empresa › Marca. La migración `empresa_logo_oscuro` suma `logo_oscuro_ruta` a lo editable de
`empresa_guardar_ajustes()` (mismo permiso, misma versión) y la devuelve `web.ajustes_acceso()` (se borra y se crea: cambia su tipo de
retorno; mismos grants, con `anon`). La columna y su `storage_refcount` ya existían. `guardarConLogo` pasa a `guardarConLogos`: los dos logos
en un solo guardado, con descarte de los recién subidos si algo falla y de los anteriores que ya no usa nadie. `<CampoLogo>` gana `variante`
(textos, ids y «Quitar» propios). `<Marca>` dibuja los dos y el tema elige por CSS, en los layouts `(app)` y `(acceso)`. Pruebas: `humo.sql`
(guarda, versión vieja, vacío y nulo, sin permiso, `anon` lo lee), `guardar-con-logo.test.ts` (9 casos) y `e2e/empresa-logo-oscuro.spec.ts`. La auditoría del informe pidió un `fix`: la vista previa del oscuro perdía su fondo oscuro (clase `darkflex`).

Para quien integra: con esta parte la fila 9.10 de `docs/PLAN.md` queda **hecha**; se cierran la celda del logo oscuro de «Sin interfaz»
(~2433) y el párrafo «PWA (instalación, push, `sw.js` mínimo)» (~2454). La instalación real con la app instalada sigue en el 9.14.

- e2e completo: no (9.10-2, Nivel 2: lo prueba el CI del PR; dirigidos: empresa-logo-oscuro, empresa y pwa)
