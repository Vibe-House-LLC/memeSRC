import { createContext } from 'react'

export const UserContext = createContext({
    user: false,
    setUser: () => {},
    login: () => {}
});