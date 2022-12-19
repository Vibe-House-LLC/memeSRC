import React, { useEffect } from 'react'
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import styled from '@emotion/styled';

const ParentContainer = styled.div`
  height: 100%;
`;

const EditorPage = () => {
    const { selectedObjects, editor, onReady } = useFabricJSEditor()
    const onAddCircle = () => {
        editor?.addCircle()
    }
    const onAddRectangle = () => {
        editor?.addRectangle()
    }

    React.useEffect(() => {
        if (editor) {
            editor.canvas.setWidth(1280);
            editor.canvas.setHeight(720);
            editor.canvas.setBackgroundColor("white");
        }
    })

    return (
        <ParentContainer>
            <button onClick={onAddCircle}>Add circle</button>
            <button onClick={onAddRectangle}>Add Rectangle</button>
            <button onClick={() => {
                // Trigger image loading when the button is clicked
                fabric.Image.fromURL('/assets/illustrations/illustration_avatar.png', (oImg) => {
                    editor?.canvas.add(oImg);
                });
            }}>Add Image</button>
            <FabricJSCanvas className="sample-canvas" onReady={onReady} height="100%" />
        </ParentContainer>
    )
}

export default EditorPage
