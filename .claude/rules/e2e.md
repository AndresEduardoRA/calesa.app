---
paths:
  - 'e2e/**'
  - 'scripts/**'
---

# e2e y capturas

- **Un e2e que falla no se reintenta** (`retries: 0`): se busca la causa en `e2e-fallos/<fecha>/` (traza, video, captura, reporte): un reporter de Playwright (`e2e/soporte/reporter-de-fallos.ts`) lo guarda en **toda** corrida que falla, también la de un spec suelto; quedan los cinco últimos. Un
  número que sólo se explica con «la máquina estaba ocupada» no se explicó: se mide (carga, contadores, qué más corría).
- `pnpm test:e2e <spec>` corre un spec sobre la base como esté (pide `npx supabase functions serve`); `--project=escritorio` o
  `--project=movil` elige el proyecto. **`pnpm test:e2e:completo`** resetea la base, corre las carreras y TODO, y pasa los argumentos a
  Playwright: `pnpm test:e2e:completo --project=escritorio` sirve para iterar sobre un proyecto.
- **Los tres niveles de verificación** (desde la 9i):
  - **Nivel 1 — toda tarea:** `pnpm lint`, `pnpm typecheck`, `pnpm test` y los e2e **dirigidos** a lo tocado, en `escritorio` y en `movil`.
  - **Nivel 2 — si la tarea toca algo que usan todas las pantallas o toda la base, y sólo entonces.** Los disparadores son estos seis y
    ningún otro: (1) lo compartido, `src/shared`; (2) el proxy, `src/proxy.ts`; (3) auth: `src/modules/equipo/features/auth`,
    `src/app/auth` y `src/app/(acceso)`; (4) RLS: una migración que crea, cambia o borra una policy, o enciende RLS en una tabla; (5) el
    layout: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/_shell` y `src/app/(acceso)/layout.tsx`; (6) el esquema base:
    `supabase/schemas` y `supabase/migrations/20261011000000_esquema_base.sql`. Además de lo dirigido corre
    `pnpm test:e2e:completo --project=escritorio` (con `npx supabase functions serve` en otra terminal): **sólo escritorio, ~20 min**. Un
    componente, el proxy, una policy o el layout los usan todas las pantallas: lo dirigido no alcanza para ver lo que rompe en otra. Corre
    **después del último cambio de código**; si el código cambia después, se vuelve a correr.
  - **Nivel 3 — un cierre de fase:** `pnpm test:e2e:completo` con los dos proyectos, sin la bandera (**≈ 32 min**: escritorio 19,6 y
    celular 12,0 en el cierre 5a-fix-3; antes 42).
    La BITACORA dice cuál se corrió: `e2e completo: sí|no (<tarea>)`. Un nivel que no se corrió se dice, no se da por pasado.
- **Una captura para mirar se toma con `capturar()` de `e2e/soporte/recorrido.ts`** (o `capturarEn()` de `e2e/soporte/capturas.ts`), nunca
  con un `page.screenshot` suelto: espera a que la pantalla esté quieta (dos cuadros y todas las animaciones y transiciones con fin, con
  tope de 2 s que dice cuáles seguían) y deja `animations: 'disabled'` como respaldo para las infinitas (un spinner, el pulso de un
  esqueleto). Dos lecturas equivocadas de los botones fueron capturas a media transición. Sólo con `E2E_CAPTURAS=<carpeta>`;
  `e2e/capturas-quietas.spec.ts` prueba que muerde.
- **«Mirar las capturas» significa abrir TODAS las hojas.** `node scripts/hoja-de-contacto.mjs <carpeta>` monta cada proyecto en
  `<carpeta>/hojas/<proyecto>-NN.png` (escritorio de a 4, celular de a 3, cada una rotulada con su nombre, a un tamaño que `Read` lee sin
  reducir) y `hojas/indice.txt` dice qué lleva cada hoja. Se abren con `Read` todas, una por una; abrir las que «parecían importantes» es
  no haber mirado (el cierre 3 abrió 17 de 115). **El informe lista las hojas abiertas** y lo que se vio en cada una (también «sin
  novedad»). Una captura suelta sólo se abre para ampliar un detalle de una hoja.
- Un defecto visto al mirar que no es de la tarea va a `docs/PLAN.md` con su número y su lugar; no se arregla de paso.
- Lo que se puede afirmar sin mirar se afirma (cajas, tamaños de letra, contraste, quién recibe el clic: `e2e/soporte/recorrido.ts`);
  las capturas son para lo que se juzga mirando (solapamientos, redacción, jerarquía).
- Cada spec limpia lo que crea: `beforeAll`/`afterAll` con los ayudantes de `e2e/soporte/` (`prepararAlta`, `prepararListado`,
  `prepararRecorrido`) y un nombre de prueba con el prefijo `E2E` y el proyecto, para que dos proyectos no se pisen.
- **Todo spec corre en los dos proyectos, `escritorio` y `movil`; un spec nuevo no tiene que hacer nada.** Salir del celular exige **marcarlo
  en el propio spec, con el motivo escrito**, y haber demostrado que el celular no le agrega nada. La marca es un comentario (no toca el
  código ni su formato): `// @sin-celular-archivo: <motivo>` suelto, al principio de una línea, para el archivo entero, o `// @sin-celular:
<motivo>` justo encima de un `test('título', …)` del nivel superior (título entre comillas en esa línea, sin plantillas). El motivo dice por
  qué el ancho no importa (≥ 40 caracteres). Las lee `playwright.config.ts` (el proyecto `movil` deja fuera lo marcado con `testIgnore` y
  `grepInvert`) y **`scripts/guardas/sin-celular.test.ts` (en `pnpm test`) la lista y falla** si falta el motivo o es corto, si la marca no está
  sobre un `test(…)`, si dos pruebas llevan la misma, si la prueba pregunta por el ancho o el proyecto (`esMovil`, `isMobile`,
  `project.name ===`, `setViewportSize`, el 200 %), si llama a un ayudante de `e2e/soporte` que mide (`tactil`, `panelDeFiltros`,
  `sinScrollHorizontal`, `avisoNoTapaElPie`…, también a través de otros ayudantes), o si lo hace un `beforeEach` o una función del propio spec.
  Una prueba que alimenta a la siguiente de un archivo `serial` (estado en la base o en una variable) **no se marca**: `movil` la dejaría
  sin su alimentadora.
- **La demostración** es `E2E_HUELLA=<carpeta> pnpm test:e2e:completo` (graba, por prueba, los pasos con la huella de cada elemento, los errores
  de consola y el JS ejecutado: `e2e/soporte/huella.ts`) y `node scripts/comparar-anchos.mjs <carpeta> [salida.json] [resultado.json]`, que dice
  IGUAL, DISTINTO (con el primer paso que difiere), SALTADA o SOLO_UNO. **Sale sólo una IGUAL cuyo JS de más del celular ejecuta otra prueba
  que se queda.** Una diferencia real —tabla contra tarjetas, panel a la derecha contra desde abajo, el menú del celular, las pestañas de
  etapas— deja la prueba en celular. `node scripts/areas-cubiertas.mjs <antes-esc> <antes-mov> <despues-esc> <despues-mov> [bajadas.json]`
  (con `playwright test --list --project=<p>` de antes y de después) comprueba que cada nombre que sale de un proyecto sigue en el otro o
  bajó a una prueba que lo cubre. Medido en el cierre 5a-fix-3: `docs/RENDIMIENTO.md` › «Cierre 5a-fix-3».
- **Una prueba que baja de nivel (Vitest o `db:probar`) se prueba con una mutación:** se rompe a propósito la conducta en el código de producto,
  se ve que cae la prueba de abajo, se revierte y recién entonces se borra el e2e. Si no cae, el e2e se queda. Lo que sólo se prueba con dos
  conexiones va a `scripts/carreras/` (`pnpm db:carreras`).
- **Después de un Esc que cierra un diálogo o de un `fill` que la app anota en un efecto, se espera antes del paso siguiente:**
  `expect(dialogo).toBeHidden()` (mientras se cierra, el menú o el panel aún tienen su copia de un botón o su nombre, y un locator ve dos) y
  `esperarDosCuadros(page)` de `e2e/soporte/barra-de-filtros.ts` entre el `fill` y el Esc (la app anota «hay algo escrito» después de pintar;
  un Esc 1 ms después, que una persona no da, cerraba el panel sin preguntar). Un `getByRole('dialog', { name })` busca por subcadena: «Editar
  <nombre>» también contiene el nombre.
