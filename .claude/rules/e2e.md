---
paths:
  - 'e2e/**'
  - 'scripts/**'
---

# e2e y capturas

## Fallos y base local

- En local un e2e que falla no se reintenta (`retries: 0`): se busca la causa en `e2e-fallos/<fecha>/` (traza,
  video, captura, reporte), que guarda `e2e/soporte/reporter-de-fallos.ts` en toda corrida que falla. En CI hay un
  reintento: la que pasa al reintentar no pone el PR en rojo y `e2e/soporte/reporter-de-inestables.ts` la anota
  en el PR y en el resumen de la corrida. Sólo se arregla si cae dos noches seguidas en el completo; no se piden
  actualizaciones «estabilizar». Un `pnpm test` que cae deja su salida en `test-salidas/<fecha_hora-pid>/`. «La
  máquina estaba ocupada» no explica nada: se mide.
- La base local y el servidor de e2e de una pila son de una sola sesión a la vez: `db:reset`, `db:types`,
  `db:diff`, `db:medir`, `db:carreras`, `db:lint`, `db:aplastar`, `db:sembrar-volumen`, `db:medir:volumen`,
  `test:e2e` y `test:e2e:completo` toman `scripts/candado.sh` (no `db:probar`, que es PGlite). Hay un candado por
  pila: la principal y cada carril (un worktree con su pila), que el candado reconoce por su `.env.carril`
  (`scripts/worktree/preparar.sh`). Ocupado falla con 75 (`CANDADO_ESPERA=<s>` espera); `bloquear-peligrosos.sh`
  rechaza `supabase` y el runner suelto. En un carril, `pnpm dev` y `pnpm funciones` ya usan su pila; `supabase`
  suelto, no.
- `pnpm test:e2e <spec>` corre un spec sobre la base como esté (pide `pnpm funciones`);
  `--project=escritorio` o `--project=movil` elige el proyecto. `pnpm test:e2e:completo` resetea la base,
  corre las carreras y todo; pasa sus argumentos a Playwright.

## Niveles de verificación

- Nivel 1, toda actualización: los e2e dirigidos a lo tocado, en `escritorio` y, si es interfaz (regla de
  abajo), también en `movil`; las pruebas de lo tocado (`pnpm exec vitest related --run <archivos>`) y
  `scripts/guardas`. `lint` y `typecheck` los corre el hook del commit (lefthook); la suite entera, la skill
  `entregar` antes de publicar. El CI del PR vuelve a correr todo y es la autoridad (`docs/FLUJO.md`).
- Nivel 2, sólo si la actualización toca uno de estos seis disparadores y ningún otro: (1) lo compartido,
  `src/shared`; (2) el proxy, `src/proxy.ts`; (3) auth: `src/modules/equipo/features/auth`, `src/app/auth` y
  `src/app/(acceso)`; (4) RLS: una migración que crea, cambia o borra una policy, o enciende RLS en una
  tabla; (5) el layout: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/_shell` y
  `src/app/(acceso)/layout.tsx`; (6) la estructura: una migración que crea, cambia o borra una tabla o un
  índice. Además de lo dirigido, el e2e completo de escritorio: lo corre el CI del PR en sus cuatro bloques
  (`scripts/e2e-dirigidos.mjs` pasa a modo completo cuando el PR toca un disparador o algo que mueve a todos los
  specs: dependencias, `playwright.config.ts`, `supabase/config.toml`, las migraciones), no la sesión. En local,
  sólo lo dirigido.
- Nivel 3, antes de desplegar: el completo con los dos proyectos (Actions › ci › Run workflow,
  `proyectos: ambos`, que dispara la persona; o `pnpm test:e2e:completo` en local, ≈ 95 min). Cada noche el CI
  corre el completo de escritorio sobre `main` si hubo commits. Un nivel no corrido se dice en el PR.
- **Interfaz: cuándo los e2e dirigidos corren también en `movil`** (la regla vive aquí; la aplica
  `scripts/nivel.mjs` como `toca_interfaz` y `scripts/nivel.test.ts` falla si se separan).
  Un archivo cambiado es interfaz si no es una prueba (`*.test.*` o `*.spec.*`) y es un `.tsx` o un `.css`
  de `src/`, algo de `design/`, `public/`, `src/app/` o `src/shared/ui/`, o algo de
  `src/modules/<módulo>/pantallas/`. No lo es lo demás (`entities/`, `infra/`, `src/shared/lib`,
  `supabase/`, `scripts/`, `e2e/`, docs). Ante la duda, `movil`; sin interfaz, sólo `escritorio`. No toca
  al completo (Niveles 2 y 3).

## Qué pruebas se escriben

### Pruebas: sólo lo clave

Decisión de la persona: «no quiero sobretestear; sólo las partes clave». El rigor va donde se pierde dinero o se filtran datos. Las pruebas que
ya existen siguen corriendo y no se rompen; esto decide qué se escribe con cada cambio.

- **Se escriben:** los tests de `entities/` con dinero, fórmula o permisos; las pruebas SQL (`db:probar`) de RLS, permisos y `security definer`; las carreras
  (`scripts/carreras/`) sólo donde hay candados o numeración (marcar final, comprobantes); **un** e2e del camino feliz por pantalla nueva, en `escritorio`.
- **No se escriben:** mutaciones (salvo el motor de la fórmula y el dinero); sondas de medición; e2e de volumen de interfaz (nodos, bytes, pedidos) salvo las
  listas de leads, vehículos o cotizaciones; e2e de conflicto o de versión si la RPC ya tiene su prueba SQL; `medir-*.sql` para tablas de configuración
  (decenas de filas: plantillas, versiones de la fórmula, tablas de referencia, series); capturas para mirar; e2e en `movil` de las pantallas de
  Configuración (el archivo lleva `// @sin-celular-archivo:` con un motivo de ≥ 40 caracteres, «Celular» abajo).
- **Presupuestos** (JS por ruta, nodos, bytes): si un cambio los pasa por ≤ 5 %, sube el tope con una línea en `docs/RENDIMIENTO.md` y sigue; no se
  refactoriza ni se difiere código para entrar.
- **Datos y dinero** (fórmulas del cotizador, dinero, RLS, permisos, `security definer`, migraciones): antes de publicar, una segunda lectura en un
  contexto aparte (el agente `revisor` o `/revisar`). **Pantalla** (sólo `features/`, `components/`, `pantallas/` o `src/app/`, sin datos ni permisos
  nuevos): un e2e del camino feliz y los tests de lo que tenga lógica.

### Pulido

No se recoge de paso en un cambio de producto ni se escribe prueba nueva para él: el texto o el diseño al 200 %; el foco tras recargar o tras «atrás»;
`aLaVistaSinDesplazar()` o `sinScrollHorizontal()` nuevos; las capturas para juzgar con `E2E_CAPTURAS`. `ui.md` sigue diciendo cómo se construye
(`min-w-0`, rem, `@container`). Un defecto de pulido que aparezca se anota en una línea en `docs/PENDIENTES.md` › «Pulido de interfaz». **No es pulido**
lo que falla al 100 %: un botón inalcanzable, un monto mal dibujado, un dato que no se ve o un permiso que no se respeta; eso se arregla en el momento.

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
- Lo que suma un pedido al marco de toda pantalla (un bloque, una suscripción) mueve las pruebas que cuentan
  pedidos: antes de publicar, grep en `e2e/` del texto o del pedido tocado y correr esos specs. Más trampas
  de e2e, por tema, en `docs/LECCIONES.md` › «e2e (Playwright)».

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
  `Read`; el PR lista las hojas abiertas y lo visto en cada una.
- Un defecto ajeno va a `docs/PENDIENTES.md`, no se arregla de paso.
