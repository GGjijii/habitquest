import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HabitQuestApp from '@/components/HabitQuestApp';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // middlewareで基本弾かれるはずだが、念のため二重にガードしておく
  if (!user) {
    redirect('/login');
  }

  return <HabitQuestApp userId={user.id} />;
}
