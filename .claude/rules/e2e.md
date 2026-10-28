---
paths:
  - 'e2e/**'
  - 'scripts/**'
---

# e2e y capturas

## Fallos y base local

- Un e2e que falla no se reintenta (`retries: 0`): se busca la causa en `e2e-fallos/<fecha>/` (traza,
  video, captura, reporte), que guarda `e2e/soporte/reporter-de-fallos.ts` en toda corrida que falla.
  Un `pnpm test` que cae deja su salida en `test-salidas/<fecha_hora-pid>/`. «La máquina estaba
  ocupada» no explica nada: se mide.
- La base local y el servidor de e2e de un stack son de una sola sesión a la vez: `db:reset`, `db:types`,
  `db:diff`, `db:medir`, `db:carreras`, `db:lint`, `db:sembrar-volumen`, `db:medir:volumen`, `test:e2e` y
  `test:e2e:completo` toman `scripts/candado.sh` (no `db:probar`, que es PGlite). Hay un candado por stack:
  la principal y cada carril de Orca, que el candado reconoce por su `.env.carril` (`scripts/worktree/preparar.sh`).
  Ocupado falla con 75 (`CANDADO_ESPERA=<s>` espera); `bloquear-peligrosos.sh` rechaza `supabase` y el
  runner suelto. En un carril, `pnpm dev` y `pnpm funciones` ya usan su stack; `supabase` suelto, no.
- `pnpm test:e2e <spec>` corre un spec sobre la base como esté (pide `pnpm funciones`);
  `--project=escritorio` o `--project=movil` elige el proyecto. `pnpm test:e2e:completo` resetea la base,
  corre las carreras y todo; pasa sus argumentos a Playwright.

## Niveles de verificación

- Nivel 1, toda tarea: `pnpm lint`, `pnpm typecheck`, `pnpm test` y los e2e dirigidos a lo tocado, en
  `escritorio` y, si es interfaz (regla de abajo), también en `movil`.
- Nivel 2, sólo si la tarea toca uno de estos seis disparadores y ningún otro: (1) lo compartido,
  `src/shared`; (2) el proxy, `src/proxy.ts`; (3) auth: `src/modules/equipo/features/auth`, `src/app/auth` y
  `src/app/(acceso)`; (4) RLS: una migración que crea, cambia o borra una policy, o enciende RLS en una
  tabla; (5) el layout: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/_shell` y
  `src/app/(acceso)/layout.tsx`; (6) la estructura: una migración que crea, cambia o borra una tabla o un
  índice (la base no cambia nunca). Además de lo dirigido corre
  `pnpm test:e2e:completo --project=escritorio` (con `pnpm funciones`),
  después del último cambio de código.
- Nivel 3, un cierre de fase: `pnpm test:e2e:completo` con los dos proyectos. La BITACORA dice cuál se
  corrió: `e2e completo: sí|no (<tarea>)`. Un nivel no corrido se dice.
- Fase 4 (`docs/DECISIONES.md`): los pasos de pura pantalla (4.12–4.14, 4.16–4.23) van con el Nivel 1
  (más el 2 si tocan un disparador); el completo de escritorio corre en el tercer paso de pantalla seguido
  sin completo y en el hito 4-A (4.18). Sin completo: `e2e completo: no (4.xx, pantalla, n de 3)`.
- **Interfaz: cuándo los e2e dirigidos corren también en `movil`** (la regla vive aquí; la aplica
  `scripts/piloto/nivel.mjs` como `toca_interfaz` y `scripts/piloto/nivel.test.ts` falla si se separan).
  Un archivo cambiado es interfaz si no es una prueba (`*.test.*` o `*.spec.*`) y es un `.tsx` o un `.css`
  de `src/`, algo de `design/`, `public/`, `src/app/` o `src/shared/ui/`, o algo de
  `src/modules/<módulo>/pantallas/`. No lo es lo demás (`entities/`, `infra/`, `src/shared/lib`,
  `supabase/`, `scripts/`, `e2e/`, docs). Ante la duda, `movil`; sin interfaz, sólo `escritorio`. No toca
  al completo (Niveles 2 y 3).

## Escribir specs

- Cada spec limpia lo que crea (`prepararAlta`, `prepararListado`, `prepararRecorrido`)
  y nombra sus pruebas con prefijo `E2E` y el proyecto.
- Un spec prepara todo el estado que usa y no depende de otro (CI corre en `--shard=i/4`, cada uno desde
  `db:reset`): lo que necesita lo deja sin pisar lo existente y lo quita (`soporte/apibara-clave.ts`).
- Antes de medir una caja o ver quién recibe un clic se espera el estado final, nunca un tiempo
  (`soporte/esperas.ts`; tras un `goto` con desborde, `aLaVistaAlAcomodarse()`).
- Tras un Esc que cierra un diálogo: `expect(dialogo).toBeHidden()`; entre un `fill` y el Esc:
  `esperarDosCuadros(page)` de `e2e/soporte/barra-de-filtros.ts`.
- Una prueba que baja de nivel (Vitest o `db:probar`) se prueba con una mutación: se rompe la conducta en
  el producto, cae la de abajo, se revierte y recién entonces se borra el e2e. Lo que exige dos
  conexiones va a `scripts/carreras/`.

## Celular

- Todo spec corre en `escritorio` y `movil`. Salir del celular exige marcarlo en el spec con motivo de
  ≥ 40 caracteres: `// @sin-celular-archivo: <motivo>` para el archivo, o `// @sin-celular: <motivo>`
  justo encima de un `test('título', …)` del nivel superior. La leen `playwright.config.ts`
  (`testIgnore`, `grepInvert`) y `scripts/guardas/sin-celular.test.ts` (`pnpm test`), que falla si falta el
  motivo, la marca no está sobre un `test(…)`, dos pruebas llevan la misma, la prueba pregunta por el
  ancho o el proyecto (`esMovil`, `isMobile`, `project.name ===`, `setViewportSize`) o llama a un
  ayudante que mide (`tactil`, `sinScrollHorizontal`, `avisoNoTapaElPie`…).
- Una prueba que alimenta a otra de un archivo `serial` no se marca.
- Demostración: `E2E_HUELLA=<carpeta> pnpm test:e2e:completo` y
  `node scripts/comparar-anchos.mjs <carpeta>`; sólo sale una IGUAL cuyo JS de más lo ejecuta otra
  prueba que se queda.

## Capturas

- Una captura para mirar se toma con `capturar()` (`e2e/soporte/recorrido.ts`) o `capturarEn()`
  (`e2e/soporte/capturas.ts`), nunca con `page.screenshot`; sólo con `E2E_CAPTURAS=<carpeta>`.
- «Mirar las capturas» es abrir todas las hojas de `node scripts/hoja-de-contacto.mjs <carpeta>` con
  `Read`; el informe lista las hojas abiertas y lo visto en cada una.
- Un defecto ajeno va a `docs/PLAN.md`, no se arregla de paso.
