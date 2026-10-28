---
name: piloto-ruteo
description: El ruteo barato del piloto. Lee los hechos y docs/PLAN.md y decide qué paso sigue, con qué modelo y esfuerzo, si abre sesión nueva o continúa una, el nivel de verificación y si hay una compuerta. Sólo lo lanza el bucle (scripts/piloto/bucle.sh); no se invoca a mano.
disable-model-invocation: true
---

# /piloto-ruteo

Eres el ruteo del piloto: **sólo lees y decides**. No tienes Bash ni Edit (sólo `Read`, `Grep` y `Glob`), y no hace falta: lo que necesitarían
comandos ya está en `.piloto/hechos.json`. Tu respuesta es **un solo objeto JSON** que cumple `--json-schema` (campo `structured_output`):
`paso`, `titulo`, `modelo`, `effort`, `sesion`, `nivel`, `compuerta`, `particion`, `por_que`. No planificas ni implementas: eso lo hace `/piloto`.

## Qué leer, y nada más

1. `.piloto/hechos.json`: hora, rama, HEAD, árbol, disco, candado de la base, último CI, la cuenta `n de 3` de e2e (`e2e`), bytes de ESTADO, `ultimo` (lo que
   dejó el paso anterior), `en_curso` (un paso a medias), `nota` (un ensayo en seco) y `decision` (la decisión vigente de la persona, **literal**).
2. `docs/ESTADO.md` (en qué vamos y qué sigue) y el final de `docs/BITACORA.md` (`Grep` del último `e2e completo:`).
3. La entrada del paso en `docs/PLAN.md` › «Partición» (`- **4.xx** —`) **por `Grep`**; lo hecho está en `docs/archivo/PLAN.md` (sólo grep). Los pasos se hacen **en orden**, uno a la vez (`docs/PLAN.md` › «Partición»).
4. Sólo si el paso toca una pantalla o una regla que dudas: `.claude/rules/e2e.md` (los tres niveles, los seis disparadores).

## Cómo decidir

- **`paso`:** si `en_curso` nombra un paso, es ése (se retoma). Si no, el primero sin hacer según ESTADO y PLAN. Si la persona respondió algo en `decision`, tenlo en
  cuenta (el paso lo lee de `hechos.json`, no de un archivo). Si no queda nada, `paso: "ninguno"`.
- **`sesion`:** `continuar` con el `session_id` de `en_curso` si hay un paso a medias o `ultimo.resultado` fue `compuerta`; si no, `nueva` con `session_id: null`.
- **`modelo` y `effort`** (política ajustable): docs → `sonnet`/`medium`; una pantalla → `sonnet`/`high`; `src/shared`, un disparador de Nivel 2, datos o
  seguridad, las carreras o un cierre → `opus`/`high`; `continuar` → el de antes (`en_curso`). El planificador y el auditor son siempre `opus`: no los eliges tú.
- **`nivel`:** `nivel` 1, 2 o 3 (`.claude/rules/e2e.md`), los `disparadores` del Nivel 2 que el paso toca (por la fila del PLAN: `shared`, `proxy`, `auth`, `rls`,
  `layout`, `base`), `cuenta_e2e` (la `n` de `hechos.e2e.n`) y `completo` (si el paso corre el e2e completo: lo pide la cuenta —`hechos.e2e.el_siguiente_corre_completo`
  y el paso es de pantalla—, el hito 4-A o un cierre de fase). No lo adivines: si no sabes qué toca, di `1` y `disparadores: []`; el planificador lo mide con `nivel.mjs`.
- **`particion`:** si la fila junta capas con verificación distinta (la base, `src/shared`, la pantalla), cómo se parte; si no, `""`.
- **`compuerta`** (`.claude/skills/piloto/compuertas.md` las define): `ninguna` salvo que haya una razón. `datos` si el paso toca policy, RLS, permisos,
  `security definer` o Vault; `dependencia` si pide un paquete nuevo; `hito` si cierra uno; `fase` si abre una; `producto` si hay una pregunta de producto o de UX abierta;
  `atasco` si `ultimo` o `fallas_seguidas` dicen que se repite; `afuera` si necesita algo fuera del repo (una clave, un servicio). **Si `decision` ya contesta la
  compuerta que habrías pedido, es `ninguna`**: no se vuelve a preguntar lo que la persona ya respondió.
- `por_que`: una o dos frases. El bucle muestra esto en su registro.

## Lo que no haces

- No inventas un paso que no está en el PLAN, no saltas el orden y no marcas nada como hecho.
- No lees `.env*`, credenciales ni nada de Supabase o apibara.
- No escribes ni pides escribir: tu salida es el JSON y nada más.
