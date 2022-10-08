import { makeSlug, makeExcerpt, countWordsRounded, strftime } from "./utils.js"

export default {
  sourceRepo: "",
  // in format of 'owner/repo'
  // if empty, will try to use env var GITHUB_REPOSITORY (e.g. provided by GitHub Actions)
  categoriesWhitelist: [],
  authorsWhitelist: [],
  // if empty, all are allowed

  outputDir: "output",
  // relative to current working directory
  postSubDir: "posts",
  // relative to outputDir
  generateIndex: true,
  // whether to generate index.md (a list of posts and labels)
  postUseJson: false,
  homeUseJson: false,
  // if true, use json frontmatter instead of yaml for posts / homepage

  generateJsonFeed: true,
  generateRssFeed: true,
  // whether to generate feed
  postsInFeed: 10,
  // number of posts to include in the feed

  formatFilename: (post) => {
    // function to format the filename of a post
    let filename = ""
    filename += strftime("%y%m-", new Date(post.createdAt))
    // replaces disallowed characters with delimiter (default: '-')
    filename += makeSlug(post.title, {
      disallowed: ",", // in addition to \/?*:|"<> and whitespace
    })
    return filename
  },

  extraFrontmatterPost: (post) => {
    const wordCounts = countWordsRounded(post.bodyText)
    return {
      // add entries to post frontmatter
      countZH: wordCounts.zh,
      countEN: wordCounts.en,
      // excerpt: makeExcerpt(post.bodyText),
    }
  },

  extraFrontmatterIndex: (metadata) => {
    return {
      // add entries to index.md frontmatter (e.g. layout)
    }
  },
}
