## 2026-11-12 · Paso 9.01-4: el diff en su drawer, «Ver actividad» en las fichas (parte 4 de 4)

### Hecho

- Migración `20261113020055_actividad_diff_moneda.sql`: `actividad_diff` suma `moneda_antes` y `moneda_despues` de la foto del cambio (fuera de `leads` y
  sólo si `authenticated` lee `moneda`) y `origen_id` de un vehículo. T7 en `areas/actividad/actividad.sql`, también sin grant de `moneda` y que siga
  `security definer` con `search_path` vacío.
- `/actividad`: una fila visible abre su diff en un drawer `?cambio=<id>`, con el cuerpo por `diferido()`, las etiquetas de `atributos` leídas al abrir,
  cada monto con la moneda de su lado y «No tienes acceso a este cambio.».
- `<Monto>` acepta `moneda={null}`: el número sin moneda inventada, oculto igual en el Modo Live. **Para el carril base:** este cambio a
  `src/shared/ui/monto.tsx` va dentro del commit `bacbc87a` (el drawer de `actividad`), no en uno propio; sólo agrega (nadie pasaba `null`).
- «Ver actividad» en el «⋯» de la ficha de lead y de vehículo, sólo con `actividad.ver` (la ruta la arma `src/app`).
- `e2e/actividad.spec.ts`: el camino feliz en escritorio. La fila «Actividad» de `docs/UX.md`.

### Verificación

- `db:probar` entero en verde; T7 en verde. Vitest: T8–T11 en verde; M5 (cae T9) y M6 (cae T8).
- Vitest de actividad, entidades de leads y vehículos, ficha de lead y guardas: 2611 en verde. `typecheck` y `lint` limpios por el hook de cada commit (format, mapa, lint ✔); su prueba de autoridad es el CI del PR. `mapa.sh --check` en 0.
- `nivel.mjs --rango 254cce68..HEAD`: `{"nivel":2,"disparadores":["shared"],"toca_interfaz":true,"database_types":false}`.
- e2e completo: no (9.01-4, Nivel 2: shared, lo prueba el CI del PR; dirigidos: actividad en escritorio, leads-menu-orden y vehiculos-menu-orden en escritorio y movil)

### El paso 9.01 queda hecho (4 partes, `parcial: false`)

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- En la «Partición» de la Fase 9, `9.01-4` hecha: el drawer `?cambio=` con la moneda y el origen de la foto, «Ver actividad» en las fichas y
  `e2e/actividad.spec.ts`.
- La fila **9.01** queda **hecha** (4 partes).
- Se cierra el arrastrado «Actividad lee el diff por una función que recorta según la cartera»: la pantalla abre el diff recortado y el e2e lo recorre.

### Para copiar a `docs/RENDIMIENTO.md`

- `/actividad`: la lista por cursor (`actividad_listar`, de a `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO`, una ruta por filtro con su índice); el
  drawer pide `actividad_diff` por `actividad_pkey` y, sólo si el diff trae `atributos`, las etiquetas por `leads_campos_clave_key` u
  `origenes_campos_origen_id_clave_key`, acotadas a las claves que llegaron. `actividad` no es una tabla con volumen medido: sin `medir-*.sql`.
