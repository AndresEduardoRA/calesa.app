# empresa

Ajustes de la empresa (marca, datos legales, país, formato regional, zona horaria, políticas), monedas y tipos de cambio nombrados con historial, integraciones activables.

## Entra y sale

- Entra: Configuración › Empresa (`/configuracion/empresa`): el formulario de ajustes y la carga del logo.
- Sale:
  - `getAjustes()` — lo mínimo de la empresa, una lectura por request, funciona sin sesión: nombre, logo, color, íconos, formato regional, zona horaria, moneda base, registro abierto, primer registro. Nunca tumba una pantalla. Lo consumen `app/` (marca, tokens de color, formato, zona horaria, pantallas de acceso) y `equipo` (registro).
  - `registroDisponible()`.
  - `getTiposCambio()` — los tipos de cambio vigentes, con el por defecto adelante. Tampoco tumba una pantalla (devuelve una lista vacía). Lo consume `app/` para la barra superior (`<TiposCambioVigentes>`); lo consumirá `cotizaciones`, que congela los que usa.
  - `integracionActiva('apibara')` — si una integración está prendida; si la base no responde, no. La consulta `app/` para decirle a `vehiculos` si ofrece el alta por enlace y el refresco de la subasta.
  - Para la pantalla: `leerAjustes()`, `leerMonedasYTiposCambio()`, `leerHistorial()`, `leerIntegraciones()`, `zonasHorarias()`, `<FormularioEmpresa>`, `<MonedasYTiposCambio>`, `<Integraciones>`.
  - Íconos: `iconosDelManifest()`, `urlDeIcono()`, `claveDeIconoVigente()` para `app/manifest.ts` y `app/iconos/vigente/[tamano]`; `<IconosDeLaApp>` para la pantalla.
- Depende de: ningún otro módulo. No tiene `client.ts`: ningún Client Component de afuera necesita nada de acá.

## Archivos clave

- `entities/ajustes.ts` — `Ajustes` (lo mínimo, para toda pantalla), `ajustesDesde()`, `registroDisponible()`, `AJUSTES_POR_DEFECTO`.
- `entities/ajustes-empresa.ts` — `AjustesEmpresa` (la fila entera, con su versión), `CambiosDeAjustes`, `cambiosComoColumnas()`.
- `entities/marca.ts` — `validarColorDeMarca()` (contraste AA, con el motivo y un tono cercano que sí pasa) y las reglas del logo: formatos, pesos, `motivoDeSvgInvalido()`, `medidasDeSvg()`.
- `entities/regional.ts` — `localeCanonico()`, `zonaHorariaValida()`, `codigoDeMoneda()`: todo contra `Intl`.
- `entities/iconos.ts` — tamaños, `encuadreDeIcono()`, `iconosDelManifest()`, `urlDeIcono()`.
- `entities/tipos-cambio.ts`, `entities/integraciones.ts` — tipos y reglas puras de lo que viene.
- `entities/uso-apibara.ts` — `UsoDeApibara`, `usoDesdeRespuesta()`, `resumenDeUso()` y los mensajes con que puede fallar pedirlo. `infra/apibara.client.ts` — `consultarUso()` (en el navegador, por `invocarFuncion()` de `shared`).
- `entities/motivos.ts` — por qué algo aparece deshabilitado. `entities/repositorios.ts` — las interfaces.
- `infra/queries/` — lecturas (`server-only`). `infra/{empresa,tipos-cambio,integraciones}.ts` — escrituras, todas por RPC. `infra/{logo,iconos}.client.ts` — preparar, subir y descartar en Storage desde el navegador.
- `composicion.ts` (servidor) y `composicion.client.ts` (navegador): de ahí toman `features/` sus implementaciones.
- `features/empresa/` — el formulario. `guardar-con-logo.ts` son los pasos del commit diferido, contra puertos.
- `features/iconos/` — «Regenerar íconos»: dibuja, muestra y, al confirmar, sube y guarda. `regenerar-iconos.ts` son los pasos, contra puertos.
- `features/integraciones/` — la pestaña «Integraciones»: apibara con su interruptor, su configuración no secreta y `<CampoSecreto>` (dice «guardada el …» y deja reemplazarla; nunca la muestra) y «Ver uso» (`<UsoDeApibara>`: pide `/usage` a la edge function `apibara` a mano, para saber cuánta cuota queda; sólo para quien gestiona los ajustes).
- `features/tipos-cambio/` — la pestaña «Monedas»: listas, un panel por tipo de cambio (valor e historial) y por moneda, y `<TiposCambioVigentes>` para la barra superior.

## Tablas

`ajustes_empresa` (fila única), `monedas`, `tipos_cambio`, `tipos_cambio_historial`, `integraciones`. Son de sólo lectura para la app: se escriben por RPC (`supabase/migrations/20261011001200_empresa.sql`).
RPC: `web.ajustes_acceso` (lo único de la empresa que lee `anon`), `empresa_guardar_ajustes`, `empresa_con_datos_cargados`, `moneda_crear`, `moneda_guardar`, `tipo_cambio_crear`, `tipo_cambio_guardar`, `integracion_guardar`, `integracion_guardar_secreto`, `integracion_secreto` (sólo `service_role`).

## No se rompe

- Toda edición manda la versión que tenía en pantalla (`actualizado_en`) y la base responde `PT409` si otra persona lo cambió. Los ajustes son una fila con una versión que editan dos cosas (el formulario y los íconos), y apibara otra que editan tres: la versión llega por props y cada parte lleva de `key` lo que ella muestra (`huellaDelFormulario()`), así arranca de lo guardado cuando eso cambia y no pierde lo tipeado cuando guardó la de al lado.
- Los íconos se dibujan desde el logo **guardado** y se suben recién al confirmar la vista previa. Su dirección cambia en cada regeneración (el nombre es el hash): es lo que le avisa al navegador.
- El logo se sube al guardar, no al elegirlo. Si la fila no se guarda, el objeto recién subido se descarta; si se guarda, se descarta el anterior. Siempre por `storage_refcount`.
- Un color que no da contraste AA con el texto de los botones (ni en blanco ni en oscuro) se rechaza con el motivo, en el campo y otra vez en el servidor.
- Locale y zona horaria se validan contra `Intl`; en la base, la zona con `now() at time zone` y el locale por su forma. Si igual llegara uno inválido, `formato.ts` formatea con el de fábrica en vez de tumbar la pantalla.
- El borrador del formulario guarda sólo lo que la persona cambió: reponer el formulario entero pisaría lo que otra guardó mientras tanto. Quien no puede editar no tiene borrador.
- La moneda base no se cambia con datos cargados: la UI lo deshabilita y lo dice, y `empresa_guardar_ajustes()` lo rechaza.
- Un valor vigente por clave: cambiarlo pisa el anterior, y el historial lo escribe un trigger (`tipos_cambio_historial_trg`). **No** altera cotizaciones guardadas (ellas tienen su snapshot).
- Entre dos monedas hay un solo tipo de cambio por defecto (índice único parcial): marcar otro desmarca al anterior en la misma RPC. El por defecto no se desactiva; la moneda base y las que usa un tipo de cambio activo, tampoco.
- La clave de un tipo de cambio sale de su nombre al crearlo y no cambia: la nombran las fórmulas. Nada se borra: se desactiva (borrar arrastraría el historial).
- El secreto de una integración entra una vez y no vuelve a salir: ninguna action, lectura ni columna lo devuelve. La dirección de apibara sólo puede ser de `apibara.tech` (en Zod y en la RPC): es a donde la edge function manda la clave, y quien pudiera apuntarla a otro sitio se la llevaría. apibara no se activa sin su clave guardada (lo impide la RPC; la UI lo deshabilita y lo dice).
- Los valores de los tipos de cambio pasan por `<Monto>`: el Modo Live los oculta también en la barra superior.
- `registro_abierto = false` lo aplica la base (trigger en `auth.users`), no sólo la UI.
- `registroDisponible()` repite la condición del trigger: registro abierto **o** todavía no hay nadie (la primera cuenta nace siempre, y nace dueña).
- `getAjustes()` nunca tumba una pantalla: si la base no responde devuelve la identidad neutra con el registro cerrado y deja el error en el log.

## Ojo

- `ajustes_empresa` sólo la lee `authenticated`; las pantallas de acceso y el manifest corren como `anon`. Por eso `getAjustes()` va por `web.ajustes_acceso()`, con las columnas contadas. Una columna nueva que haga falta antes de ingresar se suma ahí, no con un grant a `anon`.
- No hay permiso de «ver»: la pantalla la abre quien tiene `empresa.ajustes.gestionar` o `empresa.tipos_cambio.gestionar`, y lo que no puede editar lo ve deshabilitado con el motivo.
- `<Marca>` y `<EstiloDeMarca>` viven en `src/shared/ui` y reciben nombre, logo y color por props: `shared` no importa este módulo. El color entra como un `<style>` con `:root` y `.dark`, no en `<html style>`: un estilo en línea le ganaría al tema oscuro.
- El secreto de apibara no se guarda en columnas legibles: va a Vault por `integracion_guardar_secreto()` y la app sólo lee `integraciones.secreto_guardado_en`. `integraciones.config` lleva lo no secreto. Variables de entorno sólo para la infraestructura del despliegue (secret key, VAPID privada): ver docs/DECISIONES.md.
- `push_web` y `web_publica` existen como filas pero no tienen interfaz hasta sus fases (7 y 8). Una integración nueva se suma a `CLAVES_INTEGRACION`; si lleva secreto, también a `esquemaGuardarSecreto`.
- «Retención» son `papelera_dias` y `actividad_dias`. `demora_dias_default`, `lead_dormido_meses` y `logo_oscuro_ruta` todavía no tienen interfaz.
- Un logo no pasa por `comprimirImagen()` como una foto: el SVG se sube tal cual y un raster de más de 1024 px se reduce a PNG, sin pérdida.
