import { Auth } from "aws-amplify";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// export default async function CheckAuth(props) {
//     const navigate = useNavigate();

//     useEffect
    
//     Auth.currentAuthenticatedUser().then((x) =>
//     {
//         return props.children
//     }).catch((err) => {
//         navigate('/login', { replace: true });
//     })
// }

export default function CheckAuth(props) {
    const navigate = useNavigate();
    const [isSignedIn, setSignedIn] = useState();
    
    useEffect(() => {
        Auth.currentAuthenticatedUser().then(() =>
        {
            setSignedIn(true)
        }).catch((err) => {
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

// TODO: Find way to gate pages based on authentication