import { getFilename, getExcerpt, countWordsRounded } from "./utils.js"

export default {
  sourceRepo: "",
  // in format of 'owner/repo'
  // if empty, will try to use env var GITHUB_REPOSITORY (e.g. provided by GitHub Actions)
  categoriesWhitelist: [],
  authorsWhitelist: [],
  // if empty, all are allowed

  outputDir: "output",
  // relative to the root of the repo
  postSubDir: "posts",
  // relative to outputDir
  generateIndex: true,
  // whether to generate index.md (a list of posts and labels)
  postUseJson: false,
  homeUseJson: false,
  // if true, use json frontmatter instead of yaml for posts / homepage

  formatFilename: getFilename,
  // function to format the filename of a post
  extraFrontmatterPost: (post) => {
    // add extra entries to each post's frontmatter
    const wordCounts = countWordsRounded(post.bodyText)
    return {
      countZH: wordCounts.zh,
      countEN: wordCounts.en,
      excerpt: getExcerpt(post.bodyText),
    }
  },

  extraFrontmatterIndex: (metadata) => {
    // add extra frontmatter to index.md (e.g. layout)
    return {}
  },

  generateJsonFeed: true,
  generateRssFeed: true,
  // whether to generate feed
  postsInFeed: 10,
  // number of posts to include in the feed
}
