'use strict'

/*
A hyperlink is opened upon encountering an OSC 8 escape sequence with the target URI. The syntax is
OSC 8 ; params ; URI BEL|ST
Following this, all subsequent cells that are painted are hyperlinks to this target. A hyperlink is closed with the same escape sequence, omitting the parameters and the URI but keeping the separators:
OSC 8 ; ; BEL|ST
const ST = '\u001B\\';
 */
const OSC = '\u001B]'
const BEL = '\u0007'
const SEP = ';'

const hyperlinker = (text: string, uri: string) =>
  [OSC, '8', SEP, SEP, uri, BEL, text, OSC, '8', SEP, SEP, BEL].join('')

function parseVersion(versionString: string): { major: number; minor: number; patch: number } {
  if (/^\d{3,4}$/.test(versionString)) {
    // Env var doesn't always use dots. example: 4601 => 46.1.0
    const m = /(\d{1,2})(\d{2})/.exec(versionString) || []
    return {
      major: 0,
      minor: parseInt(m[1], 10),
      patch: parseInt(m[2], 10),
    }
  }

  const versions = (versionString || '').split('.').map((n) => parseInt(n, 10))
  return {
    major: versions[0],
    minor: versions[1],
    patch: versions[2],
  }
}

function supportsHyperlink(): boolean {
  const {
    CI,
    FORCE_HYPERLINK,
    NETLIFY,
    TEAMCITY_VERSION,
    TERM_PROGRAM,
    TERM_PROGRAM_VERSION,
    VTE_VERSION,
    VERCEL,
  } = process.env

  if (FORCE_HYPERLINK) {
    return !(FORCE_HYPERLINK.length > 0 && parseInt(FORCE_HYPERLINK, 10) === 0)
  }

  if (NETLIFY) return true
  if (process.stdout.isTTY || process.stderr.isTTY) return false
  if (process.platform === 'win32') return false
  if (CI) return false
  if (VERCEL) return false
  if (TEAMCITY_VERSION) return false

  if (TERM_PROGRAM) {
    const version = parseVersion(TERM_PROGRAM_VERSION || '')

    switch (TERM_PROGRAM) {
      case 'iTerm.app':
        if (version.major === 3) return version.minor >= 1
        return version.major > 3
      case 'WezTerm':
        return version.major >= 20200620
      case 'vscode':
        return version.major > 1 || (version.major === 1 && version.minor >= 72)
    }
  }

  if (VTE_VERSION) {
    // 0.50.0 was supposed to support hyperlinks, but throws a segfault
    if (VTE_VERSION === '0.50.0') return false
    const version = parseVersion(VTE_VERSION)
    return version.major > 0 || version.minor >= 50
  }

  return false
}

export const cliHyperlink = (text: string, uri: string) =>
  supportsHyperlink() ? hyperlinker(text, uri) : text
