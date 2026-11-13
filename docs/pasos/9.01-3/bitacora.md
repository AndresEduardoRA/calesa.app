## 2026-11-12 · Paso 9.01-3: la pantalla `/actividad` (parte 3 de 4)

### Hecho

- Módulo `actividad`. `entities/` lleva los tipos de las dos RPC, las etiquetas de entidad, acción y campo, y `presentarDiff`:
  - muestra sólo lo que cambió, comparado en profundidad, también dentro de `atributos`;
  - un monto sale como monto, cada lado en su moneda;
  - sin moneda conocida, `monedaConocida: false`;
  - un atributo de tipo `moneda`, con la moneda sin conocer.
- Filtros de persona y entidad, de una sola opción. `?registro=` vale sólo con `?entidad=`.
- `infra/` lee la página por cursor, el diff y las personas.
- `/actividad`:
  - por día en la zona de la empresa;
  - «Ver más» hasta `TOPE_DE_LO_CARGADO` con `<AvisoDeTope>`, «Ir a una fecha» y «Volver a lo más reciente»;
  - los estados de `docs/UX.md`: esqueleto, vacío de primera vez con `actividad_dias`, vacío por filtro, error con «Reintentar» y sin permiso.
- La entrada «Actividad» del menú del usuario pasa a `disponible`.
- `actividad_listar` entra en `scripts/guardas/areas-c/paginas-en-la-base.ts`.
- La fila todavía no abre el diff.

### Verificación

- `diff.test.ts`: T1–T5 en verde. Las mutaciones caen:
  - M1, sin `monto` en gastos: caen T2 y T3;
  - M2, comparar por identidad: cae T1;
  - M3, la misma moneda en los dos lados: cae T2;
  - M4, el atributo `moneda` en base: cae T2.
- `vitest run scripts/guardas`, `navegacion.test.ts` y el módulo: 1180 en verde. `typecheck` y `lint` limpios.
- `nivel.mjs --rango 2c139fd9..HEAD`: `{"nivel":2,"disparadores":["layout"],"database_types":false}`.
- e2e completo: no (9.01-3, Nivel 2: layout, lo prueba el CI del PR; dirigidos: pwa en escritorio y movil, datos-exportar en escritorio)

### Lo que sigue (9.01 queda abierto)

- **9.01-4 (datos y pantalla).** La parte se vuelve de datos por su primer commit, así que su plan se audita.
  - Primer commit: la migración `actividad_diff_moneda`. `actividad_diff` suma `moneda_antes`/`moneda_despues` desde `a.antes->>'moneda'` y
    `a.despues->>'moneda'` (la foto del cambio, nunca la fila vigente), sólo con `visible: true` y en `gastos`, `pagos`, `repuestos_compras` y
    `repuestos_items`. Lleva su prueba en `areas/actividad/actividad.sql`.
  - Después: el drawer `?cambio=`, «Ver actividad» en las fichas, `e2e/actividad.spec.ts` y la fila de `docs/UX.md`.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- En la «Partición» de la Fase 9:
  - 9.01-3 hecha: `/actividad` por día, con «Ver más», «Ir a una fecha» y filtros de persona y entidad.
  - 9.01-4 suma `moneda_antes`/`moneda_despues` de la foto en `actividad_diff`.
- La fila 9.01 sigue en 4 partes.
