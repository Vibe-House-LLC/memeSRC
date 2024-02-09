/**
 * Finds a file by its base name in an array of File objects and returns a URL created from that file.
 * 
 * @param {string} fileNameWithoutExt - The base name of the file to find, without its extension.
 * @param {File[]} filesArray - An array of File objects.
 * @returns {string | null} A URL for the file if found, or null if not found.
 */
function jszipObjToImage(fileNameWithoutExt, filesArray) {
    // Attempt to find a file that matches the base name without considering the extension
    const file = filesArray.find(f => f.name.split('.').slice(0, -1).join('.') === fileNameWithoutExt);

    if (file) {
        // If the file is found, create and return an object URL from the file
        return URL.createObjectURL(file);
    }

    // Return null if no matching file is found
    return null;
}

export default jszipObjToImage;
