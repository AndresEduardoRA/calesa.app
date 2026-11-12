# 9.09 · higiene del e2e, del CI y de los entornos (partes 1 y 3)

- **Partición.** El paso entero no cabe en un PR: 9.09 lleva la parte 1 (9-8) y la 3 (9-11, 9-4, 9-5, 9-6); 9.09-2 lleva 9-9 y 9-10 (sólo
  specs de e2e, Nivel 1); 9.09-3 lleva 4-41 (`env:check produccion`, toca `src/shared/config/esquemas.ts`, Nivel 2). Para `docs/PLAN.md`:
  la fila 9.09 queda «hecha la parte 1 (9-8) y la 3 (9-11; 9-4 y 9-5 cerrados como decididos; 9-6 abierto)»; 9-9, 9-10 y 4-41 se cierran
  en su paso. 9.09-3 no puede correr a la vez que la Fase 7 (7-1 también edita `esquemas.ts`) ni que el 9.13.
- **9-8: no se renombra la clave real.** El plan la apartaba renombrándola; medido en la base local, `postgres` sólo tiene `select`,
  `delete`, `truncate` y `references` sobre `vault.secrets` (no `update`), y `vault.update_secret()` mueve `updated_at`, de modo que la
  huella `id|updated_at|md5` no volvería. Una clave borrada tampoco vuelve con su id. Se aplica la salida prevista (D1b): con una clave
  real, la prueba que escribe la clave se salta (`test.skip`) y la huella se afirma igual; sin ella, el spec quita lo que dejó. Sigue la
  regla de `asegurarClaveDeRelleno()`: nunca pisa una clave que exista.
- **9-11: el rojo provocado en un dispatch es de la persona.** Una sesión no puede disparar un workflow a mano (el hook lo rechaza): se
  demostró con el guion en local (cinco archivos con contenido) y con la guarda y sus mutaciones. `volcar-base.sh` nunca sale con error y
  cada volcado es independiente. El artefacto vive 14 días y el repo es público: el log de la base y `pg_stat_statements` (consultas
  normalizadas, sin literales) no llevan claves; los datos del e2e son de prueba, como los del `funciones.log` que ya se sube.
- **9-4 y 9-5: cerrados como decididos.** Quedan fuera de CI (`FUERA_DE_CI` en `scripts/guardas/workflows.ts` ya lo vigila): sin runner
  dedicado ni cuenta de cinco corridas. **9-6 sigue abierto con la persona** (cuenta 3 de 5; faltan dos corridas manuales).
- **La guarda nueva va aparte** (`workflows-fallo.ts`): `workflows.ts` (298 líneas) y su test (338) no crecen.
- Sin dependencias nuevas en ninguna parte.
