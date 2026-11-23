// The printable fixture list. Rebuild both files with: python scripts/build-fixture-pdf.py
import fixturePdfInfo from '../assets/bpl-2027-fixture.json';
import fixturePdfUrl from '../assets/bpl-2027-fixture.pdf?url';

export { fixturePdfUrl };

/** Download name carries the update date, so a new copy never overwrites or hides behind the old one. */
export const FIXTURE_PDF_NAME = `BPL-2027-Fixture-${fixturePdfInfo.updated}.pdf`;
