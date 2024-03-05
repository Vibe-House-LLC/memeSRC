import { Container, Divider, Typography } from "@mui/material";

export default function AliasManagement({ metadatas = [], reload = () => { } }) {
    return (
        <Container maxWidth='lg'>
            <Typography fontSize={24} fontWeight={700}>
                Alias Management
            </Typography>
            <Divider sx={{ my: 3 }} />
        </Container>
    )
}
