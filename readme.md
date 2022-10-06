#### Intro

Export Discussions in a repo as `.md` files. Also generate an index of posts as well as feed (rss or json).


#### Usage (Local)

1. Install deno (developed on `1.25`)
2. Set environment variable `GITHUB_TOKEN` in command line or in `.env` file in project directory 
3. Edit `script/config.js` as needed
4. `deno run --allow-net --allow-env --allow-read --allow-write scripts/fetchPosts.js`

#### Usage (Automatic)

1. "Use this template" to create a repo, or copy the files to an existing repo
2. Edit `script/config.js` as needed
3. A workflow will fetch discussions and commit them to the repo when a discussion is created or edited


#### Background

Some projects (e.g. [YeungKC/Hakuba](https://github.com/YeungKC/Hakuba)) use *Github Discussions* as a Content Management System for blogs. (In fact, *Github Discussions* works very well as a blog by itself.) Basically, the workflows of those projects are

1. Export discussions to `.md` files
2. Use static site generator to build `.html` pages

This project only does 1. Then the files can be used for any SSG or just as backup. The generated feed can be used by a feed reader ([demo link](https://cdn.jsdelivr.net/gh/King-of-Infinite-Space/gh-discussions-export/demo_output/feed.rss)).