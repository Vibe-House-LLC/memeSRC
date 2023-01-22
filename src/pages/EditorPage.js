import { memo, useCallback, useEffect, useState } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TwitterPicker } from 'react-color';
import { Button, Card, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Fab, Grid, IconButton, Popover, Slider, Stack, TextField, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { HighlightOffRounded, HistoryToggleOffRounded } from '@mui/icons-material';
import { Storage } from 'aws-amplify';
import TextEditorControls from '../components/TextEditorControls';

const ParentContainer = styled.div`
    height: 100%;
    padding: 20px;
`;

const ColorPickerPopover = styled.div({
})

const oImgBuild = path =>
    new Promise(resolve => {
        fabric.Image.fromURL(`https://memesrc.com${path}`, (oImg) => {
            // oImg._element.onload = () => resolve(oImg);
            // oImg._element.onerror = () => resolve({ path, status: 'error' });
            resolve(oImg);
        }, { crossOrigin: "anonymous" });
    });

const loadImg = (paths, func) => Promise.all(paths.map(func));

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledLayerControlCard = styled(Card)`
  width: 280px;
  border: 3px solid transparent;
  box-sizing: border-box;
  padding: 10px 15px;
`;

const StyledCardMedia = styled.img`
  width: 100%;
  height: auto;
  background-color: black;
`;

const StyledTwitterPicker = styled(TwitterPicker)`
    span div {
        border: 1px solid rgb(240, 240, 240);
    }
`;

const EditorPage = () => {
    const TwitterPickerWrapper = memo(StyledTwitterPicker);

    // Get everything ready
    const { fid } = useParams();
    const [defaultFrame, setDefaultFrame] = useState(null);
    const [pickingColor, setPickingColor] = useState(false);
    const [imageScale, setImageScale] = useState();
    const [generatedImage, setGeneratedImage] = useState();
    const [canvasSize, setCanvasSize] = useState({
        width: 500,
        height: 500
    });
    const [fineTuningFrames, setFineTuningFrames] = useState([]);
    const [canvasObjects, setCanvasObjects] = useState();
    const [sessionID, setSessionID] = useState();
    const [surroundingFrames, setSurroundingFrames] = useState();
    const [selectedFid, setSelectedFid] = useState(fid);
    const [colorPickerShowing, setColorPickerShowing] = useState(false);
    const [colorPickerAnchor, setColorPickerAnchor] = useState(null);
    const [colorPickerColor, setColorPickerColor] = useState({
        r: '0',
        g: '0',
        b: '0',
        a: '100'
    });
    const [fontSizePickerShowing, setFontSizePickerShowing] = useState(false);
    const [fontSizePickerAnchor, setFontSizePickerAnchor] = useState(null);
    const [selectedFontSize, setSelectedFontSize] = useState(100);

    const [editorAspectRatio, setEditorAspectRatio] = useState(1);

    const [fineTuningValue, setFineTuningValue] = useState(4);
    const [episodeDetails, setEpisodeDetails] = useState();
    const [open, setOpen] = useState(false);
    const [imageUploading, setImageUploading] = useState();
    const [imageBlob, setImageBlob] = useState();
    const [shareImageFile, setShareImageFile] = useState();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    const { selectedObjects, editor, onReady } = useFabricJSEditor()

    const navigate = useNavigate();
    const location = useLocation();

    const handleClickDialogOpen = () => {
        setOpen(true);
        saveImage();
    };

    const handleDialogClose = () => {
        setOpen(false);
    };

    // Canvas resizing
    const resizeCanvas = useCallback((width, height) => {
        if (editor) {
            console.log('Resized the canvas');
            editor.canvas.preserveObjectStacking = true;
            editor?.canvas.setWidth(width);
            editor?.canvas.setHeight(height);
            editor?.canvas.setBackgroundColor("white");
        }
    }, [editor])

    // Update the editor size
    const updateEditorSize = useCallback(() => {
        const [desiredHeight, desiredWidth] = calculateEditorSize(editorAspectRatio);
        // Calculate scale factor
        const scaleFactorX = desiredWidth / canvasSize.width;
        const scaleFactorY = desiredHeight / canvasSize.height;
        const scaleFactor = Math.min(scaleFactorX, scaleFactorY)
        // Scale the canvas
        editor?.canvas.setZoom(scaleFactor);
        // Resize the canvas
        resizeCanvas(desiredWidth, desiredHeight);
        setCanvasObjects([...editor?.canvas._objects])
        editor?.canvas.renderAll();
    }, [editor, canvasSize, editorAspectRatio, resizeCanvas]);

    // useEffect(() => {
    //     navigate(`/editor/${selectedFid}`)
    // }, [selectedFid, navigate])

    useEffect(() => {
        setSelectedFid(fid)
    }, [location, fid, editor])

    useEffect(() => {
        window.addEventListener('resize', updateEditorSize)

        return () => {
            window.removeEventListener('resize', updateEditorSize)
        }
    }, [defaultFrame, updateEditorSize])

    // Prepare sessionID
    useEffect(() => {
        if ("sessionID" in sessionStorage) {
            setSessionID(sessionStorage.getItem("sessionID"));
        } else {
            fetch(`https://api.memesrc.com/?uuidGen`).then(response => {
                response.json().then(generatedSessionID => {
                    setSessionID(generatedSessionID);
                    sessionStorage.setItem("sessionID", generatedSessionID);
                }).catch(err => console.log(`JSON Parse Error:  ${err}`));
            }).catch(err => console.log(`UUID Gen Fetch Error:  ${err}`));
        }
    }, []);

    const addText = useCallback((updatedText, append) => {
        const text = new fabric.Textbox(updatedText, {
            left: editor?.canvas.getWidth() * 0.05,
            top: editor?.canvas.getHeight() * (append ? 0.5 : 0.95),
            originY: 'bottom',
            width: editor?.canvas.getWidth() * 0.9,
            fontSize: editor?.canvas.getWidth() * 0.04,
            fontFamily: 'sans-serif',
            fontWeight: 900,
            fill: 'white',
            stroke: 'black',
            strokeLineJoin: 'round',
            strokeWidth: editor?.canvas.getWidth() * 0.0040,
            strokeUniform: false,
            textAlign: 'center',
            selectable: true,
            paintFirst: 'stroke'
        });
        if (editor) {
            if (append) {
                editor?.canvas.add(text);
                setCanvasObjects([...editor.canvas._objects]);
            } else {
                editor.canvas._objects = [];
                editor?.canvas.add(text);
                setCanvasObjects([...editor.canvas._objects]);
            }
        }
    }, [editor]);

    const setupEditor = useCallback(() => {
        const apiSearchUrl = `https://api.memesrc.com/?fid=${selectedFid}&sessionID=${sessionID}`;
        fetch(apiSearchUrl).then(response => {
            console.log('test')
            response.json().then(data => {
                setSurroundingFrames(data.frames_surrounding);
                const episodeDetails = selectedFid.split('-');
                setEpisodeDetails(episodeDetails);
                // Pre load fine tuning frames
                loadImg(data.frames_fine_tuning, oImgBuild).then((images) => {
                    setFineTuningFrames(images)
                });
                // Background image from the 
                fabric.Image.fromURL(`https://memesrc.com${data.frame_image}`, (oImg) => {
                    setDefaultFrame(oImg);
                    const imageAspectRatio = oImg.width / oImg.height;
                    setEditorAspectRatio(imageAspectRatio);
                    const [desiredHeight, desiredWidth] = calculateEditorSize(imageAspectRatio);
                    setCanvasSize({ height: desiredHeight, width: desiredWidth })  // TODO: rename this to something like "desiredSize"
                    // Scale the image to fit the canvas
                    oImg.scale(desiredWidth / oImg.width);
                    // Center the image within the canvas
                    oImg.set({ left: 0, top: 0 });
                    const minRes = 1280;
                    const x = (oImg.width > minRes) ? oImg.width : minRes;
                    setImageScale(x / desiredHeight);
                    resizeCanvas(desiredWidth, desiredHeight)
                    editor?.canvas.setBackgroundImage(oImg);
                    addText(data.subtitle, false);
                }, { crossOrigin: "anonymous" });
            }).catch(err => console.log(err))
        }).catch(err => console.log(err))
    }, [resizeCanvas, selectedFid, sessionID, editor, addText])

    // Look up data for the fid and set defaults
    useEffect(() => {
        // if (editor) { editor.canvas._objects = [] }
        setupEditor();
    }, [sessionID, selectedFid]) // eslint-disable-line react-hooks/exhaustive-deps

    // Calculate the desired editor size
    const calculateEditorSize = (aspectRatio) => {
        const containerElement = document.getElementById('canvas-container');
        const availableWidth = containerElement.offsetWidth;
        const calculatedWidth = availableWidth;
        const calculatedHeight = availableWidth / aspectRatio;
        return [calculatedHeight, calculatedWidth]
    }

    // Handle events
    const saveProject = () => {
        const canvasJson = editor.canvas.toJSON(['hoverCursor', 'selectable']);
        const key = selectedFid ? `project-${selectedFid}` : 'project-example';
        localStorage.setItem(key, JSON.stringify(canvasJson));
    };

    const loadProject = () => {
        const key = selectedFid ? `project-${selectedFid}` : 'project-example';
        const canvasJson = localStorage.getItem(key);
        editor.canvas.loadFromJSON(canvasJson, () => {
            editor.canvas.backgroundImage.scaleToHeight(canvasSize.height);
            editor.canvas.backgroundImage.scaleToWidth(canvasSize.width);
            editor.canvas.renderAll();
        });
        updateEditorSize();
    };

    const addImage = () => {
        fabric.Image.fromURL('/assets/illustrations/illustration_avatar.png', (oImg) => {
            editor?.canvas.add(oImg);
        })
    }

    const saveImage = () => {
        setImageUploading(true);
        const resultImage = editor.canvas.toDataURL({
            multiplier: imageScale
        });

        fetch(resultImage)
            .then(res => res.blob())
            .then(blob => {
                setImageBlob(blob);
                fetch(`https://api.memesrc.com/?uuidGen`).then(response => {
                    response.json().then(uuid => {
                        Storage.put(`${uuid}.png`, blob, {
                            resumable: true,
                            contentType: "image/png",
                            completeCallback: (event) => {
                                Storage.get(event.key).then((image) => {
                                    setGeneratedImage(image);
                                    const file = new File([blob], 'test.png', { type: blob.type });
                                    setShareImageFile(file);
                                    setImageUploading(false);
                                })
                            },
                            progressCallback: (progress) => {
                                console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
                            },
                            errorCallback: (err) => {
                                console.error('Unexpected error while uploading', err);
                            }
                        })
                    }).catch(err => console.log(`JSON Parse Error:  ${err}`));
                }).catch(err => console.log(`UUID Gen Fetch Error:  ${err}`));
            })
    }

    // // TODO: Repurpose this for canvas scaling
    // const matchImageSize = () => {
    //     // Export the state of the canvas as a JSON object
    //     const canvasJson = editor.canvas.toJSON(['hoverCursor', 'selectable']);

    //     // Scale the objects on the canvas proportionally to fit the new size
    //     canvasJson.objects.forEach(obj => {
    //         // Calculate the scale factor based on the ratio of the new canvas size to the original canvas size
    //         const scaleFactorX = defaultFrame.width / editor.canvas.width;
    //         const scaleFactorY = defaultFrame.height / editor.canvas.height;

    //         const scaleFactor = Math.min(scaleFactorX, scaleFactorY)

    //         console.log(`Scale factor (original / display): ${scaleFactor}`)

    //         // Scale the object
    //         obj.scaleX *= scaleFactor;
    //         obj.scaleY *= scaleFactor;

    //         // Adjust the position of the object
    //         obj.left *= scaleFactor;
    //         obj.top *= scaleFactor;
    //     });

    //     // Update the canvas size
    //     setCanvasSize({
    //         width: defaultFrame.width,
    //         height: defaultFrame.height
    //     })

    //     // Load the state of the canvas from the JSON object
    //     editor.canvas.loadFromJSON(canvasJson, () => {
    //         // Callback function to execute after the canvas is loaded
    //         console.log('Canvas loaded from JSON');
    //     });
    // }

    const showColorPicker = (event, index) => {
        setPickingColor(index);
        setColorPickerShowing(index);
        setColorPickerAnchor(event.target);
    }

    const showFontSizePicker = (event, index) => {
        // setPickingColor(index);
        const defaultFontSize = editor.canvas.getWidth() * 0.04;
        const currentFontSize = Math.round(100 * editor.canvas.item(index).fontSize / defaultFontSize);
        // defaultFontSize * (event.target.value / 100);
        setSelectedFontSize(currentFontSize);
        setFontSizePickerShowing(index);
        setFontSizePickerAnchor(event.target);
    }

    const changeColor = (color, index) => {
        setColorPickerColor(color);
        editor.canvas.item(index).set('fill', color.hex);
        console.log(`Length of object:  + ${selectedObjects.length}`)
        setCanvasObjects([...editor.canvas._objects])
        console.log(editor.canvas.item(index));
        editor?.canvas.renderAll();
        setColorPickerShowing(false);
    }

    const handleEdit = (event, index) => {
        console.log(event)
        console.log(index)
        editor.canvas.item(index).set('text', event.target.value);
        console.log(`Length of object:  + ${selectedObjects.length}`)
        setCanvasObjects([...editor.canvas._objects])
        console.log(editor.canvas.item(index));
        editor?.canvas.renderAll();
    }

    const handleFocus = (index) => {
        editor.canvas.setActiveObject(editor.canvas.item(index));
        editor?.canvas.renderAll();
    }

    const handleFontSize = (event, index) => {
        const defaultFontSize = editor.canvas.getWidth() * 0.04;
        editor.canvas.item(index).fontSize = defaultFontSize * (event.target.value / 100);
        setCanvasObjects([...editor.canvas._objects])
        console.log(editor.canvas.item(index));
        editor?.canvas.renderAll();
    }

    const handleFineTuning = (event) => {
        console.log(fineTuningFrames[event.target.value]);
        const oImg = fineTuningFrames[event.target.value];
        oImg.scaleToHeight(editor.canvas.getHeight());
        oImg.scaleToWidth(editor.canvas.getWidth());
        editor?.canvas?.setBackgroundImage(oImg);
        editor?.canvas.renderAll();
    }

    const handleStyle = (index, customStyles) => {
        // Select the item
        const item = editor.canvas.item(index);
        // Update the style
        item.fontWeight = customStyles.includes('bold') ? 900 : 400
        item.fontStyle = customStyles.includes('italic') ? 'italic' : 'normal'
        item.underline = customStyles.includes('underlined')
        // Update the canvas
        editor.canvas.item(index).dirty = true;
        setCanvasObjects([...editor.canvas._objects]);
        console.log(editor.canvas.item(index));
        editor?.canvas.renderAll();
    }


    const deleteLayer = (index) => {
        editor.canvas.remove(editor.canvas.item(index));
        setCanvasObjects([...editor.canvas._objects]);
        editor?.canvas.renderAll();
    }

    // Outputs
    return (
        <>
            <ParentContainer id="parent-container">
                <Grid container justifyContent='center'>
                    <Grid container item xs={12} md={8} minWidth={{ xs: {}, md: '98vw', lg: '1200px' }} justifyContent='center'>
                        <Card sx={{ padding: '20px' }}>
                            <Grid container item spacing={2} justifyContent='center'>
                                <Grid item xs={12} md={7} lg={7} order='1'>

                                    <div style={{ width: '100%', height: '100%' }} id='canvas-container'>
                                        <FabricJSCanvas onReady={onReady} />
                                    </div>
                                </Grid>
                                <Grid item xs={12} md={5} lg={5} minWidth={{ xs: {}, md: '350px' }} order={{ xs: 3, md: 2 }}>
                                    <Grid item xs={12} marginBottom={2}>
                                        <Button variant='contained' onClick={() => addText('text', true)} fullWidth sx={{ zIndex: '50' }}>Add Layer</Button>
                                    </Grid>
                                    <Grid container item xs={12} maxHeight={{ xs: {}, md: `${canvasSize.height - 52}px` }} paddingX={{ xs: 0, md: 2 }} sx={{ overflowY: 'scroll', overflow: 'auto' }} flexDirection='col-reverse'>
                                        {canvasObjects && canvasObjects.map((object, index) => (

                                            ('text' in object) &&
                                            <Grid item xs={12} order={`-${index}`} key={`grid${index}`}>
                                                <Card sx={{ marginBottom: '20px', padding: '10px' }} key={`card${index}`}>
                                                    <div style={{ display: 'inline', position: 'relative' }} key={`div${index}`}>
                                                        {/* <button type='button' key={`button${index}`} onClick={(event) => showColorPicker(event, index)}>Change Color</button> */}
                                                        <TextEditorControls showColorPicker={(event) => showColorPicker(event, index)} colorPickerShowing={colorPickerShowing} index={index} showFontSizePicker={(event) => showFontSizePicker(event, index)} fontSizePickerShowing={fontSizePickerShowing} key={`togglebuttons${index}`} handleStyle={handleStyle} />
                                                    </div>
                                                    <Fab size="small" aria-label="add" sx={{ position: 'absolute', backgroundColor: '#FFFFFF', boxShadow: 'none', top: '11px', right: '9px' }} onClick={() => deleteLayer(index)} key={`fab${index}`}>
                                                        <HighlightOffRounded color="error" />
                                                    </Fab>
                                                    <TextField size='small' key={`textfield${index}`} multiline type='text' value={canvasObjects[index].text} fullWidth onFocus={() => handleFocus(index)} onChange={(event) => handleEdit(event, index)} />
                                                    {/* <Typography gutterBottom >
                                                        Font Size
                                                    </Typography>
                                                    <Slider
                                                        size="small"
                                                        defaultValue={100}
                                                        min={1}
                                                        max={200}
                                                        aria-label="Small"
                                                        valueLabelDisplay="auto"
                                                        onChange={(event) => handleFontSize(event, index)}
                                                        onFocus={() => handleFocus(index)}
                                                        key={`slider${index}`}
                                                    /> */}
                                                </Card>
                                            </Grid>
                                        )
                                        )}
                                    </Grid>
                                </Grid>
                                <Grid item xs={12} md={7} lg={7} marginRight={{ xs: '', md: 'auto' }} order={{ xs: 2, md: 3 }}>
                                    <Stack spacing={2} direction='row' alignItems={'center'}>
                                        <Tooltip title="Fine Tuning">
                                            <IconButton>
                                                <HistoryToggleOffRounded alt='Fine Tuning' />
                                            </IconButton>
                                        </Tooltip>
                                        <Slider
                                            size="small"
                                            defaultValue={4}
                                            min={0}
                                            max={8}
                                            value={fineTuningValue}
                                            aria-label="Small"
                                            valueLabelDisplay="auto"
                                            onChange={(event) => {
                                                handleFineTuning(event);
                                                setFineTuningValue(event.target.value);
                                            }}
                                            valueLabelFormat={(value) => `Fine Tuning: ${((value - 4) / 10).toFixed(1)}s`}
                                            marks
                                            track={false}
                                        />
                                    </Stack>
                                    <button type='button' onClick={addImage}>Add Image</button>
                                    <button type='button' onClick={saveProject}>Save Project</button>
                                    <button type='button' onClick={loadProject}>Load Project</button>
                                    <button type='button' onClick={handleClickDialogOpen}>Save Image</button>


                                </Grid>
                                <Grid container item spacing={1} order='4'>
                                    {surroundingFrames && surroundingFrames.map(result => (
                                        <Grid item xs={4} sm={4} md={12 / 9} key={result.fid}>
                                            <a style={{ textDecoration: 'none' }}>
                                                <StyledCard>
                                                    <StyledCardMedia
                                                        component="img"
                                                        src={`https://memesrc.com${result.frame_image}`}
                                                        alt={result.subtitle}
                                                        title={result.subtitle}
                                                        onClick={() => {
                                                            editor.canvas._objects = [];
                                                            setSelectedFid(result.fid);
                                                            navigate(`/editor/${result.fid}`)
                                                            setFineTuningValue(4)
                                                        }}
                                                    />
                                                </StyledCard>
                                            </a>
                                        </Grid>
                                    ))}
                                    <Grid item xs={12}>
                                        {episodeDetails && <Button variant='contained' fullWidth href={`/episode/${episodeDetails[0]}/${episodeDetails[1]}/${episodeDetails[2]}`}>View Episode</Button>}
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Card>


                    </Grid>
                </Grid>

                <Popover
                    open={
                        (colorPickerShowing !== false)
                    }
                    anchorEl={colorPickerAnchor}
                    onClose={() => setColorPickerShowing(false)}
                    id="colorPicker"
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                >
                    <ColorPickerPopover>
                        <TwitterPickerWrapper
                            onChangeComplete={(color) => changeColor(color, pickingColor)}
                            color={colorPickerColor}
                            colors={['#FFFFFF', 'yellow', 'black', 'orange', '#8ED1FC', '#0693E3', '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF']}
                            width='280px'
                        />
                    </ColorPickerPopover>
                </Popover>

                <Popover
                    open={
                        (fontSizePickerShowing !== false)
                    }
                    anchorEl={fontSizePickerAnchor}
                    onClose={() => setFontSizePickerShowing(false)}
                    id="colorPicker"
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                >
                    <StyledLayerControlCard>
                        <Typography variant='body1'>
                            Font Size
                        </Typography>
                        <Slider
                            size="small"
                            defaultValue={selectedFontSize}
                            min={1}
                            max={400}
                            aria-label="Small"
                            valueLabelDisplay="auto"
                            onChange={(event) => handleFontSize(event, fontSizePickerShowing)}
                            onFocus={() => handleFocus(fontSizePickerShowing)}
                        />
                    </StyledLayerControlCard>
                </Popover>

                <Dialog
                    fullScreen={fullScreen}
                    open={open}
                    onClose={handleDialogClose}
                    aria-labelledby="responsive-dialog-title"
                >
                    <DialogTitle id="responsive-dialog-title">
                        Save Image
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {!imageUploading && <img src={generatedImage} alt="generated meme" />}
                            {imageUploading && <center><CircularProgress /></center>}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        {navigator.canShare && <Button disabled={imageUploading} onClick={() => {
                            navigator.share({
                                title: 'memeSRC.com',
                                text: 'Check out this meme I made on memeSRC.com',
                                files: [shareImageFile],
                            })
                        }}>
                            Share
                        </Button>}
                        <Button disabled={imageUploading} autoFocus onClick={() => {
                            const { ClipboardItem } = window;
                            navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })])
                        }}>
                            Copy
                        </Button>
                        <Button autoFocus onClick={handleDialogClose}>
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>


            </ParentContainer>




        </>
    )
}

export default EditorPage
