insert into public.categories (
  id,
  user_id,
  name,
  icon,
  color,
  keywords,
  is_default,
  sort_order
)
values (
  'pet',
  null,
  'Pet',
  'PawPrint',
  '#EC4899',
  array['pet', 'cachorro', 'gato', 'ração', 'racao', 'veterinário', 'veterinario', 'banho e tosa', 'petshop']::text[],
  true,
  70
)
on conflict (id) do update
set user_id = null,
    name = excluded.name,
    icon = excluded.icon,
    color = excluded.color,
    keywords = excluded.keywords,
    is_default = true,
    sort_order = excluded.sort_order;
