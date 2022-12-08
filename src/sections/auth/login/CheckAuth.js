import { Backdrop, CircularProgress } from "@mui/material";
import { Auth } from "aws-amplify";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CheckAuth(props) {
    const navigate = useNavigate();
    const backdrop = true;
    const [isSignedIn, setSignedIn] = useState(null);
    
    useEffect(() => {
        Auth.currentAuthenticatedUser().then(() =>
        {
            setSignedIn(true)
        }).catch((err) => {
            setSignedIn(false)
        });
    });

    // I'm not really sure if we want to use this. It pops up just long enough to be annoying. 
    // That being said, it's nice to know that this is also a built in component in MUI.
    if (isSignedIn === null) {
        return (
            <Backdrop
                sx={{ color: '#fff', zIndex: "3000" }}
                open={backdrop}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        )
    }

    if (isSignedIn === true) {
        return props.children;
    } 

    if (isSignedIn === false) {
        navigate('/login', { replace: true });
    }
}