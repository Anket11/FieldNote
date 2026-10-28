#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-}" in
  "") check_only=false ;;
  --check) check_only=true ;;
  *) echo "Usage: bash scripts/commit-changes.sh [--check]" >&2; exit 1 ;;
esac

# This is a one-time split of the reviewed working tree.
expected_head=721ead76bfe484adc005b331f0c058ed6bdf4135
if [[ "$(git rev-parse HEAD)" != "$expected_head" ]]; then
  echo "HEAD changed since this script was prepared. Review the remaining changes before creating more commits." >&2
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "Existing staged changes found. Commit or unstage them before running this script." >&2
  exit 1
fi
if [[ -n "$(git diff --name-only --diff-filter=U)" ]]; then
  echo "Resolve merge conflicts first." >&2
  exit 1
fi
git check-ignore -q .env.local || { echo ".env.local must remain ignored." >&2; exit 1; }
git diff --check
git var GIT_AUTHOR_IDENT >/dev/null
git var GIT_COMMITTER_IDENT >/dev/null

commit_tmp=$(mktemp -d "${TMPDIR:-/tmp}/procurement-commits.XXXXXX")
cleanup() { python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1])' "$commit_tmp"; }
trap cleanup EXIT

# Keep the old UI buildable until the chat migration commit; never rewrite working files.
python3 - "$commit_tmp" <<'SNAPSHOTS'
from pathlib import Path
import re, subprocess, sys
output = Path(sys.argv[1])
types = Path('src/types/research.ts').read_text()
for name in ['BackendSection', 'BackendPassage', 'ResearchSection']:
    types, count = re.subn(r'^interface '+name+r'\b', 'export interface '+name, types, flags=re.M)
    if count != 1:
        raise SystemExit('Research types changed; review the commit split before continuing.')
research = Path('src/services/research.ts').read_text()
if 'searchResearch' in research or 'DEMO_QUERY' in research:
    raise SystemExit('Research service changed; review the commit split before continuing.')
original = subprocess.check_output(['git', 'show', 'HEAD:src/services/research.ts'], text=True)
legacy_search = original[original.index('export async function searchResearch'):]
research = 'import scenario from "../../demo-data/query.json";\n' + research
research = research.replace('function record(', 'export const DEMO_QUERY = scenario.query;\nconst normalize = (query: string) => query.trim().replace(/\\s+/g, " ").toLowerCase();\n\nfunction record(', 1)
research += '\n' + legacy_search
for name, text in [('src/types/research.ts', types), ('src/services/research.ts', research)]:
    file = output / name
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text)
SNAPSHOTS

stage_snapshot() {
  if "$check_only"; then return; fi
  local blob
  blob=$(git hash-object -w "$commit_tmp/$1")
  git update-index --add --cacheinfo 100644 "$blob" "$1"
}
commit_group() {
  local message="$1"
  shift
  if "$check_only"; then
    printf '%s\n' "$message"
    return
  fi
  git add -A -- "$@"
  git diff --cached --check
  if git diff --cached --quiet; then
    echo "No changes to commit for: $message"
    return
  fi
  git diff --cached --stat
  git commit -m "$message"
}

if ! "$check_only"; then
  npm test
  npm run lint
  npm run typecheck
  npm run build -- --webpack
fi

commit_group 'feat(setup): configure copilotkit and gemini dependencies' \
  .env.example \
  .gitignore \
  next.config.ts \
  package-lock.json \
  package.json

stage_snapshot src/types/research.ts
stage_snapshot src/services/research.ts
commit_group 'feat(geography): add package maps terrain and historical imagery' \
  demo-data/query.json \
  src/components/agent/location/HistoryControls.tsx \
  src/components/agent/location/LocationCanvas.tsx \
  src/components/agent/location/LocationView.tsx \
  src/components/agent/map/MapboxLoader.tsx \
  src/components/agent/map/MarkerMap.tsx \
  src/services/demoQuery.ts \
  src/services/packageComparison.ts \
  src/services/packageLocations.ts \
  src/services/queryLocation.ts \
  src/services/satellite.ts \
  src/tests/packageComparison.test.ts \
  src/tests/packageLocations.test.ts \
  src/tests/queryLocation.test.ts \
  src/tests/satellite.test.ts \
  src/types/geography.ts \
  src/types/mapbox.ts

commit_group 'feat(agent): add validated procurement research tools and runtime' \
  scripts/check-chat-agent.ts \
  'src/app/api/copilotkit/[[...path]]/route.ts' \
  src/services/chatActions.ts \
  src/services/chatErrors.ts \
  src/services/chatLibrary.ts \
  src/tests/chatActions.test.ts \
  src/tests/chatErrors.test.ts \
  src/tests/chatLibrary.test.ts \
  src/tests/geminiSchema.test.ts \
  src/types/chat.ts

commit_group 'feat(components): add reusable collections and citation previews' \
  src/components/agent/Checklist.tsx \
  src/components/agent/Collection.tsx \
  src/components/agent/Details.tsx \
  src/components/agent/List.tsx \
  src/components/agent/SplitView.tsx \
  src/components/agent/sources/SourceCitation.tsx \
  src/components/agent/sources/sourcePlacement.ts \
  src/tests/sourcePlacement.test.ts

commit_group 'feat(chat): replace research tabs with a conversation workspace' \
  src/app/layout.tsx \
  src/app/page.tsx \
  src/components/app/AnswerRenderer.tsx \
  src/components/app/ChatComposer.tsx \
  src/components/app/ChatMessages.tsx \
  src/components/app/ChatSidebar.tsx \
  src/components/app/ChatWorkspace.tsx \
  src/components/app/CopilotThread.tsx \
  src/components/app/answers/AnswerView.tsx \
  src/components/app/answers/ChecklistAnswer.tsx \
  src/components/app/answers/CollectionAnswer.tsx \
  src/components/app/answers/RecordMap.tsx \
  src/components/app/details/RecordDetails.tsx \
  src/components/app/evidence/SourceLinks.tsx \
  src/components/app/useResearchAgent.tsx \
  src/components/research/ResearchWorkspace.tsx \
  src/components/research/results/ResearchTabs.tsx \
  src/components/research/results/ResultsWorkspace.tsx \
  src/components/research/results/evidence-panel/EvidencePanel.tsx \
  src/components/research/results/my-review/MyReviewArea.tsx \
  src/components/research/results/prepare-tender/PrepareTenderArea.tsx \
  src/components/research/results/research/ResearchArea.tsx \
  src/components/research/results/research/research-overview/ResearchOverview.tsx \
  src/components/research/results/research/similar-packages/SimilarPackagesSection.tsx \
  src/components/research/results/research/similar-packages/package-table/PackageRow.tsx \
  src/components/research/results/research/similar-packages/package-table/PackageTable.tsx \
  src/components/research/search/SearchForm.tsx \
  src/components/research/search/SearchWorkspace.tsx \
  src/components/shared/citations/CitationList.tsx \
  src/components/shared/evidence-details/EvidenceDetails.tsx \
  src/components/shared/evidence-list/EvidenceItem.tsx \
  src/components/shared/evidence-list/EvidenceList.tsx \
  src/services/answerSources.ts \
  src/services/research.ts \
  src/store/Provider.tsx \
  src/store/hooks.ts \
  src/store/researchSlice.ts \
  src/store/store.ts \
  src/tests/agentComponents.test.tsx \
  src/tests/answerSources.test.ts \
  src/tests/chatOutputs.test.tsx \
  src/tests/chatTransport.test.ts \
  src/tests/components.test.tsx \
  src/tests/fixtures/scriptedAgent.ts \
  src/tests/research.test.ts \
  src/tests/state.test.ts \
  src/types/research.ts

commit_group 'feat(workflow): document chat setup and component architecture' \
  README.md \
  commit-features.sh \
  docs/frontend-component-graph.md \
  docs/procurement-chat-spec.md \
  scripts/commit-changes.sh

if "$check_only"; then
  echo "Check passed. No files were staged and no commits were created."
else
  git log -6 --oneline
  git status --short
fi
