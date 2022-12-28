import { useCallback, useEffect, useState } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';
import { useParams } from 'react-router-dom';
import { TwitterPicker } from 'react-color';

const ParentContainer = styled.div`
    height: 100%;
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
                            const containerElement = document.getElementById('parent-container');
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
                            editor?.canvas.add(oImg);
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
            fontSize: 50,
            fontFamily: 'sans-serif',
            fontWeight: 900,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 2,
            strokeUniform: false,
            textAlign: 'center',
            selectable: true
        });
        editor?.canvas.add(text);
    }

    const toggleColorPicker = () => {
        setPickingColor(!pickingColor);
    }

    const changeColor = (color) => {
        selectedObjects.forEach((object) => {
            if (object.type === 'textbox') {
                object.set('fill', color.hex);
                editor?.canvas.renderAll();
            }
        });
    }

    // Outputs
    return (
        <>
            <ParentContainer id="parent-container">
                <button type='button' onClick={addCircle}>Add circle</button>
                <button type='button' onClick={addRectangle}>Add Rectangle</button>
                <button type='button' onClick={addImage}>Add Image</button>
                <button type='button' onClick={() => addText('text')}>Add Text</button>
                <button type='button' onClick={saveProject}>Save Project</button>
                <button type='button' onClick={loadProject}>Load Project</button>
                <button type='button' onClick={matchImageSize}>Original Size</button>
                <button type='button' onClick={saveImage}>Save Image</button>
                <div style={{ display: 'inline', position: 'relative' }}>
                    <button type='button' onClick={toggleColorPicker}>Change Color</button>
                    {pickingColor &&
                        <ColorPickerPopover>
                            <TwitterPicker onChangeComplete={changeColor} />
                        </ColorPickerPopover>
                    }
                </div>
                <FabricJSCanvas onReady={onReady} />
                <img src={generatedImage} alt="generated meme" />
            </ParentContainer >
            {pickingColor && <BackgroundCover onClick={toggleColorPicker} />}
        </>
    )
}

export default EditorPage
