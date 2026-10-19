-- «Míos» de quien ve «todos» y tiene pocos leads propios se lee por su cartera (cierre 5a-fix-4, `docs/PLAN.md` 5a-5).
--
-- Medido (`docs/RENDIMIENTO.md` › «Cierre 5a-fix-4», 212.000 leads, página de 101 filas como la pide la app): una persona con «todos» y 3 leads propios (una supervisora)
-- cuesta 81,9 ms leyendo «míos» de `leads_vista` (recorre `leads_listado_idx` entero: el plan genérico no sabe quién mira) y 5,3 ms por `leads_cartera_vista`; con 500
-- propios 37,0 contra 23,0, con 2.000 27,2 contra 22,4. Con la cartera grande es al revés o igual: el campo privado sin resultados de la dueña (40 % de los leads) 5.139 contra
-- 5.510 ms, su etiqueta 368 contra 587; Berta (13 %) 1.896 contra 1.968; Ana (4,5 %) 705 contra 674. El cruce está en unos pocos miles de leads: con T = 5.000 nadie
-- empeora, ni con 62.000 ni con 212.000 leads, y la mejora que importa (la cartera de 3, de 82 a 5 ms) se queda.
--
-- La app (`fuenteDelListado()`) enruta por el alcance —quien ve «propios» siempre lee su cartera— y ahora también por el tamaño de la cartera de quien ve «todos»: esta función
-- dice si tiene como mucho T filas vigentes (cuenta hasta T + 1 por `leads_asesores_usuario_vigente_idx`, y no devuelve ningún número). Es sólo una pista de por dónde leer:
-- las dos vistas dan las mismas filas (`listado-cartera.sql` las compara con persona de «todos» incluida), así que ni una respuesta equivocada cambia lo que se ve.
-- `security definer` porque `leads_asesores` tiene su policy (la de la cartera de quien mira, con la baja en curso); cuenta sólo las filas de `auth.uid()`.

create or replace function public._leads_cartera_corta_tope() returns integer
language sql immutable parallel safe set search_path = '' as $$ select 5000 $$;
revoke all on function public._leads_cartera_corta_tope() from public, anon, authenticated;

create or replace function public.leads_cartera_corta()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select auth.uid()) is not null
    and (select count(*) from (select 1 from public.leads_asesores la
                                where la.usuario_id = (select auth.uid()) and la.revocado_en is null
                                limit public._leads_cartera_corta_tope() + 1) x) <= public._leads_cartera_corta_tope(),
    false)
$$;
revoke all on function public.leads_cartera_corta() from public, anon;
grant execute on function public.leads_cartera_corta() to authenticated;
comment on function public.leads_cartera_corta() is 'Si quien llama tiene como mucho _leads_cartera_corta_tope() filas vigentes en su cartera (5a-5). Sólo un sí o un no: la app lee «míos» por leads_cartera_vista si es así y quien ve «todos» tiene pocos leads propios. No devuelve ningún número.';
