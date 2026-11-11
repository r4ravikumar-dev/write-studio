import {redirect} from 'next/navigation';

/** There is no public site: the front door is the Studio (sign in, or your workspace). */
export default function Home() {
  redirect('/studio');
}
