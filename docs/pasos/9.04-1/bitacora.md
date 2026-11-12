## Paso 9.04 · Configuración de leads que quedó (2026-11-12)

**Parte 1 (9.04-1): `leads.campos.gestionar` (9-3).** La migración `leads_campos_gestionar` siembra la clave (orden 215, `aplicado_en` con las cinco `lead_campo_*`), quita `lead_campo_*` del texto de `leads.configurar` y la concede al dueño y a todo rol que tenía `leads.configurar`, con «todos» y sin origen. `lead_campo_crear`, `lead_campo_guardar`, `lead_campo_eliminar`, `lead_campo_mover` y `lead_campo_impacto` se copian de la base sin otro cambio que `assert_permiso('leads.campos.gestionar')`; mantienen firmas, `security definer`, `search_path = ''` y grants. `leads.configurar` sigue para orígenes, tipos de lead y tipos de seguimiento. En el código: `CLAVES_PERMISO` y `seed.sql`; las cinco acciones de campos piden la nueva con su motivo (`MOTIVO_SIN_PERMISO_CAMPOS`); el enlace «Configurar los campos» de `/leads` la sigue. `/configuracion/leads` se abre con cualquiera de las dos: `pestanasPara()` apaga la que no puedes abrir, `PestanasConDesborde` (`shared/ui`) acepta `motivo` por pestaña y lo dice en una línea bajo la barra, y la URL que pide una apagada abre la primera habilitada. La sección «Leads» del hub y la lista de `_shell/navegacion.ts` suman la clave. La persona `configura` de `db:carreras` suma la clave (privatiza un campo en `cartera.mjs`).

Pruebas: tres bloques nuevos en `supabase/tests/configuracion-de-leads.sql`. El primero cruza las dos claves (con sólo `leads.configurar`, las cinco `lead_campo_*` dan 42501 y orígenes, tipos de lead y tipos de seguimiento pasan; con sólo la nueva, al revés). El segundo vuelve a ejecutar la migración sobre roles propios (texto en `_migracion_lcg` de `DATOS_DE_PRUEBA`): quien tenía `leads.configurar` conserva las dos, quien no la tenía no gana nada, y repetirla no suma filas. El tercero es estático (las cinco nombran la nueva y no la vieja, `prosecdef`, sin `execute` para anon ni PUBLIC, la fila del catálogo y el dueño). `permisos-enforcement.sql` ve la clave por su caso genérico, sin excepción. Vitest: `pestanas.test.ts` (`pestanasPara`, `pestanaDe`). `db:probar` 0, `db:carreras` 0, `vitest related` 1431 ✓, e2e dirigidos 146 ✓ (escritorio y celular).

- **9-3 se cierra** con esta parte. El cierre se anota en PLAN cuando cierre el paso o la Fase 9, porque esta sesión no edita PLAN.
- **Partición del 9.04**, para las partes que siguen:
  - **9.04-2:** el rango en la base. `minimo` y `maximo` en `leads_campos` y `origenes_campos`; validación en lead y vehículo con 22023 y `hint`; los `*_guardar` los aceptan y los `*_impacto` cuentan los que quedan fuera.
  - **9.04-3:** el rango en `shared` y en el panel del campo.
  - **9.04-4:** las plantillas en la base: `ajustes_leads`, `embudo_plantilla_guardar`, `portal_mensaje_guardar` y `_embudo_defecto_de()`.
  - **9.04-5:** las plantillas en pantalla, `textoParaWhatsApp()` y el e2e.

  Las precondiciones ya verificadas (V20 a V30) están en el plan de esta parte. 9-2 y los arrastrados de plantillas siguen abiertos.

- `docs/UX.md` › «Leads (config)» dice ahora las dos claves y la pestaña apagada con su motivo.
- Abierto para el pulido de la Fase 9: un `TabsTrigger` deshabilitado no recibe foco, así que el lector de pantalla no anuncia su motivo. La línea visible sí lo dice.
- e2e completo: no (9.04-1, Nivel 2: lo prueba el CI del PR; dirigidos: configuracion-leads, -seguimientos, -seguimientos-casos, -tipos, -tipos-casos, -tipos-recorrido, -origenes, -origenes-casos, -origenes-recorrido, -origen-por-defecto, configuracion-200, interruptor-200, modal-desborde-200)
