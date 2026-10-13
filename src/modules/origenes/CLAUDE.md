# origenes

Orígenes de vehículos configurables (subasta/apibara o manual), su layout de campos y sus categorías. Al crear uno nacen, por trigger y en la misma transacción, su flujo de logística (con sus reglas, sin fases) y los campos de su tipo. **No** nace una fórmula: «fórmula pendiente» es no tener una fila `publicada`.

## Entra y sale

- Entra: Configuración › Orígenes (`/configuracion/origenes` y `/configuracion/origenes/[id]` con pestañas `?seccion=datos|campos|categorias`): alta, datos, activar y desactivar, eliminar, layout de campos (orden, grupo, requerido, en tarjeta, filtrable, público, `clave_apibara`) y categorías.
- Sale por `index.ts` (servidor):
  - `getOrigenes(incluirInactivos?)` — los orígenes con lo mínimo para nombrarlos y elegirlos (`OrigenResumen`: id, nombre, color, activo). Lo consume `app/` para la matriz de roles (con inactivos: lo que se les otorgó no se esconde) y, en la fase 2, los selectores de alta.
  - Para la pantalla: `leerOrigenes()` (todos, con su uso), `leerLayout(origenId, { conUso })`, `<ListaDeOrigenes>`, `<DatosDelOrigen>`, `<EditorDeCampos>`, `<ArbolDeCategorias>`, `<SiguientesPasos>`, `pasosDe()`.
- Sale por `client.ts` (Client Components de `app/` y de otros módulos): `pluralDe()`, `contados()`, `articulo()`, `ninguno()`, `concordar()`, `generoSugerido()`, `frasePorVacio()` y los tipos `Genero`, `TipoDeOrigen`, `OrigenResumen`. Es lo que permite escribir «Ninguna unidad en Corea todavía» sin texto fijo.
- Fase 2 en adelante: `getLayout(origenId)` → campos activos para la ficha, los filtros y el alta de `vehiculos`; `cotizaciones`, `flujos` y `web` leen origen, tipo y sustantivo.
- Depende de: `equipo` (permiso `origenes.gestionar`). **No** depende de `empresa`, `flujos` ni `vehiculos`: lo que necesita de ellos (¿apibara activa?, ¿hay fases?) lo trae la página por props o lo cuenta la base (`origenes_resumen()`). `equipo` nunca importa este módulo: la matriz de roles recibe los orígenes por props.

## Archivos clave

- `entities/origen.ts` — `Origen`, `OrigenConUso`, `UsoDeOrigen`, `motivoParaNoEliminar()` (espejo de `origen_eliminar()`), `huellaDelOrigen()` (la `key` del formulario).
- `entities/nombre.ts` — `claveDeNombre()`, `generoSugerido()`, `pluralDe()`, `contados()`, `frasePorVacio()`: cómo se nombra un origen y lo que entra en él.
- `entities/preconfiguraciones.ts` — espejo de `origen_preconfigurar_campos()` y de las reglas de `origen_crear_flujo()`; un test lo compara con el SQL del trigger.
- `entities/campo.ts` — `CampoDeLayout`, `agruparCampos()`, `destinoDeMovimiento()` (subir y bajar → «después de X»), `claveDeCampo()`, `cambiosRespectoDe()`, `necesitaVistaPrevia()`. `entities/impacto.ts` — `resumenDeImpacto()` y `resumenDeEliminacion()`: lo que le pasa a lo ya cargado, dicho con números.
- `entities/categoria.ts`, `entities/pasos.ts` (`pasosDe()` deriva lo pendiente), `entities/motivos.ts`, `entities/repositorios.ts`.
- `infra/{origenes,campos,categorias}.ts` — escrituras, todas por RPC. `infra/queries/{origenes,layout}.ts` — lecturas. `composicion.ts` — de ahí toma `features/` sus implementaciones. Sin `composicion.client.ts`: no hay realtime ni lecturas desde el navegador.
- `features/origenes/` (lista, alta, datos, estado), `features/campos/` (editor, fila, panel con el aviso de impacto adentro), `features/categorias/`, `features/pasos/`.
- La página compone lo que cruza módulos: `src/app/(app)/configuracion/origenes/` (`acceso.ts` quién entra, `pasos.ts` a dónde lleva cada paso, con un test contra las pantallas que existen).

## Tablas

`origenes`, `origenes_campos`, `categorias`. Son de sólo lectura para la app: se escriben por RPC (`supabase/migrations/20261011001400_origenes.sql`).
RPC: `origen_crear`, `origen_guardar`, `origen_eliminar`, `origen_campo_crear`, `origen_campo_guardar`, `origen_campo_mover`, `origen_campo_eliminar`, `origen_campo_impacto`, `categoria_crear`, `categoria_guardar`, `categoria_mover`, `categoria_eliminar`, `origenes_resumen`, `categorias_con_uso`. Triggers: `origen_crear_flujo`, `origen_preconfigurar_campos`, `origen_tipo_inmutable`, `origen_campo_validar`, `origen_activo_requerido` (en `vehiculos` y `cotizaciones`).

## No se rompe

- Crear un origen es un solo INSERT: el flujo, sus reglas y los campos del tipo nacen en la misma transacción. La clave sale del nombre en el servidor y no cambia. La interfaz no duplica nada de eso.
- El **tipo** del origen no cambia (RPC y trigger): decide los campos preconfigurados, la regla `aduana` y el mapeo con apibara. Un origen equivocado y sin uso se elimina y se crea de nuevo. `clave_apibara` y `apibara_plataformas` sólo existen en subasta.
- Un origen con vehículos, cotizaciones o fórmula publicada **no se elimina**: se desactiva (`activo = false`), reversible. No recibe vehículos ni cotizaciones nuevos (trigger); sus fichas se siguen viendo. La matriz de roles lo sigue listando, marcado «inactivo».
- Un campo con datos no cambia de tipo ni se elimina: **quitar es desactivar** (el dato queda en `vehiculos.atributos`; reactivar lo devuelve). Un campo de sistema no cambia de tipo ni de clave y no se elimina. Volver requerido no toca vehículos: el trigger sólo valida al escribir uno.
- Toda edición manda la versión que tenía en pantalla (`actualizado_en` de la fila: origen, campo o categoría) y un nulo se rechaza. El orden es relativo («después de X») y lo calcula `destinoDeMovimiento()`; ordenar renumera 10, 20, 30… tocando sólo las filas que cambian.
- Los campos comunes (marca, modelo, año, VIN, lote, precio) son columnas de `vehiculos`: no se crean como campo propio (`CLAVES_RESERVADAS`, espejo de `_origen_clave_reservada()`). Lo demás vive en `atributos` y lo valida `vehiculo_validar_atributos`.
- El aviso de impacto va **dentro** del panel del campo, no en un diálogo: un modal no abre otro modal. El conteo (`origen_campo_impacto`) incluye la papelera.
- Una categoría tiene un solo nivel de anidado, un nombre por lugar (sin importar mayúsculas), y una con subcategorías activas no se desactiva; una con subcategorías o vehículos no se elimina.
- Entra a la pantalla quien tiene `origenes.gestionar` y, de sólo lectura (todo deshabilitado con el motivo), quien configura el flujo o la fórmula (`flujos.configurar`, `cotizaciones.configurar`). No hay `origenes.ver`: la lectura es de todas las cuentas y no tendría qué proteger.
- Los nombres de orígenes nunca aparecen fijos en la UI ni en el código: todo sale de la fila.

## Ojo

- El esquema no tiene plural: `pluralDe()` es una regla (vocal → s, consonante → es, z → ces, -ón → -ones). Si falla en un caso real, la salida es una columna `sustantivo_plural` en `origenes`, no un parche en la regla.
- Los siguientes pasos se derivan de lo que hay (fases, fórmula publicada, concesiones, integración), no de un «recién creado». El flujo (fase 5) y la fórmula (fase 4) todavía no tienen pantalla: se dicen sin enlace; al crearlas, se les pone su ruta en `app/(app)/configuracion/origenes/pasos.ts` y el test las comprueba.
- Un `<fieldset disabled>` no apaga el `Switch` de Base UI: cada uno lleva `disabled` a mano.
- `router.push` tras crear no se combina con cerrar el panel (`?panel=`): el cambio de URL de nuqs y la navegación se pisan.
- Promover un atributo a columna (porque necesita índice o UNIQUE) es migración + fila en `origenes_campos` apuntando a la columna; no se hace desde la UI.
- Queda sin hacer: arrastrar para reordenar (exige una dependencia a verificar; `origen_campo_mover` ya lo admite), ordenar los orígenes entre sí (la columna `orden` existe), `icono` del origen.
