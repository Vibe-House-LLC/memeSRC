import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';

GuestAuth.propTypes = {
    children: PropTypes.object
}

export default function GuestAuth(props) {
    const navigate = useNavigate();
    const [content, setContent] = useState(null);
    const [user, setUser] = useState(null);
    const location = useLocation();


    useEffect(() => {
        // Set up the user context
            Auth.currentAuthenticatedUser().then((x) => {
                setUser(x)  // if an authenticated user is found, set it into the context
                console.log(x)
                console.log("Updating Amplify config to use AMAZON_COGNITO_USER_POOLS")
                // Amplify.configure({
                //     "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
                // });
            }).catch(() => {
                setUser(null)  // indicate the context is ready but user is not auth'd
                console.log("There wasn't an authenticated user found")
                console.log("Updating Amplify config to use API_KEY")
                // Amplify.configure({
                //     "aws_appsync_authenticationType": "API_KEY",
                // });
            });
    }, [location.pathname])

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {props.children}
        </UserContext.Provider>
    )
}
