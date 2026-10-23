-- validar_formula() y sus ayudantes pasan de IMMUTABLE a STABLE (paso 4.05, prompt 4).
-- IMMUTABLE era falso: arman sus mensajes con format() y `||`, que son STABLE, y `_formula_rechazar` lanza el rechazo. Con
-- argumentos constantes, el planificador evalúa una función IMMUTABLE al planificar: `pnpm db:lint` (plpgsql_check) planifica cada
-- sentencia sin ejecutarla y saltaba el rechazo de `grupos_sin_total_en`, que no lleva variables. La migración …004900 ya está
-- commiteada y no se edita (docs/DECISIONES.md, 2026-10-15): el cambio va acá.
alter function public._formula_rechazar(text, text, text) stable;
alter function public._formula_forma_nodo(jsonb) stable;
alter function public._formula_forma(jsonb, jsonb) stable;
alter function public._formula_cambio_y_grupos(jsonb, jsonb, text[], text[], text[], integer, jsonb, jsonb, jsonb) stable;
alter function public._formula_variante(jsonb, text[], text[]) stable;
alter function public.validar_formula(jsonb, jsonb) stable;
