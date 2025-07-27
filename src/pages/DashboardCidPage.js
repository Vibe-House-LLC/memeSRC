import { Container, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { API, graphqlOperation } from "aws-amplify";
import { useEffect, useState } from "react";
import { listV2ContentMetadata } from "../graphql/queries";
import AliasTableRow from "../components/alias-table-row/AliasTableRow";

/* -------------------------------- Functions ------------------------------- */

const getAllMetadataObjects = (nextToken = null) => new Promise((resolve, reject) => {
    API.graphql(
      graphqlOperation(listV2ContentMetadata, { nextToken })
    ).then(response => {
      const newNextToken = response?.data?.listV2ContentMetadata?.nextToken;
      const items = response?.data?.listV2ContentMetadata?.items;
      resolve({
        newNextToken,
        items
      });
    }).catch(error => {
      reject(error);
    });
  });


const listMetadataRecursive = async (nextToken = null, allItems = []) => {
  try {
    const { newNextToken, items } = await getAllMetadataObjects(nextToken);
    const updatedItems = allItems.concat(items); // Add the items from the current fetch to the allItems array
    if (newNextToken) {
      // If there's a nextToken, recursively call this function with the newNextToken
      return listMetadataRecursive(newNextToken, updatedItems);
    }
    // If there's no nextToken, return all the items fetched
    return updatedItems;
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    throw error; // Rethrow the error to be caught by the caller
  }
};

/* -------------------------------------------------------------------------- */

const headers = [
  { id: 'name', label: 'Name', align: 'left' },
  // Add more header configurations here
];

export default function DashboardCidPage() {
  const [metadatas, setMetadatas] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allItems = await listMetadataRecursive();
        setMetadatas(allItems);
        console.log('All items:', allItems);
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <Container maxWidth='md'>
        <Typography fontSize={30} fontWeight={700}>
          Alias Management
        </Typography>
        <Divider sx={{ my: 3 }} />
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableCell key={header.id} sx={{ fontSize: 16}}><b>{header.label}</b></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {metadatas?.map((row) => (
                <AliasTableRow key={row.id} row={row} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  )
}
