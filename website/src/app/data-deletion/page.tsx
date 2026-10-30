import Link from 'next/link';
import { PageHero } from '@/components/ui';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('Data deletion', 'How to disconnect Facebook and request deletion of MultiPostly account data.', '/data-deletion');
export default function DataDeletion() {
  return <><PageHero name="Data deletion" path="/data-deletion" title="Delete your data" description="Control your connected accounts and MultiPostly data." />
    <article className="wrap prose-legal max-w-[720px] pb-28">
      <div className="rounded-2xl bg-mist p-5"><strong>Release notice.</strong> These instructions describe the updated live app implementation. The public browser demo uses sample data. Live deletion and Meta callback URLs must be deployed and verified before launch.</div>
      <section><h2>Disconnect Facebook</h2><p>In the app, open You → Connected accounts → Facebook → Disconnect. This removes the stored Facebook credentials and destinations and stops pending schedules using those destinations. Other social connections remain available. To remove the shared Meta authorization, use Facebook Settings → Apps and websites or Business integrations and remove MultiPostly. Facebook and Instagram can share that authorization.</p></section>
      <section><h2>Delete your MultiPostly account</h2><p>In the live app, open You → Account → Delete account and data, then confirm. The backend removes your account, connected accounts and credentials, drafts, scheduled posts, publishing records, and uploaded media. Your sessions are revoked. Device caption templates and account preferences are cleared by the app. If a publish is already in progress, deletion waits until that request finishes or its safety timeout passes. Storage cleanup failures remain queued for retry.</p></section>
      <section><h2>Request deletion through Facebook</h2><p>When the service is released with its data deletion callback configured, Facebook can send a signed deletion request when you remove MultiPostly. MultiPostly validates the signature, maps the Facebook identity to the associated MultiPostly accounts, and removes their stored data. Facebook receives a confirmation code and a status URL. The status reports completion after cleanup succeeds.</p></section>
      <section><h2>Posts already sent to social networks</h2><p>Deleting local data does not remove content already published to Facebook or another platform. Manage that content on the platform where it was published. A request already sent to a platform may finish while you disconnect.</p></section>
      <section><h2>Before public release</h2><p>The operator must publish a verified privacy contact, retention periods including backups and deletion receipts, and a support route for people who cannot sign in. These details remain release requirements. See the <Link href="/privacy/">privacy notice</Link> for the current preview status.</p></section>
    </article></>;
}
