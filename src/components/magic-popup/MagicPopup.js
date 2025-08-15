import PropTypes from 'prop-types';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../UserContext';
import { MagicPopupContext } from '../../MagicPopupContext';
import { useSubscribeDialog } from '../../contexts/useSubscribeDialog';

MagicPopup.propTypes = {
    children: PropTypes.element
}

export default function MagicPopup({ children }) {
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    const [magicToolsPopoverAnchorEl, setMagicToolsPopoverAnchorEl] = useState(null);
    const { openSubscriptionDialog } = useSubscribeDialog();

    const handleSubscribe = () => {
        openSubscriptionDialog(window.location.pathname);
        setMagicToolsPopoverAnchorEl(null);
    }

    return (
        <MagicPopupContext.Provider value={{ magicToolsPopoverAnchorEl, setMagicToolsPopoverAnchorEl, handleSubscribe }}>
            {children}
        </MagicPopupContext.Provider>
    )
}
