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
                    setCanvasSize({
                        width: oImg.width,
                        height: oImg.height
                    });
                    console.log(oImg);
                    editor?.canvas.add(oImg);
                })
            }

        }
    }, [editor, canvasSize, fid, loadedFid])

    // Handle events
    const onAddCircle = () => {
        editor?.addCircle()
    }
    const onAddRectangle = () => {
        editor?.addRectangle()
    }
    const onAddImage = () => {
        // Trigger image loading when the button is clicked
        fabric.Image.fromURL('/assets/illustrations/illustration_avatar.png', (oImg) => {
            editor?.canvas.add(oImg);
        })

    }

    const onAddText = () => {
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

    const onChangeColor = (color) => {
        selectedObjects.forEach((object) => {
            if (object.type === 'textbox') {
                object.set('fill', color.hex);
                editor?.canvas.renderAll();
            }
        });
    }

    // Outputs
    return (
        <><ParentContainer>
            <button type='button' onClick={onAddCircle}>Add circle</button>
            <button type='button' onClick={onAddRectangle}>Add Rectangle</button>
            <button type='button' onClick={onAddImage}>Add Image</button>
            <button type='button' onClick={onAddText}>Add Text</button>
            <div style={{ display: 'inline', position: 'relative' }}>
                <button type='button' onClick={toggleColorPicker}>Change Color</button>
                {pickingColor &&
                    <ColorPickerPopover>
                        <TwitterPicker onChangeComplete={onChangeColor} />
                    </ColorPickerPopover>
                }
            </div>
            <FabricJSCanvas className="sample-canvas" onReady={onReady} height="100%" />
        </ParentContainer >
            {pickingColor && <BackgroundCover onClick={toggleColorPicker} />}
        </>
    )
}

export default EditorPage
