/**
 * URLdecode — URL Parser & Explainer
 *
 * Parsing logic inspired by and partially derived from:
 *   obsidianforensics/unfurl (https://github.com/obsidianforensics/unfurl)
 *   Copyright (c) Ryan Benson / obsidianforensics
 *
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file for full terms.
 */

'use strict';

// ============================================================
// COLORS
// ============================================================

const HOST_COLORS = {
  scheme:    '#0d6efd',
  subdomain: '#20c997',
  domain:    '#6610f2',
  tld:       '#6c757d',
  port:      '#e67e22',
  path:      '#e67e22',
  fragment:  '#dc3545',
};

const PARAM_COLORS = [
  '#0d6efd', '#6610f2', '#d63384',
  '#fd7e14', '#20c997', '#0dcaf0',
  '#198754', '#ffc107',
];

// ============================================================
// LOOKUP TABLES
// ============================================================

const TLD_DESCRIPTIONS = {
  com:  'commercial — originally for businesses, now the most widely used extension worldwide',
  org:  'organization — commonly used by non-profits, open-source projects, and communities',
  net:  'network — originally for internet infrastructure, now general purpose',
  gov:  'U.S. government — only official U.S. government agencies may use this',
  edu:  'education — reserved for U.S. accredited educational institutions',
  mil:  'U.S. military — restricted to the U.S. Department of Defense',
  int:  'international — reserved for international treaty organizations',
  io:   'originally British Indian Ocean Territory, now popular with tech startups',
  co:   'originally Colombia, widely used as a short alternative to .com',
  ai:   'originally Anguilla, popular with AI and tech companies',
  tv:   'originally Tuvalu, popular with media and streaming services',
  app:  'applications — a modern extension for apps and software products',
  dev:  'development — popular for developer tools and services',
  blog: 'blog — designed for blogging platforms and personal sites',
  uk:   'United Kingdom',
  de:   'Germany',
  fr:   'France',
  jp:   'Japan',
  au:   'Australia',
  ca:   'Canada',
  in:   'India',
  br:   'Brazil',
  nl:   'Netherlands',
  ru:   'Russia',
  cn:   'China',
};

const SCHEME_INFO = {
  https: {
    text: 'Secure connection (HTTPS). Your data is encrypted in transit between your browser and the server. This is the standard for all modern websites.',
    badge: { text: 'Secure', cls: 'badge-passive' },
  },
  http: {
    text: 'Unsecured connection (HTTP). Data travels in plain text and could be read by anyone on the same network. Avoid entering passwords or payment details on HTTP sites.',
    badge: { text: 'Not Secure', cls: 'badge-active' },
  },
  ftp: {
    text: 'File Transfer Protocol — used to upload or download files from a server. Mostly replaced by HTTPS downloads in everyday use.',
    badge: null,
  },
  ftps: {
    text: 'Secure File Transfer Protocol — the encrypted version of FTP.',
    badge: { text: 'Secure', cls: 'badge-passive' },
  },
  mailto: {
    text: 'Opens your default email app to compose a new message to the address in this link.',
    badge: null,
  },
  tel: {
    text: 'Initiates a phone call to the specified number, typically on mobile devices.',
    badge: null,
  },
  data: {
    text: 'A "data URL" — the file content is embedded directly inside the link itself, rather than fetched from a remote server. Often used for small images.',
    badge: null,
  },
  blob: {
    text: 'A temporary browser-generated URL pointing to in-memory data. These links only exist for the current browser session and cannot be shared.',
    badge: null,
  },
  file: {
    text: 'A path to a local file on this device. These links only work on the computer they were created on.',
    badge: null,
  },
};

// UTM campaign tracking parameters
const UTM_PARAMS = {
  utm_source: (v) => ({
    label: 'UTM: Traffic Source',
    explanation: `This link was shared via <strong>${esc(v)}</strong>. Marketers add <code>utm_source</code> to track where their visitors are coming from. Common values include "twitter", "newsletter", "google", or "facebook".`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  utm_medium: (v) => ({
    label: 'UTM: Marketing Channel',
    explanation: `The marketing channel is <strong>${esc(v)}</strong>. This describes <em>how</em> the link was delivered. Common values: "email", "social", "cpc" (paid ad), "organic", or "referral".`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  utm_campaign: (v) => ({
    label: 'UTM: Campaign Name',
    explanation: `This link belongs to a campaign called <strong>${esc(v)}</strong>. Businesses use this to group all links that are part of the same promotion so they can see which campaigns drive the most traffic.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  utm_term: (v) => ({
    label: 'UTM: Ad Keyword',
    explanation: `The paid search keyword that triggered this ad was <strong>${esc(v)}</strong>. This field is mainly used with Google Search ads to track which keywords are converting.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  utm_content: (v) => ({
    label: 'UTM: Link Variant',
    explanation: `Identifies which specific ad or link was clicked: <strong>${esc(v)}</strong>. Marketers use this when A/B testing two versions of the same email or ad, so they can see which one performs better.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  utm_id: (v) => ({
    label: 'UTM: Campaign ID',
    explanation: `A unique numeric identifier for this campaign: <strong>${esc(v)}</strong>. Used for automatic campaign import and matching in Google Analytics.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
};

// Google Search parameters
const GOOGLE_PARAMS = {
  q: (v) => ({
    label: 'Search Query',
    explanation: `The search terms entered: <strong>${esc(decode(v))}</strong>`,
  }),
  oq: (v) => ({
    label: 'Original Query',
    explanation: `What you originally typed before Google\'s autocomplete or spell-correction changed it: <strong>${esc(decode(v))}</strong>`,
  }),
  ei: (v) => ({
    label: 'Session Identifier',
    explanation: `A session identifier created when your search session started. It\'s base64-encoded and contains a timestamp — which means it can reveal roughly when a Google search session began. Google uses it to link multiple searches within the same session together.`,
  }),
  ved: (v) => ({
    label: 'Click Position Tracker',
    explanation: `Tracks exactly which result you clicked: its position in the list, the type of result (web link, image, news story, etc.), and how you got to this page. The value is a base64-encoded protocol buffer. Investigators use this to reconstruct which search result a user selected.`,
  }),
  source: (v) => {
    const map = { hp: 'the Google homepage', lnms: 'the navigation menu', tbs: 'search tools', lnt: 'the "Tools" menu' };
    return { label: 'Search Origin', explanation: `Where this search originated: <strong>${map[v] || esc(v)}</strong>` };
  },
  tbm: (v) => {
    const map = { isch: 'Images', nws: 'News', vid: 'Videos', shop: 'Shopping', bks: 'Books', flm: 'Flights' };
    return { label: 'Search Type', explanation: `You were searching specifically within: <strong>${map[v] || esc(v)}</strong>` };
  },
  rlz: (v) => ({
    label: 'Browser / Install Tracker',
    explanation: `A code Google uses to identify which browser and browser version you\'re using, and sometimes which distribution channel (e.g. a Chrome update or pre-installed browser) brought you to Google. It helps Google measure which products and partnerships are driving search traffic.`,
  }),
  num: (v) => ({
    label: 'Results Per Page',
    explanation: `Showing <strong>${esc(v)}</strong> results per page. The default is 10.`,
  }),
  start: (v) => ({
    label: 'Results Page Offset',
    explanation: `Displaying results starting from result #<strong>${parseInt(v) + 1}</strong> — this is page <strong>${Math.floor(parseInt(v) / 10) + 1}</strong> of results.`,
  }),
  safe: (v) => ({
    label: 'SafeSearch Setting',
    explanation: `SafeSearch is: <strong>${v === 'active' ? 'On — filtering explicit content' : v === 'off' ? 'Off — no filtering applied' : esc(v)}</strong>`,
  }),
  aqs: (v) => ({
    label: 'Autocomplete Session Data',
    explanation: `Encodes how you found this search term: whether you typed it fully or selected an autocomplete suggestion, how many characters you typed, and which suggestion position you chose. Used by Google to improve autocomplete.`,
  }),
  gs_lcrp: (v) => ({
    label: 'Autocomplete Tracking',
    explanation: `Detailed session data about your interaction with autocomplete suggestions, encoded as a base64 protocol buffer. Used internally by Google for search improvement.`,
  }),
  sca_esv: (v) => ({
    label: 'Client Version Hash',
    explanation: `An internal Google client version identifier used for A/B experiment tracking.`,
  }),
  sclient: (v) => ({
    label: 'Search Client',
    explanation: `Identifies which Google search interface you\'re using: <strong>${esc(v)}</strong>`,
  }),
  uact: (v) => ({
    label: 'User Activity Code',
    explanation: `An internal user activity tracking code used by Google to categorize the search action: <strong>${esc(v)}</strong>`,
  }),
};

// YouTube parameters
const YOUTUBE_PARAMS = {
  v: (v) => ({
    label: 'Video ID',
    explanation: `The unique identifier for this YouTube video: <strong>${esc(v)}</strong>. Every YouTube video has one — it\'s the part after <code>?v=</code> in the URL.`,
  }),
  t: (v) => {
    const secs = parseInt(v, 10);
    if (!isNaN(secs)) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      const parts = [];
      if (h) parts.push(`${h} hr`);
      if (m) parts.push(`${m} min`);
      parts.push(`${s} sec`);
      return { label: 'Video Start Time', explanation: `The video starts at <strong>${parts.join(' ')}</strong> in (${secs} seconds total).` };
    }
    return { label: 'Video Start Time', explanation: `Start time: <strong>${esc(v)}</strong>` };
  },
  list: (v) => ({
    label: 'Playlist ID',
    explanation: `This video is playing from a playlist with ID: <strong>${esc(v)}</strong>`,
  }),
  index: (v) => ({
    label: 'Playlist Position',
    explanation: `This is video number <strong>${esc(v)}</strong> in the playlist.`,
  }),
  si: (v) => ({
    label: 'YouTube Share Tracker',
    explanation: `A tracking identifier added by YouTube when a video link is shared. It helps YouTube measure how often shared links are clicked, similar in purpose to UTM parameters.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
};

// Bing Search parameters
const BING_PARAMS = {
  q: (v) => ({
    label: 'Search Query',
    explanation: `The search terms entered: <strong>${esc(decode(v))}</strong>`,
  }),
  form: (v) => ({
    label: 'Search Origin',
    explanation: `A code identifying where this search came from within Bing: <strong>${esc(v)}</strong>`,
  }),
  PC: (v) => ({
    label: 'Browser/Partner Code',
    explanation: `A code identifying the browser or partner that sent this search to Bing: <strong>${esc(v)}</strong>. Similar to Google\'s <code>rlz</code> parameter.`,
  }),
  cvid: (v) => ({
    label: 'Conversation ID',
    explanation: `A unique session identifier for this Bing search session: <strong>${esc(v)}</strong>`,
  }),
};

// DuckDuckGo parameters
const DDG_PARAMS = {
  q: (v) => ({
    label: 'Search Query',
    explanation: `The search terms entered: <strong>${esc(decode(v))}</strong>`,
  }),
  t: (v) => ({
    label: 'Referral Source',
    explanation: `Identifies which browser or app sent this search to DuckDuckGo: <strong>${esc(v)}</strong>. DuckDuckGo uses this to track which integrations are most popular.`,
  }),
  ia: (v) => ({
    label: 'Instant Answer Type',
    explanation: `The type of "instant answer" or result panel DuckDuckGo is showing: <strong>${esc(v)}</strong>`,
  }),
};

// Facebook/Meta parameters
const FACEBOOK_PARAMS = {
  fbclid: (v) => ({
    label: 'Facebook Click ID',
    explanation: `A <strong>Facebook tracking code</strong> automatically added when you click a link on Facebook or Instagram. It tells the destination website that you came from Facebook, and links your visit to a specific ad or post. The site owner can use this to measure how effective their Facebook content is at driving traffic.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
};

// Advertising and cross-platform trackers
const AD_TRACKING_PARAMS = {
  gclid: (v) => ({
    label: 'Google Ads Click ID',
    explanation: `A <strong>Google Ads tracking ID</strong> added automatically when you click a paid Google ad. The website uses this to know which specific ad brought you there and whether you completed a purchase or goal afterward.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  gad_source: (v) => ({
    label: 'Google Ads Source',
    explanation: `Confirms this visit came from a Google Ads campaign. The value <strong>${esc(v)}</strong> identifies which type of Google ad network served the ad.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  _ga: (v) => ({
    label: 'Google Analytics Tracker',
    explanation: `A <strong>Google Analytics cross-domain tracking parameter</strong>. It carries your analytics session ID from one website to another, allowing Google Analytics to follow your journey across multiple domains in one session.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  _gl: (v) => ({
    label: 'Google Analytics Linker',
    explanation: `Encodes your full Google Analytics session for cross-domain handoff. Allows a website to maintain your analytics session when navigating to a partner domain.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  msclkid: (v) => ({
    label: 'Microsoft Ads Click ID',
    explanation: `A <strong>Microsoft Advertising (Bing Ads) tracking ID</strong> — the Microsoft equivalent of Google\'s <code>gclid</code>. Added when you click a paid Microsoft/Bing advertisement.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  ttclid: (v) => ({
    label: 'TikTok Click ID',
    explanation: `A <strong>TikTok Ads tracking ID</strong> added when you click a TikTok advertisement. Used by the destination site to measure ad conversions.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  twclid: (v) => ({
    label: 'Twitter/X Ads Click ID',
    explanation: `A <strong>Twitter/X Ads tracking ID</strong> added when you click a paid advertisement on Twitter or X.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  _hsenc: (v) => ({
    label: 'HubSpot Email Tracker',
    explanation: `A <strong>HubSpot CRM tracking code</strong>. This link was clicked from inside a HubSpot marketing email. HubSpot uses this to tell the campaign sender which specific recipients clicked which links.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  _hsmi: (v) => ({
    label: 'HubSpot Email ID',
    explanation: `The ID of the HubSpot email that contained this link: <strong>${esc(v)}</strong>`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  mc_cid: (v) => ({
    label: 'Mailchimp Campaign ID',
    explanation: `A <strong>Mailchimp campaign identifier</strong>: <strong>${esc(v)}</strong>. Confirms this link came from a Mailchimp email campaign.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  mc_eid: (v) => ({
    label: 'Mailchimp Recipient ID',
    explanation: `A <strong>Mailchimp subscriber identifier</strong>. Tracks which specific email recipient clicked this link.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
  igsh: (v) => ({
    label: 'Instagram Share Tracker',
    explanation: `A tracking parameter added when content is shared from Instagram. Used by Meta to measure engagement and link click-throughs from Instagram posts and stories.`,
    badge: { text: 'Tracker', cls: 'badge-active' },
  }),
};

// Sensitive parameter names that warrant a warning
const SENSITIVE_PARAMS = {
  token:         'Access Token',
  access_token:  'Access Token',
  id_token:      'ID Token',
  refresh_token: 'Refresh Token',
  api_key:       'API Key',
  apikey:        'API Key',
  password:      'Password',
  passwd:        'Password',
  secret:        'Secret Key',
  client_secret: 'Client Secret',
  private_key:   'Private Key',
};

const TWITTER_SHARE_METHODS = {
  '11': 'Twitter for iPhone',
  '12': 'Twitter for Android',
  '19': 'Twitter Web App',
  '20': 'TweetDeck',
  '21': 'Twitter for iPad',
  '51': 'Twitter for Mac',
  '78': 'Mobile Share Sheet',
};

// ============================================================
// UTILITIES
// ============================================================

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function decode(v) {
  try { return decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { return v; }
}

function isUrlEncoded(v) {
  return typeof v === 'string' && /%[0-9A-Fa-f]{2}/.test(v);
}

function tryBase64Decode(value) {
  if (!value || value.length < 8 || value.length > 500) return null;
  if (/^\d+$/.test(value)) return null;
  if (!/^[A-Za-z0-9+/\-_=]+$/.test(value)) return null;
  try {
    const norm = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = norm + '==='.slice(0, (4 - norm.length % 4) % 4);
    const raw = atob(padded);
    let printable = 0;
    for (const c of raw) {
      const code = c.charCodeAt(0);
      if (code >= 32 && code < 127) printable++;
    }
    if (raw.length > 2 && printable / raw.length > 0.7 && raw !== value) return raw;
  } catch (e) {}
  return null;
}

function tryUnixTimestamp(value) {
  if (!/^\d+$/.test(value)) return null;
  const num = parseInt(value, 10);
  if (value.length === 10 && num > 978307200 && num < 9999999999)
    return { date: new Date(num * 1000), unit: 'seconds' };
  if (value.length === 13 && num > 978307200000 && num < 9999999999999)
    return { date: new Date(num), unit: 'milliseconds' };
  return null;
}

function decodeSnowflake(id, epoch) {
  try {
    const ms = (BigInt(id) >> BigInt(22)) + BigInt(epoch);
    return new Date(Number(ms));
  } catch (e) { return null; }
}

function fmtDate(date) {
  return date.toUTCString().replace(' GMT', ' UTC');
}

function parseHostname(hostname) {
  const parts = hostname.split('.');
  const multiPartTLDs = ['co.uk','com.au','co.jp','com.br','co.in','org.uk','me.uk','net.au','co.nz','com.mx','co.za'];
  const lastTwo = parts.slice(-2).join('.');
  let tld, domain, subdomain;
  if (multiPartTLDs.includes(lastTwo) && parts.length >= 3) {
    tld = lastTwo;
    domain = parts[parts.length - 3];
    subdomain = parts.slice(0, -3).join('.') || null;
  } else if (parts.length >= 2) {
    tld = parts[parts.length - 1];
    domain = parts[parts.length - 2];
    subdomain = parts.slice(0, -2).join('.') || null;
  } else {
    tld = null; domain = hostname; subdomain = null;
  }
  return { subdomain, domain, tld };
}

const PLATFORM_PATTERNS = {
  google:     /(?:^|\.)google\./,
  youtube:    /(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$/,
  twitter:    /(?:^|\.)(?:twitter|x)\.com$/,
  facebook:   /(?:^|\.)facebook\.com$|(?:^|\.)fb\.com$/,
  instagram:  /(?:^|\.)instagram\.com$/,
  linkedin:   /(?:^|\.)linkedin\.com$/,
  bing:       /(?:^|\.)bing\.com$/,
  duckduckgo: /(?:^|\.)duckduckgo\.com$/,
  reddit:     /(?:^|\.)reddit\.com$/,
  tiktok:     /(?:^|\.)tiktok\.com$/,
};

function detectPlatform(hostname) {
  for (const [name, rx] of Object.entries(PLATFORM_PATTERNS)) {
    if (rx.test(hostname)) return name;
  }
  return 'generic';
}

// ============================================================
// MAIN PARSER
// ============================================================

function parseURL(rawUrl) {
  let urlStr = rawUrl.trim();
  if (!urlStr.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//)) urlStr = 'https://' + urlStr;

  let url;
  try { url = new URL(urlStr); }
  catch (e) { throw new Error("Couldn't parse that URL. Please check it's a complete, valid link and try again."); }

  const platform = detectPlatform(url.hostname);
  const segments = [];

  // --- SCHEME ---
  const scheme = url.protocol.replace(':', '');
  const si = SCHEME_INFO[scheme] || { text: `Uses the <strong>${esc(scheme)}</strong> protocol.`, badge: null };
  segments.push({ id: 'scheme', category: 'Structure', label: 'Protocol', rawValue: url.protocol, colorHex: HOST_COLORS.scheme, explanation: si.text, badge: si.badge });

  // --- HOST ---
  const { subdomain, domain, tld } = parseHostname(url.hostname);

  if (subdomain) {
    segments.push({
      id: 'subdomain', category: 'Host', label: 'Subdomain', rawValue: subdomain, colorHex: HOST_COLORS.subdomain,
      explanation: subdomain === 'www'
        ? '<strong>www</strong> stands for "World Wide Web." It\'s a traditional prefix with no real technical meaning today — most sites work identically with or without it.'
        : `The <strong>${esc(subdomain)}</strong> subdomain points to a specific section or server of the site. For example, <em>maps</em>.google.com is Google Maps and <em>mail</em>.google.com is Gmail.`,
      badge: null,
    });
  }

  segments.push({ id: 'domain', category: 'Host', label: 'Domain Name', rawValue: domain, colorHex: HOST_COLORS.domain, explanation: `The registered website name: <strong>${esc(domain)}</strong>. This is what the site owner paid to register.`, badge: null });

  if (tld) {
    segments.push({ id: 'tld', category: 'Host', label: 'Domain Extension (TLD)', rawValue: '.' + tld, colorHex: HOST_COLORS.tld, explanation: `<strong>.${esc(tld)}</strong> is the domain extension — ${TLD_DESCRIPTIONS[tld] || 'a top-level domain'}.`, badge: null });
  }

  // --- PORT ---
  if (url.port) {
    const portNotes = { '80': 'the default HTTP port', '443': 'the default HTTPS port', '8080': 'a common alternative web port used during development', '8443': 'an alternative HTTPS port', '3000': 'a common local development server port', '5000': 'a common local development server port' };
    segments.push({ id: 'port', category: 'Structure', label: 'Port', rawValue: ':' + url.port, colorHex: HOST_COLORS.port, explanation: `Port <strong>${url.port}</strong> — ${portNotes[url.port] || 'a custom port number. Standard websites use port 443 (HTTPS) or 80 (HTTP), which browsers hide by default.'}`, badge: null });
  }

  // --- PATH ---
  if (url.pathname && url.pathname !== '/') {
    const parts = url.pathname.split('/').filter(Boolean);

    if (platform === 'twitter' && parts.length >= 3 && parts[1] === 'status') {
      segments.push({ id: 'path-user', category: 'Path', label: 'Twitter/X Username', rawValue: '/' + parts[0], colorHex: HOST_COLORS.path, explanation: `The Twitter/X account: <strong>@${esc(parts[0])}</strong>`, badge: null });
      segments.push({ id: 'path-status', category: 'Path', label: 'Content Type', rawValue: '/status', colorHex: HOST_COLORS.path, explanation: 'This is a direct link to a specific <strong>post (tweet)</strong>.', badge: null });
      const tid = parts[2];
      const tdate = decodeSnowflake(tid, 1288834974657);
      segments.push({
        id: 'path-tweetid', category: 'Path', label: 'Post ID (Snowflake)', rawValue: '/' + tid, colorHex: HOST_COLORS.path,
        explanation: `The unique ID for this post: <strong>${esc(tid)}</strong>. Twitter/X uses <em>Snowflake IDs</em> — a format where the ID itself encodes the creation timestamp.${tdate ? ` This post was created: <strong>${fmtDate(tdate)}</strong>.` : ''}`,
        badge: null,
      });
    } else if (parts.length === 1) {
      const dec = isUrlEncoded(parts[0]) ? decode(parts[0]) : null;
      segments.push({ id: 'path', category: 'Path', label: 'Page Path', rawValue: url.pathname, colorHex: HOST_COLORS.path, explanation: `The path to the page or resource on this site: <strong>${esc(dec || url.pathname)}</strong>${dec ? ' <em>(URL-decoded)</em>' : ''}`, badge: null });
    } else {
      parts.forEach((p, i) => {
        const dec = isUrlEncoded(p) ? decode(p) : null;
        segments.push({ id: `path-${i}`, category: 'Path', label: `Path Segment ${i + 1}`, rawValue: '/' + p, colorHex: HOST_COLORS.path, explanation: `Segment ${i + 1} of the page path: <strong>/${esc(dec || p)}</strong>${dec ? ` — URL-decoded from <code>${esc(p)}</code>` : ''}`, badge: null });
      });
    }
  }

  // --- QUERY PARAMETERS ---
  let paramIdx = 0;
  url.searchParams.forEach((value, key) => {
    const colorHex = PARAM_COLORS[paramIdx % PARAM_COLORS.length];
    paramIdx++;

    const lk = key.toLowerCase();
    let result = null;

    if (platform === 'google' && GOOGLE_PARAMS[key])           result = GOOGLE_PARAMS[key](value);
    else if (platform === 'youtube' && YOUTUBE_PARAMS[key])    result = YOUTUBE_PARAMS[key](value);
    else if (platform === 'bing' && BING_PARAMS[key])          result = BING_PARAMS[key](value);
    else if (platform === 'duckduckgo' && DDG_PARAMS[key])     result = DDG_PARAMS[key](value);
    else if (platform === 'twitter' && key === 's')            result = { label: 'Share Method', explanation: `This post was shared via: <strong>${esc(TWITTER_SHARE_METHODS[value] || `share code ${value}`)}</strong>` };
    else if (UTM_PARAMS[lk])                                   result = UTM_PARAMS[lk](value);
    else if (FACEBOOK_PARAMS[key])                             result = FACEBOOK_PARAMS[key](value);
    else if (AD_TRACKING_PARAMS[key])                          result = AD_TRACKING_PARAMS[key](value);
    else if (SENSITIVE_PARAMS[lk]) {
      result = {
        label: SENSITIVE_PARAMS[lk],
        explanation: `⚠️ This URL contains a <strong>${esc(SENSITIVE_PARAMS[lk])}</strong>. Be careful who you share this link with — this value may grant access to an account or resource.`,
        badge: { text: 'Sensitive', cls: 'badge-active' },
      };
    } else {
      // Generic: attempt to identify the value
      const ts = tryUnixTimestamp(value);
      const b64 = !ts ? tryBase64Decode(value) : null;
      const dec = isUrlEncoded(value) ? decode(value) : null;
      let explanation;
      if (ts)       explanation = `<strong>${esc(key)}</strong> = <strong>${esc(value)}</strong>. This looks like a <strong>Unix timestamp</strong>, representing the date/time: <strong>${fmtDate(ts.date)}</strong> (${ts.unit}).`;
      else if (b64) explanation = `<strong>${esc(key)}</strong> = <strong>${esc(value)}</strong>. This appears to be <strong>base64-encoded</strong> data. Decoded value: <strong>${esc(b64)}</strong>`;
      else if (dec) explanation = `<strong>${esc(key)}</strong> = <strong>${esc(dec)}</strong> <em>(URL-decoded)</em>. The purpose of this parameter isn't publicly documented — it may be session data, a site-specific ID, or internal configuration.`;
      else          explanation = `<strong>${esc(key)}</strong> = <strong>${esc(value)}</strong>. The purpose of this parameter isn't publicly documented — it may be session data, a site-specific ID, or internal configuration.`;
      result = { label: `Parameter: ${key}`, explanation };
    }

    segments.push({ id: `param-${key}`, category: 'Query Parameter', label: result.label, rawValue: `${key}=${value}`, colorHex, explanation: result.explanation, badge: result.badge || null });
  });

  // --- FRAGMENT ---
  if (url.hash) {
    const frag = url.hash.substring(1);
    const dec = isUrlEncoded(frag) ? decode(frag) : null;
    segments.push({ id: 'fragment', category: 'Structure', label: 'Fragment / Anchor', rawValue: url.hash, colorHex: HOST_COLORS.fragment, explanation: `The <strong>#</strong> marks a fragment or anchor. <strong>${esc(dec || frag)}</strong> tells the browser to scroll to the section of the page with this name or ID.${dec ? ` URL-decoded from: <code>${esc(frag)}</code>` : ''} Fragments are never sent to the server — they're processed entirely by your browser.`, badge: null });
  }

  return { segments, platform, url };
}

// ============================================================
// COLOR-CODED URL BUILDER
// ============================================================

function seg(text, color, id) {
  return `<span class="url-segment" style="color:${color};border-bottom:2px solid ${color};" data-segment="${id}" title="Click to jump to explanation">${esc(text)}</span>`;
}

function buildColoredUrl(rawUrl) {
  try {
    let urlStr = rawUrl.trim();
    if (!urlStr.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//)) urlStr = 'https://' + urlStr;
    const url = new URL(urlStr);
    const { subdomain, domain, tld } = parseHostname(url.hostname);
    const platform = detectPlatform(url.hostname);
    let html = '';

    html += seg(url.protocol.replace(':', '') + '://', HOST_COLORS.scheme, 'scheme');
    if (subdomain) html += seg(subdomain + '.', HOST_COLORS.subdomain, 'subdomain');
    html += seg(domain, HOST_COLORS.domain, 'domain');
    if (tld) html += seg('.' + tld, HOST_COLORS.tld, 'tld');
    if (url.port) html += seg(':' + url.port, HOST_COLORS.port, 'port');

    if (url.pathname && url.pathname !== '/') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (platform === 'twitter' && parts.length >= 3 && parts[1] === 'status') {
        html += seg('/' + parts[0], HOST_COLORS.path, 'path-user');
        html += seg('/status', HOST_COLORS.path, 'path-status');
        html += seg('/' + parts[2], HOST_COLORS.path, 'path-tweetid');
      } else {
        html += seg(url.pathname, HOST_COLORS.path, 'path-0');
      }
    } else if (url.pathname === '/') {
      html += `<span style="color:${HOST_COLORS.tld};">/</span>`;
    }

    const params = [...url.searchParams.entries()];
    params.forEach(([key, value], i) => {
      const color = PARAM_COLORS[i % PARAM_COLORS.length];
      const sep = i === 0 ? '?' : '&';
      html += `<span style="color:#6c757d;font-weight:600;">${sep}</span>`;
      html += seg(`${key}=${value}`, color, `param-${key}`);
    });

    if (url.hash) html += seg(url.hash, HOST_COLORS.fragment, 'fragment');

    return html;
  } catch (e) {
    return esc(rawUrl);
  }
}

// ============================================================
// RENDERING
// ============================================================

function renderResults(segments) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  let hasTrackers = false, hasSensitive = false;

  segments.forEach(s => {
    if (s.badge?.text === 'Tracker')   hasTrackers = true;
    if (s.badge?.text === 'Sensitive') hasSensitive = true;

    const tr = document.createElement('tr');
    tr.id = `row-${s.id}`;
    tr.className = 'breakdown-row';
    tr.style.cssText = `border-left: 4px solid ${s.colorHex};`;
    tr.innerHTML = `
      <td>
        <div class="component-category">${esc(s.category)}</div>
        <div class="component-label">${esc(s.label)}</div>
        ${s.badge ? `<span class="${s.badge.cls}" style="font-size:0.7rem;margin-top:4px;display:inline-block;">${esc(s.badge.text)}</span>` : ''}
      </td>
      <td><code class="raw-value">${esc(s.rawValue)}</code></td>
      <td class="explanation-text">${s.explanation}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('trackerWarning').classList.toggle('d-none', !hasTrackers);
  document.getElementById('sensitiveWarning').classList.toggle('d-none', !hasSensitive);
}

// ============================================================
// EXAMPLES
// ============================================================

const EXAMPLES = [
  {
    title: '🔍 Google Search URL',
    desc:  'See how Google tracks your search session',
    color: '#4285f4',
    url:   'https://www.google.com/search?q=what+is+osint&source=hp&ei=YzHsZbLvM4KChbIP9oa0qA0&oq=what+is+osint&gs_lcrp=EgZjaHJvbWUyBggAEEUYOQ&ved=0ahUKEwi7o&sclient=gws-wiz',
  },
  {
    title: '📣 Marketing / Tracked Link',
    desc:  'Discover the tracking codes marketers embed in links',
    color: '#d63384',
    url:   'https://www.example.com/blog/what-is-osint?utm_source=twitter&utm_medium=social&utm_campaign=osint-awareness-2024&utm_content=header_cta',
  },
  {
    title: '🐦 Twitter / X Post',
    desc:  'See how post IDs encode a timestamp',
    color: '#1da1f2',
    url:   'https://twitter.com/obsidianforensics/status/1205161015177961473?s=19',
  },
  {
    title: '📘 Facebook Shared Link',
    desc:  'Understand what Facebook appends when you click a link',
    color: '#1877f2',
    url:   'https://www.example.com/news/article?fbclid=IwAR3xK9abc123&utm_source=facebook&utm_medium=social',
  },
];

function loadExamples() {
  document.getElementById('exampleCards').innerHTML = EXAMPLES.map(ex => `
    <div class="col-sm-6 col-lg-3">
      <div class="example-card card h-100 p-3" onclick="useExample(${JSON.stringify(ex.url)})" style="border-top:4px solid ${ex.color};cursor:pointer;">
        <div style="font-size:1rem;font-weight:700;margin-bottom:6px;">${ex.title}</div>
        <div style="font-size:0.82rem;color:#555;margin-bottom:10px;">${ex.desc}</div>
        <div class="example-url">${esc(ex.url)}</div>
      </div>
    </div>
  `).join('');
}

function useExample(url) {
  document.getElementById('urlInput').value = url;
  analyzeURL();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// PLATFORM BADGE
// ============================================================

const PLATFORM_META = {
  google:     { label: 'Google',      color: '#4285f4' },
  youtube:    { label: 'YouTube',     color: '#ff0000' },
  twitter:    { label: 'Twitter / X', color: '#1da1f2' },
  facebook:   { label: 'Facebook',    color: '#1877f2' },
  instagram:  { label: 'Instagram',   color: '#e1306c' },
  linkedin:   { label: 'LinkedIn',    color: '#0a66c2' },
  bing:       { label: 'Bing',        color: '#00a0f0' },
  duckduckgo: { label: 'DuckDuckGo',  color: '#de5833' },
  reddit:     { label: 'Reddit',      color: '#ff4500' },
  tiktok:     { label: 'TikTok',      color: '#010101' },
};

// ============================================================
// MAIN ENTRY POINTS
// ============================================================

function analyzeURL() {
  const input = document.getElementById('urlInput').value.trim();
  if (!input) return;

  history.pushState(null, '', window.location.pathname + '?url=' + encodeURIComponent(input));

  document.getElementById('examplesArea').classList.add('d-none');
  document.getElementById('errorDisplay').classList.add('d-none');

  try {
    const { segments, platform } = parseURL(input);

    document.getElementById('coloredUrl').innerHTML = buildColoredUrl(input);
    document.getElementById('urlDisplay').classList.remove('d-none');

    renderResults(segments);
    document.getElementById('resultsArea').classList.remove('d-none');

    const badge = document.getElementById('platformBadge');
    const pm = PLATFORM_META[platform];
    if (pm) {
      badge.textContent = pm.label;
      badge.style.backgroundColor = pm.color;
      badge.style.color = '#fff';
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }

    document.getElementById('urlDisplay').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    document.getElementById('urlDisplay').classList.add('d-none');
    document.getElementById('resultsArea').classList.add('d-none');
    const err = document.getElementById('errorDisplay');
    err.textContent = e.message;
    err.classList.remove('d-none');
  }
}

function onInputChange() {
  if (!document.getElementById('urlInput').value.trim()) {
    document.getElementById('urlDisplay').classList.add('d-none');
    document.getElementById('resultsArea').classList.add('d-none');
    document.getElementById('examplesArea').classList.remove('d-none');
    document.getElementById('errorDisplay').classList.add('d-none');
    history.pushState(null, '', window.location.pathname);
  }
}

// Segment click: highlight matching table row
document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-segment]');
  if (!el) return;
  const row = document.getElementById('row-' + el.dataset.segment);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('highlighted');
    setTimeout(() => row.classList.remove('highlighted'), 2500);
  }
});

// Initialize on load
window.addEventListener('load', function () {
  loadExamples();
  const urlParam = new URLSearchParams(window.location.search).get('url');
  if (urlParam) {
    document.getElementById('urlInput').value = urlParam;
    analyzeURL();
  }
});
