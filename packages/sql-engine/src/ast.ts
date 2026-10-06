import type { AstNode } from "./parser"

export type AstFacts = {
  functionNames: string[]
  schemaReferences: string[]
  nestedStatementKinds: string[]
  hasSelectInto: boolean
  functionLanguages: string[]
}

const MODIFYING_KINDS = new Set(["InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"])

function stringValue(node: unknown): string | null {
  if (typeof node === "object" && node !== null && "String" in node) {
    const inner = (node as { String: { sval?: string } }).String
    return inner.sval ?? null
  }
  return null
}

function nameList(list: unknown): string[] {
  return Array.isArray(list)
    ? list.map(stringValue).filter((value): value is string => value !== null)
    : []
}

export function collectFacts(root: AstNode, rootKind: string): AstFacts {
  const facts: AstFacts = {
    functionNames: [],
    schemaReferences: [],
    nestedStatementKinds: [],
    hasSelectInto: false,
    functionLanguages: [],
  }

  const visit = (value: unknown, depth: number) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, depth)
      }
      return
    }
    if (typeof value !== "object" || value === null) {
      return
    }
    const schemaName = (value as { schemaname?: unknown }).schemaname
    if (typeof schemaName === "string" && schemaName.length > 0) {
      facts.schemaReferences.push(schemaName.toLowerCase())
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "FuncCall" && typeof child === "object" && child !== null) {
        const names = nameList((child as { funcname?: unknown }).funcname)
        const name = names.at(-1)
        if (name) {
          facts.functionNames.push(name.toLowerCase())
        }
        if (names.length > 1 && names[0]) {
          facts.schemaReferences.push(names[0].toLowerCase())
        }
      }
      if (MODIFYING_KINDS.has(key) && depth > 0) {
        facts.nestedStatementKinds.push(key)
      }
      if (key === "intoClause" && rootKind === "SelectStmt") {
        facts.hasSelectInto = true
      }
      if (key === "DefElem" && typeof child === "object" && child !== null) {
        const element = child as { defname?: string; arg?: unknown }
        if (element.defname === "language") {
          const language = stringValue(element.arg)
          if (language) {
            facts.functionLanguages.push(language.toLowerCase())
          }
        }
      }
      if (key === "DropStmt" || key === "RenameStmt" || key === "CommentStmt") {
        visitQualifiedObjects(child, facts)
      }
      visit(child, depth + 1)
    }
  }

  visit(root, 0)
  if (rootKind === "DropStmt" || rootKind === "RenameStmt" || rootKind === "CommentStmt") {
    visitQualifiedObjects(root, facts)
  }
  if (rootKind === "CreateFunctionStmt") {
    for (const option of (root as { options?: unknown[] }).options ?? []) {
      visit(option, 1)
    }
  }
  return facts
}

function visitQualifiedObjects(node: unknown, facts: AstFacts) {
  const objects = (node as { objects?: unknown[] }).objects
  if (!Array.isArray(objects)) {
    return
  }
  for (const object of objects) {
    const list = (object as { List?: { items?: unknown[] } }).List?.items
    const names = nameList(list)
    if (names.length > 1 && names[0]) {
      facts.schemaReferences.push(names[0].toLowerCase())
    }
  }
}
