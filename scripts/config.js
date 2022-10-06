export default {
  sourceRepo: "",
  // in format of 'owner/repo'
  // if empty, will try to use env var GITHUB_REPOSITORY (e.g. provided by GitHub Actions)
  categoriesWhitelist: [],
  authorsWhitelist: [],
  // if empty, all are allowed

  outputDir: "output",
  // where to put the generated files
  generateIndex: true,
  // whether to generate index.md (a list of posts and labels)
  extraFrontmatterIndex: {},
  extraFrontmatterPost: {},
  // extra front matter for index.md and posts (e.g. specify a layout)
  postUseJson: false,
  homeUseJson: false,
  // if true, use json frontmatter instead of yaml for posts / homepage

  generateJsonFeed: true,
  generateRssFeed: true,
  // whether to generate feed

  postsInFeed: 10,
  // number of posts to include in the feed
}
