declare module 'react-pannellum' {
  import * as React from 'react'
  type ReactPannellumProps = {
    id: string
    sceneId: string
    imageSource: string
    config?: Record<string, unknown>
    style?: React.CSSProperties
  }
  const ReactPannellum: React.ComponentType<ReactPannellumProps>
  export default ReactPannellum
}


