# cotizaciones › final

El área `final` de `cotizaciones`: marcar la cotización final de un vehículo. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

Una **final** es la cotización elegida de un vehículo: a lo sumo una activa por vehículo (`cotizaciones_final_por_vehiculo`). Marcarla vincula el vehículo
al lead de la cotización, manda a la papelera las demás del vehículo (la final anterior, que baja a preventa, y las preventas) y pasa el lead a la clase
cliente. Crear una final directo con `cotizacion_crear` hace lo mismo. `client.ts` e `index.ts` vacíos: nada sale del área fuera de la guardada.

## En la pantalla

- «Marcar final» en la cabecera de la guardada (`pantallas/final-cotizacion.ts` → `HUECOS_DE_FINAL_EN_LA_GUARDADA.Acciones`). El hueco
  (`marcar-la-guardada-final.tsx`, Server Component) lo dibuja sólo en una preventa y con `cotizaciones.final.gestionar` del origen (`puedeMarcarLaFinal`);
  al navegador llegan el id, el número y el motivo para no marcar (`motivoParaNoMarcar`: falta el vehículo o el cliente, con texto según `puedeGuardar`).
  Es un `<button>` con las clases de `<Button>`, por el JS en frío de `/cotizaciones/[id]`.
- El `<Confirmar>` vive en `?panel=marcar-final` (`PANEL_MARCAR_FINAL`), se pide con `diferido()` al abrirse y se revisa al llegar (apagado: avisa el
  motivo y limpia la URL). Registrado en `scripts/guardas/confirmar-con-url-papelera.ts`.
- La action `marcarFinal({ id })` (sin versión esperada) no llama a la base sin la clave en algún origen y revalida `/cotizaciones` al entrar.
  `marcarLaFinal()` (función, no hook) cierra la URL, avisa y recién vuelve: al entrar la página se redibuja sin el botón y el diálogo se desmonta. Si no
  entra, el diálogo dice el motivo; el 23505 del índice (otra final se confirmó antes) es «Otra cotización de este vehículo ya es la final. Recarga para
  verla.».

## En la base

Orden de candados, uno solo para marcar y para crear una final: **lead → vehículo → la cotización y las vivas del vehículo** (en una pasada por id).

- `cotizacion_marcar_final(p_cotizacion)` (`security definer`, de `authenticated`):
  - **Sin candado:** la cotización viva y visible (si no, «No tienes acceso a esta cotización.»), `cotizaciones.final.gestionar` del origen, el vehículo,
    el lead vivo (en la papelera: 23514) y en la cartera con `leads.editar`, y que quien marca pueda mandar a la papelera todas las demás vivas del vehículo
    (si no, 42501 «Este vehículo tiene preventas que no puedes mandar…»).
  - **Candados:** el lead `for no key update`, el vehículo `for key share`, la cotización y las vivas del vehículo. El vehículo se escribe recién en
    `_final_aplicar`, con todo tomado.
  - **Reintento:** si lo tomado ya no está vivo o cambió (otro vehículo u otro lead), otra vuelta desde el principio (subtransacción con `PF425`); a la
    tercera, PT409. Con todo tomado vuelve a mirar el lead, ver, las preventas y el vínculo, éste releído después de la pasada (otro lead: 23514).
- `_final_aplicar(c, p_tomadas)` (de nadie; no toma candados y escribe cotizaciones sólo por id): si otra tomada tiene un comprobante vigente, 23514 (con
  sólo anulados baja a preventa y queda viva, fuera del lote); la final anterior baja a preventa, `c` pasa a final, las preventas tomadas van a **un** lote
  de la papelera de quien marca, el vehículo sin lead queda con el de `c` (con otro lead, 23514), el lead pasa al primer tipo activo de clase cliente por
  `orden, nombre`, y la actividad `cotizacion.final`.
- `_limpieza_ancla` devuelve `'cotizacion_final'` con una final activa y viva. `vehiculo_vincular` no desvincula ni reemplaza con una final activa con lead.
- `cotizacion_crear(…, p_clase := 'final')` deja el estado de marcarla:
  - **Sin candado:** la final sin vehículo (22023), el lead en la cartera con `leads.editar`, que vea el vehículo (antes que nada que lo delate) y, en
    `_final_crear_mirar(vehículo, lead, ids)` (de nadie, sin candados), otra final activa (23505: se rechaza, no se reemplaza), las preventas que no puede
    mandar a la papelera (42501) y el vínculo de otro lead (23514).
  - **Candados:** el lead `for no key update` → el vehículo (`_cotizacion_vehiculo`, `for key share`) → la fórmula → después del cálculo, las vivas del
    vehículo por id. Con todo tomado, otra vez la cartera y la ayudante (relee el vínculo). Sin vuelta `PF425`. Inserta y llama a `_final_aplicar`.
  - La preventa no cambia (lead `for key share`, nada de lo de arriba).

## Pruebas

- La pantalla: `entities/final/acceso.test.ts`, `features/final/actions/marcar-final.test.ts`, `features/final/components/marcar-final.test.tsx` y
  `e2e/cotizaciones-final-marcar.spec.ts` (en `escritorio` y `movil`).
- `supabase/tests/areas/final/`: `marcar.sql`, `marcar-candados.sql` (el orden en el cuerpo, el ayudante, los privilegios), `ancla-y-desvincular.sql`,
  `crear.sql` (crear la final deja lo mismo que crear la preventa y marcarla) y `crear-candados.sql`; una sola: `SOLO=areas/final/<x>.sql pnpm db:probar`.
- Carreras de marcar (`carreras.mjs`, `carreras-de-candados.mjs`) y de crear una final (`carreras-crear.mjs`, `carreras-crear-candados.mjs`), con
  `carreras-comun.mjs` y dos conexiones a la base local. **`db:carreras` no las corre** (`carrerasDeFinal` no está en `scripts/carreras.mjs`): van con
  `bash scripts/candado.sh db:carreras -- node supabase/tests/areas/final/correr-carreras.mjs`. Las de guardar y crear que llaman a marcar («fin2», «fin3»,
  «g11*», «g14», en `scripts/carreras/cotizaciones*.mjs`) sí están en `db:carreras`.
