# shared

Infraestructura transversal sin reglas de negocio: clientes de Supabase, permisos, errores como valores, formato de números y fechas, configuración y los componentes de interfaz que usan todos los módulos.

Ficha completa (cada componente con su historia y sus trampas): `docs/archivo/modulos/shared.md`, sólo con grep.

## Entra y sale

- Entra: nada de `src/modules` ni de `src/app`. `shared` sólo importa `shared`.
- Sale: lo consumen `app/` y las tres capas de cada módulo.

## Archivos clave

- `lib/supabase/` — `server.ts` (`createClient()`, uno por request), `browser.ts`, `admin.ts` (secret key, salta la RLS), `proxy.ts` (`actualizarSesion()`), `consultas.ts` (`citar()`, `aplicarCondicionDeAtributo()`, `aplicarRango()`, `aplicarCursor()` y `ordenarPorCursor()`, por `creado_en` u otra columna de fecha en los dos órdenes), `almacen.client.ts` (`subirPorHash()`, `quitarSiHuerfano()`).
- `lib/safe-action.ts` — `actionClient` (exige sesión; `ctx` trae `supabase`, `usuarioId`, `permisos`) y `actionClientPublico`. Toda mutación entra por acá.
- `lib/errores.ts` — `Resultado<T>`, `ok()`, `fallo()`, `conflicto()`, `errorDePostgrest()` (`PT409` → conflicto, `42501` → sin_permiso), `datosO()`.
- `lib/permisos.ts` — `puede()`, `alcanceDe()`, `origenesCon()`, `CLAVES_PERMISO`; las claves de nivel de acceso (`esClaveDeNivel()`) las crea la empresa y no están en la lista.
- `lib/rutas.ts` (`decidirAcceso()`, `returnToSeguro()`) y `lib/navegacion.ts` (`redirigir()`).
- `lib/formato.ts`, `lib/fechas.ts` — todo número y toda fecha salen de acá, en el locale y la zona de la empresa.
- `lib/numero-tipeado.ts` — el lector de un número tipeado, uno solo: `leerNumeroTipeado(texto, locale)`. Lo usan `XCell`, `esquemaDeValor()` y los formularios de dinero.
- `lib/paginacion.ts` — el tamaño de toda página sale de acá (`TAMANOS_DE_PAGINA`, `tamanoDePagina()`, `TAMANO_DE_VER_MAS`, `TOPE_DE_LO_CARGADO`, `TAMANO_DE_COLUMNA`, `TOPE_DEL_EQUIPO`); keyset `leerCursor()`, `codificarCursor()`, `armarPagina()` y, por otra columna, `armarPaginaPor()` con un `OrdenDeCursor` (`POR_ALTA` el de siempre). El cursor lleva `instante`, el valor de la columna que ordena.
- `lib/conteo.ts` — un número que se muestra nunca es un total exacto: `conteoAcotado()`, `cantidadAcotada()`, `cortarAlTope()`, `textoDelTope()`.
- `lib/memoria-de-lectura.ts` — `memoriaDeLectura(leer, vidaMs)`: lectura del navegador compartida y con vida corta.
- `lib/enviar-accion.ts`, `lib/formularios.ts`, `lib/borrador.ts` + `ui/use-borrador.ts` — lo común de un formulario con `useAction`: envío con `sinRed`, errores por campo, borrador en `sessionStorage`.
- `lib/filtros/` — filtros declarativos de un listado, sin nuqs ni módulos (`EsquemaDeFiltros`, `leerFiltros()`, `chipsDe()`, `cumpleElMinimo()`); `campos.ts` traduce campos del layout a filtros.
- `lib/campos/` — motor de campos configurables, sin I/O (`TIPOS_DE_CAMPO`, `esquemaDeValor()`, `valorMostrado()`, `campoDeFormulario()`); `ui/campos/` trae `<EditorDeCampos>`, `<DatosPorGrupo>`, `<CampoDeFormulario>`.
- `lib/ancho.ts` — `anchoDeLaPeticion()` y los cortes `CORTE_DEL_TABLERO`/`CORTE_DE_LA_TABLA`/`CORTE_DEL_PANEL`; `ui/ancho-de-pantalla.tsx` (`useAlMenos()`).
- `lib/atajos.ts` + `ui/atajos/` — `ATAJOS`, `<ProveedorAtajos>`, `useAtajo()`: responde el último registrado.
- `lib/color.ts` (`tokensDeMarca()`, `cssDeMarca()`), `lib/imagenes.ts` (`comprimirImagen()`, `extensionDe()`, `hashDe()`), `lib/almacen.ts`, `lib/iconos.ts` (catálogo cerrado de 24 iconos), `lib/apibara.ts`.
- `config/esquemas.ts` — el entorno en Zod (puro): `entornoPublico()`, `entornoDelServidor()`, el arranque, el build y `pnpm env:check`. `config/app.ts`: nombre y colores.
- `lib/email/` — `enviarEmail()`: la única puerta del correo; un adaptador REST por proveedor (`EMAIL_PROVEEDOR`; hoy `mailpit`).
- `ui/diferido.tsx` — `diferido()`: el único lugar que carga código diferido (el lint prohíbe `next/dynamic`).
- `ui/modal.tsx`, `ui/drawer.tsx`, `ui/confirmar.tsx` — diálogos controlados desde la URL. `ui/modal-de-formulario.tsx` es el contrato de un formulario en un modal; `ui/use-envio-de-modal.ts` el envío de uno sin versión.
- `ui/lista/` — el patrón de lista (`UnaSolaVista`, `TablaDeLista`, `FilaDeLista`, `TarjetaDeLista`, `MasAcciones`, `AbrirResumen`, `SimbolosDeLista`).
- `ui/filtros/` — `<FilterShell>` (búsqueda, chips, panel al costado o en hoja, «Ítems por página»); `ui/por-pagina.tsx`, `ui/paginacion.tsx`, `ui/aviso-de-tope.tsx`.
- `ui/monto.tsx` + `live.ts` + `guion-live.tsx` (Modo Live), `regional.tsx`, `densidad.tsx`, `marca.tsx`, `estilo-de-marca.tsx`.
- `ui/estados/` y `ui/esqueletos/` — los cinco estados y los esqueletos de toda vista. `ui/toasts.ts` (`avisarError()`, `avisarConDeshacer()`), `ui/sonner.tsx`, `ui/pie-del-panel.tsx`, `ui/zona-de-archivos.tsx`.
- `types/database.types.ts` — generado por `pnpm db:types`. No se edita.

## No se rompe

- `shared` no importa módulos: locale, moneda, zona horaria, nombre, logo, color y densidad entran por props desde `app/`.
- Los clientes de Supabase sólo desde `lib/supabase/` y `infra/` de un módulo. Ningún componente ni hook los usa.
- `permisos.ts` espeja la tabla `permisos` de `supabase/seed.sql` (un test lo compara). `puede()` decide qué se muestra; lo que protege es la base.
- Todo número pasa por `formato.ts` y toda fecha por `fechas.ts`; `toFixed` está prohibido por lint.
- `<Monto>` manda al DOM el valor y su reemplazo; el CSS elige con la clase `live` de `<html>`. Nunca una cifra a la vista antes de hidratar.
- `cssDeMarca()` sólo recibe colores que pasaron por `tokensDeMarca()`: a un `<style>` nunca llega texto libre.
- Cada `<Confirmar>` vive en su URL (`usePanelPorUrl()`) y se registra en `scripts/guardas/confirmar-con-url.ts`; cada `<Drawer>` en `drawers-con-salida.ts`; cada `<Modal>` con algo escrito en `modales-con-salida.ts`. Sus tests fallan si hay uno sin registrar.
- Nada anima `font-size` ni el alto: sin `transition-all` (`scripts/guardas/sin-transition-all.test.ts`).
- La lista de iconos de `lib/iconos.ts` es la de `_iconos_del_catalogo()` de la base: se guarda la clave, nunca un nombre libre ni un SVG.
- Una tabla o lista nueva usa `ui/lista`; lo vigila `scripts/guardas/listas-con-patron.ts`.

## Ojo

- `admin.ts` importa `server-only`; el lint sólo deja importarlo desde `equipo/infra/invitaciones.ts`.
- Esc dentro de un diálogo lo atiende Base UI (cierra sólo el de más arriba y detiene el evento en `document`): el atajo «cerrar» de `ProveedorAtajos` no lo ve, por eso `<Modal>` no lo registra. Un `<Modal>` abierto desde un `<Drawer>` se dibuja dentro de los hijos del Drawer.
- Un `<fieldset disabled>` no apaga los `Switch` de Base UI: pásales `disabled` a mano.
- Estado de filtros y paneles en la URL con `nuqs`; `nuqs` es `'use client'`, así que `lib/filtros` lee la URL a mano. En tests con `NuqsTestingAdapter`, espera la escritura (`waitFor`).
- Un cambio de URL `shallow: true` hecho con otra navegación pendiente la pisa; `useFiltros().cerrarPanel` va al servidor si la lista aún se está pidiendo.
- Un campo de texto que vive en la URL no lleva `key` atada a su valor (pierde el foco): usa `useTextoDeUrl()`.
- Las claves compartidas con el servidor (`CLAVE_DE_CURSOR`, `CLAVE_DE_PANEL`) salen de `lib/filtros`, no de un archivo `'use client'`.
- Toasts: `avisarError(error)` con `no_autenticado` no redirige (ofrece «Ingresar»); con `conflicto`, «Recargar». El `<Toaster>` no recibe el puntero, sólo sus botones; un aviso con otro control necesita su `pointer-events-auto`.
- Los componentes de shadcn usan variables (`bg-primary`) que `globals.css` apunta a los tokens; los propios usan `bg-(--color-surface)`.
- Safari devuelve PNG si le pides WebP: `comprimirImagen()` reintenta en JPEG; la extensión sale de `extensionDe(blob.type)`.
- `entornoPublico()` valida al primer uso; las `NEXT_PUBLIC_*` se leen con el nombre literal.
- Los textos hablan de tú, también los `MENSAJE_*` de `errores.ts`.
- `vitest` no limpia solo entre pruebas: un test que monta diálogos usa `afterEach(cleanup)`.
