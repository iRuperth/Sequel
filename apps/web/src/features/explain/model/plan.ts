import type { PlanNode } from "@sequel/contracts"

export const MISESTIMATE_THRESHOLD = 10

export type IndexedPlanNode = {
  id: string
  node: PlanNode
  depth: number
  children: IndexedPlanNode[]
}

export function indexPlan(node: PlanNode, depth = 0, path = "0"): IndexedPlanNode {
  return {
    id: path,
    node,
    depth,
    children: node.children.map((child, index) => indexPlan(child, depth + 1, `${path}.${index}`)),
  }
}

export function collectIds(node: IndexedPlanNode, into: string[] = []): string[] {
  into.push(node.id)
  for (const child of node.children) {
    collectIds(child, into)
  }
  return into
}

export function countNodes(node: PlanNode): number {
  return 1 + node.children.reduce((total, child) => total + countNodes(child), 0)
}

export function misestimateFactor(node: PlanNode): number | null {
  if (node.actualRows === null) {
    return null
  }
  const loops = node.actualLoops && node.actualLoops > 0 ? node.actualLoops : 1
  const actual = Math.max(node.actualRows * loops, 1)
  const estimated = Math.max(node.planRows, 1)
  const factor = actual > estimated ? actual / estimated : estimated / actual
  return factor >= MISESTIMATE_THRESHOLD ? factor : null
}

export function exclusiveTime(node: PlanNode): number | null {
  if (node.actualTotalTime === null) {
    return null
  }
  const loops = node.actualLoops && node.actualLoops > 0 ? node.actualLoops : 1
  const childTime = node.children.reduce(
    (total, child) => total + (child.actualTotalTime ?? 0) * (child.actualLoops || 1),
    0,
  )
  return Math.max(node.actualTotalTime * loops - childTime, 0)
}

export function relationLabel(node: PlanNode): string | null {
  if (!node.relationName) {
    return null
  }
  const base = node.schema ? `${node.schema}.${node.relationName}` : node.relationName
  return node.alias && node.alias !== node.relationName ? `${base} ${node.alias}` : base
}
