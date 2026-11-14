import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ComingSoon } from '../components/common/ComingSoon';
import { SubPageTitle } from '../components/layout/AppShell';

/** Fixtures, Points, Stats and Media: placeholders until their data exists. */

const Page = ({ children }: { children: React.ReactNode }) => (
  <main className="mx-auto flex max-w-lg flex-col gap-4 p-4 md:max-w-2xl">{children}</main>
);

export function FixturesPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <ComingSoon
        icon="📅"
        title={t('tabs.fixtures')}
        text={t('comingSoon.fixtures')}
        items={t('comingSoon.fixturesItems', { returnObjects: true }) as string[]}
      />
    </Page>
  );
}

export function StatsPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <ComingSoon
        icon="🏏"
        title={t('tabs.stats')}
        text={t('comingSoon.stats')}
        items={t('comingSoon.statsItems', { returnObjects: true }) as string[]}
      >
        <Link
          to="/awards"
          className="mt-2 rounded-xl border border-dashed border-neon-cyan/50 px-4 py-2 font-semibold text-neon-cyan"
        >
          🏆 {t('comingSoon.seeAwards')} →
        </Link>
      </ComingSoon>
    </Page>
  );
}

export function MediaPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <SubPageTitle title={t('more.media')} parent="/more" />
      <ComingSoon
        icon="📸"
        title={t('more.media')}
        text={t('comingSoon.media')}
        items={['BPL-2025', 'BPL-2026', 'BPL-2027']}
      />
    </Page>
  );
}
