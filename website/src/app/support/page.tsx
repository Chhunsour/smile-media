import Link from 'next/link';
import { PageHero } from '@/components/ui';
import { PolicyNotice, PrivacyContact } from '@/components/policy-notice';
import { pageMetadata } from '@/lib/seo';
import legal from '../../../legal.config.json';

export const metadata = pageMetadata('Support', 'MultiPostly support, privacy requests and account deletion without signing in.', '/support');
export default function Support() {
  return <><PageHero name="Support" path="/support" title="Support and privacy requests" description="Help and deletion instructions are available without signing in." />
    <article className="wrap prose-legal max-w-[720px] pb-28"><PolicyNotice />
      <section><h2>Contact</h2><p>Service support: {legal.supportEmail ? <a href={'mailto:' + legal.supportEmail}>{legal.supportEmail}</a> : <strong>the owner must confirm a public support email before live availability</strong>}. Privacy and no-login deletion requests: <PrivacyContact />.</p><p>This preview does not send requests or claim that an unconfirmed mailbox is monitored. A verified contact must be published before App Review and public registration.</p></section>
      <section><h2>Request account deletion without signing in</h2><p>Once the contact above is operational, send your MultiPostly account email, the request you want completed and enough information to identify your account. Do not send a password, Meta login code, access token, App Secret or unrelated identity documents. We may ask for proportionate ownership confirmation before changing account data. You can also use the in-app deletion control or Meta’s configured removal flow described in <Link href="/data-deletion/">Data deletion</Link>.</p></section>
      <section><h2>Publishing issues</h2><p>Include the app version, approximate time/timezone, affected destination and safe error code. Exclude credentials and unrelated personal data. If a result is uncertain, check the actual social destination before trying another publication or change. The browser demo cannot publish real posts or connect real accounts.</p></section>
    </article></>;
}
