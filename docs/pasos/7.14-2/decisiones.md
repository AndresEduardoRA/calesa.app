# Paso 7.14-2 — El cierre de la Fase 7 (parte 2 de 2): el Nivel 3 y los docs de cierre

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/7.14-2.md`.

- **D1** El Nivel 3 corre sobre la rama unida a `main` al empezar (`941663d6`, con el 8.04 del carril b), antes de los docs: los docs no cambian lo que
  prueba el e2e y así el completo no espera a que se escriban.
- **D2** El 6.14-2 sigue en su PR: no se une `origin/a/6.14` a esta rama (acoplaría los dos PR y el coordinador integra cada uno con su CI). ESTADO sólo
  cambia lo de la Fase 7 y dice que la 6 cierra con el 6.14-2; PLAN sólo la sección de la Fase 7, para que la unión posterior choque lo menos posible.
- **D3** GLOSARIO suma «Campana» y «Widget del chat». El widget es el nombre del código (`<WidgetChat>`); «la burbuja», como le dicen los docs y las
  pruebas, queda dicha en su entrada y separada de la burbuja de un mensaje del hilo (que ya usa «Cita»), en vez de abrir un término aparte.
- **D4** 7-3, 7-4 y 7-5 quedan para la persona: tocan un dato de catálogo (una migración), una función `security definer` y otra pantalla, fuera de un
  paso de docs y de lo que pide la fila.
- **D5** Lo que no corre en el completo (`push-de-verdad.sh`, la unidad) va en la tabla con el resultado de su última corrida y dónde se corrió, no como
  verde del Nivel 3.
- **D6** UX tenía duplicadas las filas de Chat, Notificaciones y Perfil (una corta y otra al día): quedan las completas.
