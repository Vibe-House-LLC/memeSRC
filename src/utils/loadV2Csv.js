import { Storage } from "aws-amplify";
import getV2Metadata from "./getV2Metadata";


export default async function loadV2Csv(show) {

    async function loadFile(cid) {
        try {
            // const response = await fetch(url);
            // const text = await response.text();

            const response = (await Storage.get(`src/${cid}/_docs.csv`, { level: 'public', download: true, customPrefix: { public: 'protected/' } })).Body
            const text = await response.text();

            const lines = text.split("\n");
            const headers = lines[0].split(",").map((header) => header.trim());
            return lines.slice(1).map((line) => {
                const values = line.split(",").map((value) => value.trim());
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index] ? values[index] : "";
                    if (header === "subtitle_text" && obj[header]) {
                        obj.base64_subtitle = obj[header]; // Store the base64 version
                        obj[header] = atob(obj[header]); // Decode to regular text
                    }
                    return obj;
                }, {});
            });
        } catch (error) {
            console.error("Failed to load file:", error);
            return [];
        }
    }

    async function initialize(cid = null) {
        const selectedCid = cid
        if (!selectedCid) {
            alert("Please enter a valid CID.");
            return null;
        }
        const lines = await loadFile(cid);
        if (lines?.length > 0) {
            // Decode base64 subtitle and assign to a new property
            const decodedLines = lines.map(line => ({
                ...line,
                subtitle: line.base64_subtitle ? atob(line.base64_subtitle) : "" // Ensure you decode the subtitle and assign it here
            }));
            //   TODO: Return decodedLines to out of the entire loadV2Csv function
            return decodedLines
        }
        return null
    }

    const v2Metadata = await getV2Metadata(show)
    const showCsv = await initialize(v2Metadata.id);

    return showCsv;
}