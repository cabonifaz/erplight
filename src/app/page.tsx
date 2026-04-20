import { redirect } from 'next/navigation';

export default function Home() {
  // Al entrar a localhost:3000, te lanza de inmediato a /login
  redirect('/login');
}