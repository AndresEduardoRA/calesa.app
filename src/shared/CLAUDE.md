# shared

Infraestructura transversal sin reglas de negocio: clientes de Supabase, permisos, errores como valores, formato de números y fechas, configuración y los componentes de interfaz que usan todos los módulos.

## Entra y sale

- Entra: nada de `src/modules` ni de `src/app`. `shared` sólo importa `shared`.
- Sale: lo consumen `app/` y las tres capas de cada módulo.

## Archivos clave

- `lib/supabase/server.ts` — `createClient()`: uno por request, con la sesión y la RLS del usuario. `browser.ts` (`createClient()`, realtime y auth en cliente), `admin.ts` (`createAdminClient()`, secret key, salta la RLS, sólo servidor), `proxy.ts` (`actualizarSesion()`, lo llama `src/proxy.ts`).
- `lib/safe-action.ts` — `actionClient` (exige sesión; deja `supabase`, `usuarioId` y `permisos` en `ctx`) y `actionClientPublico` (ingresar, registrarse, recuperar). Toda mutación entra por acá.
- `lib/errores.ts` — `Resultado<T>` (`{ ok: true, data }` | `{ ok: false, error }`), `ok()`, `fallo()`, `conflicto()`, `errorDePostgrest()` (`PT409` → `conflicto`, `42501` → `sin_permiso`).
- `lib/permisos.ts` — `CLAVES_PERMISO`, `ClavePermiso`, `puede()`, `alcanceDe()`, `origenesCon()`, `concesionesDe()` (filas de `mis_permisos()` → concesiones).
- `lib/formato.ts` — `formatearMonto()`, `formatearNumero()`, `formatearPorcentaje()` con `Intl`.
- `lib/fechas.ts` — `formatearFecha()`, `formatearFechaHora()`, `fechaRelativa()`, `diaEnZona()` en la zona de la empresa.
- `config/entorno.ts` — variables públicas validadas con Zod; `config/app.ts` — nombre y colores por defecto.
- `ui/` — componentes de shadcn (nombres en inglés, los escribe `shadcn add`) y los transversales propios (en español).
- `types/database.types.ts` — generado por `pnpm db:types`. No se edita.

## No se rompe

- `permisos.ts` es espejo de la tabla `permisos` de `supabase/seed.sql`: un test lo compara. `puede()` decide qué se muestra; lo que protege es la base.
- Los clientes de Supabase sólo se importan desde `lib/supabase/` y desde `infra/` de un módulo (lo verifica el lint). Ningún componente ni hook los usa.
- Todo número pasa por `formato.ts` y toda fecha por `fechas.ts`; `toFixed` está prohibido por lint.

## Ojo

- Los componentes de shadcn hablan en sus variables (`bg-primary`, `border-input`); `src/app/globals.css` las apunta a los tokens. En componentes propios se usa `bg-(--color-surface)`.
- `admin.ts` importa `server-only`: si llega al bundle del navegador, el build falla. Se usa después de comprobar el permiso con el cliente del usuario.
- `entornoPublico()` valida al primer uso, no al importar; las `NEXT_PUBLIC_*` se leen con el nombre literal para que Next las incruste.
