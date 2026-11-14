# shared

Infraestructura transversal sin reglas de negocio: clientes de Supabase, permisos, errores como valores, formato de números y fechas, configuración y los componentes de interfaz que usan todos los módulos.

## Entra y sale

- Entra: nada de `src/modules` ni de `src/app` (`shared` sólo importa `shared`). Sale: lo consumen `app/` y las tres capas de cada módulo.

## Archivos clave

- `lib/supabase/`: `server.ts` (`createClient()`, uno por request), `browser.ts`, `admin.ts` (secret key, salta la RLS), `proxy.ts`
  (`actualizarSesion()`), `consultas.ts` (`citar()`, `aplicarCondicionDeAtributo()`, `aplicarRango()`, `aplicarCursor()`, `ordenarPorCursor()`),
  `almacen.client.ts` (`subirPorHash()`, `quitarSiHuerfano()`).
- `lib/safe-action.ts`: `actionClient` (exige sesión; `ctx` con `supabase`, `usuarioId`, `permisos`) y `actionClientPublico`. Toda mutación.
- `lib/errores.ts`: `Resultado<T>`, `ok()`, `fallo()`, `conflicto()`, `errorDePostgrest()` (`PT409` → conflicto, `42501` → sin_permiso), `datosO()`.
- `lib/permisos.ts`: `puede()`, `alcanceDe()`, `origenesCon()`, `CLAVES_PERMISO`; las claves de nivel (`esClaveDeNivel()`) las crea la empresa.
- `lib/rutas.ts` (`decidirAcceso()`, `returnToSeguro()`), `lib/navegacion.ts` (`redirigir()`).
- `lib/formato.ts`, `lib/fechas.ts`: todo número y fecha, en el locale y la zona de la empresa; `formatearFechaHoraConZona()` y
  `abreviaturaDeZona()` para la fecha que se lee en otra zona (la de una subasta, en `useRegional().zonaDeLaPersona`). `lib/numero-tipeado.ts`: `leerNumeroTipeado(texto,
locale)`, el único lector de un número tipeado.
- `lib/paginacion.ts`: tamaños (`TAMANOS_DE_PAGINA`, `tamanoDePagina()`, `TAMANO_DE_VER_MAS`, `TOPE_DE_LO_CARGADO`, `TAMANO_DE_COLUMNA`,
  `TOPE_DEL_EQUIPO`) y keyset (`leerCursor()`, `codificarCursor()`, `armarPagina()`; por otra columna `armarPaginaPor()` con un `OrdenDeCursor`,
  `POR_ALTA` por defecto). El cursor lleva `instante`. `lib/conteo.ts`: `conteoAcotado()`, `cantidadAcotada()`, `cortarAlTope()`, `textoDelTope()`.
- `lib/memoria-de-lectura.ts`: `memoriaDeLectura(leer, vidaMs)`, lectura del navegador compartida y de vida corta.
- Formularios con `useAction`: `lib/enviar-accion.ts` (envío con `sinRed`), `lib/formularios.ts` (errores por campo), `lib/borrador.ts` +
  `ui/use-borrador.ts` (borrador en `sessionStorage`).
- `lib/filtros/`: filtros declarativos sin nuqs (`EsquemaDeFiltros`, `leerFiltros()`, `chipsDe()`, `cumpleElMinimo()`; `campos.ts`: campos del
  layout a filtros). `ui/filtros/`: `<FilterShell>`; `ui/por-pagina.tsx`, `ui/paginacion.tsx` (con `alIr`, sin ir al servidor),
  `ui/aviso-de-tope.tsx`, `ui/ir-a-una-fecha.tsx` y `ui/desde-una-fecha.tsx` (entregan un día `YYYY-MM-DD`; el instante lo arma quien lee).
- `lib/campos/`: motor de campos configurables sin I/O (`TIPOS_DE_CAMPO`, `esquemaDeValor()`, `valorMostrado()`, `campoDeFormulario()`; `rango.ts`,
  espejo de `_valor_fuera_de_rango` y `_campo_rango`). `ui/campos/`: `<EditorDeCampos>` (`campo-rango.tsx`), `<DatosPorGrupo>`, `<CampoDeFormulario>`.
- `lib/ancho.ts` (`anchoDeLaPeticion()`, `CORTE_DEL_TABLERO`/`CORTE_DE_LA_TABLA`/`CORTE_DEL_PANEL`), `ui/ancho-de-pantalla.tsx` (`useAlMenos()`).
- `lib/atajos.ts` + `ui/atajos/`: `ATAJOS`, `teclasDelAtajo()`, `<ProveedorAtajos>`, `useAtajo()` (responde el último registrado); `<AyudaDeAtajos>`
  registra `?` y abre `<ListaDeAtajos>` por `diferido()`.
- `lib/instalacion.ts` (`ofrecerInstalacion()`: `ninguna`, `prompt` o `instrucciones` en iOS) y `ui/{use-instalacion.ts,instalar-app.tsx}`.
- `lib/color.ts` (`tokensDeMarca()`, `cssDeMarca()`), `lib/imagenes.ts` (`comprimirImagen()`, `extensionDe()`, `hashDe()`), `lib/almacen.ts`,
  `lib/iconos.ts` (catálogo cerrado), `lib/apibara.ts`, `lib/numeros-de-lead.ts`.
- `lib/email/`: `enviarEmail()`, la única puerta del correo (`EMAIL_PROVEEDOR`: `mailpit`, `resend`, `cloudflare`; `proveedor.ts`;
  `pnpm email:probar <destino>`). Ningún archivo se llama `resend.ts`: el lint prohíbe importar algo llamado `resend`.
- `config/esquemas.ts`: el entorno en Zod (`entornoPublico()`, `entornoDelServidor()`, `pnpm env:check`; lectores en `scripts/lib/entornos/`).
  `config/app.ts`: nombre y colores.
- `ui/diferido.tsx`: `diferido()`. `ui/modal.tsx`, `ui/drawer.tsx`, `ui/confirmar.tsx`: diálogos por URL; `ui/modal-de-formulario.tsx`,
  `ui/use-envio-de-modal.ts` (envío sin versión).
- `ui/vuelta-del-foco.ts`: `abrirConVuelta()` y `useVueltaDelFoco()`: tras recargar con un panel por URL, «atrás» devuelve el foco a quien lo abrió
  (marca en `history.state`; desde un menú, al botón del menú). La entrada queda también en `sessionStorage` porque `shallow: false` la borra del
  historial; con `router.push`: `abrirConVuelta(clave, () => { push(url); return alLlegarA(url) })`. La usa `usePanelPorUrl()`.
- `ui/visor-de-imagenes/`: `<CarruselEnElLugar>` (la portada y, al acercarse, el resto por la `cargar` que recibe; `modo="abrir"` en un lugar
  chico) y `useVisorDeGaleria()` (una galería ya leída); el visor vive en `?visor=<clave>&foto=<n>` (la foto cambia con `replace`).
- `ui/lista/`: `UnaSolaVista`, `TablaDeLista`, `FilaDeLista`, `TarjetaDeLista`, `MasAcciones`, `AbrirResumen`, `SimbolosDeLista`.
- `ui/monto.tsx` + `live.ts` + `guion-live.tsx` (Modo Live), `regional.tsx`, `densidad.tsx`, `marca.tsx`, `estilo-de-marca.tsx`.
- `lib/acciones-del-aviso.ts` (las acciones de un aviso como datos: `AccionDelAviso`, `resolverAcciones()`, `pedidoDe()`, `hrefDePanel()`; `ErrorApp.causa`)
  y `ui/acciones-del-aviso.tsx` (`<AccionesDelAviso>`, todo `<Button>`: en un toast sólo los botones reciben el puntero).
- `ui/estados/`, `ui/esqueletos/`; `ui/toasts.ts` (`avisarError()`, `avisarConDeshacer()`), `ui/sonner.tsx`, `ui/pie-del-panel.tsx`,
  `ui/zona-de-archivos.tsx`. `types/database.types.ts`: lo genera `pnpm db:types`; no se edita.

## No se rompe

- Locale, moneda, zona, nombre, logo, color y densidad entran por props desde `app/`.
- `permisos.ts` espeja la tabla `permisos` de `supabase/seed.sql` (un test lo compara). `puede()` decide qué se muestra; protege la base.
- `toFixed` está prohibido por lint. `<Monto>` manda al DOM el valor y su reemplazo y el CSS elige con la clase `live` de `<html>`: nunca una cifra
  a la vista antes de hidratar.
- `cssDeMarca()` sólo recibe colores que pasaron por `tokensDeMarca()`: a un `<style>` nunca llega texto libre.
- `<Marca>` con `logoOscuroUrl` dibuja los dos logos y el tema elige por CSS (`dark:hidden` / `hidden dark:block`, `data-logo`), nunca por JS.
- Registro obligatorio: cada `<Confirmar>` (por `usePanelPorUrl()`) en `scripts/guardas/confirmar-con-url.ts`, cada `<Drawer>` en
  `drawers-con-salida.ts`, cada `<Modal>` con algo escrito en `modales-con-salida.ts`; toda lista nueva usa `ui/lista` (`listas-con-patron.ts`).
- Cada `history: 'push'` de `src/` usa `abrirConVuelta()` y `useVueltaDelFoco()` (`scripts/guardas/paneles-con-vuelta.test.ts`).
- Sin `transition-all`: nada anima `font-size` ni el alto (`scripts/guardas/sin-transition-all.test.ts`).
- `lib/iconos.ts` es la lista de `_iconos_del_catalogo()`: se guarda la clave, nunca un nombre libre ni un SVG.

## Ojo

- `use-instalacion.ts` pone sus oyentes (`beforeinstallprompt`, `appinstalled`) al evaluarse el módulo, no en un efecto: el navegador avisa una vez y
  el menú se monta tarde. Un evento sirve una sola vez.
- `admin.ts` importa `server-only`; el lint sólo deja importarlo desde `equipo/infra/invitaciones.ts`, `empresa/infra/revalidacion-prueba.ts` y
  `web/infra/portal/rpc.ts`.
- Esc dentro de un diálogo lo atiende Base UI (cierra el de más arriba y detiene el evento): el atajo «cerrar» no lo ve, por eso `<Modal>` no lo
  registra. Un `<Modal>` abierto desde un `<Drawer>` se dibuja dentro de los hijos del Drawer.
- Un `<fieldset disabled>` no apaga los `Switch` de Base UI: pásales `disabled`.
- `nuqs` es `'use client'`: `lib/filtros` lee la URL a mano, y de ahí salen las claves compartidas (`CLAVE_DE_CURSOR`, `CLAVE_DE_PANEL`). En tests
  con `NuqsTestingAdapter`, `waitFor` la escritura.
- Un cambio `shallow: true` con otra navegación pendiente la pisa; `useFiltros().cerrarPanel` va al servidor si la lista aún se está pidiendo.
- Un campo de texto en la URL no lleva `key` atada a su valor (pierde el foco): `useTextoDeUrl()`.
- `avisarError()` con `no_autenticado` ofrece «Ingresar» (no redirige); con `conflicto`, «Recargar»; con `{ acciones }` o `alReintentar`, el toast queda hasta cerrarlo y enfoca la principal. El `<Toaster>` no recibe el puntero: un aviso
  con otro control necesita `pointer-events-auto`.
- shadcn usa variables (`bg-primary`) que `globals.css` apunta a los tokens.
- Safari devuelve PNG si le pides WebP: `comprimirImagen()` reintenta en JPEG; la extensión sale de `extensionDe(blob.type)`.
- `entornoPublico()` valida al primer uso; las `NEXT_PUBLIC_*` se leen con el nombre literal.
- Los `MENSAJE_*` de `errores.ts` también hablan de tú.
- `vitest` no limpia entre pruebas: un test que monta diálogos usa `afterEach(cleanup)`.
- La vuelta del foco de un hook se prueba con `probarLaVuelta()` de `ui/vuelta-del-foco.soporte.tsx` (sólo pruebas): cuatro por función que abre.
