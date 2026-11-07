# cotizaciones › final

El área `final` de `cotizaciones` (carril C, 4.25): marcar la cotización final de un vehículo. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

Una **final** es la cotización elegida de un vehículo: a lo sumo una activa por vehículo (`cotizaciones_final_por_vehiculo`). Marcarla vincula el vehículo al lead
de la cotización, manda a la papelera las demás del vehículo (la final anterior, que baja a preventa, y las preventas) y pasa el lead a la clase cliente. Hoy todo
vive en la base (4.25-1). La pantalla, «Marcar final» en la guardada (`pantallas/final-cotizacion.ts`), es el 4.25-2. Crear una final directo con
`cotizacion_crear` hace lo mismo desde el 4.25-1b (4-17). `client.ts`, `index.ts` y `composicion.ts` siguen vacíos.

## En la base

- `cotizacion_marcar_final(p_cotizacion)` (`security definer`, de `authenticated`; `…_final_marcar.sql`):
  - **C1, sin candado:** la cotización viva y visible (si no, «No tienes acceso a esta cotización.»), `cotizaciones.final.gestionar` del origen, el vehículo, el
    lead vivo (en la papelera: 23514) y en la cartera con `leads.editar` (P2 a), y que quien marca pueda mandar a la papelera todas las demás vivas del vehículo
    (P3 a: si no, 42501 «Este vehículo tiene preventas que no puedes mandar…»).
  - **C2, candados:** (1) el lead `for no key update`, (2) el vehículo `for key share`, (3) la cotización y todas las vivas del vehículo en una pasada por id. El
    vehículo se escribe recién en `_final_aplicar`, con todo tomado.
  - **C3:** si lo tomado ya no está vivo o cambió (otro vehículo u otro lead), otra vuelta desde C1 (subtransacción con `PF425`); a la tercera, PT409. Con todo
    tomado vuelve a mirar el lead, ver, P3 a y el vínculo, éste releído después de la pasada (otro lead: 23514, P4 a).
- `_final_aplicar(c, p_tomadas)` (de nadie): la final anterior tomada baja a preventa (por id), `c` pasa a final, las preventas tomadas van a **un** lote de la
  papelera de quien marca, el vehículo sin lead queda con el de `c` (cinturón: otro lead, 23514), el lead pasa al primer tipo activo de clase cliente por
  `orden, nombre`, y la actividad `cotizacion.final`. No toma candados y escribe cotizaciones sólo por id.
- `_limpieza_ancla` devuelve `'cotizacion_final'` con una final activa y viva (`…_final_ancla_de_la_limpieza.sql`). `vehiculo_vincular` no desvincula ni
  reemplaza con una final activa con lead (`…_final_desvincular.sql`, P5 a).
- Por qué ese orden, con quién choca cada candado y qué cede: `docs/pasos/4.25/decisiones.md`.

## Pruebas

- `supabase/tests/areas/final/marcar.sql` (F1–F9) y `marcar-candados.sql` (F10–F13: el orden en el cuerpo, el ayudante, los privilegios): `SOLO=areas/final/<x>.sql pnpm db:probar`.
- `supabase/tests/areas/final/ancla-y-desvincular.sql` (A1–A3).
- Las carreras R1–R8 (`carreras.mjs`, `carreras-de-candados.mjs`, `carreras-comun.mjs`), con dos conexiones a la base local:
  `bash scripts/candado.sh db:carreras -- node supabase/tests/areas/final/correr-carreras.mjs`. `db:carreras` las corre cuando el A conecte
  `carrerasDeFinal` en `scripts/carreras.mjs`. Las de guardar y crear del A que llaman a marcar («fin2», «fin3», «g11», «g11b», «g14») siguen en `db:carreras`.
