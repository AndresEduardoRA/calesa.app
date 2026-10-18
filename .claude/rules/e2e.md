---
paths:
  - 'e2e/**'
  - 'scripts/**'
---

# e2e y capturas

- **Un e2e que falla no se reintenta** (`retries: 0`): se busca la causa en `e2e-fallos/<fecha>/` (traza, video, captura, reporte). Un
  número que sólo se explica con «la máquina estaba ocupada» no se explicó: se mide (carga, contadores, qué más corría).
- `pnpm test:e2e <spec>` corre un spec sobre la base como esté (pide `npx supabase functions serve`); `--project=escritorio` o
  `--project=movil` elige el proyecto. **`pnpm test:e2e:completo`** resetea la base, corre las carreras y TODO, y pasa los argumentos a
  Playwright: `pnpm test:e2e:completo --project=escritorio` sirve para iterar sobre un proyecto; **la verificación de un cierre va con
  los dos proyectos**, sin la bandera.
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
