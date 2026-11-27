#!/usr/bin/env python3
"""Semi-automated AriaScore colour migration. Dry run unless --apply."""
import argparse
import difflib
import re
from pathlib import Path


def palette(**groups):
    return {shade.lower(): token for token, shades in groups.items()
            for shade in shades.split()}


TEXT = palette(
    text='#111 #222 #333 #111827 #1f2937 #374151 #464950 #202020',
    secondaryText='#555 #666 #777 #888 #888888 #6b7280 #64748b #475569 #4b5563 #334155',
    tertiaryText='#999 #aaa #9ca3af #94a3b8 #cbd5e1',
    accent='#2563eb #1976d2', danger='#dc2626 #b91c1c #991b1b',
    warning='#d97706 #b45309', success='#16a34a #22c55e',
)
BG = palette(
    surface='#f9fafb #f8fafc #f8f9fa #f6f7f9 #f5f5f5 #f4f4f4 #f5f5f5',
    surfaceSecondary='#f3f4f6 #f1f5f9 #f0f0f0 #eee #eeeeee #e5e7eb',
    selectedBackground='#eff6ff #dbeafe', accent='#2563eb #1976d2',
    disabledText='#9ca3af', danger='#dc2626 #b91c1c',
    warning='#d97706 #b45309', success='#16a34a #22c55e',
)
BORDER = palette(border='#ddd #dddddd #d1d5db #e5e7eb #e2e8f0 #cbd5e1',
                 danger='#dc2626 #b91c1c', accent='#2563eb #1976d2')
SEPARATOR = {**BORDER, **palette(separator='#eee #eeeeee #e5e7eb #f3f4f6')}
PLACEHOLDER = {**TEXT, '#888':'tertiaryText', '#888888':'tertiaryText'}
EXCLUDED = {'BufferedPDFViewer.tsx', 'PDFViewer.tsx', 'FaceGestureCalibrationScreen.tsx',
            'AnnotationsTestScreen.tsx', 'MetadataEditor.tsx', 'DevToolsButton.tsx', 'TestTailwind.tsx'}
LEGACY = {'accent', 'accentLight', 'accentVeryLight', 'text', 'secondaryText', 'border', 'background', 'pageBackground'}
# Recognise literal colours and legacy tokens only, never arbitrary expressions.
ATOM = r'''(?:"(?:#[0-9a-fA-F]{3,8}|white|black|rgba?\([^"\n]*\))"|'(?:#[0-9a-fA-F]{3,8}|white|black|rgba?\([^'\n]*\))'|\bACCENT_COLOR\b|\bCOLORS\.[A-Za-z_]\w*)'''
# Simple conditional with literal/legacy branches; leave nested conditions alone.
COND = rf'(?P<test>[^?\n{{}};,]+?\?\s*)(?P<yes>{ATOM})(?P<sep>\s*:\s*)(?P<no>{ATOM})'


def migrate(content, path, args):
    text = dict(TEXT)
    bg = dict(BG)
    border = dict(BORDER)
    separator = dict(SEPARATOR)
    if args.extra_tokens:
        text.update(palette(genreText='#0b590e', labelText='#7e22ce'))
        bg.update(palette(genreBackground='#eaffe8', labelBackground='#f3e8ff', dangerBackground='#fef2f2'))
        border['#fecaca'] = 'dangerBorder'
    # White backgrounds are intentionally opt-in with a documented default.
    if args.white_background != 'skip':
        token = args.white_background
        if token == 'auto':
            token = 'background' if 'screens' in path.parts else 'elevated'
        bg.update(palette(**{token: 'white #fff #ffffff'}))
    if args.white_foreground != 'skip':
        text.update(palette(**{args.white_foreground: 'white #fff #ffffff'}))
    maps = {'color': text, 'backgroundColor': bg, 'borderColor': border,
            'borderTopColor': separator, 'borderBottomColor': separator,
            'borderLeftColor': border, 'borderRightColor': border,
            'placeholderTextColor': PLACEHOLDER,
            'maximumTrackTintColor': {'#d1d5db':'trackInactive'},
            'minimumTrackTintColor': {'#2563eb':'accent'},
            'tintColor': text, 'thumbColor': {'#2563eb':'accent'}}
    props = '|'.join(sorted(maps, key=len, reverse=True))

    def convert(raw, prop):
        if raw == 'ACCENT_COLOR': return 'colors.accent'
        if raw.startswith('COLORS.'):
            key = raw.split('.', 1)[1]
            return 'colors.' + key if key in LEGACY else raw
        val = raw[1:-1].lower().replace(' ', '')
        if prop == 'backgroundColor':
            if re.fullmatch(r'rgba\(0,0,0,0\.(?:25|35|4|40|45|5|50|65)\)', val):
                return 'colors.overlay'
            if val == 'rgba(255,255,255,0.96)' and 'reader' in path.parts:
                return 'colors.readerChrome'
        token = maps[prop].get(val)
        return 'colors.' + token if token else raw

    def expr(raw, prop):
        m = re.fullmatch(COND, raw)
        if m:
            return m['test'] + convert(m['yes'], prop) + m['sep'] + convert(m['no'], prop)
        return convert(raw, prop)

    # Handle direct JSX literals and expression braces, including simple ternaries.
    pat = re.compile(rf'(?P<prefix>\b(?P<prop>{props})\s*=\s*)(?P<value>{ATOM}|\{{\s*(?:{COND}|{ATOM})\s*\}})')
    def jsx(m):
        raw = m['value']
        if raw.startswith('{'):
            inner = raw[1:-1].strip()
            new = expr(inner, m['prop'])
        else:
            new = expr(raw, m['prop'])
            inner = raw
        return m['prefix'] + '{' + new + '}' if new != inner else m.group()
    content = pat.sub(jsx, content)
    # Style declarations, including multiline literals and simple ternaries.
    pat = re.compile(rf'(?P<prefix>\b(?P<prop>{props})\s*:\s*)(?P<value>{COND}|{ATOM})(?=\s*[,}};\n]|\s*$)')
    return pat.sub(lambda m: m['prefix'] + expr(m['value'], m['prop']), content)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('paths', nargs='+')
    p.add_argument('--apply', action='store_true')
    p.add_argument('--white-background', choices=['auto','skip','background','elevated','surface','readerChrome'], default='auto', help='auto: screens -> background; components -> elevated; review popup and paper exceptions')
    p.add_argument('--white-foreground', choices=['skip','onAccent','text','onDanger'], default='skip', help='Opt in only for files with known white foreground semantics')
    p.add_argument('--extra-tokens', action='store_true', help='Enable genre/label/dangerBackground/dangerBorder tokens after adding them to both palettes')
    args = p.parse_args()
    files = set()
    for name in args.paths:
        path = Path(name)
        if path.is_file(): files.add(path)
        elif path.is_dir(): files.update(path.rglob('*.tsx'))
        else: p.error(f'Not found: {path}')
    count = 0
    for path in sorted(files):
        if path.suffix != '.tsx' or path.name in EXCLUDED or 'debug' in path.parts or 'node_modules' in path.parts or 'theme' in path.parts:
            print(f'SKIPPED: {path}')
            continue
        with path.open(encoding='utf-8', newline='') as f: original = f.read()
        updated = migrate(original, path, args)
        if updated == original: continue
        count += 1
        print('\n'.join(difflib.unified_diff(original.splitlines(), updated.splitlines(), fromfile=str(path), tofile=str(path), lineterm='')))
        if args.apply:
            with path.open('w', encoding='utf-8', newline='') as f: f.write(updated)
    print(f'\n{count} files affected. ' + ('Changes applied.' if args.apply else 'Dry run; no files modified.'))
    print('Review colors scope, white surfaces, contrast, comments, and legacy imports. Run npx tsc --noEmit.')

if __name__ == '__main__': main()
