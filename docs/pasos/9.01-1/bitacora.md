## 2026-11-12 · Paso 9.01-1: la base de lectura recortada de la actividad y su purga (parte 1 de 4)

### Hecho

- `actividad_diff(p_id)` (`security definer`, pide `actividad.ver`): sólo las claves que cambiaron y que quien mira puede ver, por una lista cerrada
  por tabla (`_actividad_recorte`). De un lead, nada sin `puede_lead(…, 'leads.ver')`, sin `atributos` fuera de su cartera y nunca `numero`,
  `numero_propio` ni `telefono_principal`. De una entidad (vehículos, cotizaciones, comprobantes, aduana, documentos, gastos, pagos, transportes, repuestos,
  fórmulas), el espejo de su policy «leer». De la configuración, las columnas con grant a authenticated. De otra tabla, `{visible: false}`.
- `actividad_listar(p_antes_id, p_tamano, p_actor, p_tabla, p_registro, p_hasta, p_accion)`: cursor sobre `id`, una ruta por filtro con su índice
  (`actividad_actor_id_idx`, `actividad_accion_id_idx`, `actividad_tabla_id_idx`, `actividad_registro_id_idx`, que reemplaza `actividad_registro_idx`), tamaño por
  `_acotar_pagina(…, 20, 100)`, «Ir a una fecha» por `actividad_fecha_idx` con desempate por `id`. Cada fila trae la cabecera, si se ve y hasta 5 nombres
  de campos: nunca un valor ni `detalle`.
- `actividad_purgar()` por lotes (10.000, hasta 10 por tabla y corrida): la actividad de más de `actividad_dias` y los `eventos_web` de más de 12 meses;
  ya no borra notificaciones ni visitados (los purga `notificaciones_purgar()`). Job `actividad-purgar` a las 03:25 UTC. G2 de
  `supabase/tests/areas/notificaciones/purgar.sql` (del `a`) se editó: admite este job y ningún otro.
- Pruebas: `supabase/tests/areas/actividad/{actividad,listar,purgar}.sql` (T1–T10 con T5b); entradas en `numero-global.sql` y
  `cotizaciones-visibilidad.sql`.

### Verificación

- `pnpm db:probar` completo en verde; mutaciones (sin `puede_lead`, sin una tabla declarada, sin las entradas de los dos inventarios): cada una
  hace caer su prueba. `vitest run scripts/guardas`: 1141 en verde.
- `node scripts/piloto/nivel.mjs --rango eaa39d40..HEAD`: `{"nivel":2,"disparadores":["estructura"]}`.
- e2e completo: no (9.01-1, Nivel 2: sin e2e completo, lo prueba el CI del PR; dirigidos: ninguno, sin texto de interfaz)

### Lo que sigue (9.01 queda abierto)

- **9.01-2 (base):** la deuda de `registrar_actividad()` (quitarle el `execute` a authenticated si ninguna función de invocador la llama) y la
  revisión de lo que guarda `detalle` en cada llamada; declarar, si hace falta, las tablas que hoy quedan sin recorte a propósito.
- **9.01-3 (pantalla):** el módulo, `/actividad`, `navegacion.ts` y la entrada de `actividad_listar` en `scripts/guardas/areas-c/paginas-en-la-base.ts`
  (obligatoria: no entró en esta parte porque la guarda exige quién la llame).
- **9.01-4 (pantalla):** el drawer del diff (`?cambio=`), «Ver actividad» en las fichas, `e2e/actividad.spec.ts` y la fila de `docs/UX.md`.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- La fila 9.01 sigue en 4 partes. En la «Partición» de la Fase 9: 9.01-1 hecha (base de lectura: `actividad_diff`, `actividad_listar` con `p_accion`,
  índices, purga y su job); 9.01-2 a 9.01-4 como arriba.
- Arrastrado «Actividad lee el diff por una función que recorta según la cartera»: hecho en la base; se cierra con la 9.01-4.
- Abierto nuevo **9-01b**: en la nube los índices nuevos de `actividad` se crean sin `concurrently` y, con la tabla nunca purgada, bloquean sus
  escrituras mientras se arman; la guía del 9.13 dice purgar a mano antes si la tabla es grande.
