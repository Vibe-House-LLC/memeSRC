const { loadAsync } = require("jszip");

/**
 * Downloads zip files from the provided array of objects, each containing a link and an ID, then extracts the files as File objects.
 * 
 * @param {Array<{id: string, link: string}>} linksArray - Array of objects with the link to the zip file and an ID.
 * @returns {Promise<Array<{id: string, files: File[]}>>} A promise that resolves to an array of objects, each containing an ID and an array of File objects for the files within the zip.
 */
const zipToJszipArray = async (linksArray) => {
    const downloadPromises = linksArray.map(item => {
        return fetch(item.link)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.blob();
            })
            .then(blob => loadAsync(blob))
            .then(zip => {
                // Extract files and convert them to File objects
                const filesProcessing = Object.values(zip.files)
                                               .filter(file => !file.dir) // Exclude directories
                                               .map(file => 
                                                   file.async('blob').then(blob => 
                                                       new File([blob], file.name, {type: blob.type})
                                                   )
                                               );

                return Promise.all(filesProcessing).then(files => ({
                    id: item.id,
                    files // Array of File objects
                }));
            })
            .catch(err => {
                console.error('Error with ID:', item.id, err);
                // Return the ID with an error message to indicate failure
                return { id: item.id, error: err.message };
            });
    });

    return Promise.all(downloadPromises);
};

export default zipToJszipArray;
