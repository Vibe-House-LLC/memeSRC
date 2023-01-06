import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';
import { useParams } from 'react-router-dom';
import { TwitterPicker } from 'react-color';
import { Button, Card, Grid, Input, Slider, TextField } from '@mui/material';

const ParentContainer = styled.div`
    height: 100%;
    padding: 20px;
`;

const ColorPickerPopover = styled.div({
    position: 'absolute',
    top: '30px',
    zIndex: '1201',
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

const EditorPage = () => {
    const TwitterPickerWrapper = memo(TwitterPicker);

    // Get everything ready
    const { fid } = useParams();
    const [loadedFid, setLoadedFid] = useState();
    const [baseImg, setBaseImg] = useState(null);
    const [pickingColor, setPickingColor] = useState(false);
    const [imageScale, setImageScale] = useState();
    const [generatedImage, setGeneratedImage] = useState();
    const [canvasSize, setCanvasSize] = useState({
        width: 500,
        height: 500
    });
    const [defaultSubtitle, setDefaultSubtitle] = useState(false);
    const [canvasObjects, setCanvasObjects] = useState();

    const { selectedObjects, editor, onReady } = useFabricJSEditor()

    useEffect(() => {
        function getSessionID() {
            if ("sessionID" in sessionStorage) {
                return Promise.resolve(sessionStorage.getItem("sessionID"));
            }
            return fetch(`https://api.memesrc.com/?uuidGen`)
                .then(response => response.text())
                .then(sessionID => {
                    sessionStorage.setItem("sessionID", sessionID);
                    return sessionID;
                });
        }

        if (editor && editor.canvas.width !== canvasSize.width && editor.canvas.height !== canvasSize.height) {
            console.log('Resized the canvas');
            editor.canvas.preserveObjectStacking = true;
            editor.canvas.setWidth(canvasSize.width);
            editor.canvas.setHeight(canvasSize.height);
            editor.canvas.setBackgroundColor("white");
            if (defaultSubtitle) {
                addText(defaultSubtitle);
            }

            if (fid && !loadedFid) {
                const apiSearchUrl = `https://api.memesrc.com/?fid=${fid}&sessionID=${getSessionID}`;
                fetch(apiSearchUrl)
                    .then(response => response.json())
                    .then(data => {
                        console.log('addText');
                        setLoadedFid(fid)
                        console.log('loaded image')
                        const parsedFid = parseFid(fid)
                        console.log(parsedFid)
                        fabric.Image.fromURL(`https://memesrc.com${data.frame_image}`, (oImg) => {
                            setBaseImg(oImg);
                            // Get a reference to the ParentContainer element
                            const containerElement = document.getElementById('canvas-container');
                            // Get the width and height of the ParentContainer
                            const availableWidth = containerElement.offsetWidth;
                            const availableHeight = containerElement.offsetHeight;
                            // Determine the aspect ratio of the image
                            const imageAspectRatio = oImg.width / oImg.height;
                            // Calculate the size of the canvas based on the aspect ratio of the image and the available space
                            let calculatedWidth;
                            let calculatedHeight;
                            if (availableWidth / imageAspectRatio <= availableHeight) {
                                // If the width is the limiting factor, set the canvas width to the available width and the height based on the aspect ratio
                                calculatedWidth = availableWidth;
                                calculatedHeight = availableWidth / imageAspectRatio;
                            } else {
                                // If the height is the limiting factor, set the canvas height to the available height and the width based on the aspect ratio
                                calculatedHeight = availableHeight;
                                calculatedWidth = availableHeight * imageAspectRatio;
                            }
                            setCanvasSize({
                                width: calculatedWidth,
                                height: calculatedHeight
                            });
                            console.log('image')
                            console.log(oImg);
                            // Scale the image to fit the canvas
                            oImg.scale(calculatedWidth / oImg.width);
                            // Center the image within the canvas
                            oImg.set({ left: 0, top: 0 });
                            // Disable the ability to edit the image
                            oImg.selectable = false;
                            oImg.hoverCursor = 'default';
                            oImg.crossOrigin = 'anonymous';
                            editor?.canvas.setBackgroundImage(oImg);
                            const minRes = 1280;
                            const x = (oImg.width > minRes) ? oImg.width : minRes;
                            setImageScale(x / calculatedWidth);
                            setDefaultSubtitle(data.subtitle);
                        }, { crossOrigin: "anonymous" });

                    })
                    .catch(error => {
                        console.error(error);
                    });
            }

        }
    }, [editor, canvasSize, fid, loadedFid])

    // Handle events
    const saveProject = () => {
        const canvasJson = editor.canvas.toJSON(['hoverCursor', 'selectable']);
        const key = fid ? `project-${fid}` : 'project-example';
        localStorage.setItem(key, JSON.stringify(canvasJson));
    };

    const loadProject = () => {
        const key = fid ? `project-${fid}` : 'project-example';
        const canvasJson = localStorage.getItem(key);
        editor.canvas.loadFromJSON(canvasJson, () => {
            console.log('Canvas loaded from JSON');
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

    const matchImageSize = () => {
        // Export the state of the canvas as a JSON object
        const canvasJson = editor.canvas.toJSON(['hoverCursor', 'selectable']);

        // Scale the objects on the canvas proportionally to fit the new size
        canvasJson.objects.forEach(obj => {
            // Calculate the scale factor based on the ratio of the new canvas size to the original canvas size
            const scaleFactorX = baseImg.width / editor.canvas.width;
            const scaleFactorY = baseImg.height / editor.canvas.height;

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
            width: baseImg.width,
            height: baseImg.height
        })

        // Load the state of the canvas from the JSON object
        editor.canvas.loadFromJSON(canvasJson, () => {
            // Callback function to execute after the canvas is loaded
            console.log('Canvas loaded from JSON');
        });
    }

    const addText = (updatedText) => {
        const text = new fabric.Textbox(updatedText, {
            left: 0,
            top: editor.canvas.getHeight() - 35,
            originY: 'bottom',
            width: editor.canvas.getWidth(),
            fontSize: editor.canvas.getWidth() * 0.03,
            fontFamily: 'sans-serif',
            fontWeight: 900,
            fill: 'white',
            stroke: 'black',
            strokeWidth: editor.canvas.getWidth() * 0.00125,
            strokeUniform: false,
            textAlign: 'center',
            selectable: true
        });
        editor?.canvas.add(text);
        setCanvasObjects(editor.canvas._objects);

    }

    const toggleColorPicker = () => {
        setPickingColor(!pickingColor);
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

    // Outputs
    return (
        <>
            <ParentContainer id="parent-container">

                <Grid container spacing={2}>
                    <Grid item xs={12} md={8} height='100vh'>
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
                        <div style={{ width: '100%', height: '100%' }} id='canvas-container'>
                            <FabricJSCanvas onReady={onReady} />
                        </div>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        {editor?.canvas?.getObjects().map((object, index) => (

                            ('text' in object) &&

                            <Card sx={{ marginTop: '10px', marginBottom: '10px', paddingY: '10px' }} key={`card${index}`}>
                                <div style={{ display: 'inline', position: 'relative' }} key={`div${index}`}>
                                    <button type='button' key={`button${index}`} onClick={toggleColorPicker}>Change Color</button>
                                    {pickingColor &&
                                        <ColorPickerPopover key={`colorpicker${index}`}>
                                            <TwitterPickerWrapper key={`twitterpicker${index}`} onChange={(color) => changeColor(color, index)} />
                                        </ColorPickerPopover>
                                    }
                                </div>
                                <TextField key={`textfield${index}`} multiline type='text' value={canvasObjects[index].text} sx={{ marginLeft: '5px', marginRight: '5px' }} fullWidth onFocus={() => handleFocus(index)} onChange={(event) => handleEdit(event, index)} />
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
                        )
                        )}
                        <Button variant='contained' onClick={() => addText('text')} fullWidth>Add Layer</Button>
                    </Grid>
                </Grid>








                <img src={generatedImage} alt="generated meme" />
            </ParentContainer >
            {/* {pickingColor && <BackgroundCover onClick={toggleColorPicker} />} */}
        </>
    )
}

export default EditorPage
