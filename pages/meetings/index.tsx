import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getMeetingsForUser, Meeting } from '../../lib/firestoreMeeting';
import Link from 'next/link';
import Layout from '../../components/Layout';

function isUpcoming(meeting: Meeting) {
  return meeting.startTime.seconds * 1000 > Date.now();
}

export default function MeetingsPage() {
  const { data: session, status } = useSession();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) return;
    getMeetingsForUser(session.user.email).then((ms) => {
      setMeetings(ms);
      setLoading(false);
    });
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center">Loading...</div>
      </Layout>
    );
  }

  const upcoming = meetings
    .filter(isUpcoming)
    .sort((a, b) => a.startTime.seconds - b.startTime.seconds);
  const past = meetings
    .filter((m) => !isUpcoming(m))
    .sort((a, b) => b.startTime.seconds - a.startTime.seconds);

  return (
    <Layout>
      <div className="flex w-full flex-col items-center">
        <div className="mb-8 flex w-full items-center justify-between">
          <h1 className="text-3xl font-extrabold text-blue-700">Your Meetings</h1>
          <Link
            href="/meetings/new"
            className="rounded bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
          >
            + New Meeting
          </Link>
        </div>
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setTab('upcoming')}
            className={`rounded px-4 py-2 font-semibold ${tab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setTab('past')}
            className={`rounded px-4 py-2 font-semibold ${tab === 'past' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Past
          </button>
        </div>
        {tab === 'upcoming' ? (
          upcoming.length === 0 ? (
            <div className="text-gray-500">No upcoming meetings.</div>
          ) : (
            <div className="w-full max-w-2xl space-y-4">
              {upcoming.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex flex-col rounded-xl bg-white p-6 shadow md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-lg font-bold text-blue-800">{meeting.title}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(meeting.startTime.seconds * 1000).toLocaleString()} •{' '}
                      {meeting.duration} min
                    </div>
                    <div className="text-xs text-gray-500">ID: {meeting.id}</div>
                  </div>
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="mt-4 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 md:mt-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )
        ) : past.length === 0 ? (
          <div className="text-gray-500">No past meetings.</div>
        ) : (
          <div className="w-full max-w-2xl space-y-4">
            {past.map((meeting) => (
              <div
                key={meeting.id}
                className="flex flex-col rounded-xl bg-white p-6 shadow md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-lg font-bold text-blue-800">{meeting.title}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(meeting.startTime.seconds * 1000).toLocaleString()} •{' '}
                    {meeting.duration} min
                  </div>
                  <div className="text-xs text-gray-500">ID: {meeting.id}</div>
                </div>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="mt-4 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 md:mt-0"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
