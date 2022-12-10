import { Auth } from "aws-amplify";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../UserContext";

export default function CheckAuth(props) {
    const navigate = useNavigate();
    const [isSignedIn, setSignedIn] = useState(null);
    const {user, setUser} = useContext(UserContext);

    let result = null;

    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true });
        } else {
            result = props.children
        }
    }, [user]); // Note that we include `user` in the dependency array to avoid an infinite loop

    return result
}


