import { Auth } from "aws-amplify";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CheckAuth(props) {
    const navigate = useNavigate();
    const [isSignedIn, setSignedIn] = useState(null);
    
    useEffect(() => {
        Auth.currentAuthenticatedUser().then(() =>
        {
            setSignedIn(true)
        }).catch(() => {
            setSignedIn(false)
        });
    });

    if (isSignedIn === true) {
        return props.children;
    } 

    if (isSignedIn === false) {
        navigate('/login', { replace: true });
    }
}
