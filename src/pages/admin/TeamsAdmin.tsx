import { useState } from 'react';
import { btn, Card, inputClass } from '../../components/common/controls';
import { TeamAvatar } from '../../components/common/TeamAvatar';
import {
  TOURNAMENT_TEAMS,
  squadWarnings,
  type TournamentPlayer,
  type TournamentTeam,
} from '../../data/teams';
import { SQUAD_LIMITS } from '../../config/tournament';
import { dataSource, resetData, saveData } from '../../sync/remoteData';
import { assetUrl } from '../../utils/asset';
import { squareImage, uploadMedia } from './media';
import { small, StatusLine, useStatus } from './shared';
import { groupOf } from '../../tournament/groups';

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'player';

function uniqueId(base: string, taken: string[]) {
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export function TeamsAdmin({ email }: { email: string }) {
  const [teams, setTeams] = useState<TournamentTeam[]>(() =>
    structuredClone([...TOURNAMENT_TEAMS]),
  );
  const [teamId, setTeamId] = useState(teams[0].id);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState('');
  const status = useStatus();
  const team = teams.find((t) => t.id === teamId)!;

  const setTeam = (patch: Partial<TournamentTeam>) => {
    setTeams((all) => all.map((t) => (t.id === teamId ? { ...t, ...patch } : t)));
    setDirty(true);
    status.clear();
  };
  const setPlayers = (players: TournamentPlayer[]) => setTeam({ players });
  const setPlayer = (i: number, patch: Partial<TournamentPlayer>) =>
    setPlayers(team.players.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  /** Only one captain and one vice-captain. */
  const setOnly = (i: number, key: 'captain' | 'viceCaptain') =>
    setPlayers(team.players.map((p, j) => ({ ...p, [key]: j === i ? !p[key] : false })));
  const move = (i: number, d: -1 | 1) => {
    const ps = [...team.players];
    [ps[i], ps[i + d]] = [ps[i + d], ps[i]];
    setPlayers(ps);
  };

  const upload = async (file: File | undefined, key: string, done: (url: string) => void) => {
    if (!file) return;
    setUploading(key);
    try {
      const isLogo = key === 'logo';
      const blob = await squareImage(file, 400, isLogo ? 'image/png' : 'image/jpeg');
      const path = `${isLogo ? 'logos' : `players/${team.id}`}/${key}-${Date.now()}.${isLogo ? 'png' : 'jpg'}`;
      done(await uploadMedia(path, blob));
    } catch (e) {
      alert(`ছবি আপলোড হয়নি: ${(e as Error).message}`);
    } finally {
      setUploading('');
    }
  };

  const warnings = squadWarnings(team, SQUAD_LIMITS);

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        এখন চালু: {dataSource('teams') === 'built-in' ? 'কোডের আসল তালিকা' : 'আপনার সেভ করা তালিকা'}।
        একটা দল বদলে অন্য দলে গেলেও বদল থাকবে, শেষে একবার সেভ করলেই হবে।
      </p>
      <select className={inputClass} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} (গ্রুপ {groupOf(t.id) ?? t.group}, {t.players.length} জন)
          </option>
        ))}
      </select>

      <div className="flex items-center gap-3">
        <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="md" />
        <label className={`${btn.secondary} cursor-pointer py-2 text-sm`}>
          {uploading === 'logo' ? 'আপলোড হচ্ছে…' : 'লোগো বদলান'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) =>
              void upload(e.target.files?.[0], 'logo', (url) => setTeam({ logo: url }))
            }
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className="col-span-2 flex flex-col text-xs font-semibold">
          দলের নাম
          <input
            className={inputClass}
            value={team.name}
            onChange={(e) => setTeam({ name: e.target.value })}
          />
        </label>
        <label className="flex flex-col text-xs font-semibold">
          সংক্ষেপ
          <input
            className={inputClass}
            maxLength={4}
            value={team.short}
            onChange={(e) => setTeam({ short: e.target.value.toUpperCase() })}
          />
        </label>
        <label className="flex flex-col text-xs font-semibold">
          রং
          <input
            type="color"
            className="h-10 w-full rounded-lg"
            value={team.color}
            onChange={(e) => setTeam({ color: e.target.value })}
          />
        </label>
      </div>
      {warnings.length > 0 && (
        <p className="text-xs font-semibold text-amber-700">⚠ দলে সমস্যা: {warnings.join(', ')}</p>
      )}

      <ol className="flex flex-col gap-1.5">
        {team.players.map((p, i) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 p-1.5 dark:border-slate-700"
          >
            <label className="relative cursor-pointer" title="ছবি বদলান">
              {p.photo ? (
                <img
                  src={assetUrl(p.photo)}
                  alt=""
                  className="size-10 rounded-full object-cover"
                  onError={(e) => (e.currentTarget.style.opacity = '0.2')}
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-xs">
                  ছবি
                </span>
              )}
              {uploading === p.id && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] text-white">
                  …
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) =>
                  void upload(e.target.files?.[0], p.id, (url) => setPlayer(i, { photo: url }))
                }
              />
            </label>
            <input
              className={`${small} min-w-0 flex-1`}
              value={p.name}
              aria-label="নাম"
              onChange={(e) => setPlayer(i, { name: e.target.value })}
            />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={!!p.captain} onChange={() => setOnly(i, 'captain')} />
              C
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={!!p.viceCaptain}
                onChange={() => setOnly(i, 'viceCaptain')}
              />
              VC
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={!!p.substitute}
                onChange={() => setPlayer(i, { substitute: !p.substitute })}
              />
              অতিরিক্ত
            </label>
            <button
              type="button"
              className={small}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label="ওপরে"
            >
              ↑
            </button>
            <button
              type="button"
              className={small}
              disabled={i === team.players.length - 1}
              onClick={() => move(i, 1)}
              aria-label="নিচে"
            >
              ↓
            </button>
            <button
              type="button"
              className={`${small} text-red-600`}
              aria-label="বাদ দিন"
              onClick={() =>
                confirm(`${p.name}-কে দল থেকে বাদ দেবেন?`) &&
                setPlayers(team.players.filter((_, j) => j !== i))
              }
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={btn.secondary}
        onClick={() => {
          const name = prompt('নতুন খেলোয়াড়ের নাম')?.trim();
          if (!name) return;
          const id = uniqueId(
            slug(name),
            team.players.map((p) => p.id),
          );
          setPlayers([...team.players, { id, name }]);
        }}
      >
        + খেলোয়াড় যোগ করুন
      </button>

      <div className="sticky bottom-20 flex flex-wrap gap-2 rounded-xl bg-white/95 py-2 md:bottom-2 dark:bg-slate-900/95">
        <button
          type="button"
          className={`${btn.primary} flex-1`}
          disabled={!dirty || status.busy || !!uploading}
          onClick={() =>
            void status.run(async () => {
              // Groups always follow the fixture list
              await saveData(
                'teams',
                teams.map((x) => ({ ...x, group: groupOf(x.id) ?? x.group })),
                email,
              );
              setDirty(false);
            })
          }
        >
          {status.busy ? 'সেভ হচ্ছে…' : 'সব দলের বদল সেভ করুন'}
        </button>
        <button
          type="button"
          className={btn.secondary}
          disabled={status.busy}
          onClick={() => {
            if (!confirm('সব বদল বাদ দিয়ে কোডের আসল দল-তালিকায় ফিরে যাবেন?')) return;
            void status.run(async () => {
              await resetData('teams');
              setTeams(structuredClone([...TOURNAMENT_TEAMS]));
              setDirty(false);
              return 'আসল তালিকায় ফিরে গেছে।';
            });
          }}
        >
          আসলটায় ফিরুন
        </button>
      </div>
      <StatusLine msg={status.msg} />
    </Card>
  );
}
