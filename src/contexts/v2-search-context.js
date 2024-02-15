import { createContext } from 'react'

export const V2SearchContext = createContext({
    show: '_universal',
    setShow: () => { console.log('setShow was called with no provider available'); },
    searchQuery: '',
    setSearchQuery: () => { console.log('setSearchQuery was called with no provider available'); },
    frame: '',
    setFrame: () => { console.log('setFrame was called with no provider available'); },
    fineTuningFrame: '',
    setFineTuningFrame: () => { console.log('setFineTuningFrame was called with no provider available'); },
    cid: '',
    setCid: () => { console.log('setCid was called with no provider available'); },
    localCids: null,
    setLocalCids: () => { console.log('setLocalCids was called with no provider available'); },
    showObj: null,
    setShowObj: () => { console.log('setShowObj was called with no provider available'); }
});

