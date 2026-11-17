/** Saves an element as a PNG. html-to-image is loaded only when someone actually exports. */
export async function downloadPng(node: HTMLElement, filename: string): Promise<void> {
  const { toPng } = await import('html-to-image')
  // The calendar scrolls sideways on narrow screens: capture its full size, not just the visible part.
  const dataUrl = await toPng(node, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: node.scrollWidth,
    height: node.scrollHeight,
    style: { overflow: 'visible', width: `${node.scrollWidth}px` },
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
