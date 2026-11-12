/**
 * Report-only cleaning (block contract B3): runs the server's attribute rules over stored documents
 * and says what cleaning WOULD change, by node type, path and rule. Never prints any content.
 *
 *   npx tsx scripts/report-cleaning.ts <documents.json>     a JSON list of stored documents
 *
 * Used on staging before a block's cleaning is enforced, and by the browser suite on the document
 * the editor really saved. Exit code 1 when anything would change or a type is unknown.
 */
import {readFileSync} from 'node:fs';
import {cleanDocument, type JSONContent} from '../packages/shared/src/index';

const documents = JSON.parse(readFileSync(process.argv[2], 'utf8')) as JSONContent[];
const rules = new Map<string, number>();
const unknown = new Set<string>();
for (const doc of documents) {
  const report = cleanDocument(doc, () => false);
  report.unknown.forEach(type => unknown.add(type));
  for (const issue of report.issues) {
    const key = `${issue.type} ${issue.path.replace(/\/\d+/g, '/n').replace(/\[\d+\]/g, '[n]')}: ${issue.rule}`;
    rules.set(key, (rules.get(key) ?? 0) + 1);
  }
}
const changes = [...rules.values()].reduce((sum, count) => sum + count, 0);
console.log(JSON.stringify({documents: documents.length, changes, unknown: [...unknown], rules: Object.fromEntries(rules)}));
process.exit(changes || unknown.size ? 1 : 0);
