# Carril B — notas

El carril B (`docs/ORCA.md`) no edita `docs/ESTADO.md`, `docs/PLAN.md`, `docs/DECISIONES.md` ni `docs/BITACORA.md`: lo que iría
allí se anota aquí, y el carril A (o la persona, al integrar) lo pasa a su lugar. Lo hace cumplir la guarda de CI
`scripts/guardas/carriles.mjs`.

Cada entrada: `## AAAA-MM-DD — <tema>` (fecha de `TZ=America/La_Paz date +%F`) y debajo, en listas cortas:

- **Hecho:** lo que quedó en la rama, con el PR.
- **Para ESTADO / PLAN:** lo que el carril A tiene que reflejar (un abierto nuevo, una fila cerrada, un dato de la fase).
- **Para DECISIONES:** la decisión no obvia, en una línea, con su motivo.
- **Bitácora:** el nivel corrido (`e2e completo: sí|no (<tarea>)`) y lo medido.
- **Necesita del carril A:** una migración de un dominio compartido, un cambio en `src/shared` u otra cosa fuera de los dominios de B
  (agenda, chat, notificaciones, buscador, web). B no la hace: la describe aquí y sigue con otra cosa.

## Entradas

(Todavía ninguna.)
