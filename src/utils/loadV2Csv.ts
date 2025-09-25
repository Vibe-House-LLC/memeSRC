import { Storage } from 'aws-amplify';
import getV2Metadata from './getV2Metadata';

export default async function loadV2Csv(show: string): Promise<any[] | null> {
  function parseCsv(text: string): string[][] {
    // Remove BOM if present
    if (text && text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const rows: string[][] = [];
    let currentField = '';
    let currentRow: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          const peek = text[i + 1];
          if (peek === '"') {
            // Escaped quote inside quoted field
            currentField += '"';
            i += 1; // Skip the escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\n') {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        } else if (char === '\r') {
          // Ignore CR; if followed by \n, the \n branch will handle row end
          // If lone \r (old Mac), treat as newline
          if (text[i + 1] !== '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
          }
        } else {
          currentField += char;
        }
      }
    }

    // Flush last field/row
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    // Trim outer whitespace on all fields
    return rows.map((r) => r.map((v) => (v ?? '').trim()))
      // Filter out completely empty rows
      .filter((r) => r.some((v) => v !== ''));
  }

  async function loadFile(cid: string): Promise<any[]> {
    try {
      const result: any = (await Storage.get(`src/${cid}/_docs.csv`, {
        level: 'public',
        download: true,
        customPrefix: { public: 'protected/' },
      }) ) as any;

      const body: any = result?.Body ?? result;
      const text: string = await body.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        return [];
      }
      const headers = rows[0].map((header: string) => header.trim());

      return rows.slice(1).map((values: string[]) => {
        const rowObj = headers.reduce((obj: any, header: string, index: number) => {
          const rawValue = values[index] ?? '';
          obj[header] = rawValue;
          if (header === 'subtitle_text' && obj[header]) {
            obj.base64_subtitle = obj[header];
            try {
              obj[header] = atob(String(obj[header]));
            } catch (e) {
              console.warn('Failed to decode base64 subtitle_text for row', e);
            }
          }
          return obj;
        }, {} as any);
        return rowObj;
      });
    } catch (error) {
      console.error('Failed to load file:', error);
      return [];
    }
  }

  async function initialize(cid: string | null = null): Promise<any[] | null> {
    const selectedCid = cid;
    if (!selectedCid) {
      alert('Please enter a valid CID.');
      return null;
    }
    const lines = await loadFile(cid);
    if (lines?.length > 0) {
      // Decode base64 subtitle and assign to a new property
      const decodedLines = lines.map((line: any) => ({
        ...line,
        // Ensure you decode the subtitle and assign it here
        subtitle: line.base64_subtitle ? atob(line.base64_subtitle) : '',
      }));
      // TODO: Return decodedLines to out of the entire loadV2Csv function
      return decodedLines;
    }
    return null;
  }

  const v2Metadata: any = await getV2Metadata(show);
  const showCsv = await initialize(v2Metadata.id);

  return showCsv;
}

