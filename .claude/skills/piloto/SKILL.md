---
name: piloto
description: Un paso de docs/PLAN.md de importadora, de punta a punta en una sesión (plan por el planificador, auditoría en contexto aparte, ejecución, informe y commits sin push). Sólo lo lanza el bucle del piloto (`claude -p "/piloto <paso>"`); no se invoca a mano.
argument-hint: '<paso> [continuar] [--hasta-plan] [--en-seco]'
disable-model-invocation: true
---

# /piloto $ARGUMENTS

Eres la sesión de **un** paso. El bucle (`scripts/piloto/bucle.sh`, bash, sin modelo) te lanzó con `claude -p`; nadie te contesta en vivo. Lo que necesites decidir
que no sea tuyo se lo pides al bucle por `.piloto/ultimo.json` (una **compuerta**), no por una pregunta: aquí no hay `AskUserQuestion`. `$ARGUMENTS`:
el número del paso y, opcionales, `continuar` (retomas esta sesión tras una compuerta o un fallo), `--hasta-plan` (te detienes cuando el plan está auditado) y
`--en-seco` (planificas y auditas, y no ejecutas nada).

## Reglas que no se negocian

- **No publicas.** Nada de `git push`, PR, `gh` que escriba ni `claude`: el hook `bloquear-peligrosos.sh` lo rechaza con `PILOTO=1`, y es el bucle el que verifica y empuja
  (en bash, con su propia copia de las piezas). Tus commits quedan locales.
- **Lo que autoriza no es tuyo:** no escribes ni nombras `<carpeta común de git>/piloto/**` (la compuerta, la decisión, los `aprobado-<paso>`) ni
  `.piloto/decision.md` (`guardar-autorizaciones.sh` lo bloquea). La decisión vigente de la persona la lees de `.piloto/hechos.json` › `decision`.
- La base local y el servidor de e2e son de una sola sesión a la vez: `db:*` y `test:e2e*` toman el candado (`scripts/candado.sh`, `hechos.json` › `candado` dice quién lo tiene). Si está
  ocupado, espera con `CANDADO_ESPERA=<segundos>` o pide una compuerta `afuera`. Nunca lo saltes (`bloquear-peligrosos.sh` lo rechaza).
- Sigues `CLAUDE.md` y las reglas de `.claude/rules/`. Un número de dinero va por `<Monto>`; los nombres salen de la base; ninguna tabla sin RLS. «Nadie prueba a mano».
- Nunca `--no-verify`, nunca desactivar una regla de lint, nunca la clave real de apibara ni una credencial. No instalas ni cambias dependencias (compuerta `dependencia`).
- Una sola fase de `docs/PLAN.md`: tu paso. Nada de paso de más.
- **Un subagente se invoca con `run_in_background: false`** y recibes su informe en este mismo turno: no termines el turno esperándolo, porque en `-p` nadie te
  reanima (4.14-2, 2026-10-29: sin ese parámetro corrió en segundo plano, el turno terminó con «Espero al planificador.» y costó ≈10 min y 4 USD).

## El camino

1. **Orientarte** (poco): `.piloto/hechos.json`, `docs/ESTADO.md`, y con `continuar`, `.piloto/planes/<paso>.md` y `.piloto/informes/<paso>.md` si existen.
   **Si existe `.piloto/aparcados/<paso>.md`** (el paso del plan, sin el sufijo de la parte), este paso ya se intentó y quedó aparcado: léela antes que
   nada. Dice por qué no cerró, en qué quedó la rama y si hay un stash con trabajo a medias. No repitas lo mismo: achica el paso (una parte que cierre con
   `parcial: true`) o cambia de enfoque; si lo que falta no depende de ti (una clave, un servicio de afuera), déjalo hecho hasta donde se pueda con un
   adaptador y su prueba de contrato, y dilo en el resumen.
   **Si existe `.piloto/conflicto-con-main.md`, eso va primero:** tu rama choca con `origin/main` en código (los choques de `docs/` el bucle ya los unió) y
   el PR no se integra hasta resolverlo. `git merge origin/main`, resuelve lo que lista, commit de merge con el mensaje por omisión (no va en `commits` de
   `ultimo.json`), y sigue con el paso. Si la nota dice que falta **regenerar los tipos de la base**, main ya está unido: haz lo que dice
   (`pnpm db:reset`, `pnpm db:types` y su commit) y bórrala.
2. **Planificar.** Si es una parte que sigue (`<paso>-2`, `-3`…), dale al planificador la ruta del plan y del informe de la parte anterior: parte de ahí y no se orienta
   de cero. Invoca al subagente `planificador`: orienta, parte si hace falta y escribe `.piloto/planes/<paso>.md` con
   [plantilla-plan.md](plantilla-plan.md). No escribes tú el plan: el planificador es el único que lo hace, y su Bash es de sólo lectura. Corre en opus,
   salvo en un paso que el ruteo mandó con `modelo: sonnet` (el de pantalla; lo dice `.piloto/ruteo.json`): ahí pásale `model: "sonnet"`. Del 5 al 7 de
   noviembre, en esos pasos opus se llevaba 184 de 266 USD planificando y auditando, más que ejecutar. El auditor sigue siempre en opus.
3. **Auditar el plan, una sola vez y sólo en un paso de datos o dinero** (`.claude/rules/e2e.md` › «Pulido y rigor por tipo de paso», la persona, 2026-11-08).
   Un paso `verde` o `ambar` sin datos ni permisos nuevos (el riesgo está en `.piloto/asignado.json` › `riesgo`; sin él, mira si el plan toca policy, RLS,
   permisos, `security definer`, migraciones o dinero) **no se audita**: del plan pasas a ejecutar. En los demás, invoca al subagente `auditor` (opus, en un
   contexto aparte). Su primera línea es `VEREDICTO: pasa|observaciones|bloquea`. `observaciones`: las atiendes en el plan y sigues. **`bloquea`: no hay 2.ª
   ronda.** Corrige tú las objeciones en el plan con `Edit` (contéstalas en `.piloto/planes/<paso>.respuestas.md`) y ejecuta; si alguna no la puedes resolver
   sin rediseñar, **achica el paso, sin preguntar**: esta parte lleva lo que el auditor no objeta y termina con `parcial: true`; lo bloqueado, con sus objeciones
   copiadas tal cual, pasa a la parte siguiente, que se planea de cero en su propia sesión. Sólo si no queda nada sin objetar es una compuerta `atasco`. El plan
   pesa ≤ 60 KB (`wc -c`).
4. **Compuertas del plan** ([compuertas.md](compuertas.md)): si el plan toca datos o seguridad (policy, RLS, permiso, `security definer`, Vault), pide una dependencia
   nueva o deja una pregunta de producto o de UX abierta → termina con `resultado: compuerta` (ver «Terminar»). Con `--hasta-plan`, tras auditar el plan terminas
   **siempre** con una compuerta `datos` que lleve el plan en su `contexto`: la persona lo ve antes de que se ejecute. **Sin compuertas** (lo de hoy: `PILOTO_AUTO`
   con `todo`; el bucle ya no pasa `--hasta-plan`) nadie va a contestar: una compuerta se responde sola con su **primera opción**, así que la primera es siempre la que
   deja seguir con tu recomendación, y sólo pones «parar» primero si de verdad el paso no puede seguir (entonces el bucle lo aparca y el carril toma otro). Una duda
   de producto la decides tú con la recomendada del plan y la anotas en `docs/pasos/<paso>/decisiones.md`; no hace falta una compuerta para eso. Si el plan corre el completo en local (sólo un paso con `cierre: true` en `.piloto/asignado.json`)
   y `hechos.json` › `funciones` no las tiene todas en `true`, compuerta `afuera` antes de ejecutar («faltan las funciones edge (…): `pnpm funciones`»): el
   completo las exige y el bucle no las levanta. El bucle ya lo mira por el nivel del ruteo; esto cubre el plan que sube de nivel.
5. **Ejecutar y verificar** (Nivel 1, 2 o 3 de `.claude/rules/e2e.md`, el que dice el plan): primero las pruebas, **sólo las clave** (`.claude/rules/e2e.md` ›
   «Pulido y rigor por tipo de paso»: dinero, fórmula, permisos, RLS, carreras donde hay candados, un e2e del camino feliz por pantalla); se escriben antes que el
   código, sin guardar su salida en rojo. Mutaciones sólo en el motor de la fórmula y el dinero; nada de sondas de medición, volumen de interfaz ni capturas. Cada salida va a `.piloto/salidas/<paso>/` con `tee`; las corridas largas con
   `nohup … ; echo $? > <algo>.fin` y una espera de primer plano. **Antes de una corrida pesada** (e2e, mediciones, carreras) espera, en un bucle de primer plano
   de ≤ 9 minutos, a que no haya procesos pesados **en este mismo árbol** (`playwright`, `next build`, `vitest`, `carreras`, `medir`, `supabase db|start`) y a que `loadavg` sea menor que
   los núcleos (`nproc`). Los otros carriles tienen su árbol y su base: esperar a que la máquina quede ociosa con tres carriles no termina nunca (con `loadavg` < 1,5 cada parte perdía
   sus 9 minutos, 2026-11-06). **La base, dos veces por parte y no una por commit:** `pnpm db:reset`, `pnpm db:types` y `pnpm db:probar` antes del primer commit de SQL y, si después cambió algo de
   `supabase/`, `pnpm db:probar` otra vez antes del informe. Con `PILOTO=1` el hook del commit ya no corre `probar-schema` (eran ≈ 4 min por commit): que `db:probar` esté
   en verde antes de commitear es tuyo, no del hook. **Qué no se corre en local** (`.claude/rules/e2e.md`, Nivel 1): `lint` y `typecheck` los corre el hook del commit; la suite entera de vitest, el hook de
   Stop al cerrar el paso (en el paso, sólo `pnpm exec vitest related --run <archivos>` y `scripts/guardas`); el e2e completo, el CI del PR, salvo en un cierre de fase (`cierre: true` en `.piloto/asignado.json`).
6. **Informe** en `.piloto/informes/<paso>.md` ([plantilla-informe.md](plantilla-informe.md)): qué se hizo, la salida real de cada prueba (con su ruta), lo que no se hizo.
7. **Auditar el informe**, sólo si el paso toca RLS, permisos, `security definer` o dinero (si no, se salta: verifica el bucle y el CI). Mismo `auditor`: si bloquea, corriges con un `fix` y sigues; un segundo bloqueo es una compuerta `atasco`.
8. **Docs y commits.** **Con `asignado` en `hechos.json` (un carril con coordinador) no edites `docs/ESTADO.md`, `PLAN.md`, `BITACORA.md` ni `DECISIONES.md`** (los editarían todos los carriles a la vez): escribe lo mismo en `docs/pasos/<paso>/` (`bitacora.md`, con el marcador `e2e completo: …`, y `decisiones.md`); el carril `a` los pasa con `node scripts/coordinador/consolidar-docs.mjs` antes de su commit de docs, y el `ESTADO` lo lleva el carril `a`. Sin `asignado`: los docs que dice el plan (ESTADO por sustitución, ≤ 60 líneas medido con `wc -l`; BITACORA con el marcador `e2e completo: sí|no (…)`; DECISIONES con
   la fecha de `TZ=America/La_Paz date +%F`; fichas; `bash scripts/mapa.sh`). **Commits por intención**, asunto en español, minúscula, ≤ 72 caracteres, mensaje con `-F`, `mapa.sh`
   antes: **hasta 6 de código y el de docs** (menos partes son menos ciclos de plan, PR y CI; si el plan necesitaba más, el paso se parte); el `fix` que pida la auditoría del informe va aparte y no cuenta.
   **Sin push.** Verifica con `git log` que existen.
9. **Terminar.** Escribe `.piloto/ultimo.json` (abajo) y responde con una línea. El bucle lo valida con `jq`; un `ultimo.json` que falte o no valide es un fallo del proceso.

## El paso especial `ci-fix`

Si `$ARGUMENTS` es `ci-fix`, **no hay fila en `docs/PLAN.md`, ni planificador, ni auditor**: el bucle junta los CI rojos y manda arreglarlos (`.piloto/ci-rojos.md`, y `hechos.json` › `ci_rojos`). Camino corto:

1. Lee `.piloto/ci-rojos.md`. Por cada corrida, `gh run view <id> --log-failed | tail -n 200 > .piloto/salidas/ci-fix/<id>.log` (sólo lectura: nada de `gh` que escriba, ni `gh run rerun`).
2. Encuentra la **causa**, no el síntoma: la prueba o el job que cayó, el commit que lo rompió (`git log` del rango). Un test inestable no se arregla con un reintento ni quitándolo: se hace determinista o se dice en `falla`.
3. Reprodúcelo **sólo lo que cayó** (un archivo de vitest, un spec de e2e, un job) y arréglalo. No corras la suite entera: el CI lo vuelve a correr.
4. Uno o dos commits `fix(<scope>): …` en el estilo de siempre, `mapa.sh` antes, sin push. Docs sólo si la corrección cambia una regla.
5. `ultimo.json` con `paso: "ci-fix"`; `listo` si arreglaste todos los rojos anotados, `falla` si no pudiste (di cuál y por qué). Si el rojo es de la base (RLS, grants, advisors) o de un secreto, compuerta `datos` o `afuera`.

## El paso especial `pedido-<n>`

Si `$ARGUMENTS` es `pedido-<n>`, otro carril está **parado esperándote**: necesita algo de lo que tu carril posee (un registro de una guarda, una prueba tuya que
dé por vacío lo que él llena, un archivo de `src/app`). Tampoco hay fila en `docs/PLAN.md`, ni planificador, ni auditor. Lo pedido está en `.piloto/asignado.json` ›
`pedido` (`de`, `paso`, `texto`, `archivos`). Camino corto: haz **sólo eso**, con su prueba (una guarda o una prueba del núcleo **simula** lo del otro carril, no lee
sus archivos reales), `mapa.sh`, uno o dos commits `fix(<scope>)` o `chore(<scope>)`, sin push, y `ultimo.json` con `paso: "pedido-<n>"` y `listo`. Si toca datos
o seguridad, compuerta `datos` como en cualquier paso. Si no se puede (no es tuyo, o rompe algo), `falla` con el porqué: el otro carril lo verá.

## Cuando necesitas algo de otro carril: compuerta `espera`

**Lo del núcleo lo haces tú, en tu PR** (2026-11-08): si eres B o C y te falta algo de lo que posee el carril A (un registro de una guarda, una línea en
`src/app`, una prueba del núcleo, un archivo de `src/shared`), lo agregas o lo editas tú mismo, chico y con su prueba, en un commit propio de tu paso: la guarda
de carriles te deja agregar y editar lo del base (no borrarlo) y el coordinador integra tu PR. No esperas al A. Sólo pides `espera` por lo de **otro carril
no base** (el `dueno_de` de B o de C), por una migración de un dominio que no es tuyo, o por un borrado en el núcleo.

Si lo que te falta no es tuyo (está en el `dueno_de` de otro carril no base en `docs/plan.yaml`), **no** pidas una `afuera` ni ofrezcas
opciones que el bucle no sabe cumplir («seguir mientras…»): termina con `resultado: compuerta` y una compuerta `espera` con `pedido` (qué archivo, qué cambio y por qué,
para que su dueño lo haga sin preguntarte) y `archivos` (**obligatorio**: las rutas que tienen que crearse o cambiar en `origin/main`). El bucle se lo pide al carril
dueño, espera a que **todos** esos archivos cambien en `main` (o a que el dueño cierre el pedido), lo trae a tu rama y te retoma con `continuar`; la respuesta dice qué
trajo. Si al retomar todavía no está, pide otra `espera` (hasta 3 por paso; después lo mira la persona).
Antes de pedirla, deja tu trabajo en un commit o el árbol limpio: traer `main` con cambios sin commitear puede fallar.

## `.piloto/ultimo.json`

```json
{
  "paso": "<el mismo paso>",
  "resultado": "listo | compuerta | falla",
  "resumen": "qué se hizo o qué pasó, en pocas frases",
  "commits": ["<sha>", "…"],
  "e2e_dirigidos": ["e2e/<spec>.spec.ts"],
  "parcial": false,
  "compuerta": null
}
```

- **`listo`:** los commits son **todos** los de esta sesión (`git rev-list --no-merges <HEAD de arranque>..HEAD`, ni uno más; los de partes anteriores del paso, ya publicadas, no) y el árbol está limpio. `e2e_dirigidos`: los specs que tocan lo que cambiaste (grepea `e2e/` por el texto tocado); el bucle los repite.
- **`parcial`** (sólo en un carril, con `listo`): `true` si el paso se partió y este «listo» es una de sus partes (el 4.20-2b de un 4.20 que sigue). El paso sigue asignado al carril y la
  vuelta siguiente retoma su rama; con `false` (o sin el campo), el coordinador lo da por terminado cuando se integre su PR y el carril pasa al siguiente. Escribirlo
  en el resumen («este PR no marca integrado…») no alcanza: el bucle sólo mira el campo.
- **`compuerta`:** `compuerta` es `{ "tipo", "motivo", "pregunta", "opciones": [{ "etiqueta", "descripcion" }, …], "contexto": ["<ruta>", …] }`; de **2 a 4 opciones, la recomendada primero**; `contexto` lleva las
  rutas que la persona puede abrir (el plan, el informe). Te retoman con `continuar`: la respuesta literal está en `hechos.json` › `decision`.
  La de **`producto`** lleva, en vez de `pregunta` y `opciones`, **una pregunta por decisión** abierta del plan, en su orden, en `preguntas`: cada una
  `{ "id": "P0", "pregunta", "opciones" }` (de 1 a 12 preguntas; `id` de ≤ 12 caracteres y sin repetir; de 2 a 4 opciones cada una, la recomendada primero). La persona las
  contesta en tandas de 4 y la respuesta trae una línea `- P0: …` por decisión.
- **`falla`:** lo que no pudiste y por qué (una prueba que no se pone verde, el entorno). No inventes un `listo`.

Con `--en-seco`: planificador y auditor y nada más (el bucle te lo limita por permisos, no por obediencia): imprime el plan, el veredicto y, como sonda, haz que el auditor corra
`touch .piloto/sonda` —su hook de sólo lectura tiene que rechazarlo— y di qué pasó.
