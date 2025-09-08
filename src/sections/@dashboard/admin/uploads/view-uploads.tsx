import { useEffect, useState } from "react";
import { Container, Typography } from "@mui/material";
import { ListSourceMediasResponse } from "./types";
import listSourceMedias from "./functions/list-source-medias";
import AdminSourceMediaList from "./components/source-media-list";
import SourceMediaDetailsDialog from "./components/source-media-details-dialog";

export default function AdminViewUploads() {
    const [data, setData] = useState<ListSourceMediasResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSourceMediaId, setSelectedSourceMediaId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        listSourceMedias()
            .then(results => {
                if (results) {
                    // Transform the results to match the expected structure
                    const transformedData: ListSourceMediasResponse = {
                        listSourceMedias: {
                            items: results,
                            nextToken: null,
                            __typename: "ModelSourceMediaConnection"
                        }
                    };
                    setData(transformedData);
                }
            })
            .catch(error => {
                console.error(error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleViewDetails = (sourceMediaId: string) => {
        setSelectedSourceMediaId(sourceMediaId);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedSourceMediaId(null);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
                Source Media List ({data?.listSourceMedias?.items?.length})
            </Typography>
            <AdminSourceMediaList 
                data={data} 
                loading={loading} 
                onViewDetails={handleViewDetails}
            />
            <SourceMediaDetailsDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                sourceMediaId={selectedSourceMediaId}
            />
        </Container>
    );
}