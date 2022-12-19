import React from 'react'

import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'

const EditorPage = () => {
  const { editor, onReady } = useFabricJSEditor()
  const onAddCircle = () => {
    editor?.addCircle()
  }
  const onAddRectangle = () => {
    editor?.addRectangle()
  }

  return (<div>
    <button onClick={onAddCircle}>Add circle</button>
    <button onClick={onAddRectangle}>Add Rectangle</button>
    <FabricJSCanvas className="sample-canvas" onReady={onReady} />
  </div>)
}

export default EditorPage