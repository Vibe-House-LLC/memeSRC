export default function getUserDetails(params) {
    if (params.username) {
        const query = `
            query listUserDetails {
                listUserDetails(filter: {username: {eq: "${params.username}"}}) {
                    items {
                        updatedAt
                        username
                        stripeId
                        id
                        email
                        createdAt
                        status
                    }
                }
            }
        `
        return query
    } else if (params.sub) {
        const query = `
            query getUserDetails {
                getUserDetails(id: "${params.id}") {
                    createdAt
                    email
                    id
                    stripeId
                    username
                    updatedAt
                    status
                }
            }
        `
        return query
    }
}