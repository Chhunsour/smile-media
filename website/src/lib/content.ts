export const platforms = [
  { id: "instagram", name: "Instagram", color: "#E1306C", detail: "Photos, carousels & video", requirement: "Connect an Instagram professional account linked to a Facebook Page." },
  { id: "tiktok", name: "TikTok", color: "#111114", detail: "Videos & photo posts", requirement: "Connect your TikTok account. Posting availability depends on TikTok permissions and app approval." },
  { id: "youtube", name: "YouTube", color: "#FF0033", detail: "Video uploads", requirement: "Connect a YouTube channel. A video is required; set a title and visibility before publishing." },
  { id: "facebook", name: "Facebook", color: "#1877F2", detail: "Posts for your Pages", requirement: "Connect a Facebook account with access to the Pages you want to publish to." },
  { id: "x", name: "X", color: "#111114", detail: "Text, images & video", requirement: "Connect your X account. Posting is subject to API access, media limits, and platform rate limits." },
  { id: "telegram", name: "Telegram", color: "#229ED9", detail: "Channel updates", requirement: "Add the configured bot as an administrator to your Telegram channel, then connect the channel." },
] as const;
export type PlatformId = (typeof platforms)[number]["id"];

export const faqs = [
  { q: "Can I try MultiPostly in my browser?", a: "Yes. Choose Try the app to open the real MultiPostly app at /app in demo mode. Explore the tabs, create a post, preview it, publish to sample accounts, and view insights without signing up. Publishing, connections, and AI suggestions are simulated; no real post is sent." },
  { q: "What is MultiPostly?", a: "MultiPostly is a mobile app for creating one post and publishing it to multiple social platforms. You can choose accounts, adapt captions, schedule posts, and track publishing status in one place." },
  { q: "Which platforms does MultiPostly support?", a: "MultiPostly includes integrations for Facebook Pages, Instagram professional accounts, TikTok, YouTube, X, and Telegram channels. Live availability depends on platform permissions, account eligibility, and service configuration." },
  { q: "Can I change a caption for each platform?", a: "Yes. Start with one shared caption, then customize it for individual platforms. MultiPostly also checks platform-specific caption and media requirements before you publish." },
  { q: "Can I schedule a post for later?", a: "Yes. Choose a date and time in the composer and review upcoming posts in the calendar. Live scheduling requires the publishing service to be configured and your accounts to remain connected." },
  { q: "What happens if one platform fails?", a: "MultiPostly shows a separate publishing result for each destination. You can see what went live, read the error for a failed destination, and retry eligible failures." },
  { q: "Does every platform accept the same content?", a: "No. Each platform has its own media, caption, and account rules. For example, YouTube requires a video, and Instagram needs media and an eligible professional account. The review step helps you catch issues." },
  { q: "Does MultiPostly include AI writing tools?", a: "Yes. The app includes tools to improve captions, translate text, suggest hashtags, and shorten copy. Live AI assistance depends on the configured AI service." },
  { q: "How much does MultiPostly cost?", a: "Launch pricing has not been announced. The plans on the Pricing page are a preview and may change before launch. No payment is collected on this website." },
  { q: "Where can I download the app?", a: "Visit the Get the app page for iOS and Android availability. Verified store links will appear there when supplied. This preview does not claim an App Store or Google Play release." },
  { q: "Are the screenshots real?", a: "Yes. Every screen on this website is captured from the MultiPostly app running in demo mode. Studio names and numbers are illustrative demo data." },
] as const;

export const featureItems = [
  { title: "Your voice. Every channel.", description: "One starting caption. Platform-specific edits. A preview before the world sees it.", screen: "compose", icon: "write" },
  { title: "Make room for your next idea.", description: "Schedule a drop, save a draft, and see what’s coming in your calendar.", screen: "calendar", icon: "calendar" },
  { title: "Know exactly what went live.", description: "Follow each destination, spot an issue, and retry eligible failures.", screen: "publishing", icon: "send" },
  { title: "Keep your best words close.", description: "Save captions, sign-offs, and hashtag sets as reusable templates.", screen: "templates", icon: "bookmark" },
] as const;
