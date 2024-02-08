import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import { V2SearchContext } from "./v2-search-context";



export const V2SearchDetailsProvider = ({ children }) => {
    const { pathname } = useLocation();
    const [show, setShow] = useState('_universal');
    const [cid, setCid] = useState();
    const [searchQuery, setSearchQuery] = useState('');
    const [frame, setFrame] = useState('');
    const [fineTuningFrame, setFineTuningFrame] = useState();
    const [localCids, setLocalCids] = useState();

    useEffect(() => {
        if (pathname === '/') {
            setShow('_universal')
        }
        if (!(pathname.startsWith('/frame') || pathname.startsWith('/editor'))) {
            setFineTuningFrame(null)
        }
    }, [pathname])

    return (
        <V2SearchContext.Provider
            value={{
                show,
                setShow,
                searchQuery,
                setSearchQuery,
                frame,
                setFrame,
                fineTuningFrame,
                setFineTuningFrame,
                cid,
                setCid,
                localCids,
                setLocalCids
            }}
        >
            {children}
        </V2SearchContext.Provider>
    );
};

V2SearchDetailsProvider.propTypes = {
    children: PropTypes.node
}