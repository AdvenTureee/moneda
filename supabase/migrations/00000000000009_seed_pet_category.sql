-- 00000000000009_seed_pet_category.sql
-- Adiciona a categoria default "Pet". Diferente das outras defaults, sua
-- visibilidade é gated por profiles.has_pet (filtro de aplicação, não SQL).
-- Mantida como default global (user_id NULL, is_default true) para satisfazer
-- categories_default_user_chk e permitir uso transversal sem inserção por usuário.
--
-- Dependências: 00000000000005_init_seed_categories, 00000000000007_add_profile_finance_fields.

INSERT INTO public.categories (id, user_id, name, icon, color, keywords, sort_order, is_default)
VALUES
  ('pet', NULL, 'Pet', 'PawPrint', '#EC4899',
    ARRAY['petshop','pet shop','ração','racao','veterinário','veterinario',
          'vacina pet','tosa','banho pet','cachorro','gato','dogão','dogao',
          'cocheira','consulta veterinária','consulta veterinaria'],
    45, true)
ON CONFLICT (id) DO NOTHING;
