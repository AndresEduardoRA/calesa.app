# origenes

Orígenes de vehículos configurables (subasta/apibara o manual), su layout de campos y sus categorías. Al crear uno nacen, por trigger y en la misma transacción, su flujo de logística (con sus reglas, sin fases) y los campos de su tipo. Uno de subasta nace con **un campo por cada dato normalizado que devuelve apibara** (el catálogo), todos encendidos. **No** nace una fórmula: «fórmula pendiente» es no tener una fila `publicada`.

Ficha completa: `docs/archivo/modulos/origenes.md`, sólo con grep.

## Entra y sale

- Entra: Configuración › Orígenes (`/configuracion/origenes` y `/[id]` con `?seccion=datos|campos|categorias`): alta, datos, activar/desactivar, eliminar, layout de campos y categorías.
- `index.ts` (servidor, **sin componentes**):
  - `getOrigenes(incluirInactivos?)` — `OrigenResumen` (id, nombre, color, activo, sustantivo, género, tipo); lo usa `app/` para la matriz de roles (con inactivos) y las pestañas del inventario.
  - `leerDatosNuevosDeApibara(origenId)`; `leerLayout(origenId, { conUso })` — todos los campos (también desactivados: quien consume filtra `activo`) y categorías, con sus tipos (`CampoDeLayout`, `Categoria`, `LayoutDeOrigen`…) y `agruparCampos()`, `tieneOpciones()`.
  - Para la pantalla: `leerOrigenes()` y `pasosDe()`.
- Componentes por `pantallas/<pantalla>.ts` (sólo `src/app`): `origenes` (`<ListaDeOrigenes>`) y `origen` (`<DatosDelOrigen>`, `<SiguientesPasos>`, `<EditorDeCampos>`, `<DatosNuevosDeApibara>`, `<ArbolDeCategorias>`).
- `client.ts`: `pluralDe()`, `contados()`, `articulo()`, `ninguno()`, `concordar()`, `generoSugerido()`, `frasePorVacio()`, tipos `Genero`, `TipoDeOrigen`, `OrigenResumen`, `agruparCampos()`, `tieneOpciones()` y los del layout.
- Lo consumen `vehiculos`, `app/`, luego `cotizaciones`, `flujos`, `web`. Depende de `equipo` (permiso `origenes.gestionar`). **No** depende de `empresa`, `flujos` ni `vehiculos`: lo que necesita (¿apibara activa?, ¿hay fases?) lo trae la página por props o lo cuenta la base (`origenes_resumen()`). `equipo` nunca importa este módulo.

## Archivos clave

- `entities/origen.ts` — `Origen`, `OrigenConUso`, `motivoParaNoEliminar()` (espejo de `origen_eliminar()`), `huellaDelOrigen()`, `PANEL_ELIMINAR_ORIGEN`. `entities/nombre.ts` — `claveDeNombre()`, `pluralDe()`, `frasePorVacio()`…
- `entities/preconfiguraciones.ts` — espejo de `origen_preconfigurar_campos()` y `origen_crear_flujo()`. `entities/catalogo-apibara.ts` (+ `-datos.ts`) — espejo de `_apibara_catalogo()`; `rutaIgnorada()` dice qué no es campo; test contra el SQL y `e2e/fixtures/apibara/`.
- **El motor de campos es de `shared`** (`lib/campos`, `ui/campos`). Acá: `entities/campo.ts` (`CampoDeLayout` = `CampoBase` + `origenId`, `enTarjeta`, `filtrable`, `publicoWeb`, `claveApibara`; `CLAVES_RESERVADAS`, `claveDeCampo()`), `entities/cambios-de-campo.ts` (`cambiosRespectoDe()`: sólo viaja lo que cambió), `entities/impacto.ts`, `features/campos/configuracion.tsx` (`configuracionDeOrigen()`).
- `entities/{categoria,pasos,motivos,repositorios}.ts`.
- `infra/{origenes,campos,categorias}.ts` — escrituras por RPC. `infra/queries/{origenes,layout}.ts`. `composicion.ts`; sin `.client`.
- `features/{origenes,campos,categorias,pasos}/`. La página compone: `src/app/(app)/configuracion/origenes/` (`acceso.ts` quién entra; `pasos.ts` a dónde lleva cada paso, con test contra las pantallas existentes).

## Tablas

`origenes`, `origenes_campos`, `categorias`: sólo lectura para la app, se escriben por RPC (en la base, `supabase/migrations/20261028180656_base.sql`). Reglas comunes en el motor `_campo_*`, `_campos_*`, `_atributos_*`, que usan también los leads.
RPC: `origen_apibara_rutas_sin_campo`, `origen_apibara_agregar` (`origen_apibara_completar()` y `_apibara_catalogo()` internas), `origen_crear`, `origen_guardar`, `origen_eliminar`, `origen_campo_crear|guardar|mover|eliminar|impacto`, `categoria_crear|guardar|mover|eliminar`, `origenes_resumen`, `categorias_con_uso`. Triggers: `origen_crear_flujo`, `origen_preconfigurar_campos`, `origen_tipo_inmutable`, `origen_campo_validar`, `origen_activo_requerido` (en `vehiculos` y `cotizaciones`).

## No se rompe

- Crear un origen es un solo INSERT: flujo, reglas y campos del tipo nacen en la misma transacción. La clave sale del nombre en el servidor y no cambia; la interfaz no duplica nada.
- El **tipo** no cambia (RPC y trigger): decide campos preconfigurados, regla `aduana` y mapeo con apibara. Equivocado y sin uso: se elimina y se crea de nuevo. `clave_apibara` y `apibara_plataformas` sólo existen en subasta.
- Un origen con vehículos, cotizaciones o fórmula publicada **no se elimina**: se desactiva (`activo = false`, reversible); no recibe vehículos ni cotizaciones nuevos (trigger), sus fichas se siguen viendo y la matriz de roles lo lista «inactivo».
- Un campo con datos no cambia de tipo ni se elimina: **quitar es desactivar** (el dato queda en `vehiculos.atributos`). Un campo `es_sistema` no cambia de tipo ni clave y no se elimina. Volver requerido no toca vehículos: el trigger valida al escribir.
- Toda edición manda la versión en pantalla (`actualizado_en` de origen, campo o categoría); un nulo se rechaza. El orden es relativo («después de X»), lo calcula `destinoDeMovimiento()`; ordenar renumera 10, 20, 30… tocando sólo lo que cambia.
- **`clave_apibara` es una ruta** de la respuesta con puntos (`pricing.estimated_cost.median`), única por origen (índice parcial). Los 17 campos `es_sistema` se llenan con su ruta; los ~90 restantes son extra, sin tarjeta, sin filtro y **no públicos**. `cilindros`, `enciende_y_anda`, `nota_subasta`, `banderas_subasta` no tienen fuente en la API (manuales). Los campos del preset con opciones son texto; el alta busca la opción por clave o etiqueta.
- **Un dato nuevo de la API no crea un campo solo:** la pestaña Campos avisa; «Agregarlos» crea los campos con la ruta como nombre y los vehículos existentes se llenan en su próximo refresco.
- Un campo de origen no es `correo` ni `documento` (tipos de leads; `check` en `origenes_campos`). Los comunes (marca, modelo, año, VIN, lote, precio) son columnas de `vehiculos`: no se crean como campo (`CLAVES_RESERVADAS`, espejo de `_origen_clave_reservada()`); lo demás vive en `atributos` y lo valida `vehiculo_validar_atributos`.
- El **valor por defecto** (`origenes_campos.valor_defecto`) sólo precarga el alta de un vehículo; la base nunca lo aplica sola. Lo llevan texto, número, monto, sí o no y opciones; cambiar el tipo o quitar la opción lo limpia.
- El aviso de impacto va **dentro** del panel del campo; su conteo (`origen_campo_impacto`) incluye la papelera.
- Categoría: un solo nivel de anidado, un nombre por lugar (sin importar mayúsculas); con subcategorías activas no se desactiva; con subcategorías o vehículos no se elimina.
- Entra quien tiene `origenes.gestionar`; de sólo lectura (deshabilitado con el motivo), quien tiene `flujos.configurar` o `cotizaciones.configurar`. No hay `origenes.ver`.
- Plataformas de apibara: `integraciones.config.plataformas` (techo) y `origenes.apibara_plataformas`; se consulta la que está en las dos; sin ninguna elegida, las de la integración.

## Ojo

- `pluralDe()` es una regla (vocal → s, consonante → es, z → ces, -ón → -ones); si falla, la salida es una columna `sustantivo_plural`.
- Los siguientes pasos se derivan de lo que hay (fases, fórmula, concesiones, integración). Lo sin pantalla se dice sin enlace; su ruta va en `configuracion/origenes/pasos.ts`.
- `<fieldset disabled>` no apaga el `Switch` de Base UI.
- Promover un atributo a columna es migración + fila en `origenes_campos`; no desde la UI.
- **No es el origen del lead**: `origenes_lead` vive en `leads`; no comparten tabla.
- Eliminar un origen: `?panel=eliminar-origen&…` con `<Confirmar>` (registro `scripts/guardas/confirmar-con-url.ts`).
