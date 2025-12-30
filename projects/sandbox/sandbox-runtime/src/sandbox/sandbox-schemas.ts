// Filesystem restriction configs (internal structures built from permission rules)
export type FsReadRestrictionConfig = {
  denyOnly: string[]
}

export type FsWriteRestrictionConfig = {
  allowOnly: string[]
  denyWithinAllow: string[]
}

// Network restriction config (internal structure built from permission rules)
export type NetworkRestrictionConfig = {
  allowedHosts?: string[]
  deniedHosts?: string[]
}

export type NetworkHostPattern = {
  host: string
  port: number | undefined
}

export type SandboxAskCallback = (
  params: NetworkHostPattern,
) => Promise<boolean>
