/**
 * BGL Sports Committee members. Seed data for the future Supabase
 * `committee_members` table, where the admin will add, edit and remove them.
 *
 * Names are not filled in yet: a member without a name is shown as
 * "Member 1" / "সদস্য ১" in the current language.
 */
export type CommitteeRole = 'convener' | 'memberSecretary' | 'member';

export interface CommitteeMember {
  /** Stable slug; also the photo file name. */
  id: string;
  /** Shown exactly as written, never translated. Missing = placeholder. */
  name?: string;
  role: CommitteeRole;
  /** Path under public/, e.g. 'committee/member-1.jpg'. Optional. */
  photo?: string;
}

export const COMMITTEE_LOGO = 'images/bgl-sports-committee-logo.png';

/** Official BPL-2027 logo (transparent background). */
export const BPL_LOGO = 'images/bpl-2027-logo.png';
export const COMMITTEE_NAME = 'BGL Sports Committee';

const roleFor = (n: number): CommitteeRole =>
  n === 1 ? 'convener' : n === 2 ? 'memberSecretary' : 'member';

/** Listed in display order. */
export const COMMITTEE_MEMBERS: readonly CommitteeMember[] = Array.from({ length: 10 }, (_, i) => ({
  id: `member-${i + 1}`,
  role: roleFor(i + 1),
}));
