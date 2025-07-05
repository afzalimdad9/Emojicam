import Layout from '../components/Layout';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import type { GetServerSideProps } from 'next';
import { getUserProfile } from '../lib/firestoreUser';

export default function Dashboard({ user }: { user: { name?: string; email?: string } }) {
  return (
    <Layout>
      <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-4xl font-extrabold text-blue-700">Dashboard</h1>
        <p className="mb-6 text-center text-lg text-gray-700">
          Welcome{user?.name ? `, ${user.name}` : ''}!<br />
          Here you can manage your meetings and profile.
        </p>
        <nav className="mb-4 flex gap-4">
          <Link
            href="/"
            className="rounded bg-gray-800 px-4 py-2 text-white transition hover:bg-gray-900"
          >
            Home
          </Link>
          <Link
            href="/meetings"
            className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Meetings
          </Link>
        </nav>
        <div className="mt-4 w-full border-t pt-4 text-center text-sm text-gray-500">
          <span>Email: {user?.email || 'N/A'}</span>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session || !session.user?.email) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }
  const profile = await getUserProfile(session.user.email);
  if (!profile || !profile.name) {
    return {
      redirect: {
        destination: '/profile-setup',
        permanent: false,
      },
    };
  }
  return {
    props: { user: { ...session.user, ...profile } },
  };
};
