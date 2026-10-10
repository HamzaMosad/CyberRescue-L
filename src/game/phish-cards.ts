export type RedFlag = "link" | "rush" | "secret";

export interface PhishCard {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  link: string | null;
  isFake: boolean;
  reason: string;
  reasonAr: string;
  /** Suspicious part of the link to highlight. */
  flaw: string | null;
  flags: RedFlag[];
}

export const FAKE_CARDS: PhishCard[] = [
  { id: "f1", sender: "Bank Alert", avatar: "🏦", text: "Your account is locked! Click now to open it.", link: "bank-secure-login.xyz", isFake: true, reason: "Banks never use .xyz links and never rush you.", reasonAr: "البنوك لا تستخدم روابط ‎.xyz ولا تستعجلك.", flaw: ".xyz", flags: ["link", "rush"] },
  { id: "f2", sender: "PayPal", avatar: "💳", text: "Confirm your password to keep your account.", link: "paypa1.com", isFake: true, reason: "Look closely: 'paypa1' uses the number 1, not L.", reasonAr: "انظر جيداً: ‏paypa1 فيها رقم 1 بدل حرف L.", flaw: "paypa1", flags: ["link", "secret"] },
  { id: "f3", sender: "Prize Team", avatar: "🎁", text: "You WON a new iPhone! Claim it in 5 minutes.", link: "free-iphone-win.net", isFake: true, reason: "Free prizes with a timer are a classic scam.", reasonAr: "الجوائز المجانية مع مؤقت خدعة مشهورة.", flaw: "free-iphone-win", flags: ["link", "rush"] },
  { id: "f4", sender: "Insta Support", avatar: "📸", text: "Send us your password so we can verify you.", link: "insta-support.info", isFake: true, reason: "Real support never asks for your password.", reasonAr: "الدعم الحقيقي لا يطلب كلمة المرور أبداً.", flaw: ".info", flags: ["link", "secret"] },
  { id: "f5", sender: "DHL", avatar: "📦", text: "Pay $1 now to get your package today.", link: "dhl-pay-now.top", isFake: true, reason: "Delivery firms don't use .top pay links.", reasonAr: "شركات التوصيل لا تستخدم روابط دفع ‎.top.", flaw: ".top", flags: ["link", "rush", "secret"] },
  { id: "f6", sender: "Free Wi-Fi", avatar: "📶", text: "Enter your card number to get free Wi-Fi.", link: "free-wifi-card.biz", isFake: true, reason: "Free things never need your card number.", reasonAr: "الأشياء المجانية لا تحتاج رقم بطاقتك.", flaw: ".biz", flags: ["link", "secret"] },
  { id: "f7", sender: "Facebook", avatar: "👤", text: "Someone logged in! Log in here right now.", link: "faceb00k-security.com", isFake: true, reason: "'faceb00k' uses zeros instead of the letter O.", reasonAr: "‏faceb00k فيها أصفار بدل حرف O.", flaw: "faceb00k", flags: ["link", "rush"] },
  { id: "f8", sender: "Apple ID", avatar: "🍎", text: "Your Apple ID expires today. Verify your password.", link: "apple-id-verify.co", isFake: true, reason: "Apple only uses apple.com, not .co links.", reasonAr: "آبل تستخدم apple.com فقط وليس ‎.co.", flaw: "apple-id-verify.co", flags: ["link", "rush", "secret"] },
];

export const SAFE_CARDS: PhishCard[] = [
  { id: "s1", sender: "Google", avatar: "🔎", text: "Your verification code is 482913. Don't share it.", link: "google.com", isFake: false, reason: "Real domain, and it asks you for nothing.", reasonAr: "رابط حقيقي ولا يطلب منك شيئاً.", flaw: null, flags: [] },
  { id: "s2", sender: "School", avatar: "🏫", text: "Reminder: your math class starts at 10:00.", link: "school.edu", isFake: false, reason: "A normal reminder from a real .edu site.", reasonAr: "تذكير عادي من موقع ‎.edu حقيقي.", flaw: null, flags: [] },
  { id: "s3", sender: "Netflix", avatar: "🎬", text: "A new episode of your show is out!", link: "netflix.com", isFake: false, reason: "Real domain, no pressure, no password.", reasonAr: "رابط حقيقي بلا ضغط وبلا كلمة مرور.", flaw: null, flags: [] },
  { id: "s4", sender: "Mom", avatar: "👩", text: "Can you buy bread on your way home?", link: null, isFake: false, reason: "No link, no request for secrets. Just mom.", reasonAr: "لا رابط ولا طلب أسرار. إنها أمك فقط.", flaw: null, flags: [] },
  { id: "s5", sender: "Amazon", avatar: "🛒", text: "Good news: your order has shipped.", link: "amazon.com", isFake: false, reason: "Real domain and only shares information.", reasonAr: "رابط حقيقي ويعطيك معلومة فقط.", flaw: null, flags: [] },
  { id: "s6", sender: "Microsoft", avatar: "🪟", text: "An update is ready. Install it when you like.", link: "microsoft.com", isFake: false, reason: "Real domain and no rush at all.", reasonAr: "رابط حقيقي ولا يوجد استعجال.", flaw: null, flags: [] },
  { id: "s7", sender: "Spotify", avatar: "🎵", text: "Your weekly playlist is ready.", link: "spotify.com", isFake: false, reason: "Real domain, asks for nothing.", reasonAr: "رابط حقيقي ولا يطلب شيئاً.", flaw: null, flags: [] },
  { id: "s8", sender: "GitHub", avatar: "🐙", text: "Your project got a new star today.", link: "github.com", isFake: false, reason: "Real domain and a simple notification.", reasonAr: "رابط حقيقي وإشعار بسيط.", flaw: null, flags: [] },
];

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Same seed → same 10 cards (5 fake + 5 safe) in the same order on both devices. */
export function buildDeck(seed: number): PhishCard[] {
  const rand = mulberry32(seed);
  const fakes = shuffle(FAKE_CARDS, rand).slice(0, 5);
  const safes = shuffle(SAFE_CARDS, rand).slice(0, 5);
  return shuffle([...fakes, ...safes], rand);
}

export const EXAMPLE_CARD = FAKE_CARDS[1]!;
