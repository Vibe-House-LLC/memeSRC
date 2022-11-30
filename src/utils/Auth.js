import { Auth } from 'aws-amplify';

export default function signUp(username, password, email, autoSignInEnabled) {
    return new Promise((resolve, reject) => {
    try {
        const { user } = Auth.signUp({
            username,
            password,
            attributes: {
                email,          // optional
                // other custom attributes
            },
            autoSignIn: { // optional - enables auto sign in after user is confirmed
                enabled: autoSignInEnabled,
            }
        }).then((x) => resolve(x));
        console.log(user);
        resolve(user);
    } catch (error) {
        reject(error);
    }
});
}

// export async function signIn(username, password) {
//     try {
//         const user = await Auth.signIn(username, password);
//     } catch (error) {
//         console.log('error signing in', error);
//     }
// }

// export async function signOut() {
//     try {
//         await Auth.signOut();
//     } catch (error) {
//         console.log('error signing out: ', error);
//     }
// }
