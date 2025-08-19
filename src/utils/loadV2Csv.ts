import { Storage } from 'aws-amplify';
import getV2Metadata from './getV2Metadata';

export default async function loadV2Csv(show: string): Promise<any[] | null> {
  async function loadFile(cid: string): Promise<any[]> {
    try {
      const result: any = (await Storage.get(`src/${cid}/_docs.csv`, {
        level: 'public',
        download: true,
        customPrefix: { public: 'protected/' },
      }) ) as any;

      const body: any = result?.Body ?? result;
      const text: string = await body.text();

      const lines = text.split('\n');
      const headers = lines[0].split(',').map((header: string) => header.trim());
      return lines.slice(1).map((line: string) => {
        const values = line.split(',').map((value: string) => value.trim());
        return headers.reduce((obj: any, header: string, index: number) => {
          obj[header] = values[index] ? values[index] : '';
          if (header === 'subtitle_text' && obj[header]) {
            obj.base64_subtitle = obj[header]; // Store the base64 version
            obj[header] = atob(obj[header]); // Decode to regular text
          }
          return obj;
        }, {} as any);
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

