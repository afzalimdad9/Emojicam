import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';
import { useState, useEffect } from 'react';
import { getUserProfile, setUserProfile } from '../lib/firestoreUser';
import { useRouter } from 'next/router';

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) {
      router.replace('/auth/signin');
      return;
    }
    getUserProfile(session.user.email).then((profile) => {
      if (profile) {
        setName(profile.name || '');
        setPhotoURL(profile.photoURL || '');
        setTimeZone(profile.timeZone || '');
      } else {
        setName(session.user.name || '');
        setPhotoURL(session.user.image || '');
      }
      setLoading(false);
    });
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;
    setSaving(true);
    await setUserProfile(session.user.email, { name, photoURL, timeZone });
    setSaving(false);
    router.replace('/dashboard');
  };

  if (loading)
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-extrabold text-blue-700">Your Profile</h1>
        <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required
          />
          <input
            type="url"
            placeholder="Photo URL (optional)"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Time Zone (e.g. America/New_York)"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-blue-600 py-3 text-lg font-semibold text-white shadow transition hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
        {photoURL && (
          <img
            src={photoURL}
            alt="Profile"
            className="mt-6 h-24 w-24 rounded-full border-2 border-blue-400 object-cover"
          />
        )}
        <div className="mt-6 text-sm text-gray-500">Email: {session?.user?.email}</div>
      </div>
    </Layout>
  );
}
