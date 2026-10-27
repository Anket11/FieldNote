#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! git diff --cached --quiet; then
  echo "Commit or unstage existing staged changes before running this script." >&2
  exit 1
fi

if git ls-files --error-unmatch demo-data/procurement_final.json >/dev/null 2>&1; then
  echo "This migration is already tracked. Review Git history before running the script again." >&2
  exit 1
fi

commit_tmp=$(mktemp -d)
trap 'rm -rf "$commit_tmp"' EXIT

# Prepare intermediate index versions so each feature commit has its dependencies.
# Working files are never rewritten.
python3 - "$commit_tmp" <<'PY'
from pathlib import Path
import sys

output = Path(sys.argv[1])

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise SystemExit("Source changed since this script was prepared; review the commit split before continuing.")
    return text.replace(old, new, 1)

def snapshot(name, transform):
    text = transform(Path(name).read_text())
    destination = output / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(text)

snapshot("src/components/research/results/research/ResearchArea.tsx", lambda text:
    replace_once(replace_once(text,
        'import ResearchOverview from "./research-overview/ResearchOverview";\n', ''),
        '      <ResearchOverview sections={sections} />',
        '''      <section>
        <h3>Research brief</h3>
        <EvidenceList items={sections.find((section) => section.id === "overview")?.items ?? []} />
      </section>'''))

snapshot("src/components/research/results/prepare-tender/PrepareTenderArea.tsx", lambda text:
    replace_once(text, 'title: "Action items"', 'title: "Questions to resolve"'))
snapshot("src/components/research/results/my-review/MyReviewArea.tsx", lambda text:
    replace_once(text, 'title: "Action items"', 'title: "Open preparation questions"'))

def earlier_panel(text):
    for old, new in [
        ('  const panel = useRef<HTMLElement>(null);\n', ''),
        ('    panel.current?.scrollTo(0, 0);\n', ''),
        ('  }, [citation.id]);', '  }, []);'),
        ('<aside ref={panel}', '<aside'),
        ('lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] ', ''),
        (' lg:overflow-y-auto', ''),
    ]:
        text = replace_once(text, old, new)
    return text

snapshot("src/components/research/results/evidence-panel/EvidencePanel.tsx", earlier_panel)

def earlier_tests(text):
    text = replace_once(text, 'assert.match(html, /Research overview/);', 'assert.match(html, /Research brief/);')
    start = text.index('  for (const [title, count] of ')
    end = text.index('  assert.match(html, /<table/);', start)
    text = text[:start] + text[end:]
    return replace_once(text, 'assert.match(html, /Action items/);', 'assert.match(html, /Questions to resolve/);')

snapshot("src/tests/components.test.tsx", earlier_tests)
PY

git diff --check
npm run typecheck
npm run lint
npm test
npm run build -- --webpack

commit_staged() {
  if ! git diff --cached --quiet; then
    git commit -m "$1"
  fi
}

stage_snapshot() {
  local blob
  blob=$(git hash-object -w "$commit_tmp/$1")
  git update-index --add --cacheinfo 100644 "$blob" "$1"
}

git add -- src/components/research/search/SearchForm.tsx src/components/research/search/SearchWorkspace.tsx
commit_staged "feat(search): add compact editable search header"

# The response contract, Redux state and consuming UI change together.
git add -A -- src demo-data/procurement_final.json ':(glob,exclude)**/.DS_Store'
git restore --staged -- src/components/research/results/research/research-overview/ResearchOverview.tsx
for commit_path in \
  src/components/research/results/research/ResearchArea.tsx \
  src/components/research/results/prepare-tender/PrepareTenderArea.tsx \
  src/components/research/results/my-review/MyReviewArea.tsx \
  src/components/research/results/evidence-panel/EvidencePanel.tsx \
  src/tests/components.test.tsx; do
  stage_snapshot "$commit_path"
done
commit_staged "feat(research): support sectioned responses and three work areas"

git add -- src/components/research/results/evidence-panel/EvidencePanel.tsx
commit_staged "feat(evidence): keep source panel visible while browsing"

git add -- \
  src/components/research/results/research/ResearchArea.tsx \
  src/components/research/results/research/research-overview/ResearchOverview.tsx \
  src/components/research/results/prepare-tender/PrepareTenderArea.tsx \
  src/components/research/results/my-review/MyReviewArea.tsx \
  src/tests/components.test.tsx
commit_staged "feat(overview): add clickable counts and action items"

git add -- README.md commit-features.sh
commit_staged "feat(workflow): document research setup and feature commits"

git log -5 --oneline
git status --short
