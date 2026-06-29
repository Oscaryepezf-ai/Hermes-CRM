export type FlowButton = { id: string; label: string; nextNodeId: string | null }
export type FlowNodeKind = 'MESSAGE' | 'HANDOFF' | 'END'
