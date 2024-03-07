export default function getRandomIndex(array) {
    if(array.length === 0) {
      return null; // Return null if the array is empty
    }
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
  }