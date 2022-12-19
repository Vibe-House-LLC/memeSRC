import { useEffect, useState } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';
import { useParams } from 'react-router-dom';

const ParentContainer = styled.div`
  height: 100%;
`;

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
    const { selectedObjects, editor, onReady } = useFabricJSEditor()
    useEffect(() => {
        if (editor) {
            editor.canvas.setWidth(1280);
            editor.canvas.setHeight(720);
            editor.canvas.setBackgroundColor("white");
            if (fid && !loadedFid) {
                setLoadedFid(fid)
                console.log('loaded image')
                const parsedFid = parseFid(fid)
                console.log(parsedFid)
                fabric.Image.fromURL(`https://memesrc.com/${parsedFid.seriesId}/img/${parsedFid.seasonNum}/${parsedFid.episodeNum}/${fid}.jpg`, (oImg) => {
                    editor?.canvas.add(oImg);
                })
            }
        }
    }, [editor])

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

    // Outputs
    return (
        <ParentContainer>
            <button onClick={onAddCircle}>Add circle</button>
            <button onClick={onAddRectangle}>Add Rectangle</button>
            <button onClick={onAddImage}>Add Image</button>
            { }
            <FabricJSCanvas className="sample-canvas" onReady={onReady} height="100%" />
        </ParentContainer >
    )
}

export default EditorPage
