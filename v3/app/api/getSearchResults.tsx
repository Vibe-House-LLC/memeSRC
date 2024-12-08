export interface SearchResult {
  season: string;
  episode: string;
  subtitle_index: string;
  subtitle_text: string;
  start_frame: string;
  end_frame: string;
  cid: string;
}

export interface SearchResults {
  results: SearchResult[];
}

export async function getSearchResults(searchTerm: string, indexId: string = 'all'): Promise<SearchResults> {
  const apiUrl = `https://v2-beta.memesrc.com/search/${indexId}/${encodeURIComponent(searchTerm)}`;

  console.log(`URL: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data as SearchResults;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
