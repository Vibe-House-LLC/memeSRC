import PropTypes from "prop-types";
import { useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SnackbarContext } from "../SnackbarContext";


interface StripeWatcherProps {
    children: React.ReactNode;
}

export default function StripeWatcher({ children }: StripeWatcherProps) {
    const  [searchParams]  = useSearchParams();
    const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)

    useEffect(() => {
        if (searchParams.has('paymentComplete')) {
            const stripeStatus =  searchParams.get('paymentComplete')
            setMessage(stripeStatus)
            setSeverity('info')
            setOpen(true)
        }
    }, [searchParams])

    return (
        <>
            {children}
        </>
    )
}
StripeWatcher.propTypes = {
    children: PropTypes.node,
};
