import { createContext } from 'react'

export const UserContext = createContext({
    user: false,
    setUser: () => {},
    shows: [],
    setShows: () => {},
    defaultShow: false,
    handleUpdateDefaultShow: () => {},
    setDefaultShow: () => {},
    handleUpdateUserDetails: () => {}
});