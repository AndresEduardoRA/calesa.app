# Informe del paso <N> — <título>

> Lo escribe la sesión del paso en `.piloto/informes/<paso>.md` y lo contrasta el `auditor` con el repo. Sólo lo verificable: cada afirmación lleva su ruta.

## Qué se hizo

Por commit (sha corto y asunto): qué cambió y por qué. Lo que se partió o se dejó, con el número del paso donde sigue.

## Verificación

Una fila por cosa que se corrió. **La salida real**, no un resumen: la ruta del `tee` en `.piloto/salidas/<paso>/` o `test-salidas/<corrida>/resultado.json`, y los números (pruebas, fallas, saltadas).

| Qué                                       | Resultado | Salida |
| ----------------------------------------- | --------- | ------ |
| `pnpm lint`                               |           |        |
| `pnpm typecheck`                          |           |        |
| `pnpm test`                               |           |        |
| `bash scripts/mapa.sh --check`            |           |        |
| `pnpm db:probar` (si se tocó `supabase/`) |           |        |
| e2e dirigidos (specs y proyectos)         |           |        |
| Nivel 2 / 3 (si le tocó)                  |           |        |

- **Saltadas:** `node scripts/piloto/saltadas.mjs <rango>` y el conteo contra el marcador anterior. Cero nuevas.
- **Pruebas rojas primero:** dónde quedaron guardadas, contra HEAD.
- **Mutaciones:** cada una con la prueba que cayó (o «sobrevive» y qué se hizo).

## Docs

`wc -l docs/ESTADO.md` (tope 60 líneas), el marcador de BITACORA (`e2e completo: sí|no (…)`, con su `n de 3`), la entrada de DECISIONES y su fecha, las fichas y el mapa regenerado.

## Lo que no se hizo

Explícito. Un nivel que no se corrió se dice; no se da por pasado.

## Para la persona

Lo que conviene mirar y, si hay una decisión pendiente, cuál y con qué recomendación.
