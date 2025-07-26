import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { useRouter } from 'next/router'; // eslint-disable-line import/no-unresolved
import { SearchContext } from "./SearchContext";



export const SearchDetailsProvider = ({ children }) => {
    const router = useRouter();
    const [show, setShow] = useState('_universal');
    const [searchQuery, setSearchQuery] = useState('');
    const [frame, setFrame] = useState('');
    const [fineTuningFrame, setFineTuningFrame] = useState();

    useEffect(() => {
        if (!router.isReady) {
            return;
        }

        const currentPath = router.asPath.split("?", 1)[0];

        if (currentPath === "/") {
            setShow("_universal");
        }
        if (!(currentPath.startsWith("/frame") || currentPath.startsWith("/editor"))) {
            setFineTuningFrame(null);
        }
    }, [router.isReady, router.asPath])

    return (
        <SearchContext.Provider value={{ show, setShow, searchQuery, setSearchQuery, frame, setFrame, fineTuningFrame, setFineTuningFrame }}>
            {children}
        </SearchContext.Provider>
    );
};

SearchDetailsProvider.propTypes = {
    children: PropTypes.node
}