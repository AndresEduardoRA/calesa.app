## 6.09-1 — Aduana de lectura (2026-11-12)

- **D1** «Pagada» y «Faltan los tributos de N» salen sólo de la base (`pagada`, `faltan`); nunca se calculan en el cliente. Con `hayOcultos` y `faltan > 0` el texto agrega «y de unidades que no ves»;
  ya pagada no se dice nada de ocultos; sin vehículos, «Sin vehículos».
- **D2** El vencimiento usa el día de la empresa (`diaEnZona`): «Vencida el …» si pasó y no está pagada, «Vence hoy», «Vence mañana», «Vence en N días» (hasta 7), si no «Vence el 10 ene 2027». Una pagada
  muestra la fecha sin alarma. Siempre texto; el color sólo refuerza.
- **D3** El canal se dice con su texto («Verde», «Amarillo», «Rojo», «Sin canal»); los valores salen del tipo generado y el texto de un `Record` exhaustivo.
- **D6** Quien tiene `logistica.aduana.gestionar` y no `logistica.ver` no entra a la página ni ve el enlace (la página exige `logistica.ver`): lo más conservador.
- **D8** La lista abre el resumen por `?declaracion=<id>` en un `<Drawer>`; el alta y la edición (6.09-2) van por `?panel=` y no conviven con él.
- **D9** «Unidades» es el número de la base (acotado a 201: «más de 200»), nunca un total exacto.
- **D11** Sin paginación numerada: «Siguiente» por cursor `(creado_en, id)` y «Volver a las más recientes»; sin «Anterior».
- **D13** El hueco lee «Tributos pagados» de `declaracion_leer` (sin montos, funciona con sólo `logistica.ver`); si la unidad no está entre las 200 que trae, dice «Abre la declaración para ver los tributos.».
- **D14** El hueco pide `logistica.ver` y la regla `aduana`; sin declaración dice «Esta unidad no está en ninguna declaración.» con «Ver declaraciones».
- **Tributos en la lista:** el filtro «pagada» es una elección de tres (todas, pagadas, con tributos pendientes) y no un booleano: un «No» tri-estado no filtraría y el chip diría lo contrario.
- **Sin `medir-*.sql`** (tabla de volumen bajo, D34 de 6.07).
