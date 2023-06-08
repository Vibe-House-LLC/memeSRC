export default function getUserDetails(params) {
    if (params.sub) {
        const query = `
            query listUserDetails {
                listUserDetails(filter: {sub: {eq: "${params.sub}"}}) {
                    items {
                        updatedAt
                        sub
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
    } else if (params.username) {
        const query = `
            query getUserDetails {
                getUserDetails(id: "${params.id}") {
                    createdAt
                    email
                    id
                    stripeId
                    sub
                    updatedAt
                    status
                }
            }
        `
        return query
    }
}