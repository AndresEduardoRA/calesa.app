# El piloto

> Avanza `docs/PLAN.md` **un paso por sesión nueva de `claude -p`**, con un bucle en bash que no es un modelo. Sólo le pregunta a la persona en las **compuertas**, al celular, por una sesión corta con Remote
> Control. Nada de una sesión larga que arrastre contexto, ni `/goal`. Diseño de la persona (2026-10-26): ruteo barato (Sonnet) → paso (el plan lo hace Opus; el auditor lee en un contexto aparte) → compuerta →
> registro de consumo por llamada. **El modelo nunca publica**: el bucle verifica por su cuenta y empuja. **Lo que autoriza** (decisiones y aprobados) **queda fuera del alcance de las sesiones que trabajan.**

## Requisitos, una sola vez

- **Claude Code** con `claude` accesible: `CLAUDE_BIN`, o el del `PATH`, o el más nuevo de la extensión de VS Code (`~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude`; la ruta cambia con cada versión).
  `--permission-prompts none` pide ≥ 2.1.259.
- `tmux`, `flock`, `jq`, `node` y `gh` (con `gh auth login`: sin él el CI no se puede mirar y `publicar.sh` no espera al anterior).
- **Remote Control** aceptado en la cuenta, y en el celular `/config` › «Push when actions required» (permisos y preguntas) y «Push when Claude decides»: sin eso la pregunta de una compuerta no llega.
- **La carpeta confiada.** Medido en el ensayo: `claude -p` en una carpeta sin confiar imprime «Ignoring 13 permissions.allow entries from .claude/settings.json: this workspace has not been trusted» y no aplica los hooks del frontmatter de los agentes. Los hooks de `settings.json` **sí** corren (también dentro de los
  subagentes), y por eso la sola lectura del auditor y del planificador no depende de la confianza (`por-agente.sh`); pero las `permissions.allow` se ignoran, y un paso en `--permission-mode auto` queda en manos del clasificador. Para que valgan: abrir `claude` una vez, interactivo, en la carpeta y aceptar el diálogo, o
  `projects["<ruta del repo principal>"].hasTrustDialogAccepted: true` en `~/.claude.json` (la ruta del mensaje es la del repo principal, no la del worktree). Es una decisión de la persona; el piloto no la toma.
- **Disco:** el bucle para si pasa de `PILOTO_DISCO_MAX` (90 % por defecto). Con 94 % hay que liberar espacio o arrancar con `PILOTO_DISCO_MAX=95`; el ensayo en seco sólo avisa.
- **Las funciones edge, para un paso de Nivel 2.** El bucle no las levanta. Un paso de Nivel 2 corre `pnpm test:e2e:completo`, y `scripts/e2e-completo.mjs` exige `apibara` y `storage-gc` y no lee `E2E_SIN_FUNCIONES`; después su `test:e2e` pasa por la guardia, que pide las tres. Antes de arrancar
  el piloto para un paso así (el 4.13-3c), `pnpm funciones` en otra terminal. Los e2e dirigidos de `verificar.sh` no las piden (el cierre, abajo). Si faltan, **el bucle avisa antes de
  lanzar el paso** (CAL-1): `hechos.sh` mira las tres con `OPTIONS` (la regla de la guardia) en el stack local (`PILOTO_SUPABASE_URL`, por defecto la API del 54621), y un ruteo de Nivel 2 o con el
  completo sin todas servidas es una parada con «reintentar» (vuelve a mirar). El paso pide además una compuerta `afuera` si su plan sube a Nivel 2 sin ellas. No las levanta el bucle: sería un
  proceso largo con contenedores que habría que cerrar en `PARAR`, en `parar.sh --ya` y tras un reinicio, el runtime es uno por stack y lo comparten los worktrees, y `serve` carga el entorno de
  las funciones, que el bucle no toca.
- **El piloto es el carril A** (`docs/ORCA.md`): corre en el worktree del carril, con su stack (`scripts/worktree/preparar.sh a`), sobre una rama `a/…`, y publica esa rama con su PR contra `main`; nunca empuja `main` ni integra (lo hace la persona). El carril B no usa el piloto.

## Arrancar, parar, retomar

| Qué                            | Comando                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arrancar (o re-arrancar)       | `bash scripts/piloto/arrancar.sh [--hasta <paso>]`                                                                                                                 |
| Ver el bucle                   | `tmux attach -t piloto-bucle` (el registro: `.piloto/registro.md`, el gasto: `.piloto/consumo.csv`)                                                                |
| Parar entre pasos              | `bash scripts/piloto/parar.sh` (o «para» a la sesión `piloto · control`, o «parar» en cualquier compuerta)                                                         |
| Parar ya                       | `bash scripts/piloto/parar.sh --ya` (además `kill -INT` al paso en curso: cierra su turno)                                                                         |
| Quitar la parada               | `rm .piloto/PARAR` y `arrancar.sh`                                                                                                                                 |
| Retomar tras un reinicio       | `bash scripts/piloto/arrancar.sh`: un paso a medias se retoma con `--resume` de **su** sesión, nunca con una nueva                                                 |
| Ensayo en seco                 | `bash scripts/piloto/arrancar.sh --en-seco --nota <archivo>`: un ruteo real y el paso sin ejecutar nada (planificador y auditor), por permisos y no por obediencia |
| Probar el circuito del celular | `bash scripts/piloto/decidir.sh --prueba` (una compuerta de mentira); `--prueba-tandas`, otra con 5 preguntas en dos tandas, como la de producto                   |

`arrancar.sh` **copia** `scripts/piloto/` (sin pruebas) **de `origin/main`** a `<carpeta común de git>/piloto/bin/` (`copiar-bin.sh`), anota un sha256 por archivo en `bin.sha256` y de dónde salió en
`bin.origen`, y lanza ESA copia. El bucle llama siempre a las piezas de la copia, nunca a las de `scripts/piloto/`: un paso no puede cambiar el código con que se lo verifica y publica. La copia es común a los
carriles y sale de lo integrado, no de la rama de cada uno (FLUJO-1: la de un carril atrasado pisaba la de los otros). Si un paso toca `scripts/piloto/`, la compuerta «guardas» lo pregunta y, aprobada, el cierre
sigue: el cambio rige cuando se integre, y entonces **cada bucle se relanza solo** con la copia nueva, entre pasos (`copia_al_dia`). Ya no hay que re-arrancar a mano.

## El bucle, vuelta por vuelta (`scripts/piloto/bucle.sh`)

0. Sin un paso vivo, si `origin/main:scripts/piloto` ya no es el de `bin.origen`, rehace la copia y se relanza con ella (`exec`, mismas opciones). Después, la copia coincide con `bin.sha256` (y no hay archivos de
   más): si no, aviso antes de rutear.
1. **Hechos, sin modelo** (`hechos.sh` → `.piloto/hechos.json`): hora de La Paz, rama, HEAD, árbol, disco, candado, último CI, la cuenta `n de 3` de e2e, bytes de ESTADO, `ultimo.json`, `en-curso.json`, fallas seguidas, la nota del ensayo, las funciones edge servidas (`funciones`) y el texto de la decisión vigente.
2. **Paradas deterministas:** `.piloto/PARAR`, rama que no es `a/…`, árbol sucio sin un paso en curso, disco, y del CI sólo la base en rojo o demasiados rojos juntos (`ci.sh`; un CI rojo común no para, se anota). Cada una es un aviso; «sigo» la ignora una vez.
3. **Ruteo** (`/piloto-ruteo`, Sonnet, esfuerzo bajo, sólo `Read`/`Grep`/`Glob`): `paso`, `titulo`, `modelo`, `effort`, `sesion`, `nivel`, `compuerta`, `particion`, `por_que` (`ruteo.schema.json`). Política de modelos: docs → sonnet/medium; pantalla → sonnet/high; `src/shared`,
   un disparador de Nivel 2, datos o seguridad, carreras o cierre → opus/high; `continuar` → el de antes. El auditor, siempre opus; el planificador, sonnet en un paso de sonnet (pantalla) y opus en lo demás (2026-11-07: en los pasos de sonnet, opus se llevaba 184 de 266 USD).
4. **Lo que el bucle no deja al modelo:** la puerta de fase (el paso 4.18 o 4.28, o abrir una fase) ya no la decide la persona sino el CI en verde (abajo); un paso de Nivel 2 (o con el completo) sin las funciones edge, también; 4.15 y 4.24–4.27 corren con `--hasta-plan` (la compuerta de datos con el plan en la mano). Si `en-curso.json` nombra un paso cuyo pid ya no vive, **sólo** se retoma con `--resume`.
5. **Paso** (`/piloto <paso>`): `claude -p` con `--permission-mode auto --permission-prompts none --disallowedTools "mcp__*" --max-budget-usd <lo que le queda al paso>` y `--session-id` nuevo o `--resume`. Antes de lanzarlo, `en-curso.json` anota paso, session_id, pid, HEAD de arranque; después de cada llamada, `usd` (el `total_cost_usd` del JSON, acumulado de la sesión).
   **Los topes son del paso entero** (CAL-1): `--max-budget-usd` vale por invocación y una retoma empieza de cero, así que el bucle pasa a cada llamada `PILOTO_TOPE_USD_PASO` (200; era 60 hasta el 4.15) menos lo gastado (más `tope_extra`, abajo); con menos de `PILOTO_TOPE_USD_MIN` (5) no lanza. Un JSON con `subtype: error_max_budget_usd` no es un fallo del proceso: no se reintenta, se anota `tope` y es una parada «el paso X gastó G de T USD» con `parado` (recomendado), «sigo — 30 USD más, una sola vez» (deja `tope_extra` en `en-curso.json`) y `reintentar`; la segunda vez ya no ofrece seguir. Toda compuerta del paso dice cuánto lleva. El ruteo va con `PILOTO_TOPE_USD_RUTEO` (0,5).
6. **Resultado** (`.piloto/ultimo.json`, validado con `jq`): `listo` → el cierre (abajo); `compuerta` → se pregunta y se vuelve a rutear (el ruteo dirá `continuar`); `falla` → aviso. Un fallo del proceso: **un** reintento con `--resume` y el mismo `session_id`; si no se puede retomar o vuelve a fallar, aviso.
7. **Límite de uso:** el texto (`You've hit your session limit · resets 3:45pm`, `… your 5-hour limit · …` o `… weekly limit`) o la señal estructurada (`api_error: usage_limit_reached`, 429) → duerme hasta esa hora + 5 min (60 si no se lee) y reintenta **una** vez con `--resume`; si vuelve, aviso. No suma fallas.
8. **Consumo** (`consumo.sh`): una línea por llamada en `.piloto/consumo.csv` (`fecha,llamada,paso,modelo,effort,session_id,tokens_*,tokens,total_cost_usd,duracion_s,resultado,usd_por_modelo`); los tokens son la suma de `modelUsage` (incluye subagentes), `usd_por_modelo` sus `costUSD` (`claude-opus-5-5=25.7977`), y con `--resume` se resta lo que la sesión ya llevaba, también modelo por modelo. `duracion_s` es el reloj del bucle (el `duration_ms` del JSON es el del último turno). Decidir se cuenta del transcript, una vez por `message.id`, sin dólares.

**El cierre de un «listo»**, en este orden y por el bucle (`cierre.sh`): a) árbol limpio y cada commit de `ultimo.json` entre los **propios** del paso (los de `HEAD de arranque..HEAD` que no son mezclas ni están en `origin/main`: traer main
a la rama ya no ensucia el rango) y ningún otro; c) compuerta **guardas** si esos commits tocan las guardas; b) `verificar.sh` **de la copia**
(sólo `pnpm typecheck` y `mapa.sh --check`, y nada si la huella del árbol ya es la de una verificación verde; lint, la suite, `db:probar` y los e2e son del CI de la rama, no se repiten aquí); d) `publicar.sh` **de la copia**.
Cualquier falla en a), b) o d) es un aviso; no se publica. El aviso de b) es la última línea de `verificar.sh`: «verificar: <nombre> falló: <causa>», con la primera línea `Error:` del log; las 200 primeras letras de la primera línea `Error:`.

**Publicar** (`publicar.sh`, sólo lo corre el bucle): rama `a/…`, árbol limpio, sin divergencia con `origin/<rama>` (nunca fuerza), **no espera al CI del push anterior** (`ci.sh`: un rojo común se anota en `.piloto/ci-rojos.md` y se sigue; sólo frenan un job de la base en rojo y 5 rojos sin arreglar), SQL de seguridad en el rango (policy, RLS, `security definer`, `grant`/`revoke`, Vault) sin
`<común>/piloto/aprobado-<paso>` → se niega; después empuja la rama y abre su PR contra `main` (`gh pr create`) o, si ya está, le comenta el paso. Con `PILOTO=1` el hook `bloquear-peligrosos.sh` le niega a una **sesión** todo `git push`: el hook no ve al bucle porque el bucle no es una sesión. **Nunca un merge.**

## Las compuertas

| Tipo            | Cuándo                                                                                                                                                                                                                                                       | Quién la detecta                                    | Cómo llega al celular                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `datos`         | El plan toca policy, RLS, permisos, `security definer` o Vault; los pasos 4.15 y 4.24–4.27                                                                                                                                                                   | el bucle (por el paso), el planificador, el auditor | sesión `piloto · datos <paso>` con la pregunta                                                                                          |
| `dependencia`   | Un paquete nuevo o una versión                                                                                                                                                                                                                               | el planificador                                     | ídem                                                                                                                                    |
| `producto`      | Una pregunta de producto o de UX abierta                                                                                                                                                                                                                     | el planificador, el auditor                         | ídem                                                                                                                                    |
| `hito` / `fase` | Se cierra un hito / se abre una fase (la `fase` ya no pregunta: la decide el CI en verde, «Sin esperar al CI»)                                                                                                                                               | el ruteo; el bucle para 4.18, 4.28 y una fase nueva | ídem                                                                                                                                    |
| `atasco`        | El auditor bloqueó dos veces                                                                                                                                                                                                                                 | la sesión del paso                                  | ídem                                                                                                                                    |
| `afuera`        | Algo fuera del repo: una clave, un servicio                                                                                                                                                                                                                  | la sesión del paso                                  | ídem                                                                                                                                    |
| `espera`        | Algo que otro carril posee y tiene que integrar en `main` (un registro, una prueba suya, un archivo de `src/app`), con su `pedido`. También una `afuera` que dice que algo «no está en main»                                                                 | la sesión del paso                                  | **No llega**: el bucle se lo pide al dueño (`pedido-<n>`), espera a main y retoma                                                       |
| `guardas`       | El rango toca `scripts/piloto/`, `scripts/guardas/`, `scripts/candado.sh`, `.claude/settings*.json`, `.claude/hooks/`, `.claude/agents/`, `.claude/skills/piloto*`, `lefthook.yml`, `.github/workflows/` o las líneas `db:*` y `test:e2e*` de `package.json` | el bucle, antes de verificar                        | ídem                                                                                                                                    |
| `parada`        | Un aviso (disco, rama, árbol, CI rojo, copia alterada, verificación o publicación que falló, un paso que falló, tres fallas seguidas)                                                                                                                        | el bucle                                            | Primero se **reintenta solo** (5, 15 y 45 min); si sigue, «Paró por <motivo>: ¿sigo, reintento o lo dejo parado?» (recomendado: parado) |

**La sesión de decidir** (`decidir.sh abrir`): `tmux` + `claude --remote-control 'piloto · <tipo> <paso>' --model sonnet --effort low --tools 'Read,AskUserQuestion' --disallowedTools 'mcp__*' --no-chrome --settings <copia>/decidir.settings.json '/piloto-decidir'`, con `ENABLE_CLAUDEAI_MCP_SERVERS=false` y `disableClaudeAiConnectors` en sus ajustes (la de control, igual): `--tools` no quita las MCP y, sin `ToolSearch`, se cargan enteras; en el 4.13-3b eran 677 KB a mitad de cada sesión, ≈ 1,2 USD por compuerta. **No escribe nada** (escribir en `.git/` preguntaría por permiso en el celular y
ninguna regla allow lo aprueba): la respuesta la anota un hook `PostToolUse` de `AskUserQuestion` (`anotar-decision.sh`), que es bash y escribe `<común>/piloto/decision.md` con el `id` de la compuerta, la opción, las notas y «me respondió: «…»» literal. El bucle sólo la acepta si su `id`
es el de la compuerta vigente, es posterior a `compuerta.md` y **ningún paso estaba vivo** (`en-curso.json` y `pgrep`); si no, la borra y sigue esperando. Con `datos` aprobada escribe `aprobado-<paso>`. Nada sigue sin respuesta.

**La compuerta de producto, una pregunta por decisión** (CAL-1; en el 4.13-3b llegaron P0–P9 en una sola): el paso la pide con `compuerta.preguntas` (de 1 a 12, cada una `{ id, pregunta, opciones }` con de 2 a 4 opciones; `id` ≤ 12 caracteres, va de `header`). El bucle las escribe en `compuerta.md` (`preguntas: N`, `tandas: K` y una decisión por línea con sus opciones indentadas) y la sesión de decidir las hace en tandas de hasta 4, una llamada a `AskUserQuestion` por tanda, en la **misma** sesión. El hook anota cada tanda en `<común>/piloto/decision-parcial-<id>.json` (empareja por el `header` y, si no, por el texto de la pregunta) y escribe `decision.md` sólo con todas: una línea `- P0: …` por decisión, en el orden de la compuerta. «parar» (o «parado», «detener») en cualquiera para el bucle; «no partir» no. El paso lee las respuestas en `hechos.json` › `decision` (hasta 8.000 B). Las demás compuertas, y la de producto que ve el ruteo, siguen con una pregunta.

## El plan, la auditoría y los commits del paso (CAL-1)

Medido en el 4.13-3b: el plan pesó **87.116 B** (el alcance, 25 KB, era el diseño entero, y archivos, pruebas y mutaciones lo volvían a contar; 6 KB eran respuestas al auditor), el
planificador lo reescribió entero dos veces (173 K tokens de salida) y el ejecutor leyó 749 de sus 775 líneas. El auditor corrió tres veces (8,74 USD), puso 39 hallazgos sin
ninguno refutado y frenó tres defectos que habrían llegado a `main`; se queda en Opus en todos los pasos.

- **El plan** (`plantilla-plan.md`): ≤ **60 KB** con `wc -c` (el auditor lo marca «debería»; baja a 40 cuando haya un plan nuevo medido). La conducta va una vez, numerada (`Cn`), y lo demás la
  cita; lo que el plan da por cierto, en «Precondiciones verificables» (`Vn · afirmación · archivo:línea`). Las respuestas al auditor van en `.piloto/planes/<paso>.respuestas.md` y el plan
  se corrige con `Edit`, sin reescribirlo.
- **La 2.ª ronda** de la auditoría de un plan mira sólo lo cambiado (`git diff --no-index` contra `.piloto/planes/<paso>.auditado.md`, que copia `/piloto`) y las respuestas.
- **Commits:** hasta 3 de código y el de docs, uno por intención; si el plan necesita más, el paso se parte. El `fix` que pida la auditoría del informe va aparte y no cuenta (el 3b: 3 de
  código, el `fix` de `inert` y el de docs).

## Las guardas y su prueba

| Guarda                                           | Qué hace                                                                                                                                                                                               | Prueba                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `.claude/settings.json` › `deny`                 | `git reset --hard*`, `git clean*`, `git checkout -- *`, `git branch -D*`, `gh workflow run*`, `vercel*`, `supabase link*`/`secrets*`, `pnpm add*`/`up*`, `next upgrade`… valen en todo modo            | `scripts/guardas/ajustes.test.ts` (el motor de permisos no corre en Vitest: la prueba funcional es la del hook) |
| `bloquear-peligrosos.sh`                         | Siempre: lo irreversible, `git push` a main o de otra rama que la propia, `gh pr merge`, lo remoto, dependencias, **saltarse el candado**. Con `PILOTO=1`: todo `git push`, `gh` que escribe, `claude` | `scripts/guardas/bloquear-peligrosos.test.ts` (tabla de comandos, repos temporales)                             |
| `guardar-autorizaciones.sh`                      | Con `PILOTO_SESION=paso\|ruteo`, ni Write/Edit ni Bash tocan `<común>/piloto/**` ni `.piloto/decision.md`                                                                                              | `scripts/guardas/guardar-autorizaciones.test.ts`                                                                |
| `solo-lectura.sh` / `escribir-solo-en-piloto.sh` | El Bash del auditor y del planificador es de lectura; el planificador sólo escribe `.piloto/planes/`                                                                                                   | `scripts/guardas/solo-lectura.test.ts`, `escribir-solo-en-piloto.test.ts`                                       |
| `por-agente.sh`                                  | Hace valer esas dos desde `settings.json` (la entrada del hook trae `agent_type`): corre sin carpeta confiada, donde el frontmatter no se aplica                                                       | `por-agente.test.ts` y la sonda real del ensayo                                                                 |
| `scripts/candado.sh`                             | Un solo turno para la base local y el servidor de e2e entre todos los worktrees (`flock -n`, exit 75 con quién lo tiene)                                                                               | `scripts/candado.test.ts`                                                                                       |
| La copia de `bin/`                               | El bucle no ejecuta código que un paso pudo cambiar                                                                                                                                                    | `bucle*.test.ts` («paso que reescribe verificar.sh», «copia alterada»)                                          |
| Cierre por el bucle                              | a) → c) → b) → d), sin creerle al «listo»                                                                                                                                                              | `bucle-cierre.test.ts`, `verificar.test.ts`, `publicar.test.ts`                                                 |

`bloquear-peligrosos.sh` lee los argumentos sin redirecciones (`2>&1`, `> f`, `&>`, `< f`) ni valores de opción (`--filter web`): `pnpm install 2>&1` ya no se toma por un paquete (visto en DEP-1); la tabla lo cubre para pnpm, npm, yarn, el candado y `playwright --list`.

## Dónde vive cada cosa

- **`.piloto/`** (ignorada por git; la escriben el bucle y las sesiones): `hechos.json`, `en-curso.json`, `ultimo.json`, `ruteo.json`, `consumo.csv`, `registro.md`, `llamadas/`, `sesiones/`, `planes/`, `informes/`, `salidas/`, `compuerta.md` (copia de lectura; la deja `decidir.sh abrir` y la borra `cerrar`), `PARAR`, `bucle.lock`.
- **`<carpeta común de git>/piloto/`** (común a todos los worktrees, fuera del árbol; sólo la escribe bash): `compuerta.md` (la que vale, con un `id` nuevo), `decision.md`, `aprobado-<paso>` y `bin/` con `bin.sha256`.
- `scripts/piloto/` las piezas y sus pruebas; `.claude/skills/piloto*` los prompts; `.claude/agents/{auditor,planificador}.md`; `.claude/hooks/` las guardas.

## El candado de la base

`db:reset`, `db:types`, `db:diff`, `db:medir`, `db:carreras`, `db:lint`, `db:sembrar-volumen`, `db:medir:volumen`, `test:e2e` y `test:e2e:completo` toman `scripts/candado.sh` (no `db:base` ni `db:probar`: PGlite en memoria). Ocupado, fallan al instante con 75 y dicen quién lo tiene;
`CANDADO_ESPERA=<s>` espera.

## El hook Stop y las sesiones `-p`

Medido en este worktree el 2026-10-26, mediana de 3 tras un calentamiento (`loadavg` < 1,5 y sin procesos del 3a antes de cada corrida):

| Verificación                                                                                             |                Mediana |
| -------------------------------------------------------------------------------------------------------- | ---------------------: |
| `mapa.sh` (regenerar) · `mapa.sh --check`                                                                |          2,5 s · 2,5 s |
| `pnpm typecheck` en frío (sin `tsconfig.tsbuildinfo`) · en tibio · `tsc --noEmit` incremental            | 19,1 s · 3,6 s · 3,2 s |
| `pnpm lint` (`eslint .` entero) · `eslint --cache` de 3 archivos                                         |         52,4 s · 1,2 s |
| `pnpm test` (4.997 pruebas, 395 archivos al medir)                                                       |                 99,2 s |
| `scripts/guardas` solo                                                                                   |                  5,0 s |
| `vitest related`: un componente de `src/shared/ui` · un archivo de `entities` · los del commit `212b70b` | 14,8 s · 5,5 s · 6,0 s |

La verificación de siempre del Stop (mapa + typecheck + lint + test + mapa) ≈ **160 s en cada fin de turno**. La persona aprobó (2026-10-26) un Stop que decide por el estado del árbol (`.claude/hooks/verificar-al-terminar.sh`, `verificar-al-terminar.test.ts`):

- **Sale sin verificar** si `PILOTO_SESION` es `ruteo|decidir|control|en-seco` (sesiones que no editan: si no, cada ruteo pagaría ≈ 90 s y, con el árbol rojo de un paso fallido, el Stop bloquearía a un Sonnet que no puede arreglar nada); si `background_tasks` no está vacío (un `-p` sigue abierto en el
  mismo árbol); o si la huella del árbol (HEAD + diff + no rastreados, `scripts/piloto/huella.sh`) es la de la última verificación verde.
- **Árbol sucio** (un turno a mitad de paso): typecheck + `eslint --cache` de los cambiados + `vitest related` + `scripts/guardas` + `mapa.sh --check` ≈ **17–27 s**.
- **Árbol limpio** (un paso cerrado): en un paso del piloto (`PILOTO=1`) sólo typecheck y mapa; la suite entera, el lint y los e2e son del CI. En una sesión de la persona sigue siendo la suite completa, una vez ≈ 160 s. Si pasa deja la huella, y `verificar.sh` la deja también.
- **Sale sin verificar** también si la sesión no escribió en este árbol (`.claude/hooks/sesion-edito.jq` lee su transcript: Edit/Write sobre el árbol, o un Bash que escribe sin `cd` a otro árbol); el árbol sucio de otra sesión o de un paso del piloto ya no le hace fallar el Stop. Sin transcript legible, verifica como antes.
- Lee `cwd` de la entrada (no `${CLAUDE_PROJECT_DIR}`, que no sigue a un worktree), igual que `lint-archivo.sh`, y conserva el tope de 3 intentos. Los hooks del proyecto corren en `-p`.

## Sin esperar al CI (2026-11-04)

El piloto corría la verificación dos veces (local y CI) y se detenía por cada CI rojo. Medido en el 4.14-3c: lint ≈ 1 min, typecheck ≈ 1 min, suite ≈ 3 min, e2e dirigidos ≈ 6,5 min, ≈ 11 min por paso que el CI repetía. Ahora **el CI es la autoridad** y el piloto no lo espera:

- **Local, lo mínimo:** eslint del archivo editado (hook `PostToolUse`), `vitest related` y typecheck mientras se trabaja; `verificar.sh` sólo typecheck + mapa (o nada con la huella verde); el pre-commit de lefthook no repite el typecheck con `PILOTO=1`.
- **Publicar y seguir** (`ci.sh`, `publicar.sh`, `bucle.sh`): el piloto empuja sin esperar al CI del push anterior. Un CI rojo se anota en `.piloto/ci-rojos.md` (corrida, commit, jobs que cayeron) y se ve en `hechos.json` › `ci_rojos`; un CI verde más nuevo borra la lista; una corrida cancelada (el push siguiente la reemplaza) no dice nada. Frenan sólo dos cosas: un job `Base ·` en rojo (RLS, grants, advisors) y `PILOTO_TOPE_CI_ROJOS` (5) corridas rojas sin arreglar.
- **El paso `ci-fix`:** con `PILOTO_CI_ARREGLAR_DESDE` (3) rojos anotados, el siguiente paso no sale del ruteo sino que es `ci-fix` (opus/high, sesión nueva, su ruteo lo escribe el bucle): lee los logs de las corridas rojas con `gh run view --log-failed`, arregla la causa y deja un commit `fix(ci)`. Hasta `PILOTO_CI_FIX_MAX` (2) intentos por racha; un CI verde reinicia la cuenta.
- **La puerta de fase** (los pasos 4.18 y 4.28 y abrir una fase) ya no es una compuerta a la persona: el bucle espera hasta `PILOTO_CI_ESPERA_MAX` (5400 s) a que el CI de la rama termine; verde → sigue; rojo → `ci-fix`; después de 2 intentos, o sin un CI que mirar, avisa. Esa puerta es lo que asegura que la app anda antes de abrir la fase siguiente.
- **Carriles en paralelo** (`PILOTO_CARRIL`, `carril.sh`, `docs/plan.yaml`, `piloto.config`): `bash scripts/piloto/arrancar.sh --carril a` en el worktree del carril (`bash scripts/coordinador/abrir-carriles.sh` los abre, hasta `CARRILES_MAX`) lanza `piloto-bucle-a` y, una vez, `piloto-coordinador`. El bucle ya no elige el paso: se lo pide al coordinador (un paso empieza cuando sus dependencias están integradas en `main`), trabaja cada paso en `<carril>/<paso>` cortada de `origin/main`, y `publicar.sh` abre **un PR por paso**; el coordinador integra los verdes con el CI en verde y devuelve a su carril los rojos o en conflicto. El ruteo respeta `asignado` de `hechos.json`. Una sola compuerta a la vez en la máquina (`<común>/piloto/compuerta.lock`). Carril `a` = `base`: 4.15-3, 4.15-4 (parte las entradas de `cotizaciones` por área), 4.16 a 4.19 y el cierre 4.28; `b` = la fórmula (4.20 a 4.23); `c` = papelera, marcar final, comprobantes y comentarios (4.24 a 4.27). Sin `PILOTO_CARRIL` nada cambia (el carril A de siempre).
- **Máquina dedicada** (`scripts/maquina/`): `verificar-entorno.sh [carriles]` dice qué falta (herramientas, `docker` sin sudo, `gh` y `claude` con sesión, RAM ≈ 7 GB y disco ≈ 8 GB por carril, `linger`); `instalar-servicios.sh [--en-seco] [carril…]` escribe unidades `systemd --user` (`piloto-<carril>.service`, que corre `arrancar.sh --carril` y retoma con `--resume` tras un reinicio) y un timer de respaldo cada 6 h; `respaldar.sh` guarda `.piloto/` de cada carril, `.git/piloto/` y `.git/coordinador/` (sin `.env.local`) y conserva los últimos 14. Los secretos (`.env.local`, claves) se copian por un canal seguro, nunca por git. Con tres carriles esta PC (30 GB de RAM, disco al 87 %) pide ≈ 64 GB libres: la dedicada necesita un disco de ≥ 500 GB.
- **Paradas de entorno que se arreglan solas** (`reparar.sh`, una vez, anotado en el registro): disco sobre el tope (libera cachés de Docker y npm), funciones edge caídas antes de un Nivel 2 (levanta `pnpm funciones` en la sesión `piloto-funciones`) y `ultimo.json` que declara de menos commits que el rango (lo completa si todos los declarados están en él). Si no queda arreglado, avisa como siempre. `PILOTO_REPARAR=0` las apaga.
- **Producto se contesta solo:** una compuerta `producto` se responde con la recomendada de cada decisión, sin abrir decidir; cada respuesta queda en `.piloto/decisiones-automaticas.md` con sus opciones. Lo mismo `datos` (aprueba el plan) y `guardas` (aprueba el cambio; el diff completo queda en `.piloto/guardas/<paso>.diff` y su ruta en `decisiones-automaticas.md`): `PILOTO_AUTO` por omisión es `producto,datos,guardas,atasco` y `PILOTO_AUTO=` (vacío) lo apaga. `atasco`, una vez por paso (`.piloto/atascos-solos/<paso>`): la segunda del mismo paso va a la persona (2026-11-07). `parada`, `dependencia` y `afuera` siguen yendo a la persona.
- **Dos rondas de auditoría del plan, no más** (2026-11-07): si la 2.ª también bloquea, la sesión achica el paso sola (ejecuta lo que el auditor ya no objeta como una parte, y lo bloqueado pasa a la parte siguiente, que se planea de cero). El 4.25 llevaba cuatro rondas y dos atascos sin código.
- **El tope por paso** sube de 60 a 200 USD (`PILOTO_TOPE_USD_PASO`).
- **Qué sigue siendo manual:** las funciones edge (`pnpm funciones`) que pide un paso de Nivel 2, y las compuertas de seguridad de arriba.

## El flujo continuo (FLUJO-1, 2026-11-07)

Del 5 al 7-11 los carriles se paraban por cosas que no necesitaban a nadie, y los relanzaban scripts fuera del repo (`~/orca/supervision/`:
integrar los PR en verde, re-arrancar al cambiar los scripts, traer main tras una espera, mantener asignado un paso partido, levantar un
carril caído). Todo eso vive ahora en el repo, con sus pruebas (`bucle-flujo.test.ts`, `arrancar.test.ts`, `coordinador.test.mjs`), y esos
scripts ya no hacen falta. Las decisiones, en `docs/pasos/flujo-1/decisiones.md`.

- **La copia se pone al día sola** (arriba): sale de `origin/main`, cada copia es su carpeta y `bin` un enlace que se cambia de una vez;
  cada bucle sigue con la suya y se relanza (`exec`) entre pasos cuando main cambia `scripts/piloto/`. `PILOTO_RECARGAR=0` lo apaga.
- **La rama del carril trae main antes de cada parte** (`carril.sh` › `traer_main`): sin commits propios pasa a ser `origin/main` (una rama
  local vieja ya no se retoma); con commits, `git merge`. Así cada parte corre con las skills, los agentes y las guardas de main. Un
  choque sólo en `docs/*.md` se resuelve uniendo las dos versiones; uno en código se aborta y queda en `.piloto/conflicto-con-main.md`, que la
  sesión del paso resuelve antes que nada (2026-11-08: antes nadie lo resolvía y el coordinador no devuelve las partes).
- **La espera a main** (compuerta `espera`, con `pedido` y `archivos`, obligatorios): el bucle le deja el pedido al coordinador, mira
  `origin/main` cada `PILOTO_ESPERA_MAIN_POLL` s (120) hasta que **todos** los `archivos` cambien (o el dueño cierre el pedido), lo trae a la
  rama y retoma el paso con la respuesta en `hechos.json` › `decision`. Hasta `PILOTO_ESPERA_MAIN_VECES` (3) esperas por paso y
  `PILOTO_ESPERA_MAIN_MAX` (6 h) cada una; después, la persona. Una `afuera` que dice que algo «no está en main» también espera.
- **Los pedidos entre carriles** (`coordinador.mjs pedir`): van al dueño de los `archivos` (o al carril base), que los toma **antes que sus
  propios pasos** como `pedido-<n>` (rama `<carril>/pedido-<n>`, ruteo sonnet/high escrito por el bucle; la skill lo hace con su prueba). Uno
  sin cambios se cierra (`cerrar-pedido`). Dos carriles que se piden mutuamente son un ciclo: va a la persona. Un carril con sus pasos
  integrados sigue atendiendo pedidos hasta que el plan entero termine. Reemplazan a los PR `fix/` hechos a mano (19, 32, 39, 46, 48).
- **Un aviso se reintenta solo** antes de ir al celular (`parada_sola`, si `PILOTO_AUTO` nombra `parada`, que es lo de omisión):
  `PILOTO_PARADA_ESPERAS` (300 900 2700 s) por motivo; reintentar no se salta ninguna verificación, la repite. Van directo a la persona lo que
  esperar no arregla: el tope de gasto, el árbol sucio, un paso que falla, tres fallas seguidas, una espera agotada y un ciclo.
- **El coordinador manda sobre el ruteo:** si el ruteo elige otro paso que el asignado (o una «parte» que es otro paso del plan, o «ninguno»),
  corre el asignado. Un paso del plan que dice «listo» sin cambios y sigue asignado va a la persona.
- **El coordinador integra** los pasos, sus partes (`coordinador.mjs parcial`: con merge y sin borrar la rama) y los pedidos, en el commit
  que vio el CI (`--match-head-commit`). Lo rojo también (`COORD_MERGE_AUTO` en `piloto.config`, decisión de la persona del 2026-11-07). **Lo
  que toca las guardas del piloto, no:** lo integra la persona (`COORD_GUARDAS_SOLAS=1` lo deja).
- **La puerta de fase con carriles mira el CI de `main`** (la rama del paso es nueva y no tenía CI), y una corrida cancelada no cuenta si hay
  otra detrás. Un `ci-fix` no se repite hasta que corra un CI con su arreglo (`ci-fix-head`).
- **En CI, los e2e tienen un reintento:** la prueba que pasa al reintentar no pone el PR en rojo, y queda anotada en el PR
  (`e2e/soporte/reporter-de-inestables.ts`, `.claude/rules/e2e.md`).
- **El carril A publica con coordinador** su rama `a/<paso>`. La sesión de funciones edge es una por carril (`piloto-funciones-<c>`). Lo que el
  bucle corre por fuera no hereda su candado (fd 8).

**Sin esperas (2026-11-08).** Del 7 al 8-11 los tres carriles estuvieron diez horas parados: el `ExecStop` de cada servicio corría `parar.sh` al
apagar la máquina y, tras el reinicio, arrancaban y se paraban por `PARAR`. Ya no hay `ExecStop` (apagar no es parar). Además: un carril sin paso
propio listo toma prestado uno de otro carril ocupado (`prestable` en `plan.mjs`); lo que un carril necesita del núcleo lo hace en su PR (la guarda
le deja agregar y editar lo del base); y el coordinador integra solo los PR que tocan `scripts/guardas/` salvo las guardas del piloto y de los
carriles (los registros de cada carril ya no esperan a la persona). **Antes de iniciar sesión** tras un reinicio, `gh` y `git fetch` fallan si la
credencial vive en el llavero del escritorio: `gh auth login --insecure-storage`, `gh auth setup-git` y el remoto por HTTPS lo evitan.

**Remiendos sin sesión, arreglos prestados y ramas limpias (2026-11-08, tarde).** Ese día hubo 19 PR devueltos por «conflicto con main» (cada
carril sumaba su pestaña a `configuracion/cotizacion/pestanas.ts`) y uno por una migración más vieja que la última de main; cada uno costó una
sesión y otro CI, mientras el A y el C pasaban ≈ 2,4 h «sin paso libre» y el B alternaba el 4.22 y el 4.26. Ahora (`carril.sh`, `plan.mjs`,
`limpiar-ramas.mjs`; pruebas en `bucle-remiendo.test.ts`, `plan.test.mjs` y `limpiar-ramas.test.mjs`):

- **Las migraciones se renumeran solas** al traer main (`renumerar_migraciones`): si una de la rama quedó atrás de la última de `origin/main`,
  todas las de la rama pasan, en su orden, a versiones nuevas con el mismo contenido, y la versión vieja se cambia en los archivos que la rama tocó.
- **Un PR devuelto se remienda sin sesión** (`remendar_sin_sesion`): en conflicto, si main entra sin choques de código (o sólo de `docs/` con
  puros agregados: si los dos lados cambiaron la misma línea, la unión la deja dos veces, como las filas de `docs/UX.md` en el 4.26, y va a la
  sesión); en rojo, sólo si se renumeró una migración. El bucle lo publica y sigue; si queda un choque de código, corre la sesión como antes.
- **Arreglo prestado:** el PR roto de un carril ocupado con otro paso lo toma un carril sin paso propio listo, en la **misma** rama del PR
  (`b/4.26` en el C), sin abrir otro; el coordinador anota la `rama` de cada paso asignado, y `publicar.sh` y el bucle aceptan la asignada.
  Al retomar, la rama local se alinea con la de su PR (avanza o se une) antes de traer main.
- **Ramas:** el coordinador borra en cada vuelta las ramas integradas, remotas y locales: PR `MERGED`, sin otro abierto, con la punta que se
  integró (o detrás de ella), sin worktree y sin ser la de un paso o pedido vivo. `COORD_LIMPIAR=0` lo apaga.

Para que un carril se levante solo tras un corte de luz, un reinicio o un bucle que se cayó: `bash scripts/maquina/instalar-servicios.sh a b c` (en el árbol del A). Escribe, por carril, la unidad
`systemd --user` que corre `arrancar.sh --carril` al iniciar y un **vigía** cada 10 min (`arrancar.sh --carril <c> --si-caido`): levanta el bucle si nadie tiene `.piloto/bucle.lock` y no se paró a
propósito (PARAR, «parado» de la persona, el carril terminó o llegó a `--hasta`). Reemplaza a `vigilar-carriles.sh`.

## El ensayo en seco (2026-10-26)

`bash scripts/piloto/arrancar.sh --en-seco --nota .piloto/contexto/3a.md` («el 3a está en curso en otra sesión: planear el 4.13-3b sobre su contrato»), con `PILOTO_TOPE_USD_PASO=15`:

- **Ruteo real** (sonnet, low): 15 s, 0,142 USD, 78.606 tokens (46.502 de caché leída). Eligió `4.13-3b`, opus/high, Nivel 2 por `src/shared`, `cuenta_e2e` 2 (el completo corre), sin compuerta; avisó que no halló la etiqueta literal en PLAN.
- **Paso en seco** (`/piloto 4.13-3b --en-seco`, opus/high): 20,3 min, **7,03 USD** (97.320 tokens de salida; 12,2 M de caché leída). El planificador escribió un plan de 32 KB; el auditor lo bloqueó con 13 objeciones (la precondición 3 exige `p_abierta: string` y `db:types` dará `p_abierta?: string`; `rg` con `\|` no alterna; la premisa de
  P3 es falsa porque `_cotizacion_guardable` ya rechaza `total_sin_valor`…) y **encontró un defecto real en `nivel.mjs`** (sin `--rango` descartaba el primer archivo; corregido con su prueba). No se lanzó la segunda ronda: la sonda ya había fallado.
- **La sonda falló, y por eso hay `por-agente.sh`:** el auditor corrió `touch .piloto/sonda` y se creó. La causa, medida: el frontmatter de un agente no se aplica con la carpeta sin confiar. Con `por-agente.sh` (hook de settings) repetida la sonda de verdad (el auditor lanzado desde `claude -p`): rechazada con «solo-lectura: «touch» no está en la lista de lectura» y sin archivo. Costó 0,115 USD.
- Topes de entonces (`PILOTO_TOPE_USD_RUTEO` 2 y `PILOTO_TOPE_USD_PASO` 50 por llamada): un paso en seco costó 7,03 USD. **Calibrados con el 4.13-3b** (CAL-1, `docs/DECISIONES.md`): el paso entero costó 43,55 USD (planificador 11,02, auditor 8,74 en tres corridas, ejecutor 23,80; 50,6 min de plan y 93,5 de ejecución) y los ruteos 0,06 y 0,12: 60 por paso entero y 0,5 por ruteo.

## Pendiente

- **`bash scripts/piloto/decidir.sh --prueba-tandas`**, que hace la persona (desde el árbol, no la copia): dos tandas en el celular (4 y 1), una con algo en «Other». Después se comprueba con comandos que `decision.md` trae 5 líneas `- Pn:` con el id de la prueba, que el transcript tiene 2 llamadas a `AskUserQuestion`, menos de 60 K tokens de caché escrita y ningún «tools just became available», y su línea en `consumo.csv`.
- El primer `arrancar.sh` real ya hizo el 4.13-3b (CAL-1); un paso de Nivel 2 con sus compuertas, el cierre y la publicación, aún no.
- Aceptar la confianza de la carpeta (arriba) para que valgan las `permissions.allow`.
- Integrado a `main` con el cierre del A0 (`docs/DECISIONES.md`, «Paso A0»; `docs/BITACORA.md`, «Paso A0»).

## La primera prueba en vivo de decidir (2026-10-26)

`decidir.sh --prueba` abrió la sesión «piloto · prueba decidir --prueba» y ésta contestó «No hay una compuerta abierta.» sin preguntar nada. **Causa:** `--prueba` escribía la compuerta sólo en `<común>/piloto/compuerta.md`, y la skill lee la copia `.piloto/compuerta.md`, que sólo hacía `escribir_compuerta` del bucle (el transcript: un `Read` de esa ruta, «File does not exist»). El camino real del bucle funcionaba; el de `--prueba` no. **Por qué las pruebas no lo vieron:** `decidir.test.ts` sembraba `comun/compuerta.md` a mano y su `tmux` falso no leía nada, y `FALSO_DECIDIR` del arnés del bucle lee `$PILOTO_COMUN`: ninguno leía por el camino de la skill. **Arreglo:** la copia la hace `decidir.sh abrir` (un solo lugar, vale para cualquier escritor) y `cerrar` la borra; el `tmux` falso de `decidir.test.ts` lee, desde el `-c` que recibe, la ruta que sale del propio `SKILL.md`, y `--prueba` tiene test. **Repetida en verde** (2026-10-26, 20:08): la compuerta `prueba-1793059712` llegó al celular, la respuesta «si llegó (Recommended)» quedó en `decision.md` con el mismo id y «me respondió: «si llegó (Recommended)»». El relato completo está en `docs/BITACORA.md`, «Paso A0».

## Lo que la doc no confirma

- Cómo sale el **límite de uso** en `-p` (se detecta por el texto documentado, con prueba de fixture): se confirma la primera vez que ocurra.
- Que `/piloto-decidir` funcione como prompt inicial de una sesión interactiva: por eso esa skill (y la de control) sí se dejan invocar por el modelo.
- Que `tool_response` de `AskUserQuestion` traiga la respuesta en el hook `PostToolUse`: el respaldo es el transcript de la sesión, y lo confirma `decidir.sh --prueba`.
- Que los hooks del frontmatter corran (exigen la carpeta confiada): lo prueba la sonda del ensayo.
- El clasificador de `auto` puede negar algo legítimo en un paso (escribir en `.claude/` es ruta protegida): el paso lo informa como compuerta; se calibra con los primeros pasos.
- La copia protege la lógica del bucle, no lo que `verificar.sh` ejecuta (`pnpm lint|typecheck|test`, `package.json`, los hooks son del árbol que el paso cambió): lo cubre la compuerta «guardas», que corre antes.
- `total_cost_usd` y los topes `--max-budget-usd` son estimaciones del cliente.
- La regla de «e2e dirigidos también en `movil` sólo si lo tocado es interfaz» vive en un solo lugar, `.claude/rules/e2e.md` › «Interfaz: cuándo los e2e dirigidos corren también en `movil`»; `nivel.mjs` (`toca_interfaz`) la aplica y la cita, y `nivel.test.ts` falla si la lista de la regla y la del código se separan. Es conservadora: ante la duda, `movil`.
