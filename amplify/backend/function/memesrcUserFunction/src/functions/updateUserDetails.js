export default function updateUserDetails(params) {
    const email = params.email ? `email: "${params.email}",` : ''
    const username = params.username ? `id: "${params.username}",` : ''
    const stripeId = params.email ? `stripeId: "${params.stripeId}",` : ''
    const sub = params.sub ? `sub: "${params.sub}",` : ''
    const status = params.status ? `status: "${params.status}",` : ''

    const query = `
        mutation updateUserDetails {
            updateUserDetails(input: {${email}${username}${stripeId}${sub}${status}}) {
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