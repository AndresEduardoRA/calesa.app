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
  el piloto para un paso así (el 4.13-3c), `npx supabase functions serve` en otra terminal. Los e2e dirigidos de `verificar.sh` no las piden (el cierre, abajo).
- La rama de trabajo es `main` (el bucle publica con `git push origin main`; nunca un PR). Si hay otro checkout con trabajo, el piloto convive con él por el candado de la base (abajo).

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

`arrancar.sh` **copia** `scripts/piloto/` (sin pruebas) a `<carpeta común de git>/piloto/bin/`, anota un sha256 por archivo en `bin.sha256` y lanza ESA copia. El bucle llama siempre a las piezas de la copia, nunca a las de
`scripts/piloto/`: un paso no puede cambiar el código con que se lo verifica y publica. Si un paso toca `scripts/piloto/`, la compuerta «guardas» lo pregunta, y aprobada la vuelta termina pidiendo re-arrancar.

## El bucle, vuelta por vuelta (`scripts/piloto/bucle.sh`)

0. La copia coincide con `bin.sha256` (y no hay archivos de más): si no, aviso antes de rutear.
1. **Hechos, sin modelo** (`hechos.sh` → `.piloto/hechos.json`): hora de La Paz, rama, HEAD, árbol, disco, candado, último CI, la cuenta `n de 3` de e2e, bytes de ESTADO, `ultimo.json`, `en-curso.json`, fallas seguidas, la nota del ensayo y el texto de la decisión vigente.
2. **Paradas deterministas:** `.piloto/PARAR`, rama ≠ main, árbol sucio sin un paso en curso, disco, último CI de main en rojo. Cada una es un aviso; «sigo» la ignora una vez.
3. **Ruteo** (`/piloto-ruteo`, Sonnet, esfuerzo bajo, sólo `Read`/`Grep`/`Glob`): `paso`, `titulo`, `modelo`, `effort`, `sesion`, `nivel`, `compuerta`, `particion`, `por_que` (`ruteo.schema.json`). Política de modelos: docs → sonnet/medium; pantalla → sonnet/high; `src/shared`,
   un disparador de Nivel 2, datos o seguridad, carreras o cierre → opus/high; `continuar` → el de antes. Planificador y auditor, siempre opus.
4. **Lo que el bucle no deja al modelo:** el paso 4.18 o 4.28, o abrir una fase, es un aviso; 4.15 y 4.24–4.27 corren con `--hasta-plan` (la compuerta de datos con el plan en la mano). Si `en-curso.json` nombra un paso cuyo pid ya no vive, **sólo** se retoma con `--resume`.
5. **Paso** (`/piloto <paso>`): `claude -p` con `--permission-mode auto --permission-prompts none --disallowedTools "mcp__*" --max-budget-usd <lo que le queda al paso>` y `--session-id` nuevo o `--resume`. Antes de lanzarlo, `en-curso.json` anota paso, session_id, pid, HEAD de arranque; después de cada llamada, `usd` (el `total_cost_usd` del JSON, acumulado de la sesión).
   **Los topes son del paso entero** (CAL-1): `--max-budget-usd` vale por invocación y una retoma empieza de cero, así que el bucle pasa a cada llamada `PILOTO_TOPE_USD_PASO` (60) menos lo gastado (más `tope_extra`, abajo); con menos de `PILOTO_TOPE_USD_MIN` (5) no lanza. Un JSON con `subtype: error_max_budget_usd` no es un fallo del proceso: no se reintenta, se anota `tope` y es una parada «el paso X gastó G de T USD» con `parado` (recomendado), «sigo — 30 USD más, una sola vez» (deja `tope_extra` en `en-curso.json`) y `reintentar`; la segunda vez ya no ofrece seguir. Toda compuerta del paso dice cuánto lleva. El ruteo va con `PILOTO_TOPE_USD_RUTEO` (0,5).
6. **Resultado** (`.piloto/ultimo.json`, validado con `jq`): `listo` → el cierre (abajo); `compuerta` → se pregunta y se vuelve a rutear (el ruteo dirá `continuar`); `falla` → aviso. Un fallo del proceso: **un** reintento con `--resume` y el mismo `session_id`; si no se puede retomar o vuelve a fallar, aviso.
7. **Límite de uso:** el texto documentado (`You've hit your … limit · resets 3:45pm`) → duerme hasta esa hora + 5 min (60 si no se lee) y reintenta **una** vez con `--resume`; si vuelve, aviso. No suma fallas.
8. **Consumo** (`consumo.sh`): una línea por llamada en `.piloto/consumo.csv` (`fecha,llamada,paso,modelo,effort,session_id,tokens_*,tokens,total_cost_usd,duracion_s,resultado,usd_por_modelo`); los tokens son la suma de `modelUsage` (incluye subagentes), `usd_por_modelo` sus `costUSD` (`claude-opus-5-5=25.7977`), y con `--resume` se resta lo que la sesión ya llevaba, también modelo por modelo. `duracion_s` es el reloj del bucle (el `duration_ms` del JSON es el del último turno). Decidir se cuenta del transcript, una vez por `message.id`, sin dólares.

**El cierre de un «listo»**, en este orden y por el bucle (`cierre.sh`): a) árbol limpio y cada commit de `ultimo.json` en `HEAD de arranque..HEAD` (y ningún otro); c) compuerta **guardas** si el rango toca las guardas; b) `verificar.sh` **de la copia**
(`pnpm lint`, `typecheck`, `test`, `mapa.sh --check`, `db:probar` si el rango toca `supabase/`, y los e2e dirigidos de `ultimo.json`, en escritorio y, sólo si `nivel.mjs` dice que el rango toca interfaz, también en móvil); d) `publicar.sh` **de la copia**.
Los e2e dirigidos corren con `E2E_SIN_FUNCIONES=1`: el bucle no levanta las funciones edge, la guardia de `e2e/global-setup.ts` las exigiría para cualquier spec (así cayó el 4.13-3b), y un spec que llama a una de verdad falla solo sin ella, así que sigue siendo un rojo. Sin la base libre (candado), también.
Cualquier falla en a), b) o d) es un aviso; no se publica. El aviso de b) es la última línea de `verificar.sh`: «verificar: <nombre> falló: <causa>», con la primera línea `Error:` del log.

**Publicar** (`publicar.sh`, sólo lo corre el bucle): rama main, árbol limpio, `git fetch` sin divergencia, espera el CI del push anterior (`gh run watch`; rojo → aviso), SQL de seguridad en el rango (policy, RLS, `security definer`, `grant`/`revoke`, Vault) sin
`<común>/piloto/aprobado-<paso>` → se niega, y `git push origin main`. Con `PILOTO=1` el hook `bloquear-peligrosos.sh` le niega a una **sesión** todo `git push`: el hook no ve al bucle porque el bucle no es una sesión. **Nunca un PR.**

## Las compuertas

| Tipo            | Cuándo                                                                                                                                                                                                                                                       | Quién la detecta                                    | Cómo llega al celular                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `datos`         | El plan toca policy, RLS, permisos, `security definer` o Vault; los pasos 4.15 y 4.24–4.27                                                                                                                                                                   | el bucle (por el paso), el planificador, el auditor | sesión `piloto · datos <paso>` con la pregunta                                |
| `dependencia`   | Un paquete nuevo o una versión                                                                                                                                                                                                                               | el planificador                                     | ídem                                                                          |
| `producto`      | Una pregunta de producto o de UX abierta                                                                                                                                                                                                                     | el planificador, el auditor                         | ídem                                                                          |
| `hito` / `fase` | Se cierra un hito / se abre una fase                                                                                                                                                                                                                         | el ruteo; el bucle para 4.18, 4.28 y una fase nueva | ídem                                                                          |
| `atasco`        | El auditor bloqueó dos veces                                                                                                                                                                                                                                 | la sesión del paso                                  | ídem                                                                          |
| `afuera`        | Algo fuera del repo: una clave, un servicio                                                                                                                                                                                                                  | la sesión del paso                                  | ídem                                                                          |
| `guardas`       | El rango toca `scripts/piloto/`, `scripts/guardas/`, `scripts/candado.sh`, `.claude/settings*.json`, `.claude/hooks/`, `.claude/agents/`, `.claude/skills/piloto*`, `lefthook.yml`, `.github/workflows/` o las líneas `db:*` y `test:e2e*` de `package.json` | el bucle, antes de verificar                        | ídem                                                                          |
| `parada`        | Un aviso (disco, rama, árbol, CI rojo, copia alterada, verificación o publicación que falló, un paso que falló, tres fallas seguidas)                                                                                                                        | el bucle                                            | «Paró por <motivo>: ¿sigo, reintento o lo dejo parado?» (recomendado: parado) |

**La sesión de decidir** (`decidir.sh abrir`): `tmux` + `claude --remote-control 'piloto · <tipo> <paso>' --model sonnet --effort low --tools 'Read,AskUserQuestion' --disallowedTools 'mcp__*' --no-chrome --settings <copia>/decidir.settings.json '/piloto-decidir'`, con `ENABLE_CLAUDEAI_MCP_SERVERS=false` y `disableClaudeAiConnectors` en sus ajustes (la de control, igual): `--tools` no quita las MCP y, sin `ToolSearch`, se cargan enteras; en el 4.13-3b eran 677 KB a mitad de cada sesión, ≈ 1,2 USD por compuerta. **No escribe nada** (escribir en `.git/` preguntaría por permiso en el celular y
ninguna regla allow lo aprueba): la respuesta la anota un hook `PostToolUse` de `AskUserQuestion` (`anotar-decision.sh`), que es bash y escribe `<común>/piloto/decision.md` con el `id` de la compuerta, la opción, las notas y «me respondió: «…»» literal. El bucle sólo la acepta si su `id`
es el de la compuerta vigente, es posterior a `compuerta.md` y **ningún paso estaba vivo** (`en-curso.json` y `pgrep`); si no, la borra y sigue esperando. Con `datos` aprobada escribe `aprobado-<paso>`. Nada sigue sin respuesta.

**La compuerta de producto, una pregunta por decisión** (CAL-1; en el 4.13-3b llegaron P0–P9 en una sola): el paso la pide con `compuerta.preguntas` (de 1 a 12, cada una `{ id, pregunta, opciones }` con de 2 a 4 opciones; `id` ≤ 12 caracteres, va de `header`). El bucle las escribe en `compuerta.md` (`preguntas: N`, `tandas: K` y una decisión por línea con sus opciones indentadas) y la sesión de decidir las hace en tandas de hasta 4, una llamada a `AskUserQuestion` por tanda, en la **misma** sesión. El hook anota cada tanda en `<común>/piloto/decision-parcial-<id>.json` (empareja por el `header` y, si no, por el texto de la pregunta) y escribe `decision.md` sólo con todas: una línea `- P0: …` por decisión, en el orden de la compuerta. «parar» (o «parado», «detener») en cualquiera para el bucle; «no partir» no. El paso lee las respuestas en `hechos.json` › `decision` (hasta 8.000 B). Las demás compuertas, y la de producto que ve el ruteo, siguen con una pregunta.

## Las guardas y su prueba

| Guarda                                           | Qué hace                                                                                                                                                                                    | Prueba                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `.claude/settings.json` › `deny`                 | `git reset --hard*`, `git clean*`, `git checkout -- *`, `git branch -D*`, `gh workflow run*`, `vercel*`, `supabase link*`/`secrets*`, `pnpm add*`/`up*`, `next upgrade`… valen en todo modo | `scripts/guardas/ajustes.test.ts` (el motor de permisos no corre en Vitest: la prueba funcional es la del hook) |
| `bloquear-peligrosos.sh`                         | Siempre: lo irreversible, `git push` fuera de main, lo remoto, dependencias, **saltarse el candado**. Con `PILOTO=1`: todo `git push`, `gh` que escribe, `claude`                           | `scripts/guardas/bloquear-peligrosos.test.ts` (tabla de comandos, repos temporales)                             |
| `guardar-autorizaciones.sh`                      | Con `PILOTO_SESION=paso\|ruteo`, ni Write/Edit ni Bash tocan `<común>/piloto/**` ni `.piloto/decision.md`                                                                                   | `scripts/guardas/guardar-autorizaciones.test.ts`                                                                |
| `solo-lectura.sh` / `escribir-solo-en-piloto.sh` | El Bash del auditor y del planificador es de lectura; el planificador sólo escribe `.piloto/planes/`                                                                                        | `scripts/guardas/solo-lectura.test.ts`, `escribir-solo-en-piloto.test.ts`                                       |
| `por-agente.sh`                                  | Hace valer esas dos desde `settings.json` (la entrada del hook trae `agent_type`): corre sin carpeta confiada, donde el frontmatter no se aplica                                            | `por-agente.test.ts` y la sonda real del ensayo                                                                 |
| `scripts/candado.sh`                             | Un solo turno para la base local y el servidor de e2e entre todos los worktrees (`flock -n`, exit 75 con quién lo tiene)                                                                    | `scripts/candado.test.ts`                                                                                       |
| La copia de `bin/`                               | El bucle no ejecuta código que un paso pudo cambiar                                                                                                                                         | `bucle*.test.ts` («paso que reescribe verificar.sh», «copia alterada»)                                          |
| Cierre por el bucle                              | a) → c) → b) → d), sin creerle al «listo»                                                                                                                                                   | `bucle-cierre.test.ts`, `verificar.test.ts`, `publicar.test.ts`                                                 |

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
- **Árbol limpio** (un paso cerrado): la suite completa, una vez ≈ 160 s; si pasa deja la huella, y `verificar.sh` (el del bucle) la deja también para que el Stop no la repita.
- Lee `cwd` de la entrada (no `${CLAUDE_PROJECT_DIR}`, que no sigue a un worktree), igual que `lint-archivo.sh`, y conserva el tope de 3 intentos. Los hooks del proyecto corren en `-p`.

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
