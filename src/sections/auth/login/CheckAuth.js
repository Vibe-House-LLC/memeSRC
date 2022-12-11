import { Auth } from "aws-amplify";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../UserContext";

export default function CheckAuth(props) {
    const navigate = useNavigate();
    const [content, setContent] = useState(null);
    const {user, setUser} = useContext(UserContext);
    
    useEffect(() => {
        if (user) {  // we only want this logic to occur after user context is prepped
            if (user.username) {
                setContent(props.children);
            } else {
                navigate('/login', { replace: true });
            }
        }
    })

    return content
}
