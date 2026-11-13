# empresa

Ajustes de la empresa (marca, datos legales, país, formato regional, zona horaria, políticas), monedas y tipos de cambio nombrados con historial, integraciones activables.

## Entra y sale

- Entra: Configuración › Empresa (`/configuracion/empresa`): ajustes y logo. Configuración › Cotización › Ajustes (`?seccion=ajustes`): la vigencia y
  el vehículo obligatorio al cotizar.
- Sale (`index.ts`, **sin componentes**):
  - `getAjustes()`: lo mínimo de la empresa (nombre, logos, color, íconos, formato regional, zona, moneda base, registro abierto, primer registro), una
    lectura por request, sin sesión; nunca tumba (si la base no responde, identidad neutra con registro cerrado y error en el log). Lo usan `app/` y
    `equipo`. `registroDisponible()`.
  - `leerAjustes()`: como `getAjustes()` pero falla en vez de dar lo de fábrica (la pantalla y el PDF de una cotización). `PESO_MAXIMO_LOGO` (1 MB,
    `entities/marca.ts`): el PDF no baja un logo más pesado.
  - `getPoliticaDeLimpieza()` (sin poder leerla, apagada), `getTiposCambio()` (vigentes, el por defecto adelante; vacía si falla),
    `integracionActiva('apibara')` (si la base no responde, no).
  - Pantalla: `leerMonedasYTiposCambio()`, `leerHistorial()`, `leerIntegraciones()`, `leerVehiculosQueCambian()` (conteo acotado de
    `web_publica_vehiculos_que_cambian()`, sólo con `empresa.ajustes.gestionar`), `zonasHorarias()`. Íconos: `iconosDelManifest()`, `urlDeIcono()`,
    `claveDeIconoVigente()` (para `app/manifest.ts` y `app/iconos/vigente/[tamano]`).
  - Ajustes de cotización: `leerAjustesDeCotizacion()` (con la versión; falla en vez de dar los de fábrica), `puedeCambiarAjustesDeCotizacion()`
    (`cotizaciones.configurar` en todos los orígenes, espejo de la RPC), `type AjustesDeCotizacion`. La action `guardarAjustesDeCotizacion` no sale
    por `client.ts`: la usa `<FormularioDeAjustesDeCotizacion>`, de este módulo.
- Pantallas: `pantallas/configuracion-empresa.ts` (`<FormularioEmpresa>`, `<MonedasYTiposCambio>`, `<Integraciones>`, `<IconosDeLaApp>`) y
  `pantallas/configuracion-cotizacion.ts` (`<FormularioDeAjustesDeCotizacion>`).
- `shell.ts`: `getAjustes()`, `getTiposCambio()`, `<TiposCambioVigentes>`.
- `client.ts`: `guardarTipoCambio` y `EntradaDeGuardarTipoCambio`, para el ⚙ de un tipo de cambio de la hoja (`cotizaciones`); la action exige
  `empresa.tipos_cambio.gestionar` en el servidor.
- Depende de ningún otro módulo.

## Archivos clave

- `entities/`: `ajustes.ts` (`AJUSTES_POR_DEFECTO`), `ajustes-empresa.ts` (`AjustesEmpresa` con versión; `telefonoCc` completa teléfonos de lead sin
  «+» ni «00»), `ajustes-de-cotizacion.ts` (`VIGENCIA_MINIMA_DIAS`/`VIGENCIA_MAXIMA_DIAS`, 1 a 365 como la base), `marca.ts`
  (`validarColorDeMarca()`: contraste AA con motivo y tono cercano; reglas del SVG), `regional.ts` (contra `Intl`), `tipos-cambio.ts`
  (`CAMBIOS_A_LA_VISTA` = 30), `integraciones.ts` (`CLAVES_INTEGRACION`), `iconos.ts`, `uso-apibara.ts`, `motivos.ts`, `repositorios.ts`.
- `infra/queries/` (`server-only`); `infra/{empresa,tipos-cambio,integraciones}.ts` escriben por RPC; `infra/{logo,iconos}.client.ts` (Storage);
  `infra/apibara.client.ts` (`consultarUso()` por `invocarFuncion()`). `infra/revalidacion-prueba.ts`, **excepción del cliente admin**:
  `probarRevalidacion()` comprueba el permiso y valida la dirección guardada antes de crear el admin, que sólo llama
  `integracion_secreto('web_publica')`. `composicion.ts` / `composicion.client.ts`.
- `features/empresa/` (`guardar-con-logo.ts`: commit diferido contra puertos), `features/iconos/`, `features/integraciones/` (apibara, web pública,
  avisos push; `<CampoSecreto>` con un `nombre` de campo propio por tarjeta), `features/tipos-cambio/` (`<AvisoDeTope>` con más de 30 cambios),
  `features/ajustes-de-cotizacion/` (sin borrador, remonta con `key` = versión).

## Tablas

`ajustes_empresa` (fila única), `monedas`, `tipos_cambio`, `tipos_cambio_historial`, `integraciones`: sólo lectura para la app, se escriben por RPC.
RPC: `web.ajustes_acceso` (lo único que lee `anon`), `empresa_guardar_ajustes`, `empresa_guardar_ajustes_de_cotizacion` (`cotizaciones.configurar`
sin origen), `empresa_con_datos_cargados`, `moneda_crear`, `moneda_guardar`, `tipo_cambio_crear`, `tipo_cambio_guardar`, `integracion_guardar` (en
`web_publica` valida `revalidar_url`: `https://` o `http://` de loopback, con `hint = 'revalidar_url'`, y guarda sólo esa clave),
`integracion_guardar_secreto`, `integracion_secreto` (sólo `service_role`), `web_publica_vehiculos_que_cambian` (de 0 a 51;
`empresa.ajustes.gestionar`).

## No se rompe

- Toda edición manda `actualizado_en`; otra es `PT409`. La fila de ajustes la editan el formulario, los íconos y los ajustes de cotización con la
  misma versión (guardar en una deja con `PT409` a la otra), y la de apibara también tres partes: la versión llega por props y cada parte lleva de
  `key` lo que muestra (`huellaDelFormulario()`).
- Los íconos se dibujan desde el logo **guardado** y se suben al confirmar la vista previa; su dirección es el hash y cambia al regenerar.
- El logo se sube al guardar: si la fila no se guarda, se descarta el subido; si se guarda, el anterior; siempre por `storage_refcount`. El logo oscuro
  viaja en el mismo guardado (`guardarConLogos()`): un subido que ya es uno de los guardados, o un anterior que pasa al otro espacio, no se descarta.
  Un logo no pasa por `comprimirImagen()`: el SVG sube tal cual; un raster > 1024 px se reduce a PNG.
- Un color sin contraste AA con el texto de los botones se rechaza con el motivo, en el campo y en el servidor. Locale y zona se validan contra
  `Intl`; con uno inválido, `formato.ts` usa el de fábrica.
- El borrador guarda sólo lo cambiado; quien no puede editar no tiene borrador.
- **Mientras guarda, el formulario no se edita** (`enCurso` apaga el `<fieldset>`): el `key` reemplazaría el formulario y lo tecleado se perdería.
- La moneda base no se cambia con datos cargados (UI deshabilitada y `empresa_guardar_ajustes()` lo rechaza).
- Un valor vigente por clave; el historial lo escribe `tipos_cambio_historial_trg`; **no** altera cotizaciones guardadas (snapshot). Entre dos
  monedas un solo por defecto (único parcial; marcar otro desmarca el anterior en la misma RPC); el por defecto, la moneda base y las que usa un tipo
  activo no se desactivan. La clave de un tipo de cambio sale del nombre al crearlo y no cambia (la nombran las fórmulas). Nada se borra: se
  desactiva.
- El secreto de una integración entra una vez y no vuelve a salir. La dirección de apibara sólo puede ser de `apibara.tech` (Zod y RPC). apibara no
  se activa sin clave guardada (RPC). «Probar» de la web pública manda un cuerpo fijo a la dirección **guardada**, no sigue redirecciones y devuelve
  sólo el código; la app rechaza redes internas y, con la base en la nube, el loopback (`esDireccionDeRevalidacion()`).
- Los tipos de cambio pasan por `<Monto>` (Modo Live también en la barra superior).
- `registro_abierto = false` lo aplica la base (trigger en `auth.users`); `registroDisponible()` lo repite: registro abierto **o** todavía no hay
  nadie (la primera cuenta nace siempre, y dueña).

## Ojo

- `ajustes_empresa` sólo la lee `authenticated`; acceso y manifest corren como `anon`, por eso `getAjustes()` va por `web.ajustes_acceso()` con
  columnas contadas. Una columna necesaria antes de ingresar se suma ahí, no con un grant a `anon`.
- No hay permiso de «ver»: abre la pantalla quien tiene `empresa.ajustes.gestionar`, `empresa.tipos_cambio.gestionar` o el permiso de alguna pestaña
  de un área (`PERMISOS_DE_EMPRESA`); lo que no puede editar, deshabilitado con el motivo. Una pestaña de un área (hoy «Comprobantes»,
  `configuracion/empresa/comprobantes/`, con `empresa.ajustes.gestionar`) sólo pide claves de la entrada «Configuración» de `NAVEGACION`.
- `<Marca>` y `<EstiloDeMarca>` viven en `src/shared/ui` y reciben todo por props. El color entra como `<style>` con `:root` y `.dark`.
- El secreto va a Vault por `integracion_guardar_secreto()`; la app sólo lee `integraciones.secreto_guardado_en`; `integraciones.config` lleva lo no
  secreto. Variables de entorno sólo para infraestructura del despliegue (`docs/DECISIONES.md`).
- `push_web` («Avisos push»): un interruptor con la versión de la fila; encender no exige la clave pública (si falta, la tarjeta lo dice; la calcula
  `app/` y llega por props); cada persona lo enciende en su perfil. `web_publica` revalida el sitio desde la base (cola
  `interno.web_revalidar_pendiente`, job `web-revalidar`; contrato en la ficha de `web`). Integración nueva: `CLAVES_INTEGRACION`; con secreto,
  también `esquemaGuardarSecreto`.
- «Retención» = `papelera_dias` y `actividad_dias`. La limpieza (`limpieza_automatica`, `limpieza_dias_gracia`, 1 a 90) se edita en «Políticas»; su
  regla es de `vehiculos`. `demora_dias_default` y `lead_dormido_meses` sin interfaz. `logo_oscuro_ruta` tiene su campo en «Marca» y lo devuelve
  `web.ajustes_acceso()`; íconos, tarjeta y PDF usan el logo normal. `vigencia_dias` y `vehiculo_obligatorio_al_cotizar` sólo por
  `guardarAjustesDeCotizacion` (`empresa_guardar_ajustes()` las rechaza).
- Los paneles de tipo de cambio y de moneda apagan sus campos mientras `enCurso` (el `<fieldset>` no basta con Base UI; remontan con
  `key={id-actualizadoEn}`) y avisan de lo escrito (`useHayCambiosEnFormulario()`). La barra superior dibuja el tipo de cambio desde 24 rem.
