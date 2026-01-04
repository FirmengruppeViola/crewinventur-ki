import { buildInfo } from '../../lib/buildInfo'

export function BuildStamp() {
  const buildStamp = buildInfo.buildTime
    .replace('T', ' ')
    .replace('Z', '')
    .split('.')[0]

  return (
    <div
      className="pointer-events-none fixed right-2 z-50 rounded-md bg-foreground/85 px-2 py-1 text-[11px] font-semibold text-background shadow-sm"
      style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
    >
      Build {buildInfo.version} · {buildInfo.gitSha} · {buildStamp}
    </div>
  )
}
