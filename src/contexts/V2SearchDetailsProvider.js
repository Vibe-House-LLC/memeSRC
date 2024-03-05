import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import { API } from 'aws-amplify';
import { V2SearchContext } from "./v2-search-context";
import { UserContext } from '../UserContext';



export const V2SearchDetailsProvider = ({ children }) => {
    const { pathname } = useLocation();
    const { user } = useContext(UserContext)
    const [show, setShow] = useState('_universal');
    const [cid, setCid] = useState();
    const [searchQuery, setSearchQuery] = useState('');
    const [frame, setFrame] = useState('');
    const [fineTuningFrame, setFineTuningFrame] = useState();
    const [localCids, setLocalCids] = useState();
    const [savedCids, setSavedCids] = useState([]);
    const [showObj, setShowObj] = useState();
    const [selectedFrameIndex, setSelectedFrameIndex] = useState();
    const [loadingSavedCids, setLoadingSavedCids] = useState(true);

    useEffect(() => {
        if (pathname === '/') {
            setShow('_universal')
            setCid()
        }
        if (!(pathname.startsWith('/frame') || pathname.startsWith('/editor'))) {
            setFineTuningFrame(null)
        }
    }, [pathname])

    useEffect(() => {
        console.log('USER: ', user)
        if (user && !savedCids) {
            setLoadingSavedCids(true)
          API.get('publicapi', '/user/update/getSavedMetadata').then(response => {
            console.log('SAVED METADATA', response)
            setSavedCids(response)
          }).catch(err => console.log(err))
        } else if (!user) {
            setLoadingSavedCids(false)
        } else {
            setLoadingSavedCids(false)
        }
      }, [user, savedCids]);

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