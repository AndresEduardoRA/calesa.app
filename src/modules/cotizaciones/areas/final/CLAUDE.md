# cotizaciones › final

El área `final` de `cotizaciones` (carril C, 4.25): marcar la cotización final de un vehículo. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

Una **final** es la cotización elegida de un vehículo: a lo sumo una activa por vehículo (`cotizaciones_final_por_vehiculo`). Marcarla vincula el vehículo al lead
de la cotización, manda a la papelera las demás del vehículo (la final anterior, que baja a preventa, y las preventas) y pasa el lead a la clase cliente. Hoy todo
vive en la base (4.25-1). Crear una final directo con `cotizacion_crear` hace lo mismo desde el 4.25-1b (4-17). `client.ts` e `index.ts` siguen vacíos: nada sale
del área fuera de la entrada de la guardada.

## En la pantalla (4.25-2)

- «Marcar final» en la cabecera de la guardada (`pantallas/final-cotizacion.ts` → `HUECOS_DE_FINAL_EN_LA_GUARDADA.Acciones`). El hueco
  (`marcar-la-guardada-final.tsx`, Server Component) lo dibuja sólo en una preventa y con `cotizaciones.final.gestionar` del origen (`puedeMarcarLaFinal`); al
  navegador llegan el id, el número y el motivo para no marcar (`motivoParaNoMarcar`: falta el vehículo o el cliente, con texto según `puedeGuardar`). Es un
  `<button>` con las clases de `<Button>`, por el JS en frío de `/cotizaciones/[id]`.
- El `<Confirmar>` vive en `?panel=marcar-final` (`PANEL_MARCAR_FINAL`), se pide con `diferido()` al abrirse y se revisa al llegar (apagado: avisa el motivo y
  limpia la URL). Está registrado en `scripts/guardas/confirmar-con-url-papelera.ts` (del C), no en `areas-c/`: `confirmar-con-url-areas.test.ts`, del A, todavía da
  por vacíos los registros `areas-*`.
- La action `marcarFinal({ id })` (sin versión esperada, P1 a del 4.25-2) no llama a la base sin la clave en algún origen y revalida `/cotizaciones` al entrar.
  `marcarLaFinal()` (función, no hook) cierra la URL, avisa y recién vuelve: al entrar la página se redibuja sin el botón y el diálogo se desmonta. Cuando no entra
  el diálogo dice el motivo; el 23505 del índice (otra final se confirmó antes) se traduce a «Otra cotización de este vehículo ya es la final. Recarga para verla.».

## En la base

- `cotizacion_marcar_final(p_cotizacion)` (`security definer`, de `authenticated`; `…_final_marcar.sql`):
  - **C1, sin candado:** la cotización viva y visible (si no, «No tienes acceso a esta cotización.»), `cotizaciones.final.gestionar` del origen, el vehículo, el
    lead vivo (en la papelera: 23514) y en la cartera con `leads.editar` (P2 a), y que quien marca pueda mandar a la papelera todas las demás vivas del vehículo
    (P3 a: si no, 42501 «Este vehículo tiene preventas que no puedes mandar…»).
  - **C2, candados:** (1) el lead `for no key update`, (2) el vehículo `for key share`, (3) la cotización y todas las vivas del vehículo en una pasada por id. El
    vehículo se escribe recién en `_final_aplicar`, con todo tomado.
  - **C3:** si lo tomado ya no está vivo o cambió (otro vehículo u otro lead), otra vuelta desde C1 (subtransacción con `PF425`); a la tercera, PT409. Con todo
    tomado vuelve a mirar el lead, ver, P3 a y el vínculo, éste releído después de la pasada (otro lead: 23514, P4 a).
- `_final_aplicar(c, p_tomadas)` (de nadie): si otra tomada tiene un comprobante vigente, 23514 (4.26-1, P7 a; con sólo anulados baja a preventa y
  queda viva, fuera del lote); la final anterior tomada baja a preventa (por id), `c` pasa a final, las preventas tomadas van a **un** lote de la
  papelera de quien marca, el vehículo sin lead queda con el de `c` (cinturón: otro lead, 23514), el lead pasa al primer tipo activo de clase cliente por
  `orden, nombre`, y la actividad `cotizacion.final`. No toma candados y escribe cotizaciones sólo por id.
- `_limpieza_ancla` devuelve `'cotizacion_final'` con una final activa y viva (`…_final_ancla_de_la_limpieza.sql`). `vehiculo_vincular` no desvincula ni
  reemplaza con una final activa con lead (`…_final_desvincular.sql`, P5 a).
- `cotizacion_crear(…, p_clase := 'final')` deja el estado de marcarla (4.25-1b, cierra 4-17; `…_final_crear.sql`):
  - **Sin candado:** la final sin vehículo (22023), el lead en la cartera con `leads.editar` (P2 a), que vea el vehículo (antes que nada que lo delate) y, en
    `_final_crear_mirar(vehículo, lead, ids)` (de nadie, no toma candados), otra final activa (23505, P7 a: se rechaza, no se reemplaza), las preventas que no
    puede mandar a la papelera (42501, P3 a) y el vínculo de otro lead (23514, P4 a).
  - **Candados:** el lead `for no key update` → el vehículo (`_cotizacion_vehiculo`, `for key share`) → la fórmula → después del cálculo, las vivas del vehículo
    en una pasada por id. Con todo tomado, otra vez la cartera y la ayudante (relee el vínculo). Sin vuelta `PF425`. Inserta y llama a `_final_aplicar`.
  - La preventa no cambia (lead `for key share`, nada de lo de arriba).
- Por qué ese orden, con quién choca cada candado y qué cede: `docs/pasos/4.25/decisiones.md`.

## Pruebas

- La pantalla: `entities/final/acceso.test.ts`, `features/final/actions/marcar-final.test.ts`, `features/final/components/marcar-final.test.tsx` y
  `e2e/cotizaciones-final-marcar.spec.ts` (E1–E5, en `escritorio` y `movil`).

- `supabase/tests/areas/final/marcar.sql` (F1–F9) y `marcar-candados.sql` (F10–F13: el orden en el cuerpo, el ayudante, los privilegios): `SOLO=areas/final/<x>.sql pnpm db:probar`.
- `supabase/tests/areas/final/ancla-y-desvincular.sql` (A1–A3).
- `supabase/tests/areas/final/crear.sql` (N1, el de 4-17: crear la final deja lo mismo que crear la preventa y marcarla; N2–N5, N11) y `crear-candados.sql` (N6–N10: el
  orden en el cuerpo, la preventa, los privilegios).
- Las carreras R1–R8 (`carreras.mjs`, `carreras-de-candados.mjs`, `carreras-comun.mjs`) y las de crear una final Q1–Q11 (`carreras-crear.mjs`,
  `carreras-crear-candados.mjs`, que llama `carrerasDeFinal`), con dos conexiones a la base local:
  `bash scripts/candado.sh db:carreras -- node supabase/tests/areas/final/correr-carreras.mjs`. `db:carreras` las corre cuando el A conecte
  `carrerasDeFinal` en `scripts/carreras.mjs`. Las de guardar y crear del A que llaman a marcar («fin2», «fin3», «g11», «g11b», «g14») siguen en `db:carreras`.
