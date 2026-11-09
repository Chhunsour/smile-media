import Link from 'next/link';
import legal from '../../legal.config.json';

export function PolicyNotice() {
  return legal.status !== 'approved' || !legal.approvedByOwner ?
    <div className="rounded-2xl bg-mist p-5 text-[14.5px] leading-relaxed text-ink-2"><strong>Release draft — not yet effective.</strong> This service-policy draft describes the candidate implementation. Operator identity, public contacts, retention, processing locations and final terms require owner confirmation and approval before release. The public browser workspace remains a simulated demo.</div> :
    <p>Effective {legal.effectiveDate}. Operated by {legal.operatorName.replace(/\.?$/, '.')}</p>;
}
export function PrivacyContact() {
  return legal.privacyEmail ? <a href={'mailto:' + legal.privacyEmail}>{legal.privacyEmail}</a> : <Link href="/support/">privacy contact — pending owner confirmation</Link>;
}
