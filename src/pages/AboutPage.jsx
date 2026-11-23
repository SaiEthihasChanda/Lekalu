import { ExternalLink, Globe, User, Users } from 'lucide-react';

const CREATOR = {
  name: 'Sai Ethihas Chanda',
  portfolio: 'https://saiethihaschanda.github.io/Portfolio/',
  projectPage: 'https://saiethihaschanda.github.io/Portfolio/projects/lekalu.html',
  github: 'https://github.com/SaiEthihasChanda',
  linkedin: 'https://www.linkedin.com/in/sai-ethihas-chanda-6724b0294/',
  linkedinPost: 'https://lnkd.in/p/dktYimiR',
};

const FEATURES = [
  ['Activity', 'Record income, expenses and transfers between your accounts. View today, this month, last month or the year so far, and filter by source, type or trackable.'],
  ['Sources', 'Add your bank accounts, cards and cash. Balances update from every activity.'],
  ['Trackables and Tracker', 'Set up recurring items like rent, salary or subscriptions, then tick them off as they happen each period.'],
  ['Analytics', 'Charts, per-trackable totals month by month, and a pivot table of where your money goes.'],
  ['Groups', 'Share expenses with family or flatmates in a group, with each member’s entries kept separate.'],
  ['SMS detection (Android)', 'The Android app can read bank and UPI SMS on your phone and suggest transactions for you to confirm. It spots duplicates, self-transfers, refunds and tracker payments, and learns which account and trackable a merchant belongs to.'],
  ['Private by design', 'Sensitive details are encrypted on your device before they are saved. You can lock the app with your fingerprint or face, and pick your own theme.'],
];

const LinkRow = ({ href, icon: Icon, label, detail }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 rounded-lg border border-gray-700 bg-primary/40 px-4 py-3 text-white hover:border-accent transition-colors"
  >
    <Icon size={18} className="text-accent shrink-0" />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium">{label}</span>
      <span className="block text-xs text-gray-400 truncate">{detail}</span>
    </span>
    <ExternalLink size={16} className="text-gray-500 shrink-0" />
  </a>
);

export const AboutPage = () => (
  <div className="p-4 md:p-8 max-w-3xl space-y-6">
    <div className="flex items-center gap-4">
      <img src="/lekalu-logo.png" alt="Lekalu" className="w-16 h-16" />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">About Lekalu</h1>
        <p className="text-sm text-gray-400">A personal and shared money tracker</p>
      </div>
    </div>

    <section className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6 space-y-4">
      <p className="text-gray-300 text-sm md:text-base">
        Lekalu helps you see where your money comes from and where it goes. Record what you earn and
        spend, keep recurring payments on track, and understand your habits with clear charts.
      </p>
      <ul className="space-y-3">
        {FEATURES.map(([title, text]) => (
          <li key={title}>
            <p className="text-white text-sm font-medium">{title}</p>
            <p className="text-gray-400 text-sm">{text}</p>
          </li>
        ))}
      </ul>
    </section>

    <section className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">Designed and built by</p>
        <p className="text-xl font-semibold text-white">{CREATOR.name}</p>
      </div>
      <div className="grid gap-2">
        <LinkRow href={CREATOR.portfolio} icon={Globe} label="Portfolio" detail="saiethihaschanda.github.io/Portfolio" />
        <LinkRow href={CREATOR.projectPage} icon={ExternalLink} label="Lekalu on my portfolio" detail="Screenshots and the story behind the app" />
        <LinkRow href={CREATOR.github} icon={User} label="GitHub" detail="github.com/SaiEthihasChanda" />
        <LinkRow href={CREATOR.linkedin} icon={Users} label="LinkedIn" detail="linkedin.com/in/sai-ethihas-chanda" />
        <LinkRow href={CREATOR.linkedinPost} icon={ExternalLink} label="Lekalu launch post" detail="Read the announcement on LinkedIn" />
      </div>
    </section>
  </div>
);
