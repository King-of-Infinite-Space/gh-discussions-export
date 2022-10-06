deno run --allow-net --allow-env --allow-read --allow-write scripts/fetchPosts.js

exit_code=$?
if [ $exit_code -gt 0 ]; then
  exit 1
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config core.quotepath off

git add .

MSG=$(git status --porcelain | sed '/index.md/d'  | sed '/feed.*/d' | sed 's/\([A-Z]\s\).*\//\1/')
# removes subdirs and unwanted lines
N_LINES=$(echo "$MSG" | wc -l)
if [ "$N_LINES" -gt 3 ]; then
  MSG="Updated $N_LINES posts"
fi
git commit -m "$MSG"
git push