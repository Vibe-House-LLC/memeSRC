import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { API, Auth, Storage } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';

const getProfilePicture = async (key) => {
    const newProfilePicture = await Storage.get(key);
    return newProfilePicture;
};

GuestAuth.propTypes = {
    children: PropTypes.object
};

export default function GuestAuth(props) {
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const authenticatedUser = await Auth.currentAuthenticatedUser();
                const userDetails = await API.get('publicapi', '/user/get');

                let profilePhoto = null;
                if (authenticatedUser?.attributes?.picture) {
                    profilePhoto = await getProfilePicture(authenticatedUser.attributes.picture);
                }

                const updatedUser = {
                    ...authenticatedUser,
                    ...authenticatedUser.signInUserSession.accessToken.payload,
                    userDetails: userDetails?.data?.getUserDetails,
                    profilePhoto
                };

                setUser(updatedUser);
                window.localStorage.setItem('memeSRCUserDetails', JSON.stringify(updatedUser));
            } catch (error) {
                console.log(error);
                setUser(false);
                window.localStorage.removeItem('memeSRCUserDetails');
            }
        };

        const cachedUserDetails = window.localStorage.getItem('memeSRCUserDetails');
        if (cachedUserDetails) {
            console.log(cachedUserDetails)
            const parsedUserDetails = JSON.parse(cachedUserDetails);
            setUser(parsedUserDetails);
        }

        fetchUser();
    }, []);

    const logout = () => {
        return new Promise((resolve) => {
            setUser(false);
            window.localStorage.removeItem('memeSRCUserDetails');
            resolve();
        });
    };

    return (
        <UserContext.Provider value={{ user, setUser, logout }}>
            {props.children}
        </UserContext.Provider>
    );
}