import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API, Auth } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';

CheckAuth.propTypes = {
    children: PropTypes.object
}

export default function CheckAuth(props) {
    const navigate = useNavigate();
    const [content, setContent] = useState(null);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        console.log(location.pathname)
        if (user) {  // we only want this logic to occur after user context is prepped
            if (user.username || location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify' ||  location.pathname === '/forgotpassword') {
                setContent(props.children);
            } else {
                navigate(`/login?dest=${encodeURIComponent(location.pathname)}`, { replace: true });
            }
        } else {
            // Set up the user context
            Auth.currentAuthenticatedUser().then((x) => {
                API.get('publicapi', '/user/get').then(userDetails => {
                    setUser({ ...x, ...x.signInUserSession.accessToken.payload, userDetails: userDetails?.data?.getUserDetails })  // if an authenticated user is found, set it into the context
                    console.log(x)
                    console.log("Updating Amplify config to use AMAZON_COGNITO_USER_POOLS")
                    // Amplify.configure({
                    //     "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
                    // });
                }).catch(err => console.log(err))
            }).catch(() => {
                setUser({ username: false })  // indicate the context is ready but user is not auth'd
                console.log("There wasn't an authenticated user found")
                console.log("Updating Amplify config to use API_KEY")
                // Amplify.configure({
                //     "aws_appsync_authenticationType": "API_KEY",
                // });
            });
        }
    }, [user, navigate, props.children, location.pathname])

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {content}
        </UserContext.Provider>
    )
}
