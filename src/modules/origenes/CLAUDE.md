# origenes

Orígenes de vehículos configurables (subasta/apibara o manual), su layout de campos y sus categorías. Al crear uno nacen, por trigger y en la misma transacción, su flujo de logística (con sus reglas, sin fases) y los campos de su tipo. Uno de subasta nace con **un campo por cada dato normalizado que devuelve apibara** (el catálogo), todos encendidos. **No** nace una fórmula: «fórmula pendiente» es no tener una fila `publicada`.

## Entra y sale

- Entra: `/configuracion/origenes` y `/[id]?seccion=datos|campos|categorias`.
- `index.ts`: `getOrigenes(incluirInactivos?)`, `leerLayout(origenId, { conUso })` (también los campos desactivados: quien consume filtra `activo`),
  `leerCampoPrincipal(origenId)` (o `null`; para quien nombra un vehículo fuera del listado), `leerDatosNuevosDeApibara`, `leerOrigenes`, `pasosDe`.
- `client.ts`: concordancia (`pluralDe()`, `articulo()`, `concordar()`, `frasePorVacio()`…), tipos y `useLayoutActivo(origenId)` (lo lee el panel del
  vehículo de la hoja de cotizar al abrirse, para que la hoja no lo cargue en cada apertura).
- Depende de `equipo` (`origenes.gestionar`). **No** depende de `empresa`, `flujos` ni `vehiculos`: lo trae la página por props o lo cuenta
  `origenes_resumen()`. `equipo` nunca importa este módulo.

## Archivos clave

- Espejos del SQL con test: `entities/origen.ts` (`motivoParaNoEliminar()` ↔ `origen_eliminar()`), `entities/preconfiguraciones.ts`
  (`origen_preconfigurar_campos()`, `origen_crear_flujo()`), `entities/catalogo-apibara.ts` (`_apibara_catalogo()`; también contra
  `e2e/fixtures/apibara/`), `CLAVES_RESERVADAS` de `entities/campo.ts` (`_origen_clave_reservada()`).
- **El motor de campos es de `shared`** (`lib/campos`, `ui/campos`); acá, `CampoDeLayout` = `CampoBase` + lo propio del origen.
- `src/app/(app)/configuracion/origenes/pasos.ts`: a dónde lleva cada siguiente paso (test contra las pantallas existentes).

## Tablas

`origenes`, `origenes_campos`, `categorias`: sólo lectura para la app, se escriben por RPC. El motor `_campo_*`, `_campos_*`, `_atributos_*` lo
comparten los leads.
RPC: `origen_crear|guardar|eliminar`, `origen_apibara_rutas_sin_campo`, `origen_apibara_agregar`, `origen_campo_crear|guardar|mover|eliminar|impacto`,
`categoria_crear|guardar|mover|eliminar`, `origenes_resumen`, `categorias_con_uso`. Triggers: `origen_crear_flujo`, `origen_preconfigurar_campos`,
`origen_tipo_inmutable`, `origen_campo_validar`, `origen_activo_requerido` (en `vehiculos` y `cotizaciones`).

## No se rompe

- Crear un origen es un solo INSERT. La clave sale del nombre en el servidor y no cambia.
- El **tipo** no cambia: decide campos preconfigurados, regla `aduana` y mapeo con apibara. Equivocado y sin uso: se elimina y se crea de nuevo.
- Con vehículos, cotizaciones o fórmula publicada **no se elimina**: se desactiva (reversible); no recibe vehículos ni cotizaciones nuevos, sus fichas
  se siguen viendo y la matriz de roles lo lista «inactivo».
- Un campo con datos no cambia de tipo ni se elimina: **quitar es desactivar** (el dato queda en `vehiculos.atributos`). Uno `es_sistema` tampoco
  cambia de clave. Volver requerido no toca vehículos: el trigger valida al escribir.
- Toda edición manda su `actualizado_en` (nulo se rechaza). El orden es relativo («después de X»); renumera 10, 20, 30… tocando sólo lo que cambia.
- **`clave_apibara` es una ruta** con puntos (`pricing.estimated_cost.median`), única por origen; sólo en subasta. Los 17 `es_sistema` se llenan con
  su ruta; el resto son extra, sin tarjeta, sin filtro y **no públicos**. `cilindros`, `enciende_y_anda`, `nota_subasta`, `banderas_subasta` son
  manuales.
- **Un dato nuevo de la API no crea un campo solo:** la pestaña Campos avisa y «Agregarlos» los crea; los vehículos se llenan en su próximo refresco.
- Un campo de origen no es `correo` ni `documento`. Marca, modelo, año, VIN, lote y precio son columnas de `vehiculos`, no campos; lo demás vive en
  `atributos` (`vehiculo_validar_atributos`).
- `valor_defecto` sólo precarga el alta de un vehículo; la base nunca lo aplica. Cambiar el tipo o quitar la opción lo limpia.
- **Campo principal**: uno por origen como mucho (`origenes_campos_principal_unico`), activo y nunca `moneda`. Marcar otro desmarca el anterior en la
  misma llamada (y mueve su versión); desactivarlo lo desmarca; sin principal, el vehículo se nombra por su título. `origen_campo_guardar` toma el
  origen `for no key update` antes que el campo y un `23505` del índice sale `PT409`.
- El aviso de impacto va **dentro** del panel del campo; `origen_campo_impacto` cuenta también la papelera.
- Categoría: un nivel de anidado, un nombre por lugar (sin mayúsculas); con subcategorías activas no se desactiva; con subcategorías o vehículos no se
  elimina.
- Entra quien tiene `origenes.gestionar`; de sólo lectura, `flujos.configurar` o `cotizaciones.configurar`. No hay `origenes.ver`.
- Plataformas: las que están en `integraciones.config.plataformas` (techo) y en `origenes.apibara_plataformas`; sin elegida, las de la integración.

## Ojo

- `pluralDe()` es una regla (vocal → s, consonante → es, z → ces, -ón → -ones); si falla, la salida es una columna `sustantivo_plural`.
- `<fieldset disabled>` no apaga el `Switch` de Base UI.
- Promover un atributo a columna es migración + fila en `origenes_campos`; no desde la UI.
- **No es el origen del lead** (`origenes_lead`, en `leads`).
