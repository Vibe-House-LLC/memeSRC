import PropTypes from 'prop-types';
import { useState } from "react";
import { SearchContext } from "./SearchContext";



export const SearchDetailsProvider = ({ children }) => {
    const [show, setShow] = useState('_universal');
    const [searchQuery, setSearchQuery] = useState('');
    const [frame, setFrame] = useState('');
    const [fineTuningFrame, setFineTuningFrame] = useState();

    return (
        <SearchContext.Provider value={{ show, setShow, searchQuery, setSearchQuery, frame, setFrame, fineTuningFrame, setFineTuningFrame }}>
            {children}
        </SearchContext.Provider>
    );
};

SearchDetailsProvider.propTypes = {
    children: PropTypes.node
}