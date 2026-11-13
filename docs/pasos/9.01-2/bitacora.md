## 2026-11-12 · Paso 9.01-2: quién escribe la actividad y quién lee su `detalle` (parte 2 de 4)

### Hecho

- `registrar_actividad()` ya no tiene `execute` para `public`, `anon` ni `authenticated`; `service_role` lo conserva. Todas las funciones que la
  llaman son `security definer` (61 en la base y las de 23 migraciones posteriores) y nada de la app ni de edge la llama por RPC. Cierra la deuda
  aceptada: con sesión se podían dejar filas con `antes`/`despues` inventados que `actividad_diff` mostraría como un cambio real.
- `actividad.detalle` ya no se lee como `anon` ni `authenticated` (revoke de columna; los demás grants de columna siguen). Lleva teléfonos
  enmascarados (`lead.telefono_*`), el código del portal (`portal.*`) y montos (`pago.*`); lo leen sólo funciones definer y `service_role`.
- Prueba: `supabase/tests/areas/actividad/registrar.sql` (T1 privilegio y 42501 con sesión; T2 ninguna invocadora la llama, por
  `pg_get_functiondef`; T3 la cabecera sí y `detalle` no; T4 el detector ve una sonda plpgsql y una `begin atomic`).
- El rango trae SQL de seguridad (`grant`/`revoke`): sólo quita privilegios; lo detecta `publicar.sh` y lo aprueba el piloto solo.

### Verificación

- `pnpm db:probar` completo: salida 0, 1236 pruebas ✓ (sin contar las cabeceras de archivo), 0 ✗. Mutaciones (sin revocar a authenticated, sin el revoke de `detalle`, detector por
  `prosrc`): caen T1, T3 y T4. `vitest run scripts/guardas`: 1143 en verde. `database.types.ts` sin cambios.
- e2e completo: no (9.01-2, Nivel 1: sin e2e completo, lo prueba el CI del PR; dirigidos: ninguno, sin texto de interfaz)

### Lo que sigue (9.01 queda abierto)

- **9.01-3 (pantalla):** el módulo, `/actividad`, `navegacion.ts` y la entrada de `actividad_listar` en `scripts/guardas/areas-c/paginas-en-la-base.ts`.
- **9.01-4 (pantalla):** el drawer del diff (`?cambio=`), «Ver actividad» en las fichas, `e2e/actividad.spec.ts` y la fila de `docs/UX.md`.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- En la «Partición» de la Fase 9: 9.01-2 hecha (sin `execute` de `registrar_actividad()` para la app y sin `select (detalle)` de `actividad` para
  `authenticated`).
- La nota de riesgos de la fase («`actividad.detalle` no está recortado…») queda resuelta; también la deuda aceptada de `registrar_actividad()`.
