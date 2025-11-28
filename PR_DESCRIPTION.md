# Description

This PR introduces advanced search capabilities, including support for boolean operators and phrase matching, along with significant UI/UX improvements to the search bar and results page.

- **Advanced Search Syntax**: Added backend support for `AND`, `OR`, `NOT`, and exact phrase matching (`"..."`) using OpenSearch's `query_string`.
- **Smart Fallback**: Implemented a fallback mechanism that reverts to simple search if the advanced query fails or returns no results.
- **Search Bar Enhancements**: Refactored `UnifiedSearchBar` to include an `@` mention feature for quick index filtering and improved the settings menu UI.
- **Search Tips**: Added a "Search Tips" dialog and a "No Results" state with helpful suggestions to guide users on using the new syntax.
- **UX Improvements**: Enhanced search term persistence and added visual cues for search shortcuts.

# Details

- **Testing Advanced Search**:
  - **Boolean Operators**: `AND`, `OR`, `NOT`, `+` (required), `-` (prohibit).
    - Example: `(surely OR shirley) AND serious`
  - **Phrase Matching**: Use quotes for exact phrases.
    - Example: `"surely you can't be serious"`
  - **Wildcards**: `?` (single char), `*` (multiple chars).
    - Example: `shir* OR ser?ous`
  - **Fuzzy Search**: `~` for similar terms.
    - Example: `shirley~` (matches "surely")
  - **Proximity Search**: `~N` for words within N distance.
    - Example: `"surely serious"~5`
  - **Boosting**: `^N` to increase term relevance.
    - Example: `speak jive^5`
- **Testing Fallback**: Try a query with invalid syntax (e.g., mismatched quotes) to verify it falls back to a simple search without crashing.
- **Testing @ Mentions**: Type `@` in the search bar to see a list of available shows/indexes and select one to filter.
- **Search Tips**: Click the help icon in the search bar settings or the "Search Tips" button on the "No Results" page to view the syntax cheat sheet.
