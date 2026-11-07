## 2026-11-07 — FLUJO-1: el flujo continuo de los carriles

- **El problema medido (5 al 7-11):** 23 fallas distintas pararon o frenaron a los carriles. Las que más costaron: re-arrancar a mano cuando cambiaban los
  scripts del piloto (≈ 4 h 30), la integración de lo rojo y del A que esperaba a la persona (8 h 17 en una noche), los pedidos de B y C al A sin mecanismo
  (≈ 3 h y 11 relanzamientos, ≈ 35 USD sin avance) y el rango del cierre ensuciado por main (54 y 165 commits ajenos). Lo tapaban scripts fuera del repo
  (`~/orca/supervision/`), sin pruebas, con rutas absolutas y compitiendo con el coordinador por `estado.json`. El A no podía publicar con coordinador.
- **La copia del bucle sale de `origin/main`, no de la rama del carril** (`copiar-bin.sh`). Es común a los carriles y cada uno la rehacía desde su rama: las tres
  iban sin los PR 44 y 49, y re-arrancar el A habría vuelto atrás el `cierre.sh` de los tres. Lo integrado ya pasó el CI y la compuerta «guardas». Se anota el
  `tree` de `origin/main:scripts/piloto` en `bin.origen`, y una copia sin `bucle.sh` (un main roto) no reemplaza a la que hay.
- **El bucle se relanza solo** cuando main cambia `scripts/piloto/`, entre pasos y nunca con un paso vivo (`exec`, mismas opciones). Un bucle viejo puede llamar a
  piezas nuevas hasta su próxima vuelta: son de línea de comandos estable, y el riesgo es menor que el de dejar un carril quieto horas. El cierre de un paso que
  tocó `scripts/piloto/` ya no pide re-arrancar: su cambio rige al integrarse.
- **La rama del carril trae main antes de cada parte, nunca a mitad de un paso** (salvo tras una espera, que es por eso). Sin commits propios, la rama pasa a ser
  `origin/main`; con commits, `git merge` (nunca rebase con push forzado). Así cada parte corre con las skills y agentes de main: el planificador en sonnet del
  PR 49 nunca llegó a correr porque las ramas iban atrás.
- **El cierre cuenta los commits propios** del paso: `HEAD de arranque..HEAD`, sin mezclas y sin lo que ya está en `origin/main` (`rango_propio`). Lo mismo para las
  guardas: lo que vino de main ya pasó su compuerta.
- **La compuerta `espera` y los pedidos.** Un paso que necesita algo de otro carril ya no pide una `afuera` ni ofrece «seguir mientras…», que el bucle no sabe
  cumplir. Pide `espera` con su `pedido`: el coordinador se lo da al dueño de los `archivos` (o al base), que lo toma antes que sus pasos (`pedido-<n>`). El que
  pidió espera a main sin preguntar y se retoma solo. Se descartó dejar que B y C editen los archivos del A: la guarda de carriles es lo que permite correr tres
  a la vez sin choques. Una `afuera` que dice «no está en main» también espera, por los carriles que todavía la piden así.
- **Un aviso se reintenta solo antes de ir al celular** (5, 15 y 45 min por motivo). Reintentar no se salta nada: repite la vuelta con todas sus paradas y
  verificaciones. Lo que repetir no arregla (el tope de gasto, el árbol que el paso dejó sucio) va directo a la persona. Va en `PILOTO_AUTO` (por omisión), así
  que se apaga como las otras respuestas solas.
- **El coordinador manda sobre el ruteo.** Si el ruteo elige otro paso que el asignado, se corre el asignado y la sesión elige su parte. Antes era una parada,
  5 veces al arrancar los carriles. Una «parte» que es otro id del plan (el 4.20-4a del A dentro del 4.20 de B) no vale.
- **El coordinador integra las partes** (`pr_parcial`, con merge y sin borrar la rama, porque el carril sigue en ella) y los pedidos (como un paso ámbar). Antes
  las partes sólo las integraba `integrar-verdes.sh`, fuera del repo.
- **Lo rojo:** `integraSolo` ya no lo bloquea por código. Lo integra solo si `COORD_MERGE_AUTO` nombra `rojo` a propósito; por omisión (`piloto.config`:
  `verde,ambar`) sigue siendo de la persona. La regla cambió de hecho con `integrar-verdes.sh` sin quedar escrita: ahora es una línea de configuración a la vista.
- **La puerta de fase con carriles mira el CI de `main`**, porque la rama nueva del 4.28 no tendrá corridas. Una corrida cancelada no cuenta si hay otra detrás.
  Un `ci-fix` no se repite hasta que corra un CI que incluya su arreglo.
- **Para el coordinador (o el A):** al consolidar, cerrar en `docs/PLAN.md` el 4-83 (`auto-carriles.test.ts` hermético).
