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
  generateFeed: true,
  // whether to generate feed.json

  postUseJson: false,
  homeUseJson: false,
  // if true, use json frontmatter instead of yaml for posts / homepage

  postsInFeed: 10,
  // number of posts to include in the feed
  feedTopInfo: {},
  // override default top level feed info
  // for details see https://www.jsonfeed.org/version/1.1/
  feedPostInfo: (post) => {
    return {}
  },
  // a fuction that returns info for each post in feed,
  // override default post info
}
