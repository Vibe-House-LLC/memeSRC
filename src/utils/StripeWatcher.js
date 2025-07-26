import PropTypes from "prop-types";
import { useContext, useEffect } from "react";
import { useRouter } from 'next/router'; // eslint-disable-line import/no-unresolved
import { SnackbarContext } from "../SnackbarContext";


export default function StripeWatcher({ children }) {
    const router = useRouter();
    const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)

    useEffect(() => {
        if (!router.isReady) {
            return;
        }
        const stripeStatus = router.query.paymentComplete;
        if (stripeStatus) {
            setMessage(stripeStatus);
            setSeverity('info');
            setOpen(true);
        }
    }, [router.isReady, router.query]);

    return (
        <>
            {children}
        </>
    )
}
StripeWatcher.propTypes = {
    children: PropTypes.node,
};
