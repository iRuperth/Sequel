import { type EditorState, type Range, StateEffect, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view"

export const setErrorOffset = StateEffect.define<number | null>()

const errorMark = Decoration.mark({ class: "cm-error-mark" })
const errorLine = Decoration.line({ class: "cm-error-line" })

function buildDecorations(state: EditorState, offset: number): DecorationSet {
  const docLength = state.doc.length
  if (docLength === 0) {
    return Decoration.none
  }
  const position = Math.min(Math.max(offset, 0), docLength - 1)
  const line = state.doc.lineAt(position)
  const word = state.wordAt(position)
  const from = word ? word.from : position
  const to = word ? word.to : Math.min(position + 1, line.to)
  const ranges: Range<Decoration>[] = [errorLine.range(line.from)]
  if (to > from) {
    ranges.push(errorMark.range(from, to))
  }
  return Decoration.set(ranges, true)
}

export const errorMarkerField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = transaction.docChanged ? Decoration.none : decorations
    for (const effect of transaction.effects) {
      if (effect.is(setErrorOffset)) {
        next =
          effect.value === null
            ? Decoration.none
            : buildDecorations(transaction.state, effect.value)
      }
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})
