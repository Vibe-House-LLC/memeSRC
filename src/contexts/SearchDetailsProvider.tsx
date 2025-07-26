import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import { SearchContext } from "./SearchContext";



export const SearchDetailsProvider = ({ children }) => {
    const { pathname } = useLocation();
    const [show, setShow] = useState('_universal');
    const [searchQuery, setSearchQuery] = useState('');
    const [frame, setFrame] = useState('');
    const [fineTuningFrame, setFineTuningFrame] = useState();

    useEffect(() => {
        if (pathname === '/') {
            setShow('_universal')
        }
        if (!(pathname.startsWith('/frame') || pathname.startsWith('/editor'))) {
            setFineTuningFrame(null)
        }
    }, [pathname])

    return (
        <SearchContext.Provider value={{ show, setShow, searchQuery, setSearchQuery, frame, setFrame, fineTuningFrame, setFineTuningFrame }}>
            {children}
        </SearchContext.Provider>
    );
};

SearchDetailsProvider.propTypes = {
    children: PropTypes.node
}