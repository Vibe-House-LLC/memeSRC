import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { useLocation, useParams } from 'react-router-dom';
import { V2SearchContext } from "./v2-search-context";



export const V2SearchDetailsProvider = ({ children }) => {
    const { pathname } = useLocation();
    const [show, setShow] = useState('_universal');
    const [cid, setCid] = useState();
    const [searchQuery, setSearchQuery] = useState('');
    const [frame, setFrame] = useState('');
    const [fineTuningFrame, setFineTuningFrame] = useState();
    const [localCids, setLocalCids] = useState();
    const [savedCids, setSavedCids] = useState([]);
    const [showObj, setShowObj] = useState();
    const [selectedFrameIndex, setSelectedFrameIndex] = useState();
    const [loadingSavedCids] = useState(false);
    const { cid: seriesId } = useParams()

    useEffect(() => {
        if (pathname === '/') {
            setShow('_universal')
            setCid()
        }
        if (!(pathname.startsWith('/frame') || pathname.startsWith('/editor'))) {
            setFineTuningFrame(null)
        }

        const match = pathname.match(/^\/(search|frame|editor|episode)\/([^/]+)/);
        if (match) {
            const urlCid = match[2];
            if (urlCid) {
                setCid((prevCid) => (prevCid === urlCid ? prevCid : urlCid));
            }
        }
    }, [pathname])

    // useEffect(() => {
    //     console.log('USER: ', user)
    //     console.log((!savedCids))
    //     if (user) {
    //         setLoadingSavedCids(true)
    //         API.get('publicapi', '/user/update/getSavedMetadata').then(response => {
    //             console.log('SAVED METADATA', response)
    //             setSavedCids(response)
    //             setLoadingSavedCids(false)
    //         }).catch(err => console.log(err))
    //     } else {
    //         setLoadingSavedCids(false)
    //     }
    // }, [user]);

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
                setLocalCids,
                showObj,
                setShowObj,
                selectedFrameIndex,
                setSelectedFrameIndex,
                savedCids,
                setSavedCids,
                loadingSavedCids
            }}
        >
            {children}
        </V2SearchContext.Provider>
    );
};

V2SearchDetailsProvider.propTypes = {
    children: PropTypes.node
}
