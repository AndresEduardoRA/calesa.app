## 2026-11-07 — Paso 4.25-1: marcar final en el orden de candados de vincular, la final como ancla y desvincular con final

- **Hecho:** rigor máximo, base sola, tres commits de código con su migración (`final_marcar`, `final_ancla_de_la_limpieza`, `final_desvincular`) y uno de prueba
  que pidió la auditoría del informe. El plan necesitó cuatro rondas de auditoría (dos `atasco` contestados por la persona) y una compuerta `producto` (P1–P6, todas
  (a)); la compuerta `datos`, «aprobar».
  - `cotizacion_marcar_final` mira sin candado (ver, `final.gestionar`, el lead vivo y en la cartera, las demás del vehículo que pueda mandar a la papelera).
    Toma lead `for no key update` → vehículo `for key share` → la cotización y las vivas del vehículo en una pasada por id. Si algo cambió mientras esperaba,
    hace otra vuelta (a la tercera, PT409) y con todo tomado relee el vínculo.
  - Los efectos van en `_final_aplicar` (de nadie; lo reusa el 4.25-1b): la final anterior tomada baja por id, las preventas a un lote de quien marca, el vínculo
    con cinturón, el lead al primer tipo activo de clase cliente y la actividad.
  - `_limpieza_ancla` da `'cotizacion_final'`. `vehiculo_vincular` no desvincula ni reemplaza con una final activa con lead (P5 a).
  - El 4.25 se parte: sigue el **4.25-1b** (4-17, crear una final, P6 a) y el **4.25-2** (la pantalla).
- **Verificación** (`.piloto/salidas/4.25-1/`):
  - Rojos contra HEAD: `rojo-marcar.txt` (12 ✗; F7 y F8 verdes), `rojo-carreras.txt` (R1, R2 y R5c en 40P01; R3, R4, R5, R5b, R7 y R8 con lo de antes; R6 y R7b
    verdes), `rojo-ancla.txt` (A1) y `rojo-desvincular.txt` (A3).
  - Verde: `db:probar` entero en el hook del commit 3 (635 ✓, 0 ✗); las carreras R1–R8 (`verde-carreras-final.txt`, 11 ✓, sin 40P01); `db:carreras` entero con fin2,
    fin3, g11, g11b y g14 del A (`db-carreras-final.txt`); `scripts/guardas` (1.003 pruebas) y `carriles.mjs origin/main c/4.25` (14 archivos).
  - e2e dirigidos en `escritorio` (`e2e-dirigidos.txt`): 21 en verde, en `vehiculos-limpieza`, `leads-vehiculos`, `leads-vehiculos-acceso`,
    `vehiculos-confirmar-por-url` y `vehiculos-vinculo`.
  - Mutaciones: 26 (`mutaciones/`). Caen 25, cada una donde dice el plan. M17 cayó después de sumar a F9 que el rechazo de C1.8 va antes del primer candado. M19
    sobrevive y es equivalente en el efecto (`decisiones.md`).
  - Medido, en una siembra de volumen y con la ancla de antes y la nueva aplicadas por psql:
    - La limpieza con 100.000 candidatos: 438,5 y 391,8 ms antes; 440,2 y 451,6 ms después (tope 8.000).
    - El inventario por rutas (`limpieza_el` por fila): mismos bloques y ms en su banda (`medir-limpieza-{antes,despues}.txt`).
    - `db:medir:volumen` entero cortó en `medir-evaluar.sql` (p95 51,27 ms contra 50, ajeno). Su limpieza dio 1 ms por la hora de la corrida (`decisiones.md`).
  - `lint` lo corrió el hook; `typecheck` lo saltó el hook (`PILOTO=1`): lo corren el hook de Stop y el CI.
    e2e completo: no (4.25-1, base, Nivel 1: lo dirigido en escritorio)
- **Necesita del carril A:**
  1. Dos líneas en `scripts/carreras.mjs` para que `db:carreras` y el CI corran R1–R8 (P1 a): `import { carrerasDeFinal } from
'../supabase/tests/areas/final/carreras.mjs'` y, con las demás, `await carrerasDeFinal({ orquesta, carrera, espero, conectar })`. Siembra y limpia su persona
     sola (`carreras-final-propios@ejemplo.com`, rol `carreras_final_propios`, que el arnés borra por prefijo).
  2. `cotizacion_final: ['con cotización final', 'con cotización final']` en `ETIQUETA_DE_ANCLA` (`src/modules/vehiculos/entities/limpieza.ts`) con su prueba. Hasta
     entonces, el resumen de la limpieza dice «retenidos».
  3. `src/modules/vehiculos/CLAUDE.md:49`: marcar ya toma lead → vehículo, como vincular, y desvincular con una final ya se frena (P5 a).
  4. `docs/ESTADO.md:41-42` y `:51-52`: el deadlock de marcar, «vincula sin mirar la papelera», el ancla y desvincular con final, cerrados.
  5. `docs/PLAN.md`: la fila 4.25 partida en «4.25-1 (hecho el 2026-11-07), 4.25-1b, 4.25-2», y 4-17 al 4.25-1b.
  6. `_vehiculo_motivo_de_bloqueo` no frena mandar a la papelera un vehículo con final sin lead (abierto, no lo pidió la fila).
  7. Encima contra la papelera de vehículos ya es un ciclo hoy (encima: anterior `for share` → vehículo `for key share`; la papelera: vehículo `for update` → sus
     cotizaciones). Pide que `cotizacion_encima` tome lead y vehículo antes que la anterior. No bloquea este paso: marcar con encima no cierra ciclo (R7).
  8. `supabase/tests/medir-jobs.sql` corre la limpieza con `now() + 12 h`: corrido entre las 12:00 y las 15:00 de La Paz da «temprano» en 1 ms y no mide nada.
- **Abierto propio del C:** vincular contra restaurar la papelera de cotizaciones ya es un ciclo hoy (restaurar: vehículo → lead `for key share`; vincular: lead
  `for update` → vehículo `for update`). La salida es invertir a lead → vehículo en `_papelera_restaurar_cotizaciones`, con su carrera. Este paso no lo empeora.
- **Commits:** `b2a3624c` feat(db): marcar final en el orden de candados de vincular · `8432f0c0` feat(db): la cotización final como ancla de la limpieza ·
  `362c02b9` feat(db): no cambiar el vínculo de un vehículo con cotización final · `9de5ab84` test(db): afirmar si marcar espera en las carreras de candados · y
  el de docs.

## 2026-11-08 — Paso 4.25-1b: crear una final deja el estado de marcarla (cierra 4-17)

- **Hecho:** rigor máximo, base sola, dos commits de código. El plan pasó la auditoría con observaciones, ya aplicadas, y una compuerta `producto` contestada con
  la recomendada: P7 «rechazar» y D1 (la ayudante `security definer`) «aprobar».
  - `cotizacion_crear(…, p_clase := 'final')`:
    - sin candado: la final sin vehículo (22023, adelantado), el lead en la cartera con `leads.editar` y que vea el vehículo;
    - en `_final_crear_mirar` (nueva, de nadie, sin candados): otra final activa (23505, P7 a), las preventas que no puede mandar a la papelera (42501) y el
      vínculo de otro lead (23514);
    - toma el lead `for no key update`, el vehículo `for key share`, la fórmula y, después del cálculo, las vivas del vehículo en una pasada por id;
    - con todo tomado vuelve a mirar, inserta y aplica `_final_aplicar` del 4.25-1. La preventa no cambia.
  - **Desvío de la fila:** la prueba de 4-17 (N1) va en `supabase/tests/areas/final/crear.sql`, no en `cotizacion-crear.sql`. Ese archivo es compartido, ya tenía
    726 líneas y N1 usa lo del área. `cotizacion-crear.sql` sólo suma el vínculo en su bloque de la final.
  - Sigue el **4.25-2** (la pantalla).
- **Verificación** (`.piloto/salidas/4.25-1b/`):
  - Rojos contra HEAD:
    - `rojo-crear.txt`: N1–N5 ✗; N11 ✓ como guarda.
    - `rojo-crear-candados.txt`: N6–N8 y N10 ✗; N9 ✓ como guarda.
    - `rojo-cotizacion-crear.txt`: el bloque de la final.
    - `rojo-carreras-2.txt`: Q1, Q2 y Q4–Q11 ✗; Q3 ✓ como guarda.
  - Verde:
    - `db:probar` entero en el hook del commit 1 (679 ✓, 0 ✗).
    - Las carreras R1–R8 y Q1–Q11 (22 ✓, sin 40P01; `verde-carreras.txt`).
    - `db:carreras` entero, con «fin» del A (`db-carreras-1.txt`).
    - `scripts/guardas` (1.003 pruebas) y `carriles.mjs 8cc375ea c/4.25` (25 archivos).
  - e2e dirigidos en `escritorio` (`e2e-dirigidos.txt`): 6 en verde, en `cotizar-guardar` y `cotizar-guardar-intento`, con `E2E_SIN_FUNCIONES=1`.
  - Mutaciones: 20, todas caen donde dice el plan (`mutaciones/`). M4 se rehízo: la primera versión dejaba que la final se viera a sí misma.
  - Medido: `cotizacion_crear` con 250.000, la preventa en 6,3 ms y 359 buffers y «a mano» en 7,4 ms y 401, sin recorrer la tabla (`medir.txt`). `db:medir` no
    terminó: la persona paró el bucle durante `cotizacion_guardar`.
  - `lint` lo corrió el hook; `typecheck` lo saltó el hook (`PILOTO=1`): lo corren el hook de Stop y el CI.
    e2e completo: no (4.25-1b, base, Nivel 1: lo dirigido en escritorio)
- **Necesita del carril A** (además de lo del 4.25-1):
  1. `docs/PLAN.md`: 4-17 cerrado y la fila «4.25-1b (hecho el 2026-11-08)».
  2. `src/modules/cotizaciones/CLAUDE.md` › «No se rompe»: «A lo sumo una final activa por vehículo (`cotizacion_marcar_final`, que toma primero su cotización)» ya
     no es cierto. Crear y marcar toman lead → vehículo → cotizaciones.
  3. `scripts/carreras/cotizaciones.mjs:497` («fin»): la segunda espera el lead, no el índice. Su afirmación sigue valiendo (P7 a).
  4. Recordatorio: Q1–Q11, igual que R1–R8, no corren en `db:carreras` ni en el CI hasta que se conecte `carrerasDeFinal` en `scripts/carreras.mjs` (pedido 1 del
     4.25-1). `carrerasDeFinal` ya llama a las de crear: no hacen falta líneas nuevas.
- **Pendiente propio:** partir `supabase/tests/cotizacion-crear.sql` (730 líneas).
- **Commits:** `755a76ac` feat(db): crear una final deja el estado de marcarla · `db947e4b` test(db): carreras de crear una final contra marcar y vincular · y el
  de docs.
