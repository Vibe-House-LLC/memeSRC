import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';
import { useParams } from 'react-router-dom';
import { TwitterPicker } from 'react-color';
import { Button, Card, Grid, Input, Popover, Slider, TextField } from '@mui/material';
import TextEditorControls from '../components/TextEditorControls';

const ParentContainer = styled.div`
    height: 100%;
    padding: 20px;
`;

const ColorPickerPopover = styled.div({
})

const BackgroundCover = styled.div({
    zIndex: '1200',
    height: '100vh',
    width: '100vw',
    position: 'fixed',
    top: '0',
    left: '0'
})

function parseFid(fid) {
    const parts = fid.split('-');
    if (parts.length !== 4) {
        throw new Error(`Invalid fid: ${fid}`);
    }
    const [seriesId, seasonNum, episodeNum, frameNum] = parts;
    if (Number.isNaN(Number(seasonNum)) || Number.isNaN(Number(episodeNum)) || Number.isNaN(Number(frameNum))) {
        throw new Error(`Invalid fid: ${fid}`);
    }
    return {
        seriesId,
        seasonNum: Number(seasonNum),
        episodeNum: Number(episodeNum),
        frameNum: Number(frameNum)
    };
}

const oImgBuild = path =>
    new Promise(resolve => {
        fabric.Image.fromURL(`https://memesrc.com${path}`, (oImg) => {
            // oImg._element.onload = () => resolve(oImg);
            // oImg._element.onerror = () => resolve({ path, status: 'error' });
            resolve(oImg);
        });
    });

const imgBuild = path =>
    new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve({ path, status: 'error' });

        img.src = `https://memesrc.com${path}`;
    });

const loadImg = (paths, func) => Promise.all(paths.map(func));

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMedia = styled.img`
  width: 100%;
  height: auto;
  background-color: black;
`;

const StyledTypography = styled.p(({ theme }) => ({
    fontSize: '14px',
    color: theme.palette.text.secondary,
    padding: '10px 10px 10px 25px'
}));

const EditorPage = () => {
    const TwitterPickerWrapper = memo(TwitterPicker);

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
    const [defaultSubtitle, setDefaultSubtitle] = useState(false);
    const [fineTuningFrames, setFineTuningFrames] = useState([]);
    const [canvasObjects, setCanvasObjects] = useState();
    const [sessionID, setSessionID] = useState();
    const [surroundingFrames, setSurroundingFrames] = useState();
    const [selectedFid, setSelectedFid] = useState(fid);
    const [colorPickerShowing, setColorPickerShowing] = useState(false);
    const [colorPickerAnchor, setColorPickerAnchor] = useState(null);

    const { selectedObjects, editor, onReady } = useFabricJSEditor()

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
    }, [])

    // Look up data for the fid and set defaults
    useEffect(() => {
        const apiSearchUrl = `https://api.memesrc.com/?fid=${selectedFid}&sessionID=${sessionID}`;
        fetch(apiSearchUrl).then(response => {
            response.json().then(data => {
                setDefaultSubtitle(data.subtitle);
                setSurroundingFrames(data.frames_surrounding);
                // Pre load fine tuning frames
                loadImg(data.frames_fine_tuning, oImgBuild).then((images) => {
                    setFineTuningFrames(images)
                });
                // Background image from the 
                fabric.Image.fromURL(`https://memesrc.com${data.frame_image}`, (oImg) => {
                    const imageAspectRatio = oImg.width / oImg.height;
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
                    prepEditorDefaults(data.subtitle, oImg)
                    // setDefaultSubtitle(data.subtitle);
                }, { crossOrigin: "anonymous" });
            }).catch(err => console.log(err))
        }).catch(err => console.log(err))
    }, [sessionID, selectedFid])

    // Calculate the desired editor size
    const calculateEditorSize = (aspectRatio) => {
        const containerElement = document.getElementById('canvas-container');
        const availableWidth = containerElement.offsetWidth;
        const calculatedWidth = availableWidth;
        const calculatedHeight = availableWidth / aspectRatio;
        return [calculatedHeight, calculatedWidth]
    }

    // Canvas resizing
    const resizeCanvas = (width, height) => {
        console.log('Resized the canvas');
        editor.canvas.preserveObjectStacking = true;
        editor.canvas.setWidth(width);
        editor.canvas.setHeight(height);
        editor.canvas.setBackgroundColor("white");
    }

    // Prep default editor contents
    const prepEditorDefaults = (subtitle, image) => {
        editor?.canvas.setBackgroundImage(image);
        addText(subtitle);
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
    };

    const addCircle = () => {
        editor?.addCircle()
    }

    const addRectangle = () => {
        editor?.addRectangle()
    }

    const addImage = () => {
        fabric.Image.fromURL('/assets/illustrations/illustration_avatar.png', (oImg) => {
            editor?.canvas.add(oImg);
        })
    }

    const saveImage = () => {
        const resultImage = editor.canvas.toDataURL({
            multiplier: imageScale
        });

        setGeneratedImage(resultImage);
    }

    // TODO: Repurpose this for canvas scaling
    const matchImageSize = () => {
        // Export the state of the canvas as a JSON object
        const canvasJson = editor.canvas.toJSON(['hoverCursor', 'selectable']);

        // Scale the objects on the canvas proportionally to fit the new size
        canvasJson.objects.forEach(obj => {
            // Calculate the scale factor based on the ratio of the new canvas size to the original canvas size
            const scaleFactorX = defaultFrame.width / editor.canvas.width;
            const scaleFactorY = defaultFrame.height / editor.canvas.height;

            const scaleFactor = Math.min(scaleFactorX, scaleFactorY)

            console.log(`Scale factor (original / display): ${scaleFactor}`)

            // Scale the object
            obj.scaleX *= scaleFactor;
            obj.scaleY *= scaleFactor;

            // Adjust the position of the object
            obj.left *= scaleFactor;
            obj.top *= scaleFactor;
        });

        // Update the canvas size
        setCanvasSize({
            width: defaultFrame.width,
            height: defaultFrame.height
        })

        // Load the state of the canvas from the JSON object
        editor.canvas.loadFromJSON(canvasJson, () => {
            // Callback function to execute after the canvas is loaded
            console.log('Canvas loaded from JSON');
        });
    }

    const addText = (updatedText) => {
        const text = new fabric.Textbox(updatedText, {
            left: editor.canvas.getWidth() * 0.05,
            top: editor.canvas.getHeight() * 0.95,
            originY: 'bottom',
            width: editor.canvas.getWidth() * 0.9,
            fontSize: editor.canvas.getWidth() * 0.03,
            fontFamily: 'sans-serif',
            fontWeight: 900,
            fill: 'white',
            stroke: 'black',
            strokeLineJoin: 'round',
            strokeWidth: editor.canvas.getWidth() * 0.0040,
            strokeUniform: false,
            textAlign: 'center',
            selectable: true,
            paintFirst: 'stroke'
        });
        editor?.canvas.add(text);
        setCanvasObjects([...editor.canvas._objects]);

    }

    const showColorPicker = (event, index) => {
        setPickingColor(index);
        setColorPickerShowing(index);
        setColorPickerAnchor(event.target);
    }

    const changeColor = (color, index) => {
        editor.canvas.item(index).set('fill', color.hex);
        console.log(`Length of object:  + ${selectedObjects.length}`)
        setCanvasObjects([...editor.canvas._objects])
        console.log(editor.canvas.item(index));
        editor?.canvas.renderAll();
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
        const defaultFontSize = editor.canvas.getWidth() * 0.03;
        editor.canvas.item(index).fontSize = defaultFontSize * (event.target.value / 100);
        setCanvasObjects([...editor.canvas._objects])
        console.log(editor.canvas.item(index));
        editor?.canvas.renderAll();
    }

    const handleFineTuning = (event) => {
        console.log(fineTuningFrames[event.target.value]);
        const oImg = fineTuningFrames[event.target.value];
        oImg.scaleToHeight(canvasSize.height);
        oImg.scaleToWidth(canvasSize.width);
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
        setCanvasObjects([...editor.canvas._objects])
        console.log(editor.canvas.item(index));
        editor?.canvas.renderAll();
    }

    // Outputs
    return (
        <>
            <ParentContainer id="parent-container">
                <Grid container justifyContent='center'>
                    <Grid container item idxs={12} md={8} justifyContent='center'>
                        <Card sx={{ padding: '20px' }}>
                            <Grid container item spacing={2} justifyContent='center'>
                                <Grid item xs={12} md={8}>

                                    <div style={{ width: '100%', height: '100%' }} id='canvas-container'>
                                        <FabricJSCanvas onReady={onReady} />
                                    </div>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Grid item xs={12} marginBottom={2}>
                                        <Button variant='contained' onClick={() => addText('text')} fullWidth sx={{ zIndex: '50' }}>Add Layer</Button>
                                    </Grid>
                                    <Grid container item xs={12} maxHeight={{ xs: {}, md: `${canvasSize.height - 52}px` }} paddingX={{ xs: 0, md: 2 }} sx={{ overflowY: 'scroll', overflow: 'auto' }} flexDirection='col-reverse'>
                                        {canvasObjects && canvasObjects.map((object, index) => (

                                            ('text' in object) &&
                                            <Grid item xs={12} order={`-${index}`} key={`grid${index}`}>
                                                <Card sx={{ marginBottom: '20px', padding: '10px' }} key={`card${index}`}>
                                                    <div style={{ display: 'inline', position: 'relative' }} key={`div${index}`}>
                                                        {/* <button type='button' key={`button${index}`} onClick={(event) => showColorPicker(event, index)}>Change Color</button> */}
                                                        <TextEditorControls showColorPicker={(event) => showColorPicker(event, index)} colorPickerShowing={colorPickerShowing} index={index} key={`togglebuttons${index}`} handleStyle={handleStyle} />

                                                    </div>
                                                    <TextField key={`textfield${index}`} multiline type='text' value={canvasObjects[index].text} fullWidth onFocus={() => handleFocus(index)} onChange={(event) => handleEdit(event, index)} />
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
                                                    />
                                                </Card>
                                            </Grid>
                                        )
                                        )}
                                    </Grid>
                                </Grid>
                                <Grid item xs={8} marginRight={{ xs: '', md: 'auto' }}>
                                    <button type='button' onClick={addCircle}>Add circle</button>
                                    <button type='button' onClick={addRectangle}>Add Rectangle</button>
                                    <button type='button' onClick={addImage}>Add Image</button>
                                    <button type='button' onClick={saveProject}>Save Project</button>
                                    <button type='button' onClick={loadProject}>Load Project</button>
                                    <button type='button' onClick={matchImageSize}>Original Size</button>
                                    <button type='button' onClick={saveImage}>Save Image</button>
                                    {/* <div style={{ display: 'inline', position: 'relative' }}>
                                        <button type='button' onClick={toggleColorPicker}>Change Color</button>
                                        {pickingColor &&
                                            <ColorPickerPopover>
                                                <TwitterPicker onChangeComplete={changeColor} />
                                            </ColorPickerPopover>
                                        }
                                    </div> */}
                                    <Slider
                                        size="small"
                                        defaultValue={4}
                                        min={0}
                                        max={8}
                                        aria-label="Small"
                                        valueLabelDisplay="auto"
                                        onChange={(event) => handleFineTuning(event)}
                                    />

                                </Grid>
                                <Grid container item spacing={4}>
                                    {surroundingFrames && surroundingFrames.map(result => (
                                        <Grid item xs={12} sm={4} md={4} key={result.fid}>
                                            <a style={{ textDecoration: 'none' }}>
                                                <StyledCard>
                                                    <StyledCardMedia
                                                        component="img"
                                                        src={`https://memesrc.com${result.frame_image}`}
                                                        alt={result.subtitle}
                                                        title={result.subtitle}
                                                        onClick={() => {
                                                            editor.canvas._objects = [];
                                                            setSelectedFid(result.fid)
                                                        }}
                                                    />
                                                </StyledCard>
                                            </a>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                        </Card>


                    </Grid>
                </Grid>










                <img src={generatedImage} alt="generated meme" />
                <Popover
                    open={
                        (colorPickerShowing !== false)
                    }
                    anchorEl={colorPickerAnchor}
                    onClose={() => setColorPickerShowing(false)}
                    id="colorPicker"
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <ColorPickerPopover>
                        <TwitterPickerWrapper onChange={(color) => changeColor(color, pickingColor)} />
                    </ColorPickerPopover>
                </Popover>
            </ParentContainer>




        </>
    )
}

export default EditorPage
