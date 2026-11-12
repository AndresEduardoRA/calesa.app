## 2026-11-12 — Paso 9.04-4: las plantillas por empresa en la base

- **Sin permiso nuevo:** las plantillas las edita quien tiene `leads.configurar` (duda 2 del PLAN, la recomendada). Su descripción y su `aplicado_en` las nombran, en la migración y en `seed.sql`.
- **Dos versiones, no una:** `embudo_actualizado_en` y `portal_actualizado_en` en vez del `actualizado_en` único del PLAN. Son dos secciones de pantalla independientes; con una sola, guardar una daría PT409 en la otra sin que nadie la tocara. Reversible.
- **Null restablece la de fábrica** (el «Restablecer» de 9.04-5); un mensaje en blanco cuenta como null.
- **Las seis etapas de fábrica pasan a `_embudo_etapas_de_fabrica()`** y `ajustes_leads_leer()` las entrega: la pantalla no las copia en TS. El texto de fábrica del portal sigue en `textoParaWhatsApp()`, como dice el PLAN.
- **El mensaje:** tope de 1000 caracteres; una variable desconocida `{x}` se rechaza (que una errata no salga literal al cliente); toda `{…}` cuenta como variable (`{Codigo}` o `{ codigo }` se rechazan); `{codigo}` y `{clave}` obligatorias, `{direccion}` opcional (sin dirección, 9.04-5 pone «la web de <empresa>»).
- **La plantilla no guarda ids de etapa** (cada embudo nuevo crea los suyos), descarta las claves que sobran y los booleanos son estrictos (22023, no 22P02); un `null` de JSON cuenta como ausente (`false`), como en `_embudo_insertar`.
- **Orden:** permiso → validación → candado y versión → sin cambios. Sin cambios devuelve la versión vigente sin moverla, como `web_ajustes_guardar`.
- **Sin carrera nueva:** la fila se bloquea con `for update` y la versión da PT409, y eso lo cubre el SQL. `pnpm db:carreras` corrió entero por regresión de `_embudo_defecto_de`.
- **La lectura es de toda cuenta activa**, como `ajustes_web`: no hay secretos y el texto lo necesita quien otorga el portal sin `leads.configurar`.
- **Sin `actualizado_por`:** `trg_auditar` ya guarda quién y qué en `actividad`.
- **`_embudo_plantilla_normalizar` y `_embudo_etapas_de_fabrica` son STABLE, no IMMUTABLE:** `jsonb_build_object` es STABLE y `db:lint` lo avisa (`_portal_mensaje_normalizar` sigue IMMUTABLE).
- **`embudo_plantilla_guardar` entra a la matriz de leads** (la guarda por nombre `^(oportunidad|embudo)_` de `auditoria-leads.sql`): las 8 personas dan 42501 o «cuenta»; el camino que pasa está en `areas/plantillas/plantillas.sql`. No se renombró la RPC (el PLAN la nombra así).
