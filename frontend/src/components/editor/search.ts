import {Extension} from '@tiptap/core';
import type {Node as PMNode} from '@tiptap/pm/model';
import {Plugin, PluginKey, TextSelection, type EditorState, type Transaction} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

/**
 * Find and replace. Matches are shown with decorations only, so nothing about a search is ever
 * stored in the document. A match can span marks (bold inside a word), but not blocks.
 */
export type SearchMatch = {from: number; to: number};
type SearchState = {query: string; caseSensitive: boolean; current: number; matches: SearchMatch[]};

export const searchKey = new PluginKey<SearchState>('studioSearch');

/** Every match of `query`, in document order. Inline leaf nodes count as one character. */
export function findMatches(doc: PMNode, query: string, caseSensitive: boolean): SearchMatch[] {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const raw = node.textBetween(0, node.content.size, undefined, '￼');
    const text = caseSensitive ? raw : raw.toLowerCase();
    let index = text.indexOf(needle);
    while (index !== -1) {
      matches.push({from: pos + 1 + index, to: pos + 1 + index + needle.length});
      index = text.indexOf(needle, index + Math.max(needle.length, 1));
    }
    return false;
  });
  return matches;
}

const EMPTY: SearchState = {query: '', caseSensitive: false, current: 0, matches: []};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    studioSearch: {
      /** Starts or updates a search; highlights every match and selects the first one. */
      setSearch: (query: string, caseSensitive: boolean) => ReturnType;
      /** Moves to the next (1) or previous (-1) match and scrolls it into view. */
      goToMatch: (direction: 1 | -1) => ReturnType;
      /** Replaces the current match, then moves to the next one. */
      replaceMatch: (replacement: string) => ReturnType;
      /** Replaces every match in one step (one undo). */
      replaceAllMatches: (replacement: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

/** The search state for the toolbar's panel: query, matches and which one is current. */
export function searchStateOf(state: EditorState): SearchState {
  return searchKey.getState(state) ?? EMPTY;
}

function select(tr: Transaction, match: SearchMatch | undefined) {
  if (match) tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
  return tr;
}

export const StudioSearch = Extension.create({
  name: 'studioSearch',

  addCommands() {
    return {
      setSearch:
        (query, caseSensitive) =>
        ({tr, state, dispatch}) => {
          const matches = findMatches(state.doc, query, caseSensitive);
          // Start from the first match at or after the cursor.
          const current = Math.max(0, matches.findIndex(match => match.from >= state.selection.from));
          if (dispatch) select(tr.setMeta(searchKey, {query, caseSensitive, current, matches}), matches[current]);
          return true;
        },
      goToMatch:
        direction =>
        ({tr, state, dispatch}) => {
          const search = searchStateOf(state);
          if (!search.matches.length) return false;
          const current = (search.current + direction + search.matches.length) % search.matches.length;
          if (dispatch) select(tr.setMeta(searchKey, {...search, current}), search.matches[current]);
          return true;
        },
      replaceMatch:
        replacement =>
        ({tr, state, dispatch}) => {
          const search = searchStateOf(state);
          const match = search.matches[search.current];
          if (!match) return false;
          if (dispatch) {
            tr.insertText(replacement, match.from, match.to);
            const matches = findMatches(tr.doc, search.query, search.caseSensitive);
            const current = matches.length ? Math.min(search.current, matches.length - 1) : 0;
            select(tr.setMeta(searchKey, {...search, matches, current}), matches[current]);
          }
          return true;
        },
      replaceAllMatches:
        replacement =>
        ({tr, state, dispatch}) => {
          const search = searchStateOf(state);
          if (!search.matches.length) return false;
          if (dispatch) {
            // Back to front, so earlier positions stay valid.
            for (const match of [...search.matches].reverse()) tr.insertText(replacement, match.from, match.to);
            tr.setMeta(searchKey, {...search, matches: findMatches(tr.doc, search.query, search.caseSensitive), current: 0});
          }
          return true;
        },
      clearSearch:
        () =>
        ({tr, dispatch}) => {
          if (dispatch) tr.setMeta(searchKey, EMPTY);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => EMPTY,
          apply(tr, value) {
            const meta = tr.getMeta(searchKey) as SearchState | undefined;
            if (meta) return meta;
            if (!tr.docChanged || !value.query) return value;
            // Typing elsewhere: re-find, keeping roughly the same current match.
            const matches = findMatches(tr.doc, value.query, value.caseSensitive);
            return {...value, matches, current: Math.min(value.current, Math.max(matches.length - 1, 0))};
          },
        },
        props: {
          decorations(state) {
            const search = searchKey.getState(state);
            if (!search?.matches.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              search.matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class: index === search.current ? 'write-match write-match--current' : 'write-match',
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});
