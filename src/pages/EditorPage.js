import { useEffect, useState } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';
import { useParams } from 'react-router-dom';
import { TwitterPicker } from 'react-color';

const ParentContainer = styled.div`
  height: 100%;
`;

const ColorPickerPopover = styled.div(
    {
        position: 'absolute',
        top: '30px',
        zIndex: '1201',
    }
);

const BackgroundCover = styled.div(
    {
        zIndex: '1200',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: '0',
        left: '0'
    }
)

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
    const [canvasSize, setCanvasSize] = useState({
        width: 500,
        height: 500
    });
    const { selectedObjects, editor, onReady } = useFabricJSEditor()

    useEffect(() => {
        if (editor && editor.canvas.width !== canvasSize.width && editor.canvas.height !== canvasSize.height) {
            console.log('Resized the canvas');
            editor.canvas.setWidth(canvasSize.width);
            editor.canvas.setHeight(canvasSize.height);
            editor.canvas.setBackgroundColor("white");
            if (fid && !loadedFid) {
                setLoadedFid(fid)
                console.log('loaded image')
                const parsedFid = parseFid(fid)
                console.log(parsedFid)
                fabric.Image.fromURL(`https://memesrc.com/${parsedFid.seriesId}/img/${parsedFid.seasonNum}/${parsedFid.episodeNum}/${fid}.jpg`, (oImg) => {
                    setBaseImg(oImg)
                    // Get a reference to the ParentContainer element
                    const containerElement = document.getElementById('parent-container');
                    // Get the width of the ParentContainer
                    const availableWidth = containerElement.offsetWidth;
                    // Determine the aspect ratio of the image
                    const imageAspectRatio = oImg.width / oImg.height;
                    // Calculate the height of the canvas based on the aspect ratio of the image
                    const calculatedHeight = availableWidth / imageAspectRatio;
                    setCanvasSize({
                        width: availableWidth,
                        height: calculatedHeight
                    });
                    console.log(oImg);
                    // Scale the image to fit the canvas
                    oImg.scale(availableWidth / oImg.width);
                    // Center the image within the canvas
                    oImg.set({ left: 0, top: 0 });
                    // Disable the ability to edit the image
                    oImg.selectable = false;
                    oImg.hoverCursor = 'default';
                    editor?.canvas.add(oImg);
                })
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

    const matchImageSize = () => {
        // Export the state of the canvas as a JSON object
        const canvasJson = editor.canvas.toJSON(['hoverCursor', 'selectable']);

        // Scale the objects on the canvas proportionally to fit the new size
        canvasJson.objects.forEach(obj => {
            // Calculate the scale factor based on the ratio of the new canvas size to the original canvas size
            const scaleFactorX = baseImg.width / editor.canvas.width;
            const scaleFactorY = baseImg.height / editor.canvas.height;

            console.log(`x: ${scaleFactorX}, y: ${scaleFactorY}`)

            // Scale the object
            obj.scaleX *= scaleFactorX;
            obj.scaleY *= scaleFactorY;

            // Adjust the position of the object
            obj.left *= scaleFactorX;
            obj.top *= scaleFactorY;
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

    const addText = () => {
        const text = new fabric.Textbox('Text', {
            left: 0,
            top: editor.canvas.getHeight() - 100,
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
        <><ParentContainer id="parent-container">
            <button type='button' onClick={addCircle}>Add circle</button>
            <button type='button' onClick={addRectangle}>Add Rectangle</button>
            <button type='button' onClick={addImage}>Add Image</button>
            <button type='button' onClick={addText}>Add Text</button>
            <button type='button' onClick={saveProject}>Save Project</button>
            <button type='button' onClick={loadProject}>Load Project</button>
            <button type='button' onClick={matchImageSize}>Original Size</button>
            <div style={{ display: 'inline', position: 'relative' }}>
                <button type='button' onClick={toggleColorPicker}>Change Color</button>
                {pickingColor &&
                    <ColorPickerPopover>
                        <TwitterPicker onChangeComplete={changeColor} />
                    </ColorPickerPopover>
                }
            </div>
            <FabricJSCanvas onReady={onReady} />
        </ParentContainer >
            {pickingColor && <BackgroundCover onClick={toggleColorPicker} />}
        </>
    )
}

export default EditorPage
