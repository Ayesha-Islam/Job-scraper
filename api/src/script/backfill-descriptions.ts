import { db } from '../lib/prisma';

const BATCH_SIZE = 100;
const SLEEP_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeJobDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

    // Preserve common HTML headings as markdown-style heading markers.
    // The UI renders these lines as real headings without injecting HTML.
    .replace(/<h[1-6][^>]*>/gi, '\n## ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(
      /<(p|div)[^>]*>\s*<(strong|b)[^>]*>\s*([\s\S]{2,120}?)\s*<\/\2>\s*<\/\1>/gi,
      (_match, _block, _bold, text) => `\n## ${text}\n\n`
    )
    .replace(
      /<(strong|b)[^>]*>\s*([^<]{2,120}?)\s*(?:<br\s*\/?>\s*){1,}<\/\1>/gi,
      (_match, _tag, text) => `\n## ${text}\n\n`
    )

    // Remove empty/whitespace-only HTML blocks before turning block tags into newlines.
    .replace(/<(p|div|li|h[1-6])[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi, '')

    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(p|div|section|article|ul|ol|li)[^>]*>/gi, '\n')
    .replace(/<\/(p|div|section|article|ul|ol|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')

    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

    .replace(/[\u00A0\u200B\u200C\u200D\u2028\u2029\uFEFF]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(## .+)\n(?!\n)/gm, '$1\n\n')
    .trim();

  return cleaned || null;
}

function hasDirtyDescription(description: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(description) || /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/i.test(description);
}

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;
  let unchanged = 0;

  console.log('Starting description backfill...');

  while (true) {
    const rows = await db.job.findMany({
      take: BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        position: true,
        company: true,
        description: true,
      },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      scanned++;

      if (!row.description || !hasDirtyDescription(row.description)) {
        unchanged++;
        continue;
      }

      const cleaned = normalizeJobDescription(row.description);

      if (cleaned !== row.description) {
        await db.job.update({
          where: { id: row.id },
          data: { description: cleaned },
        });

        updated++;
        console.log(`Cleaned: ${row.position} @ ${row.company}`);
      } else {
        unchanged++;
      }
    }

    cursor = rows[rows.length - 1].id;

    console.log(`Progress: scanned=${scanned}, updated=${updated}, unchanged=${unchanged}`);

    await sleep(SLEEP_MS);
  }

  console.log(`Done. scanned=${scanned}, updated=${updated}, unchanged=${unchanged}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });