import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createSessionClient } from '@/lib/supabase/server';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryExpenseCount,
} from '@/lib/categories';
import { cacheTags } from '@/lib/cache';
import { noStoreJson } from '@/lib/http';

function invalidateCategoryCaches(userId: string) {
  revalidateTag(cacheTags.categories(userId), { expire: 0 });
}

export async function GET() {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
    }

    const categories = await getCategories(user.id);
    return noStoreJson({ data: categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return noStoreJson({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const { id, name, icon, color, keywords } = body;
        if (!id || !name || !icon || !color) {
          return noStoreJson({ error: 'Campos obrigatórios: id, name, icon, color.' }, { status: 400 });
        }
        const cat = await createCategory(user.id, { id, name, icon, color, keywords: keywords ?? [] });
        invalidateCategoryCaches(user.id);
        return noStoreJson({ data: cat });
      }

      case 'update': {
        const { id, name, icon, color, keywords } = body;
        if (!id) {
          return noStoreJson({ error: 'Campo obrigatório: id.' }, { status: 400 });
        }
        const cat = await updateCategory(user.id, id, { name, icon, color, keywords });
        invalidateCategoryCaches(user.id);
        return noStoreJson({ data: cat });
      }

      case 'delete': {
        const { id } = body;
        if (!id) {
          return noStoreJson({ error: 'Campo obrigatório: id.' }, { status: 400 });
        }

        const count = await getCategoryExpenseCount(user.id, id);
        if (count > 0) {
          return noStoreJson({
            error: `Não é possível excluir "${id}" pois existem ${count} gasto(s) associado(s) a ela.`
          }, { status: 409 });
        }

        await deleteCategory(user.id, id);
        invalidateCategoryCaches(user.id);
        return noStoreJson({ ok: true });
      }

      default:
        return noStoreJson({ error: 'Ação inválida.' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return noStoreJson({ error: message }, { status: 500 });
  }
}
