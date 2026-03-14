/// <reference types="jest" />
/* eslint-disable testing-library/no-unnecessary-act */
import * as React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import StickerAddFlow from './StickerAddFlow';

jest.mock('../../library/LibraryBrowser', () => ({
  __esModule: true,
  default: function MockLibraryBrowser(props: any) {
    return (
      <button type="button" onClick={() => props.onSelect([{ id: 'sticker-1' }])}>
        pick sticker
      </button>
    );
  },
}));

jest.mock('./StickerBrushEditor', () => ({
  __esModule: true,
  default: function MockStickerBrushEditor(props: any) {
    return (
      <div>
        <div>editor:{props.imageSrc}</div>
        <div>mode:{props.initialScreenMode}</div>
        <button type="button" onClick={props.onBack}>editor back</button>
        <button
          type="button"
          onClick={() => props.onAdd({
            changed: false,
            dataUrl: props.imageSrc,
            blob: new Blob(['test'], { type: 'image/png' }),
            width: 40,
            height: 20,
            cropBounds: { x: 0, y: 0, width: 40, height: 20 },
            sourceWidth: 40,
            sourceHeight: 20,
          })}
        >
          editor add
        </button>
      </div>
    );
  },
}));

describe('StickerAddFlow', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderFlow = (props: React.ComponentProps<typeof StickerAddFlow>) => {
    act(() => {
      root.render(<StickerAddFlow {...props} />);
    });
  };

  const clickText = async (text: string) => {
    const buttons = Array.from(container.querySelectorAll('button'));
    const element = buttons.find((button) => button.textContent === text) as HTMLButtonElement | undefined;
    expect(element).toBeTruthy();
    await act(async () => {
      element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
  };

  test('moves from library to editor after selecting a sticker', async () => {
    const onResolveSelection = jest.fn(async () => ({
      dataUrl: 'data:image/png;base64,abc',
      metadata: { libraryKey: 'library/test' },
      aspectRatio: 2,
    }));

    renderFlow({
      flow: { mode: 'add-from-library' },
      onClose: jest.fn(),
      onResolveSelection,
      onCommit: jest.fn(),
    });

    await clickText('pick sticker');

    expect(onResolveSelection).toHaveBeenCalledWith({ id: 'sticker-1' });
    expect(container.textContent).toContain('editor:data:image/png;base64,abc');
  });

  test('editor back returns to the library step', async () => {
    const onResolveSelection = jest.fn(async () => ({
      dataUrl: 'data:image/png;base64,abc',
      metadata: {},
      aspectRatio: 1,
    }));

    renderFlow({
      flow: { mode: 'add-from-library' },
      onClose: jest.fn(),
      onResolveSelection,
      onCommit: jest.fn(),
    });

    await clickText('pick sticker');
    expect(container.textContent).toContain('editor:data:image/png;base64,abc');
    await clickText('editor back');

    expect(container.textContent).toContain('pick sticker');
  });

  test('commits the edited sticker and closes the flow', async () => {
    const onResolveSelection = jest.fn(async () => ({
      dataUrl: 'data:image/png;base64,xyz',
      metadata: { libraryKey: 'library/source' },
      aspectRatio: 1,
    }));
    const onCommit = jest.fn(async () => undefined);
    const onClose = jest.fn();

    renderFlow({
      flow: { mode: 'add-from-library' },
      onClose,
      onResolveSelection,
      onCommit,
    });

    await clickText('pick sticker');
    expect(container.textContent).toContain('editor:data:image/png;base64,xyz');

    const buttons = Array.from(container.querySelectorAll('button'));
    const addButton = buttons.find((button) => button.textContent === 'editor add');
    expect(addButton).toBeTruthy();
    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onCommit).toHaveBeenCalledWith({
      mode: 'add-from-library',
      preparedSource: {
        dataUrl: 'data:image/png;base64,xyz',
        metadata: { libraryKey: 'library/source' },
        aspectRatio: 1,
      },
      edit: expect.objectContaining({
        changed: false,
        dataUrl: 'data:image/png;base64,xyz',
        width: 40,
        height: 20,
      }),
      existingEditContext: undefined,
    });
    expect(onClose).toHaveBeenCalled();
  });

  test('back from the library closes the flow', async () => {
    const onClose = jest.fn();

    renderFlow({
      flow: { mode: 'add-from-library' },
      onClose,
      onResolveSelection: jest.fn(),
      onCommit: jest.fn(),
    });

    await clickText('Library');

    expect(onClose).toHaveBeenCalled();
  });

  test('existing sticker edit mode opens the editor immediately', () => {
    renderFlow({
      flow: {
        mode: 'edit-existing-sticker',
        preparedSource: {
          dataUrl: 'data:image/png;base64,placed',
          metadata: { libraryKey: 'library/placed' },
          aspectRatio: 1,
        },
        existingEditContext: {
          stickerId: 'sticker-placed',
          sticker: { id: 'sticker-placed' },
          displayRectPx: { x: 10, y: 20, width: 40, height: 40, angleDeg: 15 },
          placement: { xPercent: 10, yPercent: 20, widthPercent: 30, angleDeg: 15, aspectRatio: 1 },
          previewCanvasSize: { width: 300, height: 200 },
          sourceWorkingDimensions: { width: 256, height: 256 },
          contextBackdropSrc: 'data:image/png;base64,context',
          layerIndex: 2,
        },
      },
      onClose: jest.fn(),
      onResolveSelection: jest.fn(),
      onCommit: jest.fn(),
    });

    expect(container.textContent).toContain('editor:data:image/png;base64,placed');
    expect(container.textContent).toContain('mode:edit');
  });
});
