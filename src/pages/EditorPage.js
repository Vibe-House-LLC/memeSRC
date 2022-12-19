import { useEffect } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';

const ParentContainer = styled.div`
  height: 100%;
`;

const EditorPage = () => {
    // Initialize fabric stuff
    const { selectedObjects, editor, onReady } = useFabricJSEditor()
    useEffect(() => {
        if (editor) {
            editor.canvas.setWidth(1280);
            editor.canvas.setHeight(720);
            editor.canvas.setBackgroundColor("white");
        }
    })

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
            <FabricJSCanvas className="sample-canvas" onReady={onReady} height="100%" />
        </ParentContainer >
    )
}

export default EditorPage
