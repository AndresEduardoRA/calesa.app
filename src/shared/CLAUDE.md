# shared

Infraestructura transversal sin reglas de negocio: clientes de Supabase, permisos, errores como valores, formato de números y fechas, configuración y los componentes de interfaz que usan todos los módulos.

## Entra y sale

- Entra: nada de `src/modules` ni de `src/app`. `shared` sólo importa `shared`.
- Sale: lo consumen `app/` y las tres capas de cada módulo.

## Archivos clave

- `lib/supabase/server.ts` — `createClient()`: uno por request, con la sesión y la RLS del usuario. `browser.ts` (`createClient()`, realtime y auth en cliente), `admin.ts` (`createAdminClient()`, secret key, salta la RLS, sólo servidor), `proxy.ts` (`actualizarSesion()`, lo llama `src/proxy.ts`).
- `lib/safe-action.ts` — `actionClient` (exige sesión; deja `supabase`, `usuarioId` y `permisos` en `ctx`) y `actionClientPublico` (ingresar, registrarse, recuperar). Toda mutación entra por acá.
- `lib/errores.ts` — `Resultado<T>` (`{ ok: true, data }` | `{ ok: false, error }`), `ok()`, `fallo()`, `conflicto()`, `errorDePostgrest()` (`PT409` → `conflicto`, `42501` → `sin_permiso`), `datosO()` (en un Server Component: el error de una lectura sube al `error.tsx` de la ruta).
- `lib/permisos.ts` — `CLAVES_PERMISO`, `ClavePermiso`, `puede()`, `alcanceDe()`, `origenesCon()`, `concesionesDe()` (filas de `mis_permisos()` → concesiones), `ModuloPermiso`, `MODULOS_PERMISO` (el título de cada módulo, tipado contra el catálogo) y `moduloDe()`.
- `lib/rutas.ts` — `RUTAS`, `decidirAcceso()` (la regla del proxy), `returnToSeguro()`, `destinoTrasIngresar()`, `rutaDeIngreso()`; `lib/navegacion.ts` — `redirigir()` para destinos calculados (con `typedRoutes`, `redirect()` sólo acepta rutas conocidas).
- `lib/formularios.ts` — `valoresDe()`, `errorDeAccion()`, `errorDeCampo()`, `enfocarPrimerError()`: lo común de un formulario con `useAction`. `conRed()` convierte en un error legible la action que no llegó al servidor; `resultadoDeAccion()` la deja como `Resultado` para encadenarla.
- `lib/borrador.ts` + `ui/use-borrador.ts` — borrador en `sessionStorage` de un formulario de más de 6 campos: se repone al volver, avisando con «Descartar».
- `lib/color.ts` — `contraste()`, `tokensDeMarca()` (acepta o rechaza el color de la empresa y deriva sus tokens), `cssDeMarca()`.
- `lib/atajos.ts` — catálogo `ATAJOS` y `atajoDe(evento)`; `ui/atajos/` — `<ProveedorAtajos>` y `useAtajo(clave, manejador, activo)`: responde el último registrado (así `Esc` cierra de a un panel) y un atajo sin nadie registrado no hace nada.
- `lib/almacen.ts` — `urlPublica(bucket, ruta)`; `lib/imagenes.ts` — `comprimirImagen()` (WebP para fotos; PNG para lo que no tolera pérdida), `hashDe()`; `lib/supabase/almacen.client.ts` — `subirPorHash()`, `quitarSiHuerfano()` (borra sólo con `storage_refcount` en 0).
- `lib/formato.ts` — `formatearMonto()`, `formatearNumero()`, `formatearPorcentaje()` con `Intl`.
- `lib/fechas.ts` — `formatearFecha()`, `formatearFechaHora()`, `fechaRelativa()`, `diaEnZona()` en la zona de la empresa.
- `config/entorno.ts` — variables públicas validadas con Zod; `config/app.ts` — nombre y colores por defecto (copias de `design/tokens.css` que un test compara).
- `ui/` — componentes de shadcn (nombres en inglés, los escribe `shadcn add`) y los transversales propios (en español):
  - `estados/` (`EstadoVacio`, `EstadoSinResultados`, `EstadoError`, `EstadoSinPermiso`) y `esqueletos/` (`EsqueletoTabla`, `EsqueletoDetalle`, `EsqueletoFormulario`, `EsqueletoBandeja`): los cinco estados de toda vista.
  - `drawer.tsx`, `modal.tsx` (controlados: el estado «abierto» vive en la URL de quien los usa), `confirmar.tsx` (irreversible; con `palabraClave` pide tipearla), `bloque.tsx` (sección plegable), `toasts.ts` (`avisarExito`, `avisar`, `avisarError`, `avisarConDeshacer`), `use-ultimo.ts` (`useUltimo()`: un panel conserva su último dato mientras se cierra).
  - `monto.tsx` + `live.ts` (`useLive()`) + `guion-live.tsx`: Modo Live. `regional.tsx` (`<ProveedorRegional>`: locale, moneda base y zona horaria de la empresa; `useRegional()`), `densidad.tsx` (`<ProveedorDensidad>`, `useDensidad()`).
  - `campo.tsx`, `campo-seleccion.tsx` (un `<select>` nativo con su etiqueta), `interruptor.tsx` (un sí o no con su explicación), `aviso.tsx`, `opciones.tsx`, `avatar.tsx`, `transicion-pagina.tsx` (View Transitions), `use-en-linea.ts` (`useEnLinea()`).
  - `marca.tsx` (nombre y logo, o el glifo neutro con el color de la marca) y `estilo-de-marca.tsx` (`<EstiloDeMarca color>`: el color de la empresa sobre los tokens).
- `types/database.types.ts` — generado por `pnpm db:types`. No se edita.

## No se rompe

- `permisos.ts` es espejo de la tabla `permisos` de `supabase/seed.sql`: un test lo compara. `puede()` decide qué se muestra; lo que protege es la base.
- Los clientes de Supabase sólo se importan desde `lib/supabase/` y desde `infra/` de un módulo (lo verifica el lint). Ningún componente ni hook los usa.
- Todo número pasa por `formato.ts` y toda fecha por `fechas.ts`; `toFixed` está prohibido por lint.
- `shared` no importa módulos: lo que depende de permisos o de ajustes (locale, moneda, zona horaria, nombre, logo y color de la empresa, la preferencia de densidad) entra por props desde `app/`.
- `cssDeMarca()` sólo recibe colores que pasaron por `tokensDeMarca()` (un hex validado): lo que llega a un `<style>` nunca es texto libre.
- `<Monto>` siempre manda al DOM el valor y su reemplazo; el CSS elige con la clase `live` de `<html>`. Así una recarga con el Modo Live encendido nunca deja ver una cifra antes de hidratar.

## Ojo

- Los componentes de shadcn hablan en sus variables (`bg-primary`, `border-input`); `src/app/globals.css` las apunta a los tokens. En componentes propios se usa `bg-(--color-surface)`.
- `admin.ts` importa `server-only`: si llega al bundle del navegador, el build falla. El lint sólo deja importarlo desde `equipo/infra/invitaciones.ts` (`.claude/rules/datos.md`).
- Los textos hablan de tú (español neutro), también los `MENSAJE_*` de `errores.ts`.
- El estado de filtros y paneles vive en la URL con `nuqs` (`<NuqsAdapter>` está en `src/app/layout.tsx`).
- Los toasts de error salen de `avisarError(error)`: con `no_autenticado` no redirige (la persona tiene un formulario abierto), ofrece «Ingresar» en otra pestaña; con `conflicto` ofrece «Recargar».
- Un `<fieldset disabled>` apaga los campos nativos de adentro, no los de Base UI (`Switch`): a esos se les pasa `disabled` a mano.
- `--fila` (altura de fila según la densidad) y las reglas del Modo Live y de View Transitions están en `src/app/globals.css`.
- `entornoPublico()` valida al primer uso, no al importar; las `NEXT_PUBLIC_*` se leen con el nombre literal para que Next las incruste.
