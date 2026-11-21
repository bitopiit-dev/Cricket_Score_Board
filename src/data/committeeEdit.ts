import type { CommitteeMember } from './committee';

/** A url-safe id from a name ("Mr. K A Rahman" -> "k-a-rahman"), unique in the list. */
export function memberId(name: string, taken: readonly string[]): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/^(mr|mrs|ms|md|dr)\.?\s+/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'member';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** A new plain member at the end of the list, with no photo yet. */
export function addMember(list: readonly CommitteeMember[], name: string): CommitteeMember[] {
  const id = memberId(
    name,
    list.map((m) => m.id),
  );
  return [...list, { id, name: name.trim(), role: 'member' }];
}

export function removeMember(list: readonly CommitteeMember[], i: number): CommitteeMember[] {
  return list.filter((_, j) => j !== i);
}

/** Moves the member at `i` one place up (-1) or down (1). */
export function moveMember(
  list: readonly CommitteeMember[],
  i: number,
  d: -1 | 1,
): CommitteeMember[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return [...list];
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** What stops the list from being saved, in plain Bengali for the admin. */
export function committeeProblems(list: readonly CommitteeMember[]): string[] {
  const out: string[] = [];
  if (list.length === 0) out.push('অন্তত একজন সদস্য লাগবে');
  const blank = list.filter((m) => !m.name?.trim()).length;
  if (blank > 0) out.push(`${blank} জনের নাম খালি`);
  const names = list.map((m) => m.name?.trim().toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length) out.push('একই নাম দুবার আছে');
  return out;
}
