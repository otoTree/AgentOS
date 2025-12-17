<components>
lib: shadcn + coss + ai-elements
shadcn: style=new-york | color=neutral | icons=lucide
priority: ui/ existing → shadcn/coss import → custom build
install: pnpm dlx shadcn@latest add <component> | pnpm dlx shadcn@latest add @coss/<component>
ai-elements: pnpm dlx shadcn@latest add "https://registry.ai-sdk.dev/<component>.json"
docs: shadcn/ui (https://ui.shadcn.com/llms.txt) | coss ui (https://coss.com/ui/llms.txt)
custom: only when 3rd-party not exist | can't adapt | specific biz logic
</components>

<shadcn-cli-safety>
purpose: prevent UNINTENDED overwrites during CLI installation
prefix: `yes n | pnpm dlx shadcn@latest add ...` (auto-answer 'n' to overwrite prompts)
verify: run `git diff` after install to check changes
note: intentional modifications to shadcn components ARE allowed and encouraged when needed
</shadcn-cli-safety>

<icons>
default: lucide-react (UI icons)
brand: react-icons (FcGoogle, FaGithub, GiYinYang)
custom: shared/icons/ when needed
priority: lucide → react-icons → custom
</icons>

<component-structure>
principle: high cohesion + low coupling
high cohesion: component manages own data, animation, styling internally
low coupling: minimize props | fetch own data (useTranslations, hooks) | ✗ receive pre-processed data as props
exception: generic reusable components → accept data via props
</component-structure>

<styling>
principle: prefer props to control behavior | modify base when semantics require (e.g., div → span)
pattern: add size/variant props → caller decides | keep base defaults stable when possible
variants: use cva (class-variance-authority) for variant styles | ✗ multiple if statements
</styling>

<cursor>
types: default | pointer | text | not-allowed
default: text content | non-interactive elements
pointer: all interactive elements (button, link, clickable) + their children
text: input fields (text, email, password, textarea, contenteditable)
not-allowed: disabled elements (:disabled, aria-disabled)
✗ use: grab | crosshair | other cursor types
</cursor>

<theme>
mode: light only | ✗ dark mode
colors: black text on white/gray bg | use opacity for hierarchy (text-black/50, text-black/70)
✗ use: dark: variant | bg-zinc-900 | text-white on dark bg
</theme>

<color-system>
format: OKLCH preferred | oklch(L C H) where L=lightness C=chroma H=hue
base: pure white bg (#fff) + pure black text (#000)
hierarchy: opacity-based (text-black/40 → /50 → /60 → /70 → /80 → black)
section-bg: oklch(0.985 0 0) ≈ zinc-50 (alternating section background)
accent: ✗ colored accents | use black/white only
border: black/[0.04-0.08] (subtle borders)
shadow: rgba(0,0,0,0.04-0.12) (delicate shadows)
success: emerald-500 (status indicator only)
mode-colors:
  - auto: oklch(0.55 0.01 60) stone gray
  - fortune: oklch(0.7 0.1 290) light violet
  - listen: oklch(0.75 0.08 165) light emerald
  - divination: oklch(0.7 0.1 290) light violet
</color-system>

<aesthetic>
direction: Eastern Editorial Minimalism
tone: light & serene | breathing whitespace | refined restraint
inspiration: magazine editorial layout + ink-wash painting aesthetics
character: modern minimalism as foundation | eastern elegance as soul | east-west fusion
✗ avoid: heavy shadows | saturated colors | busy decoration | generic AI aesthetics
</aesthetic>

<landing>
scope: landing page only | ✗ dashboard
typography: large scale titles (4xl-6xl) | font-serif for headings | font-light preferred
spacing: generous whitespace | large section padding | open layout
animation: FadeIn entrance | stagger sequences | viewport-triggered | Motion lib
glass: Apple Liquid Glass style | backdrop-blur | translucent surfaces
</landing>
