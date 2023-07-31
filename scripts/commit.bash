git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config core.quotepath off

git add \*.md
git add \**/feed.rss
git add \**/feed.json

make_commit_msg()
{
  LINES=$(git status --porcelain | sed '/index.md/d'  | sed '/feed.*/d' | sed 's/\([A-Z]\s\).*\//\1/' | sort)
  # A output/example1.md
  # M output/example2.md
  # sed then removes subdirs and unwanted lines
  N_ADD=$(echo "$LINES" | grep -c '^A')
  N_MODIFY=$(echo "$LINES" | grep -c '^M')

  if [ "$N_ADD" -eq 1 ]; then
    MSG_A=$(echo "$LINES" | grep '^A')
  elif [ "$N_ADD" -gt 1 ];  then
    MSG_A="A $N_ADD"
  else
    MSG_A=""
  fi

  if [ "$N_MODIFY" -eq 1 ]; then
    MSG_M=$(echo "$LINES" | grep '^M')
  elif [ "$N_MODIFY" -gt 1 ];  then
    MSG_M="M $N_MODIFY"
  else
    MSG_M=""
  fi

  # if msg a is empty
  if [ -z "$MSG_A" ]; then
    MSG="$MSG_M"
  elif [ -z "$MSG_M" ]; then
    MSG="$MSG_A"
  else
    MSG="$MSG_A $MSG_M"
  fi
  echo "$MSG"
}

MSG=$(make_commit_msg)
echo "Commit message: $MSG"
git commit -m "$MSG"
git push