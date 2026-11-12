## 7.14-2 · El cierre de la Fase 7: el Nivel 3 y los docs de cierre (2026-11-12)

Parte 2 de 2: cierra el 7.14 y la Fase 7. Plan: `.piloto/planes/7.14-2.md`; la parte 1, `docs/pasos/7.14-1/`.

- **Unión con main** antes del Nivel 3 (`941663d6`, con el 8.04 del carril b). El 6.14-2 sigue en su PR: no se une `origin/a/6.14` (D2).
- **Nivel 3, por proyecto** (cada uno desde `db:reset` y `db:carreras`, 17,3 s y 17,9 s): escritorio sobre `941663d6`, 1.207 en verde, 17 saltadas y 1
  caída en 53,5 min (55,7 de reloj); celular sobre `d24a019a`, 839 en verde, 29 saltadas, 1 caída y 3 sin correr (el resto de su serial) en 34,6 min
  (35,8 de reloj). 5a-4b: 91,5 min de reloj los dos (90,3 en el 6.14-2). Ninguna saltada nueva escrita (`saltadas.mjs 11289f69..HEAD`: 0); las de más
  son `test.skip` por proyecto de los specs de la fase.
- **Triaje:** las dos caídas, 3 de 3 rojas solas, y las dos de la prueba:
  - `leads-escala` › «sin red, abrir un modal cuyo código nunca se pidió…»: la suscripción de la campana se pide al descansar y la prueba corta la red
    antes; la campana pone su propia barra fija «Sin conexión» y el locator `.fixed` encontraba dos. La prueba la busca en `#contenido` (`d24a019a`, como
    `83c0dada`). Lo de fondo (una suscripción que nadie pidió no debería avisar) va a **7-5**.
  - `configuracion-leads-origenes-recorrido` › «B · con 12 orígenes…» (celular): la burbuja del chat tapaba el «⋯» que `scrollIntoViewIfNeeded` dejaba
    al borde de abajo. La burbuja va sobre el marco a propósito (D15 del 7.11-3): la prueba centra el botón (`30ce6ffb`) y sigue exigiendo que nada lo tape.
  - Los dos `fix`, Nivel 1: verdes 2 de 2 en sus proyectos (el segundo, en los dos), sin repetir el completo. Salidas en `.piloto/salidas/7.14-2/`.
- **Base y mapa:** `db:probar` 1.366 en verde; `db:lint` sin errores (59 avisos y 69 «extra»); guardas 1.128 en verde; `mapa.sh --check` en verde; el CI
  del PR del 7.14-1 en verde.
- **PLAN › «Fase 7»:** «Tabla de criterios» (14 filas, con el push a un teléfono real «sin probar») y «Cierre de la Fase 7»; la «Partición» marcada con
  fechas y docs de paso; «Total de la fase: 14 pasos y 34 partes»; 7-1 y 7-2 cerrados, «Los decide la persona» con 7-3, 7-4 y 7-5, y «Cerrados en la
  fase»; «Riesgos y huecos» con lo que resolvió cada uno.
- **Fichas** de `agenda`, `chat`, `notificaciones` y `buscador` con su parte del recorrido y sus abiertos. **GLOSARIO:** «Campana» y «Widget del chat».
  **UX:** las filas de Chat, Notificaciones y Perfil estaban duplicadas (quedan las completas) y la barra superior ya no dice que el buscador espera a la
  Fase 7. **`.claude/rules/migraciones.md`:** las excepciones sin versión del chat (`chat_grupo_miembros`, `chat_leer`, `chat_silenciar`, `mensaje_eliminar`).
- **ESTADO:** la Fase 7 cerrada, el completo del 7.14-2, 5a-4b, los abiertos 7-x, «Fase 9: 9-13» como único pendiente de las fases 7 a 9 y, de la deuda,
  fuera los permisos que ya tienen enforcement y `push_web`, que tiene interfaz.
- e2e completo: sí (7.14-2, cierre, Nivel 3: escritorio 1.207 en verde, 17 saltadas, 1 caída, 53,5 min; movil 839 en verde, 29 saltadas, 1 caída, 34,6 min; las dos caídas, de la prueba, arregladas en d24a019a y 30ce6ffb)
