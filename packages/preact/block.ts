import { Fragment, h } from 'preact';
import { useCallback, useMemo, useRef } from 'preact/hooks';
import {
  block as createBlock,
  mount$,
  patch as patchBlock,
} from '../million/block';
import { Map$, MapGet$, MapHas$, MapSet$ } from '../million/constants';
import { document$, queueMicrotask$ } from '../million/dom';
import { Effect, RENDER_SCOPE, css } from '../react/constants';
import { unwrap } from './utils';
import type { Options } from '../react/types';
import type { Props } from '../million';
import type { ComponentType, VNode } from 'preact';

// @ts-expect-error - CSSStyleSheet is not supported on Safari
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (CSSStyleSheet.prototype.replaceSync) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  document$.adoptedStyleSheets = [sheet];
} else {
  const style = document$.createElement('style');
  document$.head.appendChild(style);
  style.type = 'text/css';
  style.appendChild(document$.createTextNode(css));
}

export const REGISTRY = new Map$<
  (props: Props) => VNode,
  ReturnType<typeof createBlock>
>();

export const block = (fn: ComponentType<any> | null, options: Options = {}) => {
  const block = MapHas$.call(REGISTRY, fn)
    ? MapGet$.call(REGISTRY, fn)
    : fn
    ? createBlock(fn as any, unwrap)
    : options.block;

  function MillionBlock(props: Props) {
    const ref = useRef<HTMLElement>(null);
    const patch = useRef<((props: Props) => void) | null>(null);

    patch.current?.(props);

    const effect = useCallback(() => {
      const currentBlock = block(props, props.key, options.shouldUpdate);
      if (ref.current && patch.current === null) {
        queueMicrotask$(() => {
          mount$.call(currentBlock, ref.current!, null);
        });
        patch.current = (props: Props) => {
          queueMicrotask$(() => {
            patchBlock(currentBlock, block(props));
          });
        };
      }
    }, []);

    const marker = useMemo(() => {
      return h(RENDER_SCOPE as any, { ref });
    }, []);

    const vnode = h(Fragment, null, marker, h(Effect, { effect }));

    return vnode;
  }

  if (!MapHas$.call(REGISTRY, MillionBlock)) {
    MapSet$.call(REGISTRY, MillionBlock, block);
  }

  return MillionBlock;
};