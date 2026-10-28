# empresa

Ajustes de la empresa (marca, datos legales, país, formato regional, zona horaria, políticas), monedas y tipos de cambio nombrados con historial, integraciones activables.

Ficha completa: `docs/archivo/modulos/empresa.md`, sólo con grep.

## Entra y sale

- Entra: Configuración › Empresa (`/configuracion/empresa`): formulario de ajustes y carga del logo.
- Sale (`index.ts`, **sin componentes**):
  - `getAjustes()` — lo mínimo de la empresa, una lectura por request, funciona sin sesión (nombre, logo, color, íconos, formato regional, zona horaria, moneda base, registro abierto, primer registro). Nunca tumba una pantalla. Lo consumen `app/` y `equipo` (registro). `registroDisponible()`.
  - `getPoliticaDeLimpieza()` — limpieza automática de vehículos de subasta y días de gracia; sin poder leerla, se da por apagada.
  - `getTiposCambio()` — vigentes, el por defecto adelante; lista vacía si falla. Lo usa `app/` (`<TiposCambioVigentes>`); lo usará `cotizaciones`, que congela los que usa.
  - `integracionActiva('apibara')` — si la base no responde, no.
  - Pantalla: `leerAjustes()`, `leerMonedasYTiposCambio()`, `leerHistorial()`, `leerIntegraciones()`, `zonasHorarias()`. Íconos: `iconosDelManifest()`, `urlDeIcono()`, `claveDeIconoVigente()` (para `app/manifest.ts` y `app/iconos/vigente/[tamano]`).
- Componentes (`<FormularioEmpresa>`, `<MonedasYTiposCambio>`, `<Integraciones>`, `<IconosDeLaApp>`) por `pantallas/configuracion-empresa.ts`, sólo `src/app`.
- `shell.ts` (sólo layout `(app)`): `getAjustes()`, `getTiposCambio()`, `<TiposCambioVigentes>`.
- Depende de ningún otro módulo. Sin `client.ts`.

## Archivos clave

- `entities/ajustes.ts` — `Ajustes`, `ajustesDesde()`, `registroDisponible()`, `AJUSTES_POR_DEFECTO`. `entities/ajustes-empresa.ts` — `AjustesEmpresa` (fila entera con versión; `vehiculoObligatorioAlCotizar` lo lee `cotizacion_crear`; `telefonoCc` completa teléfonos de lead sin «+» ni «00»), `cambiosComoColumnas()`, `PoliticaDeLimpieza`.
- `entities/marca.ts` — `validarColorDeMarca()` (contraste AA con motivo y tono cercano) y reglas del logo (`motivoDeSvgInvalido()`, `medidasDeSvg()`). `entities/regional.ts` — `localeCanonico()`, `zonaHorariaValida()`, `codigoDeMoneda()` contra `Intl`. `entities/iconos.ts`.
- `entities/tipos-cambio.ts` (`CAMBIOS_A_LA_VISTA` = 30; `textoParaEditar()`, `valorTipeado()` con `shared/lib/numero-tipeado`), `entities/integraciones.ts` (`CLAVES_INTEGRACION`), `entities/uso-apibara.ts`, `entities/motivos.ts`, `entities/repositorios.ts`.
- `infra/queries/` (`server-only`); `infra/{empresa,tipos-cambio,integraciones}.ts` escrituras por RPC; `infra/{logo,iconos}.client.ts` (Storage desde el navegador); `infra/apibara.client.ts` (`consultarUso()` por `invocarFuncion()`). `composicion.ts` / `composicion.client.ts`.
- `features/empresa/` (`guardar-con-logo.ts`: commit diferido contra puertos), `features/iconos/` («Regenerar íconos»), `features/integraciones/` (apibara: interruptor, config no secreta, `<CampoSecreto>`, «Ver uso»), `features/tipos-cambio/` (pestaña «Monedas», `<AvisoDeTope>` si hay más de 30 cambios).

## Tablas

`ajustes_empresa` (fila única), `monedas`, `tipos_cambio`, `tipos_cambio_historial`, `integraciones`: sólo lectura para la app, se escriben por RPC (en la base, `supabase/migrations/20261028180656_base.sql`).
RPC: `web.ajustes_acceso` (lo único que lee `anon`), `empresa_guardar_ajustes`, `empresa_con_datos_cargados`, `moneda_crear`, `moneda_guardar`, `tipo_cambio_crear`, `tipo_cambio_guardar`, `integracion_guardar`, `integracion_guardar_secreto`, `integracion_secreto` (sólo `service_role`).

## No se rompe

- Toda edición manda la versión en pantalla (`actualizado_en`); la base responde `PT409` si otra persona cambió. Los ajustes son una fila que editan dos cosas (formulario e íconos) y apibara otra que editan tres: la versión llega por props y cada parte lleva de `key` lo que muestra (`huellaDelFormulario()`).
- Los íconos se dibujan desde el logo **guardado** y se suben al confirmar la vista previa; su dirección cambia en cada regeneración (el nombre es el hash).
- El logo se sube al guardar. Si la fila no se guarda, se descarta el objeto subido; si se guarda, el anterior. Siempre por `storage_refcount`. Un logo no pasa por `comprimirImagen()`: el SVG sube tal cual; un raster > 1024 px se reduce a PNG.
- Un color sin contraste AA con el texto de los botones se rechaza con el motivo, en el campo y en el servidor. Locale y zona se validan contra `Intl`; si llegara uno inválido, `formato.ts` usa el de fábrica.
- El borrador guarda sólo lo que la persona cambió; quien no puede editar no tiene borrador.
- **Mientras guarda, el formulario no se edita** (`enCurso` de `useAction` apaga el `<fieldset>`): el aviso sale antes de dibujar lo guardado y el `key` reemplazaría el formulario; lo tecleado en esa ventana se perdería.
- La moneda base no se cambia con datos cargados (UI deshabilitada y `empresa_guardar_ajustes()` lo rechaza).
- Un valor vigente por clave: cambiarlo pisa el anterior, el historial lo escribe el trigger `tipos_cambio_historial_trg`; **no** altera cotizaciones guardadas (tienen snapshot). Entre dos monedas un solo tipo de cambio por defecto (índice único parcial; marcar otro desmarca el anterior en la misma RPC); el por defecto, la moneda base y las que usa un tipo activo no se desactivan. La clave de un tipo de cambio sale del nombre al crearlo y no cambia (la nombran las fórmulas). Nada se borra: se desactiva.
- El secreto de una integración entra una vez y no vuelve a salir: ninguna action, lectura ni columna lo devuelve. La dirección de apibara sólo puede ser de `apibara.tech` (Zod y RPC): es a donde la edge function manda la clave. apibara no se activa sin clave guardada (lo impide la RPC).
- Los tipos de cambio pasan por `<Monto>` (Modo Live también en la barra superior).
- `registro_abierto = false` lo aplica la base (trigger en `auth.users`). `registroDisponible()` repite el trigger: registro abierto **o** todavía no hay nadie (la primera cuenta nace siempre, y dueña).
- `getAjustes()` nunca tumba: si la base no responde, identidad neutra con registro cerrado y error en el log.

## Ojo

- `ajustes_empresa` sólo la lee `authenticated`; acceso y manifest corren como `anon`, por eso `getAjustes()` va por `web.ajustes_acceso()` con columnas contadas. Una columna necesaria antes de ingresar se suma ahí, no con un grant a `anon`.
- No hay permiso de «ver»: abre la pantalla quien tiene `empresa.ajustes.gestionar` o `empresa.tipos_cambio.gestionar`; lo que no puede editar, deshabilitado con el motivo.
- `<Marca>` y `<EstiloDeMarca>` viven en `src/shared/ui` y reciben nombre, logo y color por props (`shared` no importa este módulo). El color entra como `<style>` con `:root` y `.dark`, no en `<html style>`.
- El secreto de apibara va a Vault por `integracion_guardar_secreto()`; la app sólo lee `integraciones.secreto_guardado_en`; `integraciones.config` lleva lo no secreto. Variables de entorno sólo para infraestructura del despliegue (`docs/DECISIONES.md`).
- `push_web` y `web_publica` existen como filas sin interfaz hasta sus fases (7 y 8). Integración nueva: `CLAVES_INTEGRACION`; con secreto, también `esquemaGuardarSecreto`.
- «Retención» = `papelera_dias` y `actividad_dias`. La limpieza automática (`limpieza_automatica`, `limpieza_dias_gracia`, 1 a 90) se edita en «Políticas»; su regla es de `vehiculos` y la base. `demora_dias_default`, `lead_dormido_meses`, `logo_oscuro_ruta` sin interfaz.
- Los paneles de tipo de cambio y de moneda apagan sus campos mientras `enCurso` (el `<fieldset>` no basta con Base UI; se remontan con `key={id-actualizadoEn}`) y avisan de lo escrito (`useHayCambiosEnFormulario()`; el formulario «Nuevo tipo de cambio» es hijo del `<Drawer>`). La barra superior dibuja el tipo de cambio sólo si mide 24 rem o más.
