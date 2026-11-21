/**
 * BGL Sports Committee members. This list is the built-in starting point; the
 * super admin adds, edits and removes members (and their photos) in
 * Admin → কমিটি, and that version (Supabase app_data 'committee') replaces
 * this one on every phone.
 *
 * Only members with a name are listed. Names are shown exactly as written.
 */
export type CommitteeRole = 'convener' | 'memberSecretary' | 'member';

export interface CommitteeMember {
  /** Stable slug; also the photo file name. */
  id: string;
  /** Shown exactly as written, never translated. Missing = placeholder. */
  name?: string;
  role: CommitteeRole;
  /** Path under public/ (e.g. 'committee/member-1.jpg') or an uploaded photo's web address. */
  photo?: string;
  /** Optional line under the name, e.g. a post or department. Shown as written. */
  title?: string;
}

export const COMMITTEE_ROLES: readonly CommitteeRole[] = ['convener', 'memberSecretary', 'member'];

export const COMMITTEE_LOGO = 'images/bgl-sports-committee-logo.webp';

/**
 * Official BPL-2027 logo (transparent background). Give the file a new name
 * whenever the logo changes: phones keep showing a cached copy of the old one.
 */
export const BPL_LOGO = 'images/bpl-2027-logo-v2.webp';
export const COMMITTEE_NAME = 'BGL Sports Committee';

const member = (id: string, name: string): CommitteeMember => ({
  id,
  name,
  role: 'member',
  photo: `committee/${id}.jpg`,
});

/**
 * Listed in display order. Everyone is a member; no convener or secretary.
 * The admin's saved version is copied into this array in place.
 */
export const COMMITTEE_MEMBERS: readonly CommitteeMember[] = [
  member('amzad-hossain', 'Mr. Amzad Hossain'),
  member('barkat-ullah', 'Mr. Barkat Ullah'),
  member('faisal-imam-tanim', 'Mr. Faisal Imam Tanim'),
  member('forhad-hossain', 'Mr. Forhad Hossain'),
  member('hossain', 'Mr. Hossain'),
  member('jakir-hossain', 'Mr. Jakir Hossain'),
  member('k-a-rahman', 'Mr. K A Rahman'),
  member('mahbubur-rahman-sohel', 'Mr. Mahbubur Rahman Sohel'),
  member('monir-hossain', 'Mr. Monir Hossain'),
];
