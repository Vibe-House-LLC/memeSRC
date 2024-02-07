const { loadAsync } = require("jszip");

/**
 * Loads images from a zip file at the given URL. Optionally loads a specific file if a file name (without extension) is provided.
 * 
 * @param {string} link - URL of the zip file to load images from.
 * @param {string} [fileNameWithoutExt] - Optional. The name of a specific file to load from the zip, without its extension.
 * @returns {Promise<string[] | string>} A promise that resolves to an array of image URLs, or a single image URL if a file name is provided.
 */
const zipToImage = async (link, fileNameWithoutExt = null) => {

    return fetch(link)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.blob();
        })
        .then(blob => loadAsync(blob))
        .then(zip => {
            const files = fileNameWithoutExt
                ? Object.values(zip.files).filter(file => {
                    // Check if file name starts with the provided name and is not a directory
                    const regex = new RegExp(`^${fileNameWithoutExt}\\..+$`); // Matches "fileName.extension"
                    return regex.test(file.name) && !file.dir;
                  })
                : Object.values(zip.files);

            const filePromises = files.map(file => {
                if (!file.dir) { // Check if it's a file and not a folder
                    return file.async('blob').then(blob => {
                        return URL.createObjectURL(blob);
                    });
                }
                return null
            }).filter(Boolean); // Filter out undefined values (for folders or if fileNameWithoutExt does not exactly match)

            // If looking for a specific file, resolve to a single URL instead of an array
            return fileNameWithoutExt ? (filePromises[0] || Promise.reject(new Error('File not found'))) : Promise.all(filePromises);
        })
        .catch(err => {
            console.error('Error:', err);
            return err.message; // Optionally, return error message or handle it as needed
        });
};

export default zipToImage