#### Intro

Export Discussions in a repo as `.md` files. Also generate a list of posts as well as json feed.

This repo is inspired by some projects (e.g. [YeungKC/Hakuba](https://github.com/YeungKC/Hakuba)) that use *Github Discussions* to store contents of a blog. (In fact, *Github Discussions* works very well as a blog by itself.) Basically, the workflows of those projects are

1. Export discussions to `.md` files
2. Use static site generator to build `.html` pages

This project only does 1. Then the files can be used for any SSG or just as backup. The generated json feed can be used by a feed reader (e.g. with raw Github url).

#### Usage

1. Install deno (developed on `1.25`)
2. Set environment variable `GITHUB_TOKEN` in command line or in `.env` file in project directory 
3. Edit `script/config.js` as needed
4. `deno run --allow-net --allow-env --allow-read --allow-write scripts/fetchPosts.js`

An example Github Actions workflow is provided in `.github/worflows` folder, which runs the script automatically and commits the changes.