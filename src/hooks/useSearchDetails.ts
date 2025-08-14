import { useContext } from 'react';
import { SearchContext } from '../contexts/SearchContext';

export type SearchContextValue = {
	show: string;
	setShow: (value: string) => void;
	searchQuery: string;
	setSearchQuery: (value: string) => void;
	frame: string;
	setFrame: (value: string) => void;
	fineTuningFrame: string | null | undefined;
	setFineTuningFrame: (value: string | null | undefined) => void;
};

const useSearchDetails = (): SearchContextValue => {
	const context = useContext(SearchContext) as SearchContextValue | undefined;

	if (!context) {
		throw new Error('useSearchDetails must be used within a SearchDetailsProvider');
	}

	return context;
};

export default useSearchDetails;