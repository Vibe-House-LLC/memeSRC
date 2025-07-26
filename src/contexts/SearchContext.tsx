import { createContext } from 'react'

export const SearchContext = createContext({
    show: '_universal',
    setShow: () => { console.log('setShow was called with no provider available'); },
    searchQuery: '',
    setSearchQuery: () => { console.log('setSearchQuery was called with no provider available'); },
    frame: '',
    setFrame: () => { console.log('setFrame was called with no provider available'); },
    fineTuningFrame: '',
    setFineTuningFrame: () => { console.log('setFineTuningFrame was called with no provider available'); },
});

