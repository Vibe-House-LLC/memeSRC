// @mui
import { Container, Grid, Stack, Typography, Card, CircularProgress, Backdrop, Divider, LinearProgress } from '@mui/material';
// components
import { useState, useEffect, useRef, useContext, Fragment } from 'react';
import { API, Storage, graphqlOperation, Auth } from 'aws-amplify';
import { UploadFile } from '@mui/icons-material';
import Dropzone from 'react-dropzone';
import { LoadingButton } from '@mui/lab';
import PropTypes from 'prop-types';
import { getSeries } from '../../../graphql/queries';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';

// ----------------------------------------------------------------------


export default function UploadToSeriesPage({ seriesId }) {
  const { user, forceTokenRefresh } = useContext(UserContext)
  const { setOpen, setSeverity, setMessage } = useContext(SnackbarContext)
  const dropContainer = useRef();
  const [files, setFiles] = useState();
  const [series, setSeries] = useState();
  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState(0);
  const [totalData, setTotalData] = useState(0);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);
  const [disableButton, setDisableButton] = useState(false);

  const SUPPORTED_EXTENSIONS = ['.mp4', '.json', '.csv'];

  const getRelativePath = file => {
    const rawPath = file?.webkitRelativePath || file?.path || file?.name || '';
    return rawPath.replace(/\\/g, '/');
  };

  const normalizeRelativePath = rawPath => {
    if (!rawPath) {
      return '';
    }

    const trimmedPath = rawPath.replace(/^\/+/, '');
    const safeSegments = trimmedPath
      .split('/')
      .filter(segment => segment && segment !== '.' && segment !== '..');

    return safeSegments.join('/');
  };

  const filterFiles = incomingFiles => {
    const accepted = [];
    const rejected = [];

    incomingFiles.forEach(file => {
      const rawPath = getRelativePath(file);
      const normalizedPath = normalizeRelativePath(rawPath);
      const pathForExtension = (normalizedPath || rawPath || '').toLowerCase();
      const extensionIndex = pathForExtension.lastIndexOf('.');
      const extension = extensionIndex !== -1 ? pathForExtension.substring(extensionIndex) : '';

      if (SUPPORTED_EXTENSIONS.includes(extension)) {
        accepted.push(file);
      } else {
        rejected.push(file);
      }
    });

    if (rejected.length) {
      setSeverity('error');
      setMessage('Only .mp4, .json, and .csv files are supported.');
      setOpen(true);
    }

    return accepted;
  };

  const handleAddFiles = files => {
    console.log(files)
    const filteredFiles = filterFiles(files);
    setFiles(filteredFiles.length ? filteredFiles : undefined);
    setDisableButton(false);
  }

  const handleUpload = async () => {
    setUploading(true);
    if (!files || !files.length) {
      setUploading(false);
      return;
    }
    if (user?.['cognito:groups']?.some((element) => element === 'admins' || element === 'mods' || element === 'contributors')) {
      try {
        // Force a new token so that ours doesn't expire during upload
        await forceTokenRefresh();
        // Resolve the current user's Cognito Identity ID for building the full S3 key
        let identityId;
        try {
          const credentials = await Auth.currentCredentials();
          identityId = credentials?.identityId;
        } catch (credentialsError) {
          console.log('Unable to resolve identity id', credentialsError);
        }
        const sourceMediaInput = {
          sourceMediaSeriesId: seriesId,
          status: 'uploaded',
          userDetailsSourceMediaId: user.sub,
          identityId: identityId,
        };
        const createSourceMedia = `
          mutation CreateSourceMedia(
            $input: CreateSourceMediaInput!
            $condition: ModelSourceMediaConditionInput
          ) {
            createSourceMedia(input: $input, condition: $condition) {
              id
            }
          }
        `;
        const sourceMedia = await API.graphql(graphqlOperation(createSourceMedia, { input: sourceMediaInput }));
        const sourceMediaId = sourceMedia.data.createSourceMedia.id;

        if (!identityId) {
          setUploading(false);
          setDisableButton(true)
          setMessage('Error: Unauthorized')
          setSeverity('error')
          setOpen(true)
          return;
        }

        // Calculate total data size
        const totalDataSize = files.reduce((total, file) => total + file.size, 0);
        setTotalData(totalDataSize);

        setUploadedFilesCount(0); // Reset uploaded files count
        setUploadedData(0); // Reset uploaded data size

        const uploadProgresses = files.map(() => 0); // Initialize progress for each file
        const uploadPromises = files.map(async (file, index) => {
          const relativePath = getRelativePath(file) || file.name;
          const normalizedRelativePath = normalizeRelativePath(relativePath) || file.name;
          console.log(`Attempting to upload ${normalizedRelativePath}...`);
          const s3Key = `${sourceMediaId}/${normalizedRelativePath}`;

          // Log the full S3 key including the protected identity prefix
          if (identityId) {
            const fullKey = `protected/${identityId}/${s3Key}`;
            console.log('Full S3 key:', fullKey);
          } else {
            console.log('Full S3 key (identityId unavailable):', `protected/<identityId>/${s3Key}`);
          }

          const progressCallback = progress => {
            console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
            uploadProgresses[index] = progress.loaded; // Update progress for the current file
            setUploadedData(uploadProgresses.reduce((a, b) => a + b, 0)); // Sum all progresses
          };

          const uploadedFile = await Storage.put(s3Key, file, {
            contentType: file.type || undefined,
            level: 'protected',
            progressCallback,
          });
          console.log(uploadedFile)
          console.log(`${normalizedRelativePath} uploaded!`);

          // Increment uploaded files count
          setUploadedFilesCount(prevCount => prevCount + 1);
        });

        await Promise.all(uploadPromises);
        console.log('All files uploaded successfully!');
        setUploading(false);
        setDisableButton(true)
        setMessage('Files have been successfully uploaded!')
        setSeverity('success')
        setOpen(true)

      } catch (error) {
        console.log('Error uploading files: ', error);
        setUploading(false);
      }
    } else {
      setUploading(false);
      setDisableButton(true)
      setMessage('Error: Unauthorized')
      setSeverity('error')
      setOpen(true)
    }
  };

  useEffect(() => {
    if (!series) {
      API.graphql(
        graphqlOperation(getSeries, { id: seriesId })
      ).then(response => {
        setSeries(response.data.getSeries);
      }).catch(err => console.log(err))
    }
  }, []);

  function convertBytesToSize(bytes) {
    const kilobytes = bytes / 1024;
    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(2)} KB`;
    }

    const megabytes = kilobytes / 1024;
    return `${megabytes.toFixed(2)} MB`;
  }




  return (
    <>
      <Container disableGutters>
        <Dropzone
          useFsAccessApi={false}
          accept={{
            'video/mp4': ['.mp4'],
            'application/json': ['.json'],
            'text/csv': ['.csv'],
          }}
          onDrop={(acceptedFiles, fileRejections) => {
            if (fileRejections?.length) {
              setSeverity('error');
              setMessage('Only .mp4, .json, and .csv files are supported.');
              setOpen(true);
            }
            handleAddFiles(acceptedFiles);
          }}
        >
          {({ getRootProps, getInputProps }) => (
            <Card
              {...getRootProps()}
              sx={{
                width: '100%',
                pt: files ? 3 : 10,
                pb: 10,
                maxHeight: '300px',
                overflowY: 'auto',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              <input {...getInputProps({ webkitdirectory: true, directory: true })} />
              {files ?
                <Grid container justifyContent='left' px={3}>
                  <Grid item xs={6} md={4}>
                    <Typography variant='body1' fontWeight={700}>
                      File Name
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={8}>
                    <Typography variant='body1' fontWeight={700}>
                      File Size
                    </Typography>
                  </Grid>
                  <Grid item xs={12} mt={1} mb={3}><Divider /></Grid>
                  {files?.map((file, index) => {
                    const relativePath = getRelativePath(file) || file.name;
                    const displayPath = normalizeRelativePath(relativePath) || file.name;

                    return (
                      <Fragment key={displayPath || index}>
                        <Grid item xs={6} md={4}>
                          <Typography variant='body1'>
                            {displayPath}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={8}>
                          <Typography variant='body1'>
                            {convertBytesToSize(file.size)}
                          </Typography>
                        </Grid>
                        {index < files.length - 1 && <Grid item xs={12} mt={1} mb={.7}><Divider /></Grid>}
                      </Fragment>
                    );
                  })}
                </Grid>
                :
                <Stack alignItems='center' spacing={2} ref={dropContainer}>
                  <UploadFile sx={{ fontSize: 80 }} />
                  <Typography variant='h4'>
                    Drag or click to upload
                  </Typography>
                </Stack>
              }
            </Card>
          )}

        </Dropzone>
        <LoadingButton
          fullWidth
          variant='contained'
          size='large'
          loading={uploading}
          sx={{ my: 3 }}
          disabled={!files || uploading || disableButton}
          onClick={handleUpload}
        >
          Upload
        </LoadingButton>
        {(uploading || disableButton) &&
          <>
            <LinearProgress variant="determinate" value={(parseInt(uploadedData, 10) / parseInt(totalData, 10)) * 100} />
            <Typography>{`${uploadedFilesCount}/${files.length} uploaded`}</Typography>
          </>
        }
      </Container>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={!series}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}

UploadToSeriesPage.propTypes = {
  seriesId: PropTypes.string,
};
