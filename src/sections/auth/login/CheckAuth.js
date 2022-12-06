import { Auth } from "aws-amplify";

export default function CheckAuth(props) {
    const validate = true;
    console.log(Auth.currentAuthenticatedUser())
    return validate
}

// TODO: Find way to gate pages based on authentication